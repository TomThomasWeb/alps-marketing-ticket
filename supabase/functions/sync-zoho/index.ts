import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZOHO_CLIENT_ID = Deno.env.get("ZOHO_CLIENT_ID")!;
const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value || null;
}

async function setSetting(key: string, value: string) {
  const { data: existing } = await supabase.from("app_settings").select("key").eq("key", key).maybeSingle();
  if (existing) await supabase.from("app_settings").update({ value }).eq("key", key);
  else await supabase.from("app_settings").insert({ key, value });
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getSetting("zoho_refresh_token");
  const domain = await getSetting("zoho_domain") || "https://accounts.zoho.eu";
  if (!refreshToken) return null;

  const res = await fetch(`${domain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    console.error("Zoho token refresh failed:", await res.text());
    return null;
  }

  const data = await res.json();
  if (data.access_token) {
    await setSetting("zoho_access_token", data.access_token);
    return data.access_token;
  }
  return null;
}

async function getAccessToken(): Promise<string | null> {
  let token = await getSetting("zoho_access_token");
  if (!token) token = await refreshAccessToken();
  return token;
}

async function fetchWithRetry(url: string, token: string): Promise<any> {
  let res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) return null;
    res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${newToken}` },
    });
  }

  if (!res.ok) {
    console.error("Zoho API error:", res.status, await res.text());
    return null;
  }

  return await res.json();
}

async function syncCampaigns(token: string, apiDomain: string) {
  // Fetch recent campaigns from Zoho Campaigns
  const data = await fetchWithRetry(
    `${apiDomain}/api/v1.1/recentcampaigns?recentinfo=recent&sort=desc`,
    token
  );

  if (!data || !data.recent_campaigns) return { new: 0, updated: 0 };

  const { data: existing } = await supabase
    .from("archive_entries")
    .select("title, link")
    .eq("type", "email")
    .like("tags", "%zoho-campaigns%");
  
  const existingTitles = new Set((existing || []).map((e: any) => e.title));

  let newCount = 0;
  let updatedCount = 0;

  for (const campaign of data.recent_campaigns) {
    const title = campaign.campaign_name || campaign.campaignname || "Untitled Campaign";
    const sentDate = campaign.sent_time || campaign.created_time || new Date().toISOString();
    const date = sentDate.split("T")[0].split(" ")[0];
    
    // Get campaign stats
    let stats = { sent: 0, opens: 0, clicks: 0, openRate: 0, clickRate: 0 };
    if (campaign.campaign_key || campaign.campaignkey) {
      const key = campaign.campaign_key || campaign.campaignkey;
      const statsData = await fetchWithRetry(
        `${apiDomain}/api/v1.1/reports/${key}`,
        token
      );
      if (statsData) {
        stats = {
          sent: statsData.total_sent || statsData.sent || 0,
          opens: statsData.unique_opens || statsData.opens || 0,
          clicks: statsData.unique_clicks || statsData.clicks || 0,
          openRate: statsData.open_rate || (statsData.unique_opens && statsData.total_sent ? Math.round(statsData.unique_opens / statsData.total_sent * 100) : 0),
          clickRate: statsData.click_rate || (statsData.unique_clicks && statsData.total_sent ? Math.round(statsData.unique_clicks / statsData.total_sent * 100) : 0),
        };
      }
    }

    const description = `Sent: ${stats.sent} · Opens: ${stats.opens} (${stats.openRate}%) · Clicks: ${stats.clicks} (${stats.clickRate}%)`;

    if (existingTitles.has(title)) {
      // Update stats
      await supabase
        .from("archive_entries")
        .update({ description, performance: stats.openRate > 30 ? "high" : stats.openRate > 15 ? "medium" : null })
        .eq("title", title)
        .eq("type", "email");
      updatedCount++;
    } else {
      await supabase.from("archive_entries").insert({
        title,
        type: "email",
        description,
        date,
        link: campaign.campaign_link || null,
        tags: ["email", "zoho-campaigns", "auto-synced"],
        performance: stats.openRate > 30 ? "high" : stats.openRate > 15 ? "medium" : null,
      });
      newCount++;
    }
  }

  return { new: newCount, updated: updatedCount };
}

async function syncMarketingAutomation(token: string, apiDomain: string) {
  // Fetch from Zoho Marketing Automation
  const maApiDomain = (await getSetting("zoho_ma_api_domain")) || "https://marketingautomation.zoho.eu";
  
  const data = await fetchWithRetry(
    `${maApiDomain}/api/v1/campaigns?sort_by=modified_time&sort_order=desc&limit=20`,
    token
  );

  if (!data || !data.data) return { new: 0, updated: 0 };

  const { data: existing } = await supabase
    .from("archive_entries")
    .select("title")
    .eq("type", "email")
    .like("tags", "%zoho-ma%");
  
  const existingTitles = new Set((existing || []).map((e: any) => e.title));

  let newCount = 0;

  for (const campaign of data.data) {
    const title = campaign.campaign_name || campaign.name || "MA Campaign";
    if (existingTitles.has(title)) continue;

    const date = (campaign.sent_time || campaign.modified_time || new Date().toISOString()).split("T")[0];
    const stats = {
      sent: campaign.total_recipients || 0,
      opens: campaign.unique_opens || 0,
      clicks: campaign.unique_clicks || 0,
    };
    const openRate = stats.sent > 0 ? Math.round(stats.opens / stats.sent * 100) : 0;
    const clickRate = stats.sent > 0 ? Math.round(stats.clicks / stats.sent * 100) : 0;
    const description = `Sent: ${stats.sent} · Opens: ${stats.opens} (${openRate}%) · Clicks: ${stats.clicks} (${clickRate}%)`;

    await supabase.from("archive_entries").insert({
      title,
      type: "email",
      description,
      date,
      tags: ["email", "zoho-ma", "auto-synced"],
      performance: openRate > 30 ? "high" : openRate > 15 ? "medium" : null,
    });
    newCount++;
  }

  return { new: newCount, updated: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "No Zoho access token. Please re-authorize." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiDomain = (await getSetting("zoho_campaigns_api_domain")) || "https://campaigns.zoho.eu/api";

    // Sync both Campaigns and Marketing Automation
    const campaignResults = await syncCampaigns(token, apiDomain);
    const maResults = await syncMarketingAutomation(token, apiDomain);

    await setSetting("zoho_last_sync", new Date().toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        campaigns: campaignResults,
        marketingAutomation: maResults,
        totalNew: campaignResults.new + maResults.new,
        totalUpdated: campaignResults.updated + maResults.updated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Zoho sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
