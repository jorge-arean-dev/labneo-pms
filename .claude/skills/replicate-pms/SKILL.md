---
name: replicate-pms
description: Creates a complete PMS deployment for a new client including Supabase project, GitHub repo, Vercel deployment, and admin user.
---

# Skill: Replicate PMS for New Client

## Description
This skill creates a complete PMS deployment for a new client, including:
- New Supabase project with full schema
- New GitHub repository (cloned from template)
- New Vercel deployment with environment variables
- Admin user creation

## Required Arguments
When invoking this skill, the user should provide:
- **client_name**: Client identifier (lowercase, hyphens, no spaces) e.g., `silva-ricigliano`
- **region**: Supabase region e.g., `us-west-2`, `us-east-1`, `eu-west-1`

## Prerequisites
Before running, ensure:
1. Supabase MCP is connected (`/mcp` to reconnect if needed)
2. GitHub CLI is authenticated (`gh auth status`)
3. Vercel CLI is authenticated (`vercel whoami`)
4. User has Supabase organization access

---

## Execution Steps

### Phase 1: Gather Information

1. **Confirm client details with user:**
   - Client name (will be used for: `{client_name}-pms`)
   - Supabase region preference
   - Admin user email for initial setup

2. **Ask user which Supabase organization to use:**
   - Run `mcp__supabase__list_organizations` to show options
   - Confirm selection before proceeding

3. **Check cost and get confirmation:**
   - Run `mcp__supabase__get_cost` for the organization
   - Run `mcp__supabase__confirm_cost` to get confirmation ID

---

### Phase 2: Create Supabase Project

1. **Create the project:**
   ```
   mcp__supabase__create_project
   - name: {client_name}-pms
   - region: {selected_region}
   - organization_id: {org_id}
   - confirm_cost_id: {cost_confirmation_id}
   ```

2. **Wait for project to be ready:**
   - Poll `mcp__supabase__get_project` until status is `ACTIVE_HEALTHY`
   - This typically takes 1-2 minutes

3. **Collect project credentials:**
   - Run `mcp__supabase__get_project_url` for API URL
   - Run `mcp__supabase__get_publishable_keys` for anon key
   - Save these for later use

---

### Phase 3: Run Database Migrations

Execute migrations in order using `mcp__supabase__execute_sql`:

1. **Read and execute initial schema:**
   - Read file: `deployment/migrations/00000000000000_initial_schema.sql`
   - Execute via `mcp__supabase__execute_sql`
   - Verify no errors

2. **Read and execute storage setup:**
   - Read file: `deployment/migrations/00000000000001_storage_setup.sql`
   - Execute via `mcp__supabase__execute_sql`
   - Verify no errors

3. **Read and execute seed data:**
   - Read file: `deployment/migrations/00000000000002_seed_required_data.sql`
   - Execute via `mcp__supabase__execute_sql`
   - Verify no errors

4. **Read and execute project setup:**
   - Read file: `deployment/setup-project.sql`
   - Execute via `mcp__supabase__execute_sql`
   - This enables pg_cron, realtime, etc.

5. **Verify migrations:**
   - Run `mcp__supabase__list_tables` to confirm all 17 tables exist
   - Run `mcp__supabase__get_advisors` for security check

---

### Phase 4: Configure Client Data

1. **Update clinic_info with client details:**
   ```sql
   UPDATE clinic_info SET
     nombre = '{Client Display Name}',
     -- Ask user for other details if available
   WHERE id = (SELECT id FROM clinic_info LIMIT 1);
   ```

2. **Update cron_config with deployment URL (after Vercel deploy):**
   - This will be done after we have the Vercel URL

---

### Phase 5: Create GitHub Repository

Use GitHub CLI via Bash:

1. **Create repo from template:**
   ```bash
   gh repo create jorge-arean-dev/{client_name}-pms --template jorge-arean-dev/pms --public
   ```

2. **Clone the new repo locally (optional, for verification):**
   ```bash
   gh repo clone jorge-arean-dev/{client_name}-pms
   ```

---

### Phase 6: Deploy to Vercel

Use Vercel CLI via Bash:

1. **Link and create project:**
   ```bash
   cd /path/to/cloned/repo  # or use the template repo directly
   vercel link --yes
   vercel project add {client_name}-pms
   ```

2. **Set environment variables:**
   ```bash
   # Supabase
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production

   # Security keys (generate new ones)
   vercel env add EMAIL_ENCRYPTION_KEY production
   vercel env add CRON_SECRET production
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Get deployment URL:**
   - Note the production URL for cron_config update

---

### Phase 7: Configure Supabase Auth

1. **Update Site URL in Supabase Dashboard:**
   - Instruct user to go to: Authentication > URL Configuration
   - Set Site URL to: `https://{client_name}-pms.vercel.app`
   - Add Redirect URLs:
     - `https://{client_name}-pms.vercel.app/**`
     - `http://localhost:3000/**` (for development)

2. **Update cron_config:**
   ```sql
   UPDATE cron_config
   SET value = 'https://{client_name}-pms.vercel.app'
   WHERE key = 'reminder_url';
   ```

---

### Phase 8: Create Admin User

1. **Ask user for admin details:**
   - Email address
   - Name (nombre, apellido)

2. **Create user in Supabase Auth:**
   - Instruct user to create via Dashboard: Authentication > Users > Add User
   - Or provide SQL to insert directly if using service role

3. **Assign admin role:**
   ```sql
   UPDATE usuarios_pms
   SET rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador')
   WHERE email = '{admin_email}';
   ```

---

### Phase 9: Final Verification

Run verification checks:

1. **Database:**
   - `mcp__supabase__list_tables` - should show 17 tables
   - `mcp__supabase__get_advisors` - check for security issues

2. **Instruct user to verify:**
   - [ ] Login works at production URL
   - [ ] Can create patients
   - [ ] Can create appointments
   - [ ] Permissions work correctly

---

### Phase 10: Output Summary

Provide the user with a complete summary:

```
========================================
PMS DEPLOYMENT COMPLETE: {client_name}
========================================

SUPABASE PROJECT
- Dashboard: https://supabase.com/dashboard/project/{project_id}
- API URL: https://{project_id}.supabase.co
- Anon Key: {anon_key}

GITHUB REPOSITORY
- URL: https://github.com/jorge-arean-dev/{client_name}-pms

VERCEL DEPLOYMENT
- Production URL: https://{client_name}-pms.vercel.app
- Dashboard: https://vercel.com/jorge-arean-dev/{client_name}-pms

ADMIN USER
- Email: {admin_email}
- Temporary Password: (set via Supabase Dashboard)

NEXT STEPS
1. Admin should login and change password
2. Configure email settings in /admin
3. Update clinic branding in /admin
4. Add doctors and staff as needed

========================================
```

---

## Error Handling

If any step fails:
1. Report the error clearly to the user
2. Suggest remediation steps
3. Offer to retry the failed step
4. Do NOT proceed to subsequent steps until resolved

Common issues:
- **Supabase project creation fails**: Check organization billing/limits
- **Migration fails**: Check SQL syntax, may need to run in parts
- **Vercel deploy fails**: Check environment variables are set correctly
- **Auth issues**: Verify redirect URLs are configured

---

## Reference Documentation

For detailed steps, refer to: `deployment/REPLICATION-GUIDE.md`
