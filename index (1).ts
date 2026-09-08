import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZOHO_CLIENT_ID = Deno.env.get("ZOHO_CLIENT_ID")!;
const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return null;
  // Handle JSON-wrapped strings
  try { const parsed = JSON.parse(data.value); return typeof parsed === "string" ? parsed : data.value; } catch { return data.value; }
}

async function setSetting(key: string, value: string) {
  const { data: existing } = await supabase.from("app_settings").select("key").eq("key", key).maybeSingle();
  if (existing) await supabase.from("app_settings").update({ value }).eq("key", key);
  else await supabase.from("app_settings").insert({ key, value });
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getSetting("zoho_refresh_token");
  const domain = (await getSetting("zoho_domain")) || "https://accounts.zoho.eu";
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

  if (!res.ok) { console.error("Zoho token refresh failed:", await res.text()); return null; }
  const data = await res.json();
  if (data.access_token) { await setSetting("zoho_access_token", data.access_token); return data.access_token; }
  return null;
}

async function getAccessToken(): Promise<string | null> {
  let token = await getSetting("zoho_access_token");
  if (!token) token = await refreshAccessToken();
  return token;
}

// Parse Zoho XML: extract <fl val="key">value</fl> from each <campaign>
function parseZohoCampaignsXml(xml: string): any[] {
  const campaigns: any[] = [];
  const campaignBlocks = xml.split(/<campaign\s/);
  
  for (let i = 1; i < campaignBlocks.length; i++) {
    const block = campaignBlocks[i];
    const fields: Record<string, string> = {};
    const flRegex = /<fl val="([^"]+)">([\s\S]*?)<\/fl>/g;
    let match;
    while ((match = flRegex.exec(block)) !== null) {
      fields[match[1]] = match[2].trim();
    }
    if (Object.keys(fields).length > 0) campaigns.push(fields);
  }
  
  return campaigns;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let token = await getAccessToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "No Zoho access token. Please re-authorize." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiDomain = (await getSetting("zoho_campaigns_api_domain")) || "https://campaigns.zoho.eu/api";

    // Fetch recent campaigns (returns XML)
    const url = `${apiDomain}/v1.1/recentcampaigns?recentinfo=recent&sort=desc`;
    let res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
    let xml = await res.text();
    
    // Zoho returns 200 even on auth errors — check XML body
    if (xml.includes("<code>1007</code>") || xml.includes("Unauthorized") || res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return new Response(JSON.stringify({ error: "Token refresh failed. Please re-authorize Zoho." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      token = newToken;
      res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${newToken}` } });
      xml = await res.text();
    }

    const campaigns = parseZohoCampaignsXml(xml);

    // Debug: capture what we got
    const apiDebug = { url, status: res.status, xmlLength: xml.length, xmlSample: xml.substring(0, 500), campaignsParsed: campaigns.length, token: token ? token.substring(0, 10) + "..." : "null" };

    // Get existing email entries to avoid duplicates (check by title + type)
    const { data: existing } = await supabase
      .from("archive_entries")
      .select("title")
      .eq("type", "email");
    const existingTitles = new Set((existing || []).map((e: any) => e.title));

    let newCount = 0;
    let updatedCount = 0;
    let debugStats = null;

    for (const c of campaigns) {
      const title = c.campaign_name || c.subject || "Untitled Campaign";
      const sentDateStr = c.sent_date_string || c.created_date_string || "";
      // Parse "24 Jun 2026, 01:57 PM" format
      let date = new Date().toISOString().split("T")[0];
      if (sentDateStr) {
        try {
          const d = new Date(sentDateStr.replace(",", ""));
          if (!isNaN(d.getTime())) date = d.toISOString().split("T")[0];
        } catch {}
      }
      const status = c.campaign_status || "";
      const campaignKey = c.campaign_key || "";
      const previewLink = c.campaign_preview ? "https://" + c.campaign_preview : null;

      // Fetch stats for sent campaigns
      let statsDesc = "";
      if (status === "Sent" && campaignKey) {
        try {
          // Try multiple Zoho stats endpoints
          const endpoints = [
            `${apiDomain}/v1.1/campaignreportdetails?campaignkey=${campaignKey}`,
            `${apiDomain}/v1.1/getmessagestatistics?campaignkey=${campaignKey}`,
            `${apiDomain}/v1.1/reportsdata?campaignkey=${campaignKey}&type=summary`,
            `${apiDomain}/v1.1/campaigndetails?campaignkey=${campaignKey}`,
          ];
          
          let statsXml = "";
          let successEndpoint = "";
          for (const ep of endpoints) {
            try {
              const statsRes = await fetch(ep, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
              const text = await statsRes.text();
              if (text && !text.includes("<status>error</status>") && (text.includes("sent") || text.includes("open") || text.includes("recipient"))) {
                statsXml = text;
                successEndpoint = ep;
                break;
              }
            } catch {}
          }
          
          // Save first campaign's debug info
          if (newCount === 0 && updatedCount === 0) {
            debugStats = { campaignKey, endpoints: endpoints.map(e => e.split("/v1.1/")[1]?.split("?")[0]), successEndpoint: successEndpoint || "none", xmlSample: statsXml.substring(0, 500) };
          }

          if (statsXml) {
            const getVal = (keys: string[]) => { 
              for (const key of keys) {
                const m = statsXml.match(new RegExp('<fl val="' + key + '">([^<]*)</fl>'));
                if (m && m[1]) return m[1];
                const m2 = statsXml.match(new RegExp('<' + key + '>([^<]*)</' + key + '>'));
                if (m2 && m2[1]) return m2[1];
              }
              return "0";
            };
            const sent = getVal(["total_sent_count", "total_sent", "recipients", "sent_count", "total_recipients"]);
            const opens = getVal(["unique_opens", "unique_open", "opens", "open_count"]);
            const clicks = getVal(["unique_clicks", "unique_click", "clicks", "click_count"]);
            const unsubs = getVal(["unsubscribes", "unsubscribe", "unsub_count", "unsubscribe_count"]);
            const openRate = getVal(["open_percentage", "open_rate"]);
            const clickRate = getVal(["click_percentage", "click_rate"]);
            
            const statsJson = JSON.stringify({ sent, opens, clicks, unsubs, openRate, clickRate });
            statsDesc = `\n\n---STATS---${statsJson}`;
          }
        } catch (e) { console.error("Stats fetch failed for", title, e); }
      }

      const description = `Subject: ${c.subject || title}${statsDesc}`;

      if (existingTitles.has(title)) {
        // Update existing
        if (statsDesc) {
          await supabase.from("archive_entries").update({ description }).eq("title", title);
          updatedCount++;
        }
      } else if (status === "Sent") {
        // Only add sent campaigns
        await supabase.from("archive_entries").insert({
          title,
          type: "email",
          description,
          date,
          link: previewLink,
          tags: ["email", "zoho-campaigns", "auto-synced"],
          performance: null,
        });
        newCount++;
        existingTitles.add(title);
      }
    }

    await setSetting("zoho_last_sync", new Date().toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        totalNew: newCount,
        totalUpdated: updatedCount,
        totalCampaignsFound: campaigns.length,
        statsDebug: debugStats,
        apiDebug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Zoho sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
