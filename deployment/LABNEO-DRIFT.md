# Deployment Kit Drift — Labneo Refactor

**Status:** 🔴 Out of sync
**First documented:** 2026-04-13
**Owner:** TBD

## TL;DR

The deployment kit in this folder (`migrations/`, `ref-snapshot.json`, `setup-project.sql`, `REPLICATION-GUIDE.md`) is a snapshot of the **original dermatology PMS reference**. It does **not** reflect the Labneo refactor that has been landing in `supabase/migrations/` since 2026-03-31.

Every Labneo-era database migration from `20260331000001_labneo_roles_and_schema.sql` onward was committed to `supabase/migrations/` **without** being mirrored into this deployment kit. This violates the rule in `CLAUDE.md` ("any database change that is not reflected in the deployment kit is considered a bug") but predates the audit that surfaced it.

This document captures everything you need to execute a one-shot "Labneo sync" task in the future.

## Evidence of drift

### `ref-snapshot.json` metadata

```json
"snapshot_date": "2026-03-19",
"source_project_id": "hqpngqfygfcgujyzyqtd",
"source_project_name": "pms-database"
```

- Captured on **2026-03-19** (pre-Labneo).
- Source project is `pms-database` (the dermatology reference), **not** `labneo-pms` (`kqfkvdlxsyrxosmuzohp`).
- Never regenerated after Labneo migrations started.

### Tables present in the kit (19)

```
booking_tokens, clinic_info, consultas, consultas_transferencias,
cron_config, email_config, email_reminders, email_templates,
estados_consulta, medicos, medicos_activos, medicos_bloqueos_agenda,
medicos_horarios, medicos_obras_sociales, medicos_parametros_agenda,
obras_sociales, pacientes, roles, usuarios_pms
```

### Tables present in the live Labneo DB but **missing** from the kit

```
solicitudes
estados_solicitud
solicitudes_items
odontologos_perfil
odontologos_horarios
tarifarios
tarifarios_items
items
localidades
localidades_tarifarios
citas_fotogrametria
```

The `handle_new_user()` trigger in `deployment/migrations/00000000000000_initial_schema.sql:226` already INSERTs into `odontologos_perfil`, but the table is never created in the same file. The trigger would fail at deploy time.

### Seed data drift

`deployment/migrations/00000000000002_seed_required_data.sql` still seeds the dermatology roles (`Recepcionista`, `Médico`, `Administrador`) and estados for `estados_consulta`. The Labneo refactor replaced these with `Administracion` + `Odontologo` and a new `estados_solicitud` table with prótesis / alquiler rows. None of that is in the kit.

## Labneo migrations not yet ported

All files live in `supabase/migrations/`:

| File | Summary |
|---|---|
| `20260331000001_labneo_roles_and_schema.sql` | Replaces roles (→ `Administracion`, `Odontologo`), drops dermatology roles, creates `solicitudes`, `tarifarios`, `tarifarios_items`, `localidades_tarifarios`, `citas_fotogrametria`. Updates `is_admin()` / `is_odontologo()` helpers, drops `is_medico()` / `is_recepcionista()`. |
| `20260409000001_restructure_tarifarios_and_add_items.sql` | Creates the global `items` catalog, restructures `tarifarios_items` to join items and tarifarios with prices, wires in `solicitudes_items` for per-line snapshots, adds `estados_solicitud` table and seeds its initial rows. Also creates `localidades` and `odontologos_perfil` / `odontologos_horarios` (verify). |
| `20260410000001_update_trigger_for_odontologo_signup.sql` | Rewrites `handle_new_user()` to create the `odontologos_perfil` row during odontólogo self-signup using metadata fields (telefono, localidad_id, cuit, situacion_iva, direccion_consultorio). |
| `20260411000001_protesis_estados_and_vevi_columns.sql` | **Superseded by 20260413000001** — adds `pendiente_protesis` / `registrado_vevi` estados and `vevi_usuario` / `vevi_password` / `comentarios_admin` columns on `solicitudes`. The 2026-04-13 migration renames/moves these, so direct replay of this file on a fresh kit is harmful. Port only the *final* state, not both migrations. |
| `20260413000001_move_vevi_to_odontologos_perfil.sql` | **Current Vevi design.** Adds `vevi_usuario` / `vevi_password` / `vevi_registrado_at` / `vevi_comentarios` to `odontologos_perfil`; changes `estados_solicitud` UNIQUE constraint from `(codigo)` to `(codigo, tipo_solicitud)`; renames `pendiente_protesis` → `pendiente` and `registrado_vevi` → `procesada` for tipo `protesis`; drops `vevi_usuario` / `vevi_password` / `comentarios_admin` from `solicitudes`; adds `protesis_first_notification_enabled` / `protesis_subsequent_notification_enabled` to `email_config` (default TRUE). |

