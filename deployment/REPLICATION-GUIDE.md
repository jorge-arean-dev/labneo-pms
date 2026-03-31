# PMS App Replication Guide

**Version:** 1.0
**Last Updated:** 2025-01-29
**Status:** Ready for Use

---

## Overview

This guide provides step-by-step instructions to replicate the Patient Management System (PMS) for a new client. Each replica will have:

- Fresh Supabase project (isolated database, auth, storage)
- Fresh Vercel deployment
- No user data from the original
- Fixed seed data (roles, estados, email templates)
- Configurable terminology for different business domains

---

## Prerequisites

Before starting, ensure you have:

1. **Accounts & Access**
   - [ ] Supabase account with organization access
   - [ ] Vercel account with team access (if applicable)
   - [ ] GitHub account (for repository management)

2. **CLI Tools Installed**
   - [ ] Node.js 18+ and pnpm
   - [ ] Supabase CLI (`npm install -g supabase`)
   - [ ] Vercel CLI (`npm install -g vercel`)
   - [ ] Git

3. **Template Repository**
   - [ ] Access to the PMS template repository

---

## Replication Steps

### Step 1: Create New Supabase Project

#### 1.1 Create the Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in details:
   - **Name:** `[client-name]-pms` (e.g., `wellness-spa-pms`)
   - **Database Password:** Generate and save securely
   - **Region:** Choose closest to client location
4. Wait for project to initialize (~2 minutes)

#### 1.2 Collect Credentials

From your new Supabase project, collect:

