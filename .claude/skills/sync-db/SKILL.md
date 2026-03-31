---
name: sync-db
description: Compares a replicated PMS database against the reference snapshot and fixes all differences to achieve 100% schema parity.
---

# Skill: Sync Replicated DB to Reference

## Description
Compares a replicated PMS database against the reference snapshot and fixes all differences to achieve 100% schema parity. This skill reads the local `deployment/ref-snapshot.json` (captured from the REF DB) and compares it against the currently-connected Supabase MCP project.

## Prerequisites
1. **Supabase MCP must be connected to the CLIENT/REPLICATED DB** (not the reference DB)
2. The file `deployment/ref-snapshot.json` must exist and be up to date
3. User must confirm which project they want to sync

## Important Reminders
- **Before starting:** Ask the user to confirm their Supabase MCP is connected to the CLIENT database they want to sync (NOT the reference DB)
- **The reference snapshot** is stored locally at `deployment/ref-snapshot.json` - no need to query the REF DB
- **Never modify the REF DB** - this skill only modifies the client/replicated DB

---

## Execution Steps

### Phase 1: Pre-flight Checks

1. **Remind user about MCP connection:**
   > "This skill will sync the currently-connected Supabase project to match the reference DB. Please confirm your MCP is connected to the CLIENT database you want to sync (not the reference DB)."

2. **Read the reference snapshot:**
   - Read file: `deployment/ref-snapshot.json`
   - Parse and validate the JSON structure
   - Note the expected counts from `metadata.counts`

3. **Identify the connected project:**
   - Run `mcp__supabase__list_tables` with `schemas: ["public"]` to verify connectivity
   - Show the user the project they're connected to
   - Get explicit confirmation before proceeding

---

### Phase 2: Query Client DB (All 10 Categories)

Run these SQL queries against the client DB via `mcp__supabase__execute_sql`. Run as many in parallel as possible.

**Query 1 - Columns:**
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**Query 2 - Check Constraints:**
```sql
SELECT tc.table_name, tc.constraint_name, cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name AND tc.constraint_schema = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK' AND tc.table_schema = 'public'
  AND tc.constraint_name NOT LIKE '%_not_null'
ORDER BY tc.table_name, tc.constraint_name;
```

**Query 3 - Foreign Keys:**
```sql
SELECT tc.table_name, tc.constraint_name, kcu.column_name,
  ccu.table_name AS foreign_table, ccu.column_name AS foreign_column, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
```

**Query 4 - Unique + Primary Key Constraints:**
```sql
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
  array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY') AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
```

**Query 5 - Triggers:**
```sql
SELECT trigger_name, event_object_table AS table_name, event_manipulation AS event,
  action_timing AS timing, action_statement AS function_call
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Query 6 - Functions:**
```sql
SELECT p.proname AS function_name, pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
  pg_catalog.pg_get_function_result(p.oid) AS return_type, l.lanname AS language,
  p.provolatile AS volatility, p.prosecdef AS security_definer,
  pg_catalog.pg_get_functiondef(p.oid) AS full_definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

**Query 7 - Public RLS Policies:**
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Query 8 - Storage Policies:**
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

