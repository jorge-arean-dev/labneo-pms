# n8n Migration Guide — Phase 4: Move Agent Control to Admin UI

This guide provides step-by-step instructions for updating the n8n workflow
(`whatsapp-assistant-pms-demo`) to read the bot on/off status from Supabase
instead of the n8n DataTable, and to remove the entire Telegram control section.

**Prerequisites:**
- Phase 4 database migration applied (`agent_enabled` column exists on `clinic_info`)
- Admin UI toggle tested and working
- Existing Supabase credential in n8n: "PMS Supabase Demo" (id: `izerqLt7BHMbguxC`)

---

## Step 1: Replace `Check Asistente Status` node

This node currently reads the bot's on/off status from the `control-asistente` DataTable.
We need to replace it with a Supabase node that reads from `clinic_info`.

### Instructions:

1. **Delete** the existing `Check Asistente Status` node (DataTable type)
2. **Add** a new **Supabase** node in the same position (approximately x: -4432, y: -1264)
3. **Name** it: `Check Asistente Status`
4. **Configure:**
   - Credential: `PMS Supabase Demo`
   - Operation: **Get Many** (Read)
   - Table: `clinic_info`
   - Return All: **true**
5. **Reconnect:**
   - Input: `If tiene mensajes` (true/first output) → `Check Asistente Status`
   - Output: `Check Asistente Status` → `If Asistente is ON2`

---

## Step 2: Update `If Asistente is ON2` condition

This node currently checks if `valor` equals `"on"` (string from the DataTable).
We need to update it to check the `agent_enabled` boolean from Supabase.

### Instructions:

1. **Open** the `If Asistente is ON2` node
2. **Change** the condition:
   - **Left value:** `{{ $json.agent_enabled }}`
   - **Operation:** `equals`
   - **Right value:** `true` (boolean — make sure to select Boolean type, not String)
3. **Save** the node

> **Important:** The right value must be a boolean `true`, not the string `"true"`.
> In the n8n UI, after typing `true` in the right value field, check that the
> type indicator shows "Boolean" not "String". You may need to toggle the type.

---

## Step 3: Remove all Telegram control nodes

Delete **all** of the following nodes. They are no longer needed since the admin UI
now controls the agent's on/off status.

> **Tip:** You can select multiple nodes by holding Ctrl (or Cmd) and clicking each one,
> then pressing Delete.

### Telegram trigger + authentication (5 nodes):

| # | Node Name | Type |
|---|-----------|------|
| 1 | `Telegram Trigger` | Telegram Trigger |
| 2 | `Get Telegram Chat Id4` | DataTable (get) |
| 3 | `If` | If (auth check) |
| 4 | `Extract Control Command1` | Code |
| 5 | `Sticky Note3` | Sticky Note ("Control de Asistente") |

### Command router (1 node):

| # | Node Name | Type |
|---|-----------|------|
| 6 | `Check Command` | Switch |

### ON command flow (5 nodes):

| # | Node Name | Type |
|---|-----------|------|
| 7 | `Get Asistente Status` | DataTable (get) |
| 8 | `If Asistente is ON` | If |
| 9 | `Turn Asistente ON` | DataTable (update) |
| 10 | `Asistente se ha activado` | Telegram (send message) |
| 11 | `El asistente ya se encuentra *activado*` | Telegram (send message) |

### OFF command flow (5 nodes):

| # | Node Name | Type |
|---|-----------|------|
| 12 | `Get Asistente Status1` | DataTable (get) |
| 13 | `If Asistente is OFF` | If |
| 14 | `Turn Asistente OFF` | DataTable (update) |
| 15 | `El asistente se ha desactivado satisfactoriamente.` | Telegram (send message) |
| 16 | `El asistente ya se encuentra *desactivado*` | Telegram (send message) |

### INFO command flow (4 nodes):

| # | Node Name | Type |
|---|-----------|------|
| 17 | `Get Asistente Status2` | DataTable (get) |
| 18 | `If Asistente is ON1` | If |
| 19 | `El asistente se encuentra *activado*` | Telegram (send message) |
| 20 | `El asistente se encuentra *desactivado*` | Telegram (send message) |

### Invalid command (1 node):

