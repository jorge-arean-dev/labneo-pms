# PMS Migrations Inventory

**Purpose:** Documents all migrations and categorizes them for the replication process.

**Last Updated:** 2025-01-29

---

## Migration Categories

### Category A: Core Schema (ALWAYS RUN)

These migrations create the database structure. Always run on new deployments.

| Migration | Description | Tables/Objects Created |
|-----------|-------------|------------------------|
| `20251113095209_create_roles_table.sql` | Roles table + seed data | `roles` (+ 3 seed rows) |
| `20251113095210_create_usuarios_pms_table.sql` | User profiles table | `usuarios_pms` |
| `20251113095211_create_usuarios_trigger.sql` | Auto-create user profile trigger | Trigger |
| `20251113095212_setup_rls_policies.sql` | RLS for usuarios_pms | RLS policies |
| `20251113095214_create_avatars_bucket.sql` | Avatar storage bucket | Storage bucket |
| `20251113095215_setup_avatars_policies.sql` | Avatar storage policies | Storage policies |
| `20251113095216_set_placeholder_avatar.sql` | Default avatar setup | - |
| `20251113120000_fix_rls_infinite_recursion.sql` | RLS fix | RLS policies |
| `20251114000001_create_obras_sociales_table.sql` | Insurance providers table | `obras_sociales` |
| `20251114000002_create_pacientes_table.sql` | Patients table | `pacientes` |
| `20251114000003_create_medicos_table.sql` | Doctors table | `medicos` |
| `20251114000004_create_estados_consulta_table.sql` | Status table + seed data | `estados_consulta` (+ 5 seed rows) |
| `20251114000005_create_medicos_obras_sociales_table.sql` | Doctor-insurance junction | `medicos_obras_sociales` |
| `20251114000006_create_consultas_table.sql` | Appointments table | `consultas` |
| `20251114000007_create_medicos_horarios_table.sql` | Doctor schedules table | `medicos_horarios` |
| `20251114000008_create_rls_helper_functions.sql` | Helper functions for RLS | Functions |
| `20251114000009_create_audit_triggers.sql` | Audit timestamp triggers | Triggers |
| `20251114000010_setup_rls_policies.sql` | RLS for all tables | RLS policies |
| `20251115000001_rename_notas_privadas_to_notas.sql` | Column rename | Schema change |
| `20251117000001_add_soft_delete_to_medicos.sql` | Soft delete for médicos | Column |
| `20251117000002_make_medicos_user_id_not_null.sql` | Constraint change | Schema change |
| `20251117000006_repair_medicos_schema.sql` | Schema repair | Schema change |
| `20251117000007_update_medicos_rls_for_soft_delete.sql` | RLS update | RLS policies |
| `20251118000001_drop_deprecated_consultas_fields.sql` | Remove deprecated fields | Schema change |
| `20251123000001_add_paciente_arrival_tracking.sql` | Arrival tracking field | Column |
| `20251123000002_create_consulta_transferencias.sql` | Transfer tracking table | `consulta_transferencias` |
| `20251123000003_rename_to_consultas_transferencias.sql` | Table rename | Schema change |
| `20251126000001_add_usuarios_pms_view_policy_for_all_roles.sql` | RLS policy | RLS policies |
| `20251212000001_create_medicos_parametros_agenda_table.sql` | Schedule parameters | `medicos_parametros_agenda` |
| `20251212000003_drop_deprecated_medicos_horarios_fields.sql` | Remove deprecated fields | Schema change |
| `20251213000001_enable_realtime_replica_identity_consultas.sql` | Realtime setup | Realtime config |
| `20260102000001_create_logo_bucket.sql` | Logo storage bucket | Storage bucket |
| `20260107000001_create_email_tables.sql` | Email configuration tables | `email_config`, `email_logs` |
| `20260107000002_create_clinic_info_table.sql` | Clinic information | `clinic_info` |
| `20260107000003_fix_email_config_rls.sql` | RLS fix | RLS policies |
| `20260107000004_setup_reminder_cron.sql` | Cron job setup | Cron job |
| `20260108000001_cron_config_table.sql` | Cron configuration | `cron_config` |
| `20260114000001_create_booking_tokens.sql` | Booking tokens | `booking_tokens` |
| `20260114000002_add_consultas_origen.sql` | Appointment origin field | Column |
| `20260119000001_add_clinic_info_anon_read_policy.sql` | Anon access policy | RLS policy |
| `20260121000001_create_email_templates_table.sql` | Email templates + seed | `email_templates` (+ 1 seed row) |
| `20260124000001_add_clinic_info_attributes.sql` | Additional clinic fields | Columns |
| `20260124000002_update_email_templates_placeholders.sql` | Template update | Data update |
| `20260126000001_fix_medicos_update_rls_for_soft_delete.sql` | RLS fix | RLS policies |

