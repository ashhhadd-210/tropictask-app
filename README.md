# TropicTask — Property Management Platform

> Phase 1 MVP — Frontend + Backend-Ready Architecture

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | React 18 + Vite                                         |
| Hosting    | Netlify (static deploy + edge functions)                |
| Database   | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Payments   | Stripe (Payment Intents + Subscriptions)                |
| Styling    | Custom CSS (Playfair Display + Inter)                   |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Start development server
npm run dev
```

The app runs in **local mode** with mock data until you configure Supabase.

---

## Project Structure

```
tropictask-app/
├── index.html              # Entry HTML
├── vite.config.js          # Vite config
├── package.json            # Dependencies
├── netlify.toml            # Netlify SPA routing + deploy config
├── .env.example            # Environment variables template
│
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main app — router, context, all pages
    │
    ├── lib/
    │   ├── supabase.js     # Supabase client + all DB query helpers
    │   ├── seedData.js     # Mock data (matches Supabase schema)
    │   └── constants.js    # Stage config, role config, helpers
    │
    └── styles/
        └── globals.css     # All styles (brand tokens + components)
```

---

## Demo Accounts (Local Mode)

| Role       | Email               | Password |
|------------|---------------------|----------|
| Manager    | jane@smithpm.com    | pass123  |
| Owner      | robert@email.com    | pass123  |
| Contractor | mike@plumbing.com   | pass123  |
| Tenant     | sarah@email.com     | pass123  |

---

## Features (Phase 1)

### ✅ Role System
- 4 roles: Manager, Owner, Contractor, Tenant
- Multi-role support (user can hold Manager + Owner)
- Role tab bar for switching views
- Role-specific navigation and data scoping

### ✅ Properties
- Property list with search/filter
- Add property modal
- Property detail slide panel with components
- Owner assignment

### ✅ Work Orders — 9-Stage Lifecycle
| Stage | Label                | Who Advances     |
|-------|----------------------|------------------|
| 1     | Submitted            | Manager          |
| 2     | Contractors Notified | Contractor       |
| 3     | Contractor Accepted  | Manager → Owner  |
| 4     | Owner Approval       | Owner / Manager  |
| 5     | Scheduled            | Contractor       |
| 6     | In Progress          | Contractor       |
| 7     | Complete             | Owner / Manager  |
| 8     | Paid                 | Manager          |
| 9     | Closed               | Terminal         |

### ✅ Payments
- Create payment requests (rent, maintenance, fees)
- One-time and recurring frequency
- Mark payments as paid
- Status tracking (pending, overdue, paid)

### ✅ Other Pages
- Dashboard (role-specific stats + activity)
- Contractors (list + reviews)
- Tenants (list + property link)
- Calendar (read-only scheduled visits)
- Reports + Financials
- Account settings
- Invite flows (tenant, owner, contractor)

---

## Connecting Supabase (Backend)

### 1. Create Supabase Project
Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Set Environment Variables
```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations
Create tables matching the schema in `src/lib/seedData.js`:
- `profiles` (extends auth.users)
- `properties`
- `work_orders`
- `payment_requests`
- `transactions`
- `components`
- `reviews`
- `documents`
- `invite_codes`

### 4. Enable Row-Level Security
See the developer notes document for all RLS policies.

### 5. Replace Local Calls
The `src/lib/supabase.js` file has all query helpers ready:
- `fetchProperties()`, `fetchWorkOrders()`, `fetchPayments()`
- `createWorkOrder()`, `updateWorkOrderStage()`
- `signIn()`, `signUp()`, `signOut()`
- `subscribeToWorkOrders()` (realtime)

Replace `localStorage` reads in `App.jsx` with these Supabase calls.

---

## Deploy to Netlify

```bash
# Build for production
npm run build

# Deploy (with Netlify CLI)
npx netlify deploy --prod --dir=dist
```

Or connect your GitHub repo to Netlify for automatic deploys.

The `netlify.toml` is already configured for SPA routing.

---

## Design System

| Token               | Value                               |
|----------------------|-------------------------------------|
| Primary (Forest)     | `#005357`                           |
| Accent (Blue)        | `#97D1DC`                           |
| Background (Beige)   | `#FFFBF8`                           |
| Display Font         | Playfair Display (headings)         |
| Body Font            | Inter (all UI text)                 |
| Border Radius        | 8px (sm), 16px (md), 24px (lg)     |

---

## Next Steps (Phase 2)

- [ ] Supabase Auth integration
- [ ] Database migration scripts
- [ ] Stripe Payment Intent flow
- [ ] Stripe Subscription flow
- [ ] Email notifications (Postmark/SendGrid)
- [ ] Invite code generation + validation
- [ ] File uploads (Supabase Storage)
- [ ] Realtime work order updates

---

**Confidential — TropicTask v1.0**
