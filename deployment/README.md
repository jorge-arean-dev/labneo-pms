# PMS Deployment Kit

**Version:** 1.1
**Last Updated:** 2025-01-29

---

## AI Companion Instructions

You are helping deploy PMS (Patient Management System) for a new client. Read this section first to understand the context.

### What is PMS?
- A **Patient Management System** for clinics (dermatology, spa, vet, etc.)
- Built with **Next.js 14 + Supabase + Tailwind CSS**
- Features: patient records, appointment scheduling, medical consultations
- Multi-tenant: each client gets isolated Supabase project + Vercel deployment

### Your Role
Guide the user through the 11-step deployment process. You have access to:
- This README (overview)
- `REPLICATION-GUIDE.md` (detailed step-by-step instructions)
- SQL files in `migrations/` folder
- `config.toml` and `setup-project.sql`

### Variables to Collect from User

Gather these as you progress through the steps:

| Variable | When Needed | Example |
|----------|-------------|---------|
| `client_name` | Step 1 | "wellness-spa" |
| `supabase_project_ref` | Step 1 | "abcdefghijklmnop" |
| `supabase_url` | Step 1 | "https://xxx.supabase.co" |
| `supabase_anon_key` | Step 1 | "eyJ..." |
| `supabase_service_role_key` | Step 1 | "eyJ..." |
| `vercel_url` | Step 8 | "https://client-pms.vercel.app" |
| `admin_email` | Step 6 | "admin@client.com" |
| `admin_name` | Step 6 | "María García" |
| `clinic_name` | Step 7 | "Wellness Spa Center" |
| `clinic_phone` | Step 7 | "11-4567-8900" |
| `clinic_address` | Step 7 | "Av. Example 1234, Buenos Aires" |

### Placeholders to Replace

When running SQL or editing config, replace these placeholders:

| Placeholder | Replace With |
|-------------|--------------|
| `[client-name]` | Client name in kebab-case |
| `[new-client-project-ref]` | Supabase project reference ID |
| `[USER-UID-FROM-STEP-6.1]` | Auth user UUID from Supabase |
| `[Admin First Name]` | Admin's first name |
| `[Admin Last Name]` | Admin's last name |
| `[admin@email.com]` | Admin's email address |
| `https://your-client-app.vercel.app` | Actual Vercel deployment URL |
| `[new-random-secret-64-chars]` | Generate with: `openssl rand -hex 32` |

### Decision Points

| If... | Then... |
|-------|---------|
| No client-specific code changes needed | Use Step 2 Option A (shared repo via Vercel) - simpler |
| Need client-specific customizations | Use Step 2 Option B (separate repo per client) |
| Client uses different terminology (spa, vet) | Do Step 3 (Configure Terminology) - requires Option B |
| Client doesn't need email reminders | Skip email_config setup in Step 7 |
| Client has custom domain | Do Step 8.3 (Configure Custom Domain) |
| `supabase config push` fails | Skip Step 4, configure auth manually in Step 9 |

### Success Criteria

After completing all steps, verify:

```sql
-- Run in Supabase SQL Editor
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
  (SELECT COUNT(*) FROM roles) as roles,
  (SELECT COUNT(*) FROM estados_consulta) as estados,
  (SELECT COUNT(*) FROM usuarios_pms) as users,
  (SELECT COUNT(*) FROM cron.job WHERE jobname = 'send-appointment-reminders') as cron_jobs;
```

Expected: `tables >= 17`, `roles = 3`, `estados = 5`, `users >= 1`, `cron_jobs = 1`

### Common Issues

| Error | Solution |
|-------|----------|
| "pg_cron extension not found" | Enable in Dashboard > Database > Extensions first |
| "relation usuarios_pms does not exist" | Run migrations in order (schema first) |
| "RLS policy violation" | User missing from usuarios_pms or wrong rol_id |
| "Invalid API key" | Check environment variables in Vercel |
| Admin can't login | Verify user exists in both auth.users AND usuarios_pms |

### Step-by-Step Reference

For detailed instructions on each step, read the corresponding section in `REPLICATION-GUIDE.md`:
- Steps 1-3: Project setup and preparation
- Steps 4-5: Database configuration (config.toml + SQL)
- Step 6: Admin user creation
- Step 7: Client-specific settings (cron, clinic info)
- Steps 8-9: Vercel deployment and auth URLs
- Steps 10-11: Verification

---

## Quick Start

| Task | Document |
|------|----------|
| **Deploy for a new client** | [REPLICATION-GUIDE.md](./REPLICATION-GUIDE.md) |
| **Understand migrations** | [migrations-inventory.md](./migrations-inventory.md) |

---

## Folder Structure

