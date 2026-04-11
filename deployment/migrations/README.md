# Clean Migrations for New Client Deployments

This folder contains consolidated migrations for deploying PMS to new clients.

## Files

| File | Purpose |
|------|---------|
| `00000000000000_initial_schema.sql` | All tables, indexes, RLS policies, functions, triggers |
| `00000000000001_storage_setup.sql` | Storage buckets (avatars, logo) and their policies |
| `00000000000002_seed_required_data.sql` | Required seed data: roles, estados, email templates, singletons |
| `../setup-project.sql` | Extensions, realtime publication, cron job, bucket limits |

## How to Use for New Client

### Option A: Using Supabase Dashboard SQL Editor (Recommended)

1. Go to new client's Supabase Dashboard > SQL Editor
2. **First, enable extensions:** Database > Extensions > Enable `pg_cron` and `pg_net`
3. Copy and paste the contents of `00000000000000_initial_schema.sql` → Run
4. Copy and paste `00000000000001_storage_setup.sql` → Run
5. Copy and paste `00000000000002_seed_required_data.sql` → Run
6. Copy and paste `../setup-project.sql` → Run

### Option B: Using Supabase CLI

```bash
# 1. Link to NEW client's Supabase project
supabase link --project-ref [new-client-project-ref]

# 2. Run migrations in order
supabase db execute --file deployment/migrations/00000000000000_initial_schema.sql
supabase db execute --file deployment/migrations/00000000000001_storage_setup.sql
supabase db execute --file deployment/migrations/00000000000002_seed_required_data.sql
supabase db execute --file deployment/setup-project.sql
```

## Important Notes

- **Order matters:** Run files in numerical order (00, 01, 02)
- **No sample data:** These migrations do NOT include sample patients, doctors, etc.
- **Admin user:** After running migrations, manually create the admin user (see REPLICATION-GUIDE.md)
- **pg_cron:** The cron job for email reminders requires `pg_cron` extension to be enabled
- **pg_net:** Email reminders require `pg_net` extension for HTTP requests

## Prerequisites

Before running migrations, ensure your Supabase project has:
1. `pg_cron` extension enabled (Database > Extensions)
2. `pg_net` extension enabled (Database > Extensions)

## After Running Migrations

1. Create the admin user (see REPLICATION-GUIDE.md Step 6)
2. Update cron_config with your deployment URL (see REPLICATION-GUIDE.md Step 7):
   ```sql
   UPDATE cron_config SET value = 'https://your-client-app.vercel.app' WHERE key = 'reminder_url';
   UPDATE cron_config SET value = 'your-cron-secret-key' WHERE key = 'cron_secret';
   ```
3. Update clinic_info with client's business details

## Verification Queries

After running all migrations, verify:

```sql
-- Tables exist (should be 17+ tables)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Seed data exists
SELECT COUNT(*) as roles_count FROM roles;              -- Should be 3
SELECT COUNT(*) as estados_count FROM estados_consulta; -- Should be 5
SELECT COUNT(*) as templates_count FROM email_templates; -- Should be 1
SELECT COUNT(*) as email_config_count FROM email_config; -- Should be 1
SELECT COUNT(*) as clinic_info_count FROM clinic_info;   -- Should be 1
SELECT COUNT(*) as cron_config_count FROM cron_config;   -- Should be 2

-- Data tables are empty (clean slate)
SELECT COUNT(*) as pacientes FROM pacientes;     -- Should be 0
SELECT COUNT(*) as medicos FROM medicos;         -- Should be 0
SELECT COUNT(*) as consultas FROM consultas;     -- Should be 0
SELECT COUNT(*) as obras_sociales FROM obras_sociales; -- Should be 0

-- Storage buckets exist
SELECT id, name, public FROM storage.buckets;    -- Should show 'avatars' and 'logo'

-- RLS helper functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_admin', 'is_medico', 'is_recepcionista', 'get_user_role', 'get_medico_id');
-- Should return 5 rows
```

## When to Update These Files

Update the consolidated migrations when:
- You add new tables to the reference project
- You modify RLS policies
- You add new functions or triggers
- You change column definitions

**Process:**
1. Make changes in `supabase/migrations/` as incremental migrations
2. Test on reference project
3. Regenerate consolidated schema by reviewing all migrations
4. Test on a fresh Supabase project

## Schema Overview

### Core Tables
- `roles` - User roles (Administracion, Odontologo)
- `usuarios_pms` - User profiles linked to auth.users
- `pacientes` - Patient records
- `medicos` - Doctor profiles
- `consultas` - Appointments/consultations
- `estados_consulta` - Appointment status definitions
- `obras_sociales` - Insurance providers
- `medicos_obras_sociales` - Doctor-insurance relationships
- `medicos_horarios` - Doctor weekly schedules
- `medicos_parametros_agenda` - Doctor scheduling parameters

### Supporting Tables
- `consultas_transferencias` - Appointment transfer history
- `booking_tokens` - WhatsApp booking tokens

### Email System Tables
- `email_config` - SMTP configuration (singleton)
- `email_reminders` - Scheduled email tracking
- `email_templates` - Customizable email messages (singleton)

### Configuration Tables
- `clinic_info` - Business information (singleton)
- `cron_config` - pg_cron job configuration