**Verify before porting:** the live schema in `kqfkvdlxsyrxosmuzohp` is the source of truth. Use `mcp__supabase__list_tables` + `pg_policies` + `information_schema.columns` to diff against whatever you write into the kit. The migration files above are a timeline, not a snapshot.

## Strategic decision needed before sync

The deployment kit was designed to be **business-type-agnostic** (dermatology, vet, spa, real estate). Labneo is a concrete vertical (dental lab + odontólogo portal). Syncing requires a product decision:

### Option A — Convert the kit to Labneo

Replace the dermatology domain (pacientes/medicos/consultas/…) with the Labneo domain (solicitudes/tarifarios/odontologos_perfil/…).

- ✅ Accurate reflection of the current reference implementation
- ✅ Simplest to maintain — only one domain to keep in sync
- ❌ **Breaks the multi-business replication story** in `CLAUDE.md` ("deployment kit allows replicating this PMS to different business types: 🏥 Dermatology clinics, 🐾 Veterinary clinics, 💆 Spas…"). If Labneo is the only reference, you lose the generic-replication angle.
- ❌ Anyone who wanted to clone for a new vertical would have to strip Labneo-specific bits first.

### Option B — Dual-domain kit

Keep dermatology as the generic reference and add Labneo as a second deployable profile, selected by a flag at deploy time.

- ✅ Preserves the generic-replication story
- ❌ Significantly more complex to maintain two parallel schemas
- ❌ Needs a new mechanism in `REPLICATION-GUIDE.md` to pick a profile
- ❌ Would likely diverge over time as Labneo evolves

### Option C — Archive the dermatology kit, start fresh Labneo kit

Move the dermatology-era files into `deployment/archive/pms-dermatology/` (or similar) and start a brand-new Labneo-focused kit at `deployment/migrations/`.

- ✅ Clean break; no confusion between old and new
- ✅ Dermatology files remain as historical reference if someone wants them
- ❌ Loses the generic-replication story (same downside as A)
- ❌ Breaks the `/sync-db` and `/create-ref-db-snapshot` skills until the new kit is populated

**Recommended default:** Option A, unless product explicitly wants to preserve multi-vertical replication. Labneo is the active reference; the dermatology kit is dead code.

## Sync task checklist

When the dedicated sync task runs:

1. **Decide** between options A / B / C above.
2. **Snapshot live Labneo DB** using a throwaway script that dumps:
   - All `public.*` table DDL (with constraints, FKs, indexes)
   - All RLS policies
   - All triggers + functions
   - Seed rows in `roles`, `estados_solicitud`, `localidades`, `tarifarios`, `items` (if canonical), `email_config`
3. **Split into three files** following the existing structure:
   - `00000000000000_initial_schema.sql` — tables, FKs, indexes, functions, triggers, RLS
   - `00000000000001_storage_setup.sql` — storage buckets + policies (avatars, logo, any Labneo-specific buckets)
   - `00000000000002_seed_required_data.sql` — required seed rows
4. **Update `config.toml`** if auth URL patterns, JWT settings, or API config changed in the Labneo project.
5. **Update `setup-project.sql`** with any new extensions, realtime config, cron jobs.
6. **Update `REPLICATION-GUIDE.md`** with any new variables, env keys, or deployment steps specific to Labneo.
7. **Regenerate `ref-snapshot.json`** via the `/create-ref-db-snapshot` skill — this is the final step, after all files above are correct.
8. **Smoke-test by deploying to a fresh Supabase project** and running a full end-to-end flow (odontólogo signup → solicitud creation → admin processing → Vevi credentials delivery). The replication guide should take you from empty project → working Labneo in <30 minutes.
9. **Delete `20260411000001_protesis_estados_and_vevi_columns.sql` from the porting plan** — its effects are entirely superseded by `20260413000001`. Port only the final state.

## Known landmines

- **`odontologos_perfil` table exists in the live DB but has no CREATE TABLE anywhere in `supabase/migrations/`.** It was likely created via the Supabase Dashboard or an MCP call that wasn't captured as a file. The sync task must include its explicit CREATE statement based on the live schema. Verify via `information_schema.columns`.
- **Prótesis estados semantics:** under the current design (post-20260413000001), prótesis and alquiler share the `pendiente` codigo but live in separate rows distinguished by `tipo_solicitud` via composite UNIQUE `(codigo, tipo_solicitud)`. Any simplistic port of the seed file will hit unique-constraint collisions unless the composite key is set up first.
- **`clinic_info.nombre`** was updated by `20260331000001` to `"Labneo"`. If Option B is chosen, make this configurable per profile.
- **Vevi password column stores plaintext.** Tagged with a `-- TODO: encrypt` comment in the migration. Sync task should carry this forward and decide whether to upgrade to encryption as part of the port.

## Don't remove this file until

- The deployment kit passes a full smoke-deploy on a fresh project
- `ref-snapshot.json` reflects the Labneo live DB
- `CLAUDE.md` rules on deployment-kit maintenance are achievable without exceptions