**Query 9 - Indexes:**
```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

### Phase 3: Compare & Report

For each category, compare client results against the reference snapshot:

1. **Tables & Columns:** Check for missing tables, missing columns, wrong types, wrong nullable, wrong defaults
2. **Check Constraints:** Compare names and expressions
3. **Foreign Keys:** Compare names, columns, referenced tables, ON DELETE rules
4. **Primary Keys:** Compare names and columns
5. **Unique Constraints:** Compare names and columns
6. **Triggers:** Compare names, tables, events, timing, functions
7. **Functions:** Compare signatures, return types, language, security_definer. For bodies, normalize whitespace (replace \r\n with \n, trim) before comparing
8. **RLS Policies:** Compare names, roles, commands, qual/with_check expressions
9. **Storage Policies:** Same as RLS policies but for storage.objects
10. **Indexes:** Compare names and definitions

**Output a summary table:**
```
SYNC REPORT: {project_name}
==============================
Category              | REF | Client | Diffs
--------------------- | --- | ------ | -----
Tables                |  17 |     ?? |     ?
Columns               | 152 |     ?? |     ?
Check Constraints     |  12 |     ?? |     ?
Foreign Keys          |  17 |     ?? |     ?
Primary Keys          |  17 |     ?? |     ?
Unique Constraints    |  12 |     ?? |     ?
Triggers              |  28 |     ?? |     ?
Functions             |  16 |     ?? |     ?
RLS Policies (public) |  60 |     ?? |     ?
Storage Policies      |  12 |     ?? |     ?
Indexes               |  77 |     ?? |     ?
==============================
Total differences: ??
```

Then list each difference with:
- Category
- What's wrong (missing, extra, different)
- REF value vs Client value
- Suggested fix SQL

---

### Phase 4: Fix Differences

1. **Present all differences to the user** with the fix SQL
2. **Get approval** before executing any fixes
3. **Execute fixes in batches** (group by category, max ~10 statements per batch)
4. **After each batch:** Verify the fix was applied correctly
5. **After all fixes:** Re-run the full comparison to confirm 0 differences

**Fix SQL patterns by category:**

- **Missing table:** Execute CREATE TABLE from `deployment/migrations/00000000000000_initial_schema.sql`
- **Missing column:** `ALTER TABLE ADD COLUMN`
- **Wrong column type:** `ALTER TABLE ALTER COLUMN TYPE`
- **Wrong nullable:** `ALTER TABLE ALTER COLUMN SET/DROP NOT NULL`
- **Wrong default:** `ALTER TABLE ALTER COLUMN SET DEFAULT / DROP DEFAULT`
- **Missing/wrong check constraint:** `ALTER TABLE DROP CONSTRAINT` + `ALTER TABLE ADD CONSTRAINT`
- **Wrong FK name:** `ALTER TABLE DROP CONSTRAINT` + `ALTER TABLE ADD CONSTRAINT`
- **Wrong FK ON DELETE:** `ALTER TABLE DROP CONSTRAINT` + `ALTER TABLE ADD CONSTRAINT`
- **Wrong constraint name:** `ALTER TABLE RENAME CONSTRAINT`
- **Missing trigger:** `CREATE TRIGGER`
- **Missing function:** Execute `CREATE OR REPLACE FUNCTION` from snapshot
- **Wrong function body:** Execute `CREATE OR REPLACE FUNCTION` from snapshot
- **Missing RLS policy:** `CREATE POLICY`
- **Wrong RLS policy:** `DROP POLICY` + `CREATE POLICY`
- **Extra RLS policy:** `DROP POLICY` (after user confirmation)
- **Missing index:** Execute CREATE INDEX from snapshot
- **Extra index:** `DROP INDEX` (after user confirmation)

---

### Phase 5: Final Verification

1. Re-run all 10 queries from Phase 2
2. Compare against snapshot
3. Confirm 0 differences
4. Output final summary:

```
SYNC COMPLETE: {project_name}
==============================
All 10 categories match reference DB.
Total items verified: ~400+
Differences remaining: 0
==============================
```

---

## Updating the Reference Snapshot

If the REFERENCE DB has changed and you need to update the snapshot:

1. **User must switch MCP to the REFERENCE DB** (project: hqpngqfygfcgujyzyqtd)
2. Run all 10 queries from Phase 2 against the REF DB
3. Rebuild `deployment/ref-snapshot.json` with the new data
4. Update `metadata.snapshot_date` to today's date
5. Switch MCP back to the client DB and re-run sync

---

## Error Handling

- If MCP returns permission errors, the user may be connected to the wrong project/org
- If a fix SQL fails, report the error and skip to next fix (don't abort entire batch)
- If a table is completely missing, suggest running the full initial_schema.sql migration instead
- Never modify the reference snapshot during a sync operation
