# n8n Supabase Tools Guide for AI Agents

This guide explains how to use Supabase nodes with AI Agents in n8n for the WhatsApp Appointment Booking Agent.

---

## Overview: Two Types of Supabase Nodes

| Node | Use Case | Output Type |
|------|----------|-------------|
| **Supabase** | Regular workflows (non-AI) | `main` (standard data flow) |
| **Supabase Tool** | AI Agent tools | `ai_tool` (connects to Agent) |

**For your AI Agent, always use `Supabase Tool` (n8n-nodes-base.supabaseTool)**

---

## Setting Up Supabase Credentials

Before using any Supabase node, you need to configure credentials:

### 1. Get Your Supabase API Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1...` (for public operations)
   - **service_role key**: `eyJhbGciOiJIUzI1...` (for admin operations)

### 2. Add Credentials in n8n

1. Go to **Settings** → **Credentials** → **Add Credential**
2. Search for "Supabase"
3. Fill in:
   - **Host**: `https://your-project-id.supabase.co`
   - **Service Role Secret**: Your `service_role` key (recommended for server-side operations)

---

## Supabase Tool Node Configuration

### Basic Structure

```json
{
  "type": "n8n-nodes-base.supabaseTool",
  "typeVersion": 1,
  "name": "your_tool_name",
  "parameters": {
    "toolDescription": "Description for AI to understand when to use this tool",
    "operation": "get|getAll|create|update|delete",
    "tableId": "your_table_name"
    // ... operation-specific parameters
  },
  "credentials": {
    "supabaseApi": {
      "id": "your-credential-id",
      "name": "Your Supabase Credential"
    }
  }
}
```

### Key Properties

| Property | Required | Description |
|----------|----------|-------------|
| `toolDescription` | **Yes** | Critical! Tells the AI when/how to use this tool |
| `operation` | Yes | `get`, `getAll`, `create`, `update`, `delete` |
| `tableId` | Yes | The Supabase table name |
| `filters` | Depends | Conditions for get/update/delete |
| `fieldsUi` | Depends | Fields to send for create/update |

---

## Operations Reference

### 1. GET (Single Row)

Use to fetch a single row by specific conditions.

```json
{
  "parameters": {
    "toolDescription": "consultar_paciente_por_dni: Busca un paciente en la base de datos por DNI.\n\nCUANDO USAR:\n- Al inicio del flujo de agendado para verificar si el paciente existe\n- Cuando necesites datos de un paciente específico\n\nPARAMETROS:\n- dni: DNI del paciente (string)\n\nOUTPUT:\n- Si existe: Devuelve datos del paciente (id, nombre, apellido, etc.)\n- Si NO existe: Devuelve resultado vacío",
    "operation": "get",
    "tableId": "pacientes",
    "filters": {
      "conditions": [
        {
          "keyName": "dni",
          "keyValue": "={{ $fromAI('dni', 'DNI del paciente', 'string') }}"
        }
      ]
    }
  }
}
```

**Key Points:**
- Use `$fromAI('paramName', 'description', 'type')` to let the AI provide values
- `filters.conditions` defines the WHERE clause
- Returns single row or empty if not found

---

### 2. GET ALL (Multiple Rows)

Use to fetch multiple rows, optionally with filters.

```json
{
  "parameters": {
    "toolDescription": "listar_medicos: Obtiene la lista de médicos disponibles.\n\nCUANDO USAR:\n- Cuando el paciente necesita elegir un médico\n- Para mostrar opciones de profesionales\n\nPARAMETROS:\n- Ninguno requerido\n\nOUTPUT:\n- Lista de médicos con id, nombre, apellido",
    "operation": "getAll",
    "tableId": "medicos",
    "returnAll": true,
    "filterType": "manual",
    "matchType": "allFilters",
    "filters": {
      "conditions": [
        {
          "keyName": "deleted_at",
          "condition": "is",
          "keyValue": "null"
        }
      ]
    }
  }
}
```

**Filter Conditions Available:**
| Condition | Description | Example |
|-----------|-------------|---------|
| `eq` | Equals | `"condition": "eq"` |
| `neq` | Not equals | `"condition": "neq"` |
| `gt` | Greater than | `"condition": "gt"` |
| `gte` | Greater than or equal | `"condition": "gte"` |
| `lt` | Less than | `"condition": "lt"` |
| `lte` | Less than or equal | `"condition": "lte"` |
| `like` | LIKE (use * for %) | `"condition": "like"` |
| `ilike` | Case-insensitive LIKE | `"condition": "ilike"` |
| `is` | IS (for null, true, false) | `"condition": "is"` |

---

### 3. CREATE (Insert Row)

Use to insert a new row into a table.