| Variable | Where to Find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings > API > anon public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same as anon key (or Settings > API > publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings > API > service_role (keep secret!) |

**Save these in a secure location - you'll need them later.**

---

### Step 2: Prepare the Codebase

Choose one of the following approaches:

#### Option A: Shared Repo via Vercel (Simpler - Recommended)

Use this if you don't need client-specific code changes. All clients share the same codebase, differentiated only by environment variables.

1. **Skip to Step 8** (Deploy to Vercel) when ready
2. In Vercel, click "Import" on the existing `pms` repository
3. Give the project a unique name (e.g., `[client-name]-pms`)
4. Configure environment variables to point to the **new client's** Supabase project

**Pros:**
- Simpler setup, no repo management
- All clients automatically get code updates
- One codebase to maintain

**Cons:**
- Code changes affect all client deployments
- Can't customize code per client

**Note:** With this approach, you don't need Steps 2.2 or 2.3 below. Environment variables are configured directly in Vercel (Step 8).

---

#### Option B: Separate Repo per Client (More Isolation)

Use this if you need client-specific code changes, independent deployments, or different versions per client.

##### 2.1 Clone the Template

```bash
# Option 1: Create a new repository from template (recommended)
# On GitHub: Use "Use this template" button if available

# Option 2: Clone and reinitialize
git clone https://github.com/jorge-arean-dev/pms.git [client-name]-pms
cd [client-name]-pms

# Remove git history and start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit from PMS template v1.0"
```

##### 2.2 Install Dependencies

```bash
pnpm install
```

##### 2.3 Configure Environment Variables

Create `.env.local` file:

```bash
# Copy the template
cp .env.template .env.local

# Edit with your values
```

**.env.local contents:**

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Security Keys (Required)
# Generate with: openssl rand -hex 32
EMAIL_ENCRYPTION_KEY=your-64-char-hex-string
# Generate with: openssl rand -hex 16
CRON_SECRET=your-32-char-hex-string

# Optional
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# N8N_API_KEY=your-n8n-api-key
# SMTP_FROM=noreply@example.com
```

---

### Step 3: Configure Terminology (Optional)

If the client uses different terminology (e.g., "Mascota" instead of "Paciente"), update the terminology config before deployment.

#### 3.1 Create Terminology Config

Create file `config/terminology.ts`:

```typescript
/**
 * Terminology Configuration
 *
 * This file controls the labels used throughout the application.
 * Modify these values to adapt the app for different business domains.
 *
 * Examples:
 * - Clinic: paciente, médico, consulta
 * - Vet: mascota, veterinario, cita
 * - Spa: cliente, masajista, sesión
 */

export const terminology = {
  // Main entities
  patient: {
    singular: "Paciente",
    plural: "Pacientes",
    article: "el",  // el paciente
  },
  doctor: {
    singular: "Médico",
    plural: "Médicos",
    article: "el",
  },
  appointment: {
    singular: "Consulta",
    plural: "Consultas",
    article: "la",
  },
  receptionist: {
    singular: "Recepcionista",
    plural: "Recepcionistas",
    article: "el/la",
  },
  insurance: {
    singular: "Obra Social",
    plural: "Obras Sociales",
    article: "la",
  },

  // Domain-specific labels
  domain: {
    name: "Clínica",  // e.g., "Spa", "Veterinaria"
    specialty: "Dermatología",  // e.g., "Masajes", "Medicina General"
  },

  // Action labels
  actions: {
    newAppointment: "Nueva Consulta",
    editPatient: "Editar Paciente",
    viewHistory: "Ver Historial",
  },
} as const

export type Terminology = typeof terminology
```

#### 3.2 Update High-Visibility Labels

Replace hardcoded labels in these key files (search & replace):

| File | Labels to Update |
|------|------------------|
| `components/app-sidebar.tsx` | Navigation labels |
| `app/pacientes/page.tsx` | Page title |
| `app/consultas/page.tsx` | Page title |
| `app/medicos/page.tsx` | Page title |
| Table column headers | Various |

**Note:** For Phase 1, this is a manual search-and-replace process. Future versions will automate this via the terminology config.

---

### Step 4: Push Project Configuration (Optional but Recommended)

The `config.toml` file contains project-level settings (auth, API, storage) that can be pushed to configure the new project.

#### 4.1 Update config.toml for This Client

Edit `deployment/config.toml` and update:

```toml
[project]
id = "client-name-pms"  # Unique identifier

[auth]
site_url = "https://client-app.vercel.app"  # Will update after Vercel deploy

additional_redirect_urls = [
  "https://client-app.vercel.app/**",
  "http://localhost:3000/**"
]
```

#### 4.2 Push Configuration

```bash
# Link to the new client's project
supabase link --project-ref [new-client-project-ref]

# Push the configuration
supabase config push
```

**Note:** You may need to update `site_url` again after Step 7 (Vercel deployment) once you have the final URL.

---

### Step 5: Run Database Migrations

We use **consolidated clean migrations** (4 files) instead of the 49+ incremental migrations. This ensures a clean database with no sample data.

#### 5.1 Enable Required Extensions First

Before running migrations, enable these extensions in Supabase Dashboard > Database > Extensions:

| Extension | Required For |
|-----------|--------------|
| `pg_cron` | Email reminder scheduling |
| `pg_net` | HTTP calls from cron jobs |

**Note:** `pgcrypto`, `uuid-ossp`, and `pg_graphql` are usually enabled by default.

#### 5.2 Run Clean Migrations on New Client Project

**Option A: Using Supabase Dashboard SQL Editor (Recommended)**

1. Go to Supabase Dashboard > SQL Editor
2. Run each file in order (copy-paste contents):
   - `deployment/migrations/00000000000000_initial_schema.sql`
   - `deployment/migrations/00000000000001_storage_setup.sql`
   - `deployment/migrations/00000000000002_seed_required_data.sql`
   - `deployment/setup-project.sql`

**Option B: Using Supabase CLI**

```bash
# Link to the NEW CLIENT's Supabase project
supabase link --project-ref [new-client-project-ref]

# Run the migrations in order
supabase db execute --file deployment/migrations/00000000000000_initial_schema.sql
supabase db execute --file deployment/migrations/00000000000001_storage_setup.sql
supabase db execute --file deployment/migrations/00000000000002_seed_required_data.sql
supabase db execute --file deployment/setup-project.sql
```

#### 5.3 What Each Migration Does

| File | Purpose |
|------|---------|
| `00000000000000_initial_schema.sql` | All tables, RLS policies, functions, triggers |
| `00000000000001_storage_setup.sql` | Storage buckets (avatars, logo) and policies |
| `00000000000002_seed_required_data.sql` | Roles, estados, email templates, singleton configs |
| `setup-project.sql` | Extensions, realtime, cron job, bucket limits |

**The setup-project.sql configures:**
- Enables `pg_cron` and `pg_net` extensions
- Adds `consultas` table to realtime publication
- Schedules email reminder cron job (every 30 minutes)
- Sets storage bucket file limits and MIME types

#### 5.4 Verify Migration Success

Run this verification query in SQL Editor:

```sql
-- Tables exist (should be 17+ tables)
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

-- Seed data
SELECT 'roles' as table_name, COUNT(*) as count FROM roles
UNION ALL SELECT 'estados_consulta', COUNT(*) FROM estados_consulta
UNION ALL SELECT 'email_templates', COUNT(*) FROM email_templates
UNION ALL SELECT 'email_config', COUNT(*) FROM email_config
UNION ALL SELECT 'clinic_info', COUNT(*) FROM clinic_info;

-- Extensions enabled
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- Cron job scheduled
SELECT jobname, schedule, active FROM cron.job;

-- Realtime configured
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**Expected results:**
- 17+ tables
- 3 roles, 5 estados, 1 email_template, 1 email_config, 1 clinic_info
- `pg_cron` and `pg_net` extensions
- `send-appointment-reminders` cron job (active)
- `consultas` in realtime publication

---

### Step 6: Create Initial Admin User

The first user must be created manually in Supabase.

#### 6.1 Create Auth User

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Fill in:
   - **Email:** Admin's email address
   - **Password:** Temporary password (admin will change on first login)
   - **Auto Confirm User:** Check this box
4. Click "Create user"
5. **Copy the User UID** (you'll need it for the next step)

#### 6.2 Create usuarios_pms Entry

Go to SQL Editor and run:

```sql
-- Replace the values with actual data
INSERT INTO public.usuarios_pms (
    id,
    nombre,
    apellido,
    email,
    rol_id,
    created_at,
    updated_at
)
SELECT
    '[USER-UID-FROM-STEP-5.1]'::uuid,
    '[Admin First Name]',
    '[Admin Last Name]',
    '[admin@email.com]',
    (SELECT id FROM public.roles WHERE nombre = 'Administrador'),
    NOW(),
    NOW();
```

**Example:**
```sql
INSERT INTO public.usuarios_pms (
    id,
    nombre,
    apellido,
    email,
    rol_id,
    created_at,
    updated_at
)
SELECT
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'María',
    'García',
    'maria.garcia@wellness-spa.com',
    (SELECT id FROM public.roles WHERE nombre = 'Administrador'),
    NOW(),
    NOW();
```

#### 6.3 Verify Admin Access

1. Run `pnpm dev` locally
2. Navigate to `http://localhost:3000`
3. Login with the admin credentials
4. Verify you can access all admin features

---

### Step 7: Configure Client-Specific Settings

After migrations and admin user, configure these client-specific settings.

#### 7.1 Update Cron Config (Required for Email Reminders)

Run in SQL Editor:

```sql
-- Update with the client's Vercel deployment URL
UPDATE cron_config SET value = 'https://[client-app].vercel.app' WHERE key = 'reminder_url';

-- Generate a new secret for this client (use a random string generator)
UPDATE cron_config SET value = '[new-random-secret-64-chars]' WHERE key = 'cron_secret';
```

**Important:** The `cron_secret` must also be added to Vercel environment variables as `CRON_SECRET`.

#### 7.2 Update Clinic Info

Run in SQL Editor:

```sql
UPDATE clinic_info SET
  nombre = '[Client Business Name]',
  telefono = '[Phone Number]',
  email = '[contact@client.com]',
  direccion = '[Street Address]',
  ciudad = '[City]',
  provincia = '[Province/State]'
WHERE id = (SELECT id FROM clinic_info LIMIT 1);
```

#### 7.3 Configure Email (Optional)

If client wants email reminders:

```sql
UPDATE email_config SET
  enabled = true,
  smtp_user = '[client-smtp-email]',
  smtp_password_encrypted = '[encrypted-app-password]',
  sender_name = '[Client Business Name]'
WHERE id = (SELECT id FROM email_config LIMIT 1);
```

**Note:** The SMTP password must be encrypted. This is typically done through the app's Settings > Email Configuration interface after deployment.

---

### Step 8: Deploy to Vercel

#### 8.1 Create Vercel Project

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import from Git repository
4. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `pnpm build`
   - **Install Command:** `pnpm install`

**Option B: Via CLI**

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

#### 8.2 Configure Environment Variables

In Vercel Dashboard > Project Settings > Environment Variables:

**Required Variables:**

| Variable | Value | How to Get |
|----------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[ref].supabase.co` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (secret!) | Supabase > Settings > API |
| `EMAIL_ENCRYPTION_KEY` | 64-char hex string | `openssl rand -hex 32` |
| `CRON_SECRET` | 32-char hex string | `openssl rand -hex 16` |

**Optional Variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Newer key format (optional) |
| `N8N_API_KEY` | n8n API key | WhatsApp bot integration |

**Auto-added by Vercel-Supabase Integration:**

If you connect Supabase via Vercel's integration (Project Settings > Integrations > Supabase), these are added automatically:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PASSWORD`

**Important Notes:**
- The `CRON_SECRET` value must also be set in the database's `cron_config` table (Step 7.1)
- Generate unique secrets for each client deployment - never reuse between clients

**Important:** After adding environment variables, redeploy:

```bash
vercel --prod
```

#### 8.3 Configure Custom Domain (Optional)

1. Go to Vercel > Project > Settings > Domains
2. Add custom domain (e.g., `app.wellness-spa.com`)
3. Configure DNS as instructed by Vercel

---

### Step 9: Configure Supabase Authentication

#### 9.1 Update Auth Settings

Go to Supabase Dashboard > Authentication > URL Configuration:

| Setting | Value |
|---------|-------|
| Site URL | `https://[your-vercel-domain].vercel.app` |
| Redirect URLs | `https://[your-vercel-domain].vercel.app/**` |

If using custom domain:
| Setting | Value |
|---------|-------|
| Site URL | `https://app.clientdomain.com` |
| Redirect URLs | `https://app.clientdomain.com/**` |

#### 9.2 Configure Email Templates

Go to Supabase Dashboard > Authentication > Email Templates:

Update the following templates with client branding:
- Confirm signup
- Invite user
- Magic Link
- Change Email Address
- Reset Password

**Template Variables Available:**
- `{{ .SiteURL }}` - Your site URL
- `{{ .Token }}` - Auth token
- `{{ .TokenHash }}` - Hashed token
- `{{ .RedirectTo }}` - Redirect URL

---

### Step 10: Configure Storage Buckets

The migrations create storage buckets automatically, but verify they exist:

1. Go to Supabase Dashboard > Storage
2. Verify buckets exist:
   - [ ] `avatars` - User profile pictures
   - [ ] `logos` - Clinic logos

If missing, create them manually with public access enabled.

---

### Step 11: Final Verification Checklist

Run through this checklist to verify the deployment:

#### Authentication
- [ ] Can create new user accounts (admin function)
- [ ] Can login with email/password
- [ ] Password reset flow works
- [ ] Logout clears session properly

#### Core Features
- [ ] Can view empty pacientes list
- [ ] Can create new paciente
- [ ] Can view empty consultas list
- [ ] Can create new consulta
- [ ] Can manage médicos (admin)
- [ ] Can manage obras sociales (admin)
- [ ] Can manage recepcionistas (admin)

#### Permissions
- [ ] Recepcionista cannot see medical history
- [ ] Médico can see and edit medical records
- [ ] Admin has full access

#### Email (if configured)
- [ ] Appointment confirmation emails send
- [ ] Reminder emails send
- [ ] Cancellation emails send

---

## Post-Deployment Configuration

After the initial deployment, the admin should configure:

### Clinic Information

Go to Settings > Información de la Clínica:
- [ ] Clinic name
- [ ] Address
- [ ] Phone number
- [ ] Logo upload

### Email Configuration

If using email features, configure SMTP:
- Add SMTP environment variables to Vercel
- Test email sending from the app

### Initial Data Entry

The admin should then:
1. Add obras sociales (insurance providers)
2. Add médicos (doctors)
3. Configure médico schedules (horarios)
4. Add recepcionistas (if needed)
5. Begin adding pacientes

---

## Troubleshooting

### Common Issues

#### "Invalid API key" Error
- Verify environment variables are set correctly in Vercel
- Check that you're using the correct project's keys
- Redeploy after adding environment variables

#### RLS Policy Errors
- Ensure the user has an entry in `usuarios_pms` table
- Verify the rol_id points to a valid role

#### Login Redirect Issues
- Check Supabase > Authentication > URL Configuration
- Ensure redirect URLs include your domain

#### Migrations Fail
- Check Supabase CLI is linked to correct project
- Review migration files for syntax errors
- Check for dependent objects that may be missing

### Getting Help

- Review the main CLAUDE.md for architectural patterns
- Check Supabase documentation for auth issues
- Check Vercel documentation for deployment issues

---

## Quick Reference

### Environment Variables Template

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### Supabase CLI Commands

```bash
# Login
supabase login

# Link to project
supabase link --project-ref [ref]

# Push migrations
supabase db push

# Generate types (if needed)
supabase gen types typescript --linked > lib/types/database.ts
```

### Vercel CLI Commands

```bash
# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod

# Set environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

---

## Appendix A: Migration Categories

### Fixed Seed Data (Always Included)

These migrations create essential data that every instance needs:

| Migration | Data |
|-----------|------|
| `20251113095209_create_roles_table.sql` | Roles (Recepcionista, Medico, Administrador) |
| `20251114000004_create_estados_consulta_table.sql` | Estados (programada, en_curso, completada, cancelada, ausente) |
| `20260121000001_create_email_templates_table.sql` | Default email templates |

### Sample Data (To Be Excluded for Clean Replicas)

These migrations add sample/test data that should NOT run on production replicas:

| Migration | Data | Action |
|-----------|------|--------|
| `20251113095213_insert_existing_user.sql` | Jorge's user account | Skip or modify |
| `20251115120000_seed_obras_sociales.sql` | Sample insurance providers | Skip |
| `20251115120001_seed_pacientes.sql` | Sample patients | Skip |
| `20251118000002_insert_sample_consultas.sql` | Sample appointments | Skip |
| `20251212000002_seed_medicos_parametros_agenda.sql` | Sample schedule params | Skip |

### Recommended Approach for Clean Replicas

**Option A: Comment out sample data migrations**

Before running `supabase db push`, comment out the INSERT statements in sample data migrations.

**Option B: Create consolidated clean migration (Recommended)**

Create a new migration that consolidates all schema WITHOUT sample data:

```bash
# In a future version, we'll provide:
supabase/migrations-clean/
  └── 00000000000000_initial_schema.sql  # Full schema, no sample data
```

---

## Appendix B: Replication Checklist (Printable)

```
Client Name: _______________________
Date: ____________________________
Deployed By: ______________________

[ ] Step 1: Supabase Project Created
    Project Name: ________________
    Region: _____________________
    Project Ref: ________________

[ ] Step 2: Codebase Prepared
    Repository: _________________
    Dependencies installed

[ ] Step 3: Terminology Configured (if needed)
    Domain: ____________________

[ ] Step 4: Migrations Run
    [ ] Tables created
    [ ] RLS policies applied
    [ ] Seed data inserted

[ ] Step 5: Admin User Created
    Email: _____________________
    User UID: __________________

[ ] Step 6: Vercel Deployed
    URL: ______________________
    [ ] Environment variables set

[ ] Step 7: Auth Configured
    [ ] Site URL updated
    [ ] Redirect URLs added

[ ] Step 8: Storage Verified
    [ ] avatars bucket exists
    [ ] logos bucket exists

[ ] Step 9: Verification Complete
    [ ] Login works
    [ ] CRUD operations work
    [ ] Permissions work

Notes:
_________________________________
_________________________________
_________________________________
```

---

### Step 12: Syncing Updates from Reference (Option B Only)

If you used **Option B** (Separate Repo per Client), you'll need to manually sync updates when the reference PMS repository is updated with new features or bug fixes.

#### 12.1 Initial Setup (One-Time)

Add the reference PMS repo as an upstream remote in the client repo:

```bash
cd [client-name]-pms
git remote add upstream https://github.com/jorge-arean-dev/pms.git
```

#### 12.2 Sync Updates

When the reference PMS repo has updates you want to apply to a client:

```bash
# Fetch the latest from reference
git fetch upstream

# Reset to match the reference (WARNING: overwrites local changes)
git reset --hard upstream/main

# Push to the client repo (force required)
git push origin main --force
```

**⚠️ Warning:** This overwrites any client-specific code changes. If you've made customizations:

```bash
# Alternative: Merge instead of reset (preserves local changes)
git fetch upstream
git merge upstream/main --allow-unrelated-histories
# Resolve conflicts manually
git push origin main
```

#### 12.3 When to Sync

Sync client repos when:
- Bug fixes are applied to the reference
- New features are added that all clients should have
- Security updates are released
- Database schema changes require matching code updates

#### 12.4 Option A Advantage

If you used **Option A** (Shared Repo), syncing is automatic - all clients receive updates when you push to the main PMS repository. This is why Option A is recommended for most deployments.

---

**Document Version:** 1.1
**Compatible with PMS Version:** 1.1
**Last Updated:** 2026-02-02
