---
name: create-ref-db-snapshot
description: Captures the complete schema of the reference PMS database into deployment/ref-snapshot.json. Run after any schema change to the reference DB.
---

# Skill: Create Reference DB Snapshot

## Description
Captures the complete schema of the reference PMS database into `deployment/ref-snapshot.json`. This snapshot is the source of truth used by `/sync-db` to synchronize replicated client databases.

**Run this skill after any schema change to the reference DB.**

## Prerequisites
1. **Supabase MCP must be connected to the REFERENCE DB** (project: `hqpngqfygfcgujyzyqtd`, name: `pms-database`)
2. User must confirm they are connected to the correct project before proceeding

## Important Reminders
- **Before starting:** Ask the user to confirm their Supabase MCP is connected to the REFERENCE database (not a client/replicated DB)
- **This skill only reads** — it never modifies the reference DB
- **Output:** Overwrites `deployment/ref-snapshot.json` with fresh data

---

## Execution Steps

### Phase 1: Pre-flight Check

1. **Remind user about MCP connection:**
   > "This skill will capture a fresh snapshot of the reference DB. Please confirm your MCP is connected to the REFERENCE database (pms-database / hqpngqfygfcgujyzyqtd)."

2. **Verify connectivity:**
   - Run `mcp__supabase__list_tables` with `schemas: ["public"]` to confirm access
   - Verify 17 tables are returned
   - Get explicit confirmation before proceeding

---

### Phase 2: Run All 10 Introspection Queries

Run these via `mcp__supabase__execute_sql` against the REF DB. Run as many in parallel as possible.

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

### Phase 3: Assemble ref-snapshot.json

Write the results to `deployment/ref-snapshot.json` using this structure:

```json
{
  "metadata": {
    "snapshot_date": "<today's date>",
    "source_project_id": "hqpngqfygfcgujyzyqtd",
    "source_project_name": "pms-database",
    "schema_version": "1.0",
    "description": "Reference DB schema snapshot for /sync-db skill.",
    "counts": {
      "tables": <count>,
      "columns": <count>,
      "check_constraints": <count>,
      "foreign_keys": <count>,
      "primary_keys": <count>,
      "unique_constraints": <count>,
      "triggers": <count>,
      "functions": <count>,
      "rls_policies_public": <count>,
      "storage_policies": <count>,
      "indexes": <count>
    }
  },
  "columns": { "<table_name>": [{"name", "type", "nullable", "default"}, ...], ... },
  "check_constraints": [{"table", "name", "expression"}, ...],
  "foreign_keys": [{"table", "name", "column", "references_table", "references_column", "on_delete"}, ...],
  "primary_keys": [{"table", "name", "columns"}, ...],
  "unique_constraints": [{"table", "name", "columns"}, ...],
  "triggers": [{"table", "name", "event", "timing", "function"}, ...],
  "functions": [{"name", "arguments", "return_type", "language", "volatility", "security_definer", "definition"}, ...],
  "rls_policies": [{"table", "name", "roles", "command", "qual", "with_check"}, ...],
  "storage_policies": [{"name", "roles", "command", "qual", "with_check"}, ...],
  "indexes": [{"table", "name", "definition"}, ...]
}
```

**For function definitions:** Normalize line endings (replace `\r\n` with `\n`) before storing.

---

### Phase 4: Verification

1. Read back the written file and parse it to confirm valid JSON
2. Output a summary:

```
SNAPSHOT CAPTURED: pms-database
================================
Date: <today>
Tables:              17
Columns:            1XX
Check Constraints:   12
Foreign Keys:        17
Primary Keys:        17
Unique Constraints:  12
Triggers:            28
Functions:           16
RLS Policies:        60
Storage Policies:    12
Indexes:             77
================================
File: deployment/ref-snapshot.json
```

---

## When to Run This Skill

Run `/create-ref-db-snapshot` after any of these changes to the reference DB:
- New or modified table/column
- New or modified constraint (CHECK, FK, UNIQUE, PK)
- New or modified function or trigger
- New or modified RLS or storage policy
- New or modified index