```json
{
  "parameters": {
    "toolDescription": "agregar_paciente: Registra un NUEVO paciente en la base de datos.\n\nCUANDO USAR:\n- Después de verificar que el paciente NO existe con consultar_paciente_por_dni\n- Cuando el paciente proporciona sus datos completos\n\nPARAMETROS REQUERIDOS:\n- dni: DNI del paciente (string) - REQUERIDO\n- nombre: Nombre del paciente (string) - REQUERIDO\n- apellido: Apellido del paciente (string) - REQUERIDO\n- fecha_nacimiento: Fecha de nacimiento en formato YYYY-MM-DD (string) - REQUERIDO\n\nOUTPUT:\n- Datos del paciente creado incluyendo el id generado",
    "operation": "create",
    "tableId": "pacientes",
    "dataToSend": "defineBelow",
    "fieldsUi": {
      "fieldValues": [
        {
          "fieldId": "dni",
          "fieldValue": "={{ $fromAI('dni', 'DNI del paciente', 'string') }}"
        },
        {
          "fieldId": "nombre",
          "fieldValue": "={{ $fromAI('nombre', 'Nombre del paciente', 'string') }}"
        },
        {
          "fieldId": "apellido",
          "fieldValue": "={{ $fromAI('apellido', 'Apellido del paciente', 'string') }}"
        },
        {
          "fieldId": "fecha_nacimiento",
          "fieldValue": "={{ $fromAI('fecha_nacimiento', 'Fecha de nacimiento YYYY-MM-DD', 'string') }}"
        }
      ]
    }
  }
}
```

**Key Points:**
- `dataToSend: "defineBelow"` lets you specify exact fields
- `dataToSend: "autoMapInputData"` maps input properties to columns automatically
- Use `$fromAI()` for values the AI needs to provide

---

### 4. UPDATE (Modify Row)

Use to update existing rows.

```json
{
  "parameters": {
    "toolDescription": "marcar_token_usado: Marca un booking token como usado después de completar la reserva.\n\nCUANDO USAR:\n- Después de crear exitosamente una consulta\n\nPARAMETROS:\n- token: El token de reserva (string)\n- consulta_id: ID de la consulta creada (string)",
    "operation": "update",
    "tableId": "booking_tokens",
    "filterType": "manual",
    "matchType": "allFilters",
    "filters": {
      "conditions": [
        {
          "keyName": "token",
          "condition": "eq",
          "keyValue": "={{ $fromAI('token', 'Token de reserva', 'string') }}"
        }
      ]
    },
    "dataToSend": "defineBelow",
    "fieldsUi": {
      "fieldValues": [
        {
          "fieldId": "used_at",
          "fieldValue": "={{ $now.toISO() }}"
        },
        {
          "fieldId": "consulta_id",
          "fieldValue": "={{ $fromAI('consulta_id', 'ID de la consulta creada', 'string') }}"
        }
      ]
    }
  }
}
```

---

### 5. DELETE (Remove Row)

Use to delete rows (use with caution).

```json
{
  "parameters": {
    "toolDescription": "eliminar_token_expirado: Elimina tokens de reserva expirados.\n\nCUANDO USAR:\n- Solo durante limpieza programada\n- NUNCA eliminar tokens activos\n\nPARAMETROS:\n- token: El token a eliminar (string)",
    "operation": "delete",
    "tableId": "booking_tokens",
    "filterType": "manual",
    "matchType": "allFilters",
    "filters": {
      "conditions": [
        {
          "keyName": "token",
          "condition": "eq",
          "keyValue": "={{ $fromAI('token', 'Token a eliminar', 'string') }}"
        }
      ]
    }
  }
}
```

---

## The `$fromAI()` Function

This is how AI Agents pass dynamic values to tools.

### Syntax

```javascript
$fromAI('parameterName', 'description for AI', 'type')
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `parameterName` | Unique identifier for this parameter |
| `description` | Human-readable description (helps AI understand) |
| `type` | `'string'`, `'number'`, `'boolean'` |

### Examples

```javascript
// String parameter
"={{ $fromAI('dni', 'DNI del paciente sin puntos ni guiones', 'string') }}"

// Number parameter
"={{ $fromAI('medico_id', 'ID del médico seleccionado', 'string') }}"

// With default/computed value
"={{ $fromAI('timestamp', 'Fecha y hora actual', 'string') || $now.toISO() }}"
```

---

## Connecting Tools to AI Agent

### Visual Connection

```
┌─────────────────────┐
│     AI Agent        │
│  (Main Node)        │
│                     │
│  ai_tool input ◄────┼───┐
└─────────────────────┘   │
                          │
┌─────────────────────┐   │
│  Supabase Tool 1    │   │
│  (consultar_paciente)│──┘
│  ai_tool output ────┼───┐
└─────────────────────┘   │
                          │