---

### Category B: Sample Data (SKIP FOR CLEAN REPLICAS)

These migrations add sample/test data. **Do NOT run** on production client deployments.

| Migration | Description | Data Added |
|-----------|-------------|------------|
| `20251113095213_insert_existing_user.sql` | Jorge's admin account | 1 user (hardcoded UUID) |
| `20251115120000_seed_obras_sociales.sql` | Sample insurance providers | 6 obras sociales |
| `20251115120001_seed_pacientes.sql` | Sample patients | 8 pacientes |
| `20251118000002_insert_sample_consultas.sql` | Sample appointments | 3 consultas |
| `20251212000002_seed_medicos_parametros_agenda.sql` | Sample schedule params | Variable |

---

## Replication Instructions

### Option 1: Skip Sample Data Migrations (Recommended for Now)

When running `supabase db push` for a new client:

1. Temporarily rename or move Category B migrations:
   ```bash
   mkdir supabase/migrations-sample
   mv supabase/migrations/20251113095213_insert_existing_user.sql supabase/migrations-sample/
   mv supabase/migrations/20251115120000_seed_obras_sociales.sql supabase/migrations-sample/
   mv supabase/migrations/20251115120001_seed_pacientes.sql supabase/migrations-sample/
   mv supabase/migrations/20251118000002_insert_sample_consultas.sql supabase/migrations-sample/
   mv supabase/migrations/20251212000002_seed_medicos_parametros_agenda.sql supabase/migrations-sample/
   ```

2. Run migrations:
   ```bash
   supabase db push
   ```

3. Move sample migrations back (for development):
   ```bash
   mv supabase/migrations-sample/*.sql supabase/migrations/
   rmdir supabase/migrations-sample
   ```

### Option 2: Create Consolidated Clean Migration (Future)

For a cleaner approach, create a single migration file that:
1. Creates all tables (from Category A migrations)
2. Sets up all RLS policies
3. Seeds only required data (roles, estados_consulta, email_templates)

This would be placed in: `supabase/migrations-clean/00000000000000_initial_schema.sql`

---

## Seed Data Details

### Always Seeded (Required for App to Function)

**Roles (3 rows):**
```sql
('Recepcionista', 'Personal de recepción...'),
('Medico', 'Médico dermatólogo...'),
('Administrador', 'Administrador del sistema...')
```

**Estados Consulta (5 rows):**
```sql
('programada', 'Programada', ...),
('en_curso', 'En Curso', ...),
('completada', 'Completada', ...),
('cancelada', 'Cancelada', ...),
('ausente', 'Paciente Ausente', ...)
```

**Email Templates (1 row):**
```sql
(confirmacion_turno, recordatorio_consulta, cancelacion_turno)
```

### Never Seeded on Production (Sample Data)

- Sample insurance providers (OSDE, Swiss Medical, etc.)
- Sample patients (María González, Carlos Rodríguez, etc.)
- Sample appointments (various estados)
- Development user accounts

---

## Verification Queries

After running migrations on a new deployment, verify with:

```sql
-- Should return 3 rows
SELECT * FROM roles ORDER BY nombre;

-- Should return 5 rows
SELECT * FROM estados_consulta ORDER BY orden;

-- Should return 1 row
SELECT * FROM email_templates;

-- Should return 0 rows (empty for new deployments)
SELECT COUNT(*) FROM pacientes;
SELECT COUNT(*) FROM medicos;
SELECT COUNT(*) FROM consultas;
SELECT COUNT(*) FROM obras_sociales;
SELECT COUNT(*) FROM usuarios_pms;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-29
