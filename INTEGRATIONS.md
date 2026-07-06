# Alps Marketing Hub — Integration Setup Guide

## Prerequisites

1. **Supabase CLI** installed: `npm install -g supabase`
2. **Supabase project** linked: `supabase link --project-ref YOUR_PROJECT_REF`

---

## 1. LinkedIn Integration

### Step 1: Create a LinkedIn Developer App

1. Go to https://www.linkedin.com/developers/apps
2. Click **Create App**
3. Fill in:
   - **App name:** Alps Marketing Hub
   - **LinkedIn Page:** Select your Alps company page
   - **App logo:** Upload the Alps logo
   - **Legal agreement:** Check the box
4. Click **Create App**

### Step 2: Request API Access

1. On your app page, go to the **Products** tab
2. Request access to:
   - **Share on LinkedIn** (for reading posts)
   - **Sign In with LinkedIn using OpenID Connect**
   - **Advertising API** (for engagement stats — optional)
3. Go to the **Auth** tab
4. Under **OAuth 2.0 scopes**, ensure you have:
   - `r_organization_social` (read company posts)
   - `r_basicprofile`
5. Under **OAuth 2.0 settings**, add this redirect URL:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sync-linkedin
   ```
6. Note your **Client ID** and **Client Secret**

### Step 3: Get Your Organization ID

1. Go to your LinkedIn Company Page
2. Click **Admin tools** → **View as member**
3. The URL will show: `linkedin.com/company/XXXXXXX/`
4. That number is your Organization ID

### Step 4: Authorize the App

Open this URL in your browser (replace the values):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sync-linkedin&scope=r_organization_social%20r_basicprofile&state=linkedin_auth
```

After authorizing, you'll get redirected with a `code` parameter. Exchange it for tokens:

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "redirect_uri=https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sync-linkedin" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

This returns an `access_token` and `refresh_token`. Save both.

### Step 5: Set Supabase Environment Variables

```bash
supabase secrets set LINKEDIN_CLIENT_ID=your_client_id
supabase secrets set LINKEDIN_CLIENT_SECRET=your_client_secret
```

### Step 6: Store Tokens in App Settings

In the Marketing Hub Admin → Integrations tab, enter:
- LinkedIn Organization ID
- Access Token (from Step 4)
- Refresh Token (from Step 4)

Or insert directly into Supabase:

```sql
INSERT INTO app_settings (key, value) VALUES
  ('linkedin_org_id', 'YOUR_ORG_ID'),
  ('linkedin_access_token', 'YOUR_ACCESS_TOKEN'),
  ('linkedin_refresh_token', 'YOUR_REFRESH_TOKEN');
```

### Step 7: Deploy the Edge Function

```bash
supabase functions deploy sync-linkedin
```

### Step 8: Set Up Scheduled Sync (Optional)

In the Supabase Dashboard → Database → Extensions, enable `pg_cron`.

Then run:

```sql
SELECT cron.schedule(
  'sync-linkedin-daily',
  '0 9 * * *',  -- Every day at 9am UTC
  $$SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/sync-linkedin',
    headers := '{"Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb
  )$$
);
```

---

## 2. Zoho Integration

### Step 1: Create a Zoho API Client

1. Go to https://api-console.zoho.eu/ (use .com if your Zoho is US-based)
2. Click **Add Client** → **Server-based Applications**
3. Fill in:
   - **Client Name:** Alps Marketing Hub
   - **Homepage URL:** Your Vercel URL
   - **Authorized Redirect URI:**
     ```
     https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sync-zoho
     ```
4. Note your **Client ID** and **Client Secret**

### Step 2: Authorize and Get Tokens

Open this URL (replace values):

```
https://accounts.zoho.eu/oauth/v2/auth?scope=ZohoCampaigns.campaign.READ,ZohoCampaigns.reports.READ,ZohoMarketingAutomation.campaign.READ&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sync-zoho&prompt=consent
```

**Important:** Use `accounts.zoho.eu` for EU, `accounts.zoho.com` for US, `accounts.zoho.co.uk` for UK.

After authorizing, exchange the code for tokens:

```bash
curl -X POST "https://accounts.zoho.eu/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/sync-zoho"
```

This returns `access_token` and `refresh_token`. Save the refresh token — it doesn't expire.

### Step 3: Set Supabase Environment Variables

```bash
supabase secrets set ZOHO_CLIENT_ID=your_client_id
supabase secrets set ZOHO_CLIENT_SECRET=your_client_secret
```

### Step 4: Store Configuration

In Admin → Integrations, enter:
- Zoho Domain (e.g. `https://accounts.zoho.eu`)
- Zoho Campaigns API Domain (e.g. `https://campaigns.zoho.eu/api`)
- Zoho MA API Domain (e.g. `https://marketingautomation.zoho.eu`)
- Refresh Token

Or insert directly:

```sql
INSERT INTO app_settings (key, value) VALUES
  ('zoho_domain', 'https://accounts.zoho.eu'),
  ('zoho_campaigns_api_domain', 'https://campaigns.zoho.eu/api'),
  ('zoho_ma_api_domain', 'https://marketingautomation.zoho.eu'),
  ('zoho_refresh_token', 'YOUR_REFRESH_TOKEN');
```

### Step 5: Deploy the Edge Function

```bash
supabase functions deploy sync-zoho
```

### Step 6: Set Up Scheduled Sync (Optional)

```sql
SELECT cron.schedule(
  'sync-zoho-daily',
  '0 9 * * *',
  $$SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/sync-zoho',
    headers := '{"Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb
  )$$
);
```

---

## Testing

After setup, use the **Sync Now** buttons in Admin → Integrations to trigger a manual sync. Check the response for any errors.

Auto-synced entries appear in the Marketing Archive tagged with `auto-synced` and either `linkedin` or `zoho-campaigns`/`zoho-ma`.

## Troubleshooting

- **401 errors:** Token expired. Check refresh token is stored correctly.
- **403 errors:** Missing API scopes. Re-authorize with the correct scopes.
- **No data returned:** Check Organization ID (LinkedIn) or API domain (Zoho).
- **Zoho region issues:** Make sure you're using the right domain (.eu, .com, .co.uk).