| # | Node Name | Type |
|---|-----------|------|
| 21 | `Comando invalido` | Telegram (send message) |

### Blacklist flow (9 nodes):

| # | Node Name | Type |
|---|-----------|------|
| 22 | `Check Blacklist` | DataTable (get) |
| 23 | `Code in JavaScript` | Code (blacklist check) |
| 24 | `If already blacklisted` | If |
| 25 | `Add to Blacklist2` | DataTable (insert) |
| 26 | `Get paciente1` | Google Sheets (lookup) |
| 27 | `If paciente existente` | If |
| 28 | `Paciente existente fue blacklisteado` | Telegram (send message) |
| 29 | `Paciente no agendado fue blacklisteado` | Telegram (send message) |
| 30 | `Paciente ya estaba blacklisteado` | Telegram (send message) |

### Unblacklist flow (8 nodes):

| # | Node Name | Type |
|---|-----------|------|
| 31 | `Check Blacklist2` | DataTable (get) |
| 32 | `Code in JavaScript1` | Code (unblacklist check) |
| 33 | `If already blacklisted1` | If |
| 34 | `Unblacklist1` | DataTable (deleteRows) |
| 35 | `Get paciente2` | Google Sheets (lookup) |
| 36 | `If paciente existente1` | If |
| 37 | `Paciente existente fue unblacklisteado` | Telegram (send message) |
| 38 | `Paciente no agendado fue unblacklisteado` | Telegram (send message) |
| 39 | `Paciente ya estaba unblacklisteado` | Telegram (send message) |

**Total: 39 nodes to delete.**

---

## Step 4: Clean up n8n DataTables (optional but recommended)

Since we removed all nodes that reference these DataTables, they can be deleted:

1. **`control-asistente`** — No longer needed (status now in Supabase)
2. **`blacklist`** — No longer needed (blacklist feature removed)

To delete: Go to n8n Settings > DataTables, find each table, and delete it.

---

## Step 5: Remove Telegram credential (optional)

If no other n8n workflows use the "Telegram account" credential (id: `7sSdEAccPOHUL1nJ`),
it can be deleted from n8n Credentials.

---

## Step 6: Save and activate the workflow

1. **Save** the workflow
2. **Activate** the workflow (toggle it ON)
3. Verify there are no errors on activation

---

## Verification checklist

After applying all changes:

- [ ] Workflow activates without errors
- [ ] Send a WhatsApp message when `agent_enabled = true` in DB → bot responds
- [ ] Set `agent_enabled = false` via admin UI → send WhatsApp message → no response
- [ ] Set `agent_enabled = true` via admin UI → send WhatsApp message → bot responds again
- [ ] No Telegram-related nodes remain in the workflow
- [ ] The `control-asistente` DataTable is deleted (optional)

---

## Workflow architecture after migration

```
┌─ WHATSAPP MAIN FLOW ───────────────────────────────────────┐
│ Webhook (yCloud) → Whatsapp Message Data → Self-msg filter  │
│   → Message Queue (cola-mensajes DataTable)                 │
│   → Wait 4 sec → Read pending → Claim → Mark processing    │
│   → Limit → Restore context → Check has messages            │
│   → Check Asistente Status (Supabase: clinic_info)    [NEW] │
│   → If Asistente is ON2 (agent_enabled == true)       [MOD] │
│   → Date_preprocessor → Agent 1 (GPT-4.1-mini)             │
│     Tools: consultar_paciente_por_dni, agregar_paciente,    │
│            consultar_base_conocimientos, listar_medicos      │
│     Memory: Buffer Window (30 msgs, keyed by phone)         │
│   → Check Conversation State (parse JSON)                   │
│   → Switch by Stage                                         │
│     → consulta: Send response via yCloud                    │
│     → turno: Prepare → Lookup DNI → Create Token            │
│              → Build Message → Send Booking Link            │
│   → Merge → Mark messages completed                         │
└─────────────────────────────────────────────────────────────┘

┌─ UTILITIES ─────────────────────────────────────────────────┐
│ Manual Trigger → Delete All Chat Memory (loop per patient)  │
└─────────────────────────────────────────────────────────────┘

[REMOVED] Telegram Control section (39 nodes)
[REMOVED] control-asistente DataTable
[REMOVED] blacklist DataTable
```