```
deployment/
├── README.md                           # This file
├── REPLICATION-GUIDE.md                # 11-step deployment guide
├── config.toml                         # Supabase project configuration
├── setup-project.sql                   # Extensions, realtime, cron setup
├── migrations-inventory.md             # Reference: all original migrations
│
└── migrations/                         # Clean migrations for new clients
    ├── README.md
    ├── 00000000000000_initial_schema.sql       # All tables, RLS, functions
    ├── 00000000000001_storage_setup.sql        # Storage buckets & policies
    └── 00000000000002_seed_required_data.sql   # Roles, estados, singletons
```

---

## What Each File Does

| File | Purpose | When to Use |
|------|---------|-------------|
| **config.toml** | Project-level settings (auth URLs, JWT, API config) | `supabase config push` |
| **setup-project.sql** | Enables extensions, configures realtime, schedules cron | After migrations |
| **00000000000000_initial_schema.sql** | Creates all 17 tables, RLS policies, functions, triggers | First |
| **00000000000001_storage_setup.sql** | Creates avatars & logo buckets with policies | Second |
| **00000000000002_seed_required_data.sql** | Seeds roles, estados, email templates, singletons | Third |

---

## Deployment Overview (11 Steps)

| Step | What | How |
|------|------|-----|
| 1 | Create Supabase Project | Dashboard |
| 2 | Prepare Codebase | Clone template |
| 3 | Configure Terminology | Edit code (optional) |
| 4 | **Push config.toml** | `supabase config push` |
| 5 | **Run SQL Migrations** | SQL Editor or CLI |
| 6 | Create Admin User | Dashboard + SQL |
| 7 | Configure Client Settings | SQL (cron_config, clinic_info) |
| 8 | Deploy to Vercel | Vercel CLI/Dashboard |
| 9 | Configure Auth URLs | Supabase Dashboard |
| 10 | Verify Storage | Dashboard |
| 11 | Final Verification | Manual testing |

**Estimated time:** 30-45 minutes per client

See [REPLICATION-GUIDE.md](./REPLICATION-GUIDE.md) for detailed instructions.

---

## What Gets Configured

### Via config.toml (Step 4)
- Auth site URL and redirect URLs
- JWT expiry settings
- Email signup/confirmation settings
- API settings (schemas, max rows)
- Database pooler settings

### Via SQL Migrations (Step 5)
- All database tables (17 tables)
- Row Level Security policies
- Helper functions (is_admin, is_medico, etc.)
- Triggers (updated_at, audit fields)
- Storage buckets and policies

### Via setup-project.sql (Step 5)
- pg_cron extension (email reminders)
- pg_net extension (HTTP from cron)
- Realtime publication (consultas table)
- Cron job schedule (every 30 min)
- Storage bucket file limits

### Manual Configuration Required (Steps 7, 9)
- cron_config table (Vercel URL, secret)
- clinic_info table (business details)
- email_config table (SMTP credentials)
- OAuth providers (if using Google, etc.)

---

## For Each New Client

### Quick Commands

```bash
# 1. Link to client's new Supabase project
supabase link --project-ref [client-project-ref]

# 2. Push project configuration
supabase config push

# 3. Run migrations (in SQL Editor or via CLI)
supabase db execute --file deployment/migrations/00000000000000_initial_schema.sql
supabase db execute --file deployment/migrations/00000000000001_storage_setup.sql
supabase db execute --file deployment/migrations/00000000000002_seed_required_data.sql
supabase db execute --file deployment/setup-project.sql

# 4. Follow REPLICATION-GUIDE.md for remaining steps (admin user, Vercel, etc.)
```

---

## Reference Configuration (from pms-database)

These values were captured from the reference project:

### Extensions Enabled
| Extension | Purpose |
|-----------|---------|
| pg_cron | Email reminder scheduling |
| pg_net | HTTP calls from cron |
| pgcrypto | Encryption functions |
| uuid-ossp | UUID generation |
| pg_graphql | GraphQL API |

### Realtime
- Table: `public.consultas` (live appointment updates)

### Cron Job
- Schedule: `*/30 * * * *` (every 30 minutes)
- Command: `SELECT send_appointment_reminders()`

### Storage Buckets
| Bucket | Public | Max Size | Allowed Types |
|--------|--------|----------|---------------|
| avatars | No | 5MB | jpeg, jpg, png, webp, gif |
| logo | Yes | 2MB | jpeg, jpg, png |

---

## Troubleshooting

### "pg_cron extension not found"
Enable pg_cron in Supabase Dashboard > Database > Extensions before running setup-project.sql

### "config push failed"
Ensure you're linked to the correct project: `supabase projects list`

### "RLS policy errors"
User must exist in `usuarios_pms` table with valid `rol_id`

See REPLICATION-GUIDE.md Troubleshooting section for more.
