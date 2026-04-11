# TropicTask — Deployment Guide
## GoDaddy Domain + Netlify + Supabase + Stripe

---

## Step 1: Set Up Supabase (Database)

### 1.1 Create Project
1. Go to **[supabase.com](https://supabase.com)** → New Project
2. Name: `tropictask-prod`
3. Set a strong database password (save it)
4. Region: **US East** (closest to Mississippi)
5. Wait for project to provision (~2 min)

### 1.2 Run Database Migration
1. Go to **SQL Editor** in the Supabase Dashboard
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** — this creates all tables, indexes, RLS policies, triggers

### 1.3 Verify Tables
Go to **Table Editor** — you should see:
- profiles, properties, work_orders, components
- payment_requests, transactions, invite_codes
- reviews, documents, wo_stage_history

### 1.4 Configure Auth
1. Go to **Authentication → Providers**
2. Enable **Email** (already on by default)
3. Optional: Enable **Google OAuth**
   - Create OAuth credentials at console.cloud.google.com
   - Add Client ID + Secret in Supabase

### 1.5 Get Your Keys
Go to **Settings → API**:
- Copy `Project URL` → this is your `VITE_SUPABASE_URL`
- Copy `anon public` key → this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Set Up Stripe (Payments)

### 2.1 Create Account
1. Go to **[stripe.com](https://stripe.com)** → Sign Up
2. Complete business verification

### 2.2 Get Test Keys
1. Go to **Developers → API Keys**
2. Copy the **Publishable key** (`pk_test_...`) → `VITE_STRIPE_PUBLISHABLE_KEY`
3. Copy the **Secret key** (`sk_test_...`) → for backend only (Edge Functions)

### 2.3 Set Up Webhook (after Netlify deploy)
1. Go to **Developers → Webhooks → Add Endpoint**
2. URL: `https://your-supabase-url.supabase.co/functions/v1/stripe-webhook`
3. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copy **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 3: Deploy to Netlify

### 3.1 Push to GitHub
```bash
cd tropictask-app
git init
git add .
git commit -m "Initial commit — TropicTask Phase 1"
git remote add origin https://github.com/YOUR_USER/tropictask.git
git push -u origin main
```

### 3.2 Connect to Netlify
1. Go to **[netlify.com](https://netlify.com)** → Add New Site → Import from Git
2. Select your GitHub repo
3. Build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Deploy**

### 3.3 Set Environment Variables
Go to **Site Settings → Environment Variables** and add:

| Key                          | Value                      |
|------------------------------|----------------------------|
| `VITE_SUPABASE_URL`         | `https://xxx.supabase.co`  |
| `VITE_SUPABASE_ANON_KEY`    | `eyJhbGciOi...`            |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...`            |
| `VITE_APP_URL`              | `https://tropictask.com`   |

Then **redeploy** (Deploys → Trigger Deploy → Deploy Site).

---

## Step 4: Connect GoDaddy Domain

### 4.1 In Netlify
1. Go to **Site Settings → Domain Management → Add Custom Domain**
2. Enter your domain: `tropictask.com`
3. Also add: `www.tropictask.com`
4. Netlify will show you DNS records to configure

### 4.2 In GoDaddy
1. Log into **GoDaddy** → My Domains → your domain → **DNS**
2. **Option A — Netlify DNS (Recommended)**:
   - Change nameservers to Netlify's:
     ```
     dns1.p05.nsone.net
     dns2.p05.nsone.net
     dns3.p05.nsone.net
     dns4.p05.nsone.net
     ```
   - (Netlify gives you specific nameservers — use those)

3. **Option B — Keep GoDaddy DNS**:
   - Add an **A record**:
     - Type: `A`
     - Name: `@`
     - Value: `75.2.60.5` (Netlify's load balancer)
   - Add a **CNAME record**:
     - Type: `CNAME`
     - Name: `www`
     - Value: `your-site-name.netlify.app`

### 4.3 Enable HTTPS
1. Back in Netlify → Domain Management
2. Click **Verify DNS configuration**
3. Once verified, click **Provision SSL Certificate**
4. Netlify auto-provisions a free Let's Encrypt certificate
5. Enable **Force HTTPS**

### 4.4 Wait for Propagation
DNS changes take 15 min to 48 hours. Usually under 1 hour.

Test: `dig tropictask.com` should resolve to Netlify's IP.

---

## Step 5: Post-Deploy Verification

### Checklist
- [ ] `https://tropictask.com` loads the landing page
- [ ] `https://www.tropictask.com` redirects to `https://tropictask.com`
- [ ] Sign up creates a user in Supabase Auth
- [ ] Profile is auto-created via trigger
- [ ] Sign in works with email/password
- [ ] Properties CRUD works (check Table Editor)
- [ ] Work orders create and stage advancement works
- [ ] RLS policies block cross-user data access
- [ ] Stripe test payment goes through (use card `4242 4242 4242 4242`)

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GoDaddy    │────→│   Netlify    │────→│   Supabase   │
│   (Domain)   │ DNS │   (Hosting)  │ API │  (Database)  │
│              │     │   CDN + Edge │     │  Auth + RLS  │
└──────────────┘     └──────────────┘     │  Realtime    │
                                          │  Storage     │
                                          └──────┬───────┘
                                                 │
                                          ┌──────┴───────┐
                                          │    Stripe    │
                                          │  (Payments)  │
                                          └──────────────┘
```

### Data Flow
1. User visits `tropictask.com` → Netlify serves React SPA
2. React app calls Supabase for auth + data
3. Supabase RLS ensures users only see their data
4. Payment actions call Stripe via Supabase Edge Functions
5. Stripe webhooks hit Supabase to update payment status
6. Supabase Realtime pushes work order updates live

---

## Scaling Notes

### Current Setup Handles
- **Supabase Free Tier**: 500MB database, 50K auth users, 2GB storage
- **Supabase Pro ($25/mo)**: 8GB database, 100K auth users, 100GB storage
- **Netlify Free Tier**: 100GB bandwidth, 300 build minutes
- **Netlify Pro ($19/mo)**: 1TB bandwidth, unlimited builds

### When to Upgrade
- **100+ properties**: Move to Supabase Pro for database headroom
- **1000+ users**: Add connection pooling (Supabase enables pgBouncer)
- **Heavy file uploads**: Increase Supabase Storage tier
- **Payment volume**: Stripe scales automatically (no action needed)

### Performance Optimizations (Future)
- Add `react-query` for client-side caching
- Implement pagination on property/WO lists
- Add database connection pooling
- Set up Netlify Edge Functions for API routes
- Enable Supabase database backups