┌─────────────────────┐   │
│  Supabase Tool 2    │   │
│  (agregar_paciente) │───┘
│  ai_tool output ────┼
└─────────────────────┘
```

### In Workflow JSON

```json
{
  "connections": {
    "consultar_paciente_por_dni": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "agregar_paciente": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## Tool Descriptions Best Practices

The `toolDescription` is **critical** for the AI to use tools correctly.

### Template Structure

```
[tool_name]: [One-line description]

CUANDO USAR:
- [Scenario 1]
- [Scenario 2]

PARAMETROS:
- [param1]: [description] (type) - [REQUERIDO/OPCIONAL]
- [param2]: [description] (type)

OUTPUT:
- [What the tool returns when successful]
- [What happens when not found/error]

RESTRICCIONES:
- [Important constraints]
- [Order of operations if relevant]
```

### Example: Well-Written Tool Description

```
consultar_paciente_por_dni: Busca un paciente en la base de datos por su DNI.

CUANDO USAR:
- Al inicio del flujo de agendado de turnos para verificar si el paciente ya existe
- Cada vez que necesites confirmar datos de un paciente
- SIEMPRE antes de invocar agregar_paciente (para verificar que NO existe)

PARAMETROS:
- dni: Número de DNI del paciente sin puntos ni guiones (string) - REQUERIDO

OUTPUT:
- Si existe: Devuelve datos del paciente (id, nombre, apellido, fecha_nacimiento, telefono, email)
- Si NO existe: Devuelve resultado vacío o mensaje indicando que no se encontró

RESTRICCIONES:
- Podés invocar esta herramienta MÚLTIPLES VECES si es necesario
- El DNI debe ser solo números, sin puntos ni guiones
- Siempre usá esta herramienta ANTES de agregar_paciente
```

---

## Tools for the Appointment Booking Agent

Here are the recommended tools for your workflow:

### 1. consultar_paciente_por_dni

```json
{
  "name": "consultar_paciente_por_dni",
  "operation": "get",
  "tableId": "pacientes",
  "toolDescription": "consultar_paciente_por_dni: Busca un paciente por DNI...",
  "filters": {
    "conditions": [
      {
        "keyName": "dni",
        "keyValue": "={{ $fromAI('dni', 'DNI del paciente', 'string') }}"
      }
    ]
  }
}
```

### 2. agregar_paciente

```json
{
  "name": "agregar_paciente",
  "operation": "create",
  "tableId": "pacientes",
  "toolDescription": "agregar_paciente: Registra un nuevo paciente...",
  "fieldsUi": {
    "fieldValues": [
      { "fieldId": "dni", "fieldValue": "={{ $fromAI('dni', '', 'string') }}" },
      { "fieldId": "nombre", "fieldValue": "={{ $fromAI('nombre', '', 'string') }}" },
      { "fieldId": "apellido", "fieldValue": "={{ $fromAI('apellido', '', 'string') }}" },
      { "fieldId": "fecha_nacimiento", "fieldValue": "={{ $fromAI('fecha_nacimiento', 'YYYY-MM-DD', 'string') }}" }
    ]
  }
}
```

### 3. listar_medicos

```json
{
  "name": "listar_medicos",
  "operation": "getAll",
  "tableId": "medicos",
  "toolDescription": "listar_medicos: Obtiene la lista de médicos activos...",
  "returnAll": true,
  "filterType": "manual",
  "filters": {
    "conditions": [
      {
        "keyName": "deleted_at",
        "condition": "is",
        "keyValue": "null"
      }
    ]
  }
}
```

### 4. crear_booking_token

```json
{
  "name": "crear_booking_token",
  "operation": "create",
  "tableId": "booking_tokens",
  "toolDescription": "crear_booking_token: Genera un token de reserva para el paciente...",
  "fieldsUi": {
    "fieldValues": [
      { "fieldId": "paciente_id", "fieldValue": "={{ $fromAI('paciente_id', '', 'string') }}" },
      { "fieldId": "medico_id", "fieldValue": "={{ $fromAI('medico_id', '', 'string') }}" },
      { "fieldId": "phone_number", "fieldValue": "={{ $fromAI('phone_number', '', 'string') }}" },
      { "fieldId": "expires_at", "fieldValue": "={{ $now.plus({hours: 24}).toISO() }}" }
    ]
  }
}
```

---

## Common Patterns

### Pattern 1: Check Before Insert

```
Agent Flow:
1. Call consultar_paciente_por_dni(dni)
2. If empty → Call agregar_paciente(dni, nombre, apellido, fecha_nacimiento)
3. Use returned paciente_id for next steps
```

### Pattern 2: Select from List

```
Agent Flow:
1. Call listar_medicos()
2. Present options to user: "1. Dr. Lotocki, 2. Dra. García"
3. User selects option
4. Use selected medico_id for next steps
```

### Pattern 3: Generate Token and Return Link

```
Agent Flow:
1. Have paciente_id and medico_id
2. Call crear_booking_token(paciente_id, medico_id, phone_number)
3. Get returned token
4. Generate link: "https://tudominio.com/agendar?token={token}"
5. Return link to user
```

---

## Debugging Tips

1. **Test tools individually** before connecting to agent
2. **Check Supabase logs** in the dashboard for query errors
3. **Verify RLS policies** allow the operations you're attempting
4. **Use the n8n execution log** to see what values were passed

---

## Resources

- [n8n Supabase Node Docs](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)
- [PostgREST Filter Guide](https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering)
- [n8n AI Agent Tutorial](https://docs.n8n.io/advanced-ai/intro-tutorial/)
- [Template: MCP Supabase Agent](https://n8n.io/workflows/3641)
- [Template: AI Restaurant Assistant](https://n8n.io/workflows/3585)
