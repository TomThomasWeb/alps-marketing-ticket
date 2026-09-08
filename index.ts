import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;

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
  const refreshToken = await getSetting("linkedin_refresh_token");
  if (!refreshToken) return null;

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    console.error("LinkedIn token refresh failed:", await res.text());
    return null;
  }

  const data = await res.json();
  await setSetting("linkedin_access_token", data.access_token);
  if (data.refresh_token) await setSetting("linkedin_refresh_token", data.refresh_token);
  return data.access_token;
}

async function getAccessToken(): Promise<string | null> {
  let token = await getSetting("linkedin_access_token");
  if (!token) token = await refreshAccessToken();
  return token;
}

async function fetchPosts(token: string, orgId: string) {
  // Fetch recent posts from the company page
  const url = `https://api.linkedin.com/rest/posts?author=urn%3Ali%3Aorganization%3A${orgId}&q=author&count=20&sortBy=LAST_MODIFIED`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (res.status === 401) {
    // Token expired, try refresh
    const newToken = await refreshAccessToken();
    if (!newToken) return null;
    const retry = await fetch(url, {
      headers: {
        Authorization: `Bearer ${newToken}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!retry.ok) return null;
    return await retry.json();
  }

  if (!res.ok) {
    console.error("LinkedIn posts fetch failed:", res.status, await res.text());
    return null;
  }

  return await res.json();
}

async function fetchPostStats(token: string, postUrns: string[]) {
  if (postUrns.length === 0) return {};
  
  const urnsParam = postUrns.map((u) => encodeURIComponent(u)).join("&shares=");
  const url = `https://api.linkedin.com/rest/socialActions?ids=List(${postUrns.map(u => encodeURIComponent(u)).join(",")})`;
  
  // Use the simpler organizationalEntityShareStatistics endpoint
  const stats: Record<string, any> = {};
  
  for (const urn of postUrns) {
    try {
      const res = await fetch(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(urn)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "LinkedIn-Version": "202401",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        stats[urn] = {
          likes: data.likesSummary?.totalLikes || 0,
          comments: data.commentsSummary?.totalFirstLevelComments || 0,
        };
      }
    } catch (e) {
      console.error("Failed to fetch stats for", urn, e);
    }
  }
  
  return stats;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const orgId = await getSetting("linkedin_org_id");
    if (!orgId) {
      return new Response(JSON.stringify({ error: "LinkedIn Organization ID not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getAccessToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "No LinkedIn access token. Please re-authorize." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postsData = await fetchPosts(token, orgId);
    if (!postsData || !postsData.elements) {
      return new Response(JSON.stringify({ error: "Failed to fetch posts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const posts = postsData.elements;
    let newCount = 0;
    let updatedCount = 0;

    // Get existing LinkedIn archive entries to avoid duplicates
    const { data: existing } = await supabase
      .from("archive_entries")
      .select("link")
      .eq("type", "social")
      .like("link", "%linkedin.com%");
    
    const existingLinks = new Set((existing || []).map((e: any) => e.link));

    // Fetch engagement stats
    const postUrns = posts.map((p: any) => p.id || p.urn).filter(Boolean);
    const stats = await fetchPostStats(token, postUrns);

    for (const post of posts) {
      const postId = post.id || post.urn || "";
      const postText = post.commentary || post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "";
      const createdAt = post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString();
      const postDate = createdAt.split("T")[0];
      const postLink = `https://www.linkedin.com/feed/update/${postId}`;
      
      // Extract a title from the first line or first 80 chars
      const title = postText.split("\n")[0].substring(0, 80) || "LinkedIn Post";
      
      const engagement = stats[postId] || {};

      if (existingLinks.has(postLink)) {
        // Update engagement data on existing entry
        await supabase
          .from("archive_entries")
          .update({
            performance: engagement.likes > 10 ? "high" : engagement.likes > 3 ? "medium" : null,
            description: postText.substring(0, 500) + (engagement.likes ? `\n\n---\n👍 ${engagement.likes} likes · 💬 ${engagement.comments || 0} comments` : ""),
          })
          .eq("link", postLink);
        updatedCount++;
      } else {
        // Create new archive entry
        const description = postText.substring(0, 500) + (engagement.likes ? `\n\n---\n👍 ${engagement.likes} likes · 💬 ${engagement.comments || 0} comments` : "");
        
        await supabase.from("archive_entries").insert({
          title,
          type: "social",
          description,
          date: postDate,
          link: postLink,
          tags: ["linkedin", "auto-synced"],
          campaign: null,
          performance: engagement.likes > 10 ? "high" : engagement.likes > 3 ? "medium" : null,
        });
        newCount++;
      }
    }

    await setSetting("linkedin_last_sync", new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, newPosts: newCount, updatedPosts: updatedCount, totalFetched: posts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("LinkedIn sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
