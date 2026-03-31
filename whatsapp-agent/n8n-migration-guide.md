# n8n Workflow Migration Guide: Spa → PMS Dermatology Clinic

This guide provides step-by-step instructions to adapt the existing n8n WhatsApp chatbot workflow (built for "Punto Relax Hombres" spa) to work with the PMS dermatology clinic system.

**Prerequisites:**
- n8n instance running with the existing spa workflow imported
- Supabase project `hqpngqfygfcgujyzyqtd` accessible (PMS database)
- Supabase service_role key from dashboard

---

## C1. Create Supabase Credentials in n8n

1. Go to **Settings > Credentials > Add Credential**
2. Search for **"Supabase"**
3. Fill in:
   - **Host**: `https://hqpngqfygfcgujyzyqtd.supabase.co`
   - **Service Role Key**: Copy from Supabase Dashboard > Settings > API > `service_role` key
4. Click **Save** and name it **"PMS Supabase"**

---

## C2. Replace `consultar_paciente` (Google Sheets → Supabase)

**Delete** the existing `consultar_paciente` Google Sheets Tool node.

**Add new node:**
1. Add a **Supabase Tool** node and connect it to the Agent 1 node (as a tool)
2. **Node Name**: `consultar_paciente_por_dni`
3. **Credentials**: Select "PMS Supabase"
4. Configure:
   - **Operation**: Get Many Rows
   - **Table**: `pacientes`
   - **Filters**: Add filter → Column: `dni`, Operator: equals, Value: `{{ $fromAI("dni", "Numero de DNI del paciente", "string") }}`
5. **Tool Description** (paste exactly):
```
Busca un paciente por su numero de DNI. Devuelve id, dni, nombre, apellido, fecha_nacimiento, telefono, email. Usar cuando el paciente proporciona su DNI para verificar si ya esta registrado.
```

---

## C3. Replace `agregar_paciente` (Google Sheets → Supabase)

**Delete** the existing `agregar_paciente` Google Sheets Tool node.

**Add new node:**
1. Add a **Supabase Tool** node and connect it to the Agent 1 node (as a tool)
2. **Node Name**: `agregar_paciente`
3. **Credentials**: Select "PMS Supabase"
4. Configure:
   - **Operation**: Insert Row
   - **Table**: `pacientes`
   - **Fields to Send**:
     - `dni` = `{{ $fromAI("dni", "Numero de DNI del paciente", "string") }}`
     - `nombre` = `{{ $fromAI("nombre", "Nombre del paciente", "string") }}`
     - `apellido` = `{{ $fromAI("apellido", "Apellido del paciente", "string") }}`
     - `fecha_nacimiento` = `{{ $fromAI("fecha_nacimiento", "Fecha de nacimiento en formato YYYY-MM-DD. Puede ser vacio.", "string") }}`
     - `telefono` = `{{ $fromAI("telefono", "Numero de telefono del paciente. Puede ser vacio.", "string") }}`
5. **Tool Description** (paste exactly):
```
Registra un nuevo paciente en la base de datos. Requiere: dni, nombre, apellido. Opcionales: fecha_nacimiento (formato YYYY-MM-DD), telefono. IMPORTANTE: Verificar primero con consultar_paciente_por_dni que el paciente NO existe antes de usar esta herramienta.
```

---

## C4. Replace `consultar_base_conocimientos` (Google Docs → Supabase)

**Delete** the existing `consultar_base_conocimientos` Google Docs Tool node.

**Add new node:**
1. Add a **Supabase Tool** node and connect it to the Agent 1 node (as a tool)
2. **Node Name**: `consultar_base_conocimientos`
3. **Credentials**: Select "PMS Supabase"
4. Configure:
   - **Operation**: Get Many Rows
   - **Table**: `clinic_info`
   - **Return All**: true
5. **Tool Description** (paste exactly):
```
Consulta la informacion del consultorio y base de conocimientos. Devuelve nombre, telefono, email, direccion, horarios y el campo base_conocimientos con informacion detallada sobre servicios, politicas y preguntas frecuentes. Usar cuando el paciente pregunta sobre el consultorio, servicios, horarios, ubicacion o cualquier informacion general.
```

---

## C5. Add `listar_medicos` Tool (NEW)

**Add new node:**
1. Add a **Supabase Tool** node and connect it to the Agent 1 node (as a tool)
2. **Node Name**: `listar_medicos`
3. **Credentials**: Select "PMS Supabase"
4. Configure:
   - **Operation**: Get Many Rows
   - **Table**: `medicos_activos`
   - **Return All**: true
5. **Tool Description** (paste exactly):
```
Lista todos los medicos activos del consultorio con su id, nombre, apellido y matricula. Usar cuando el paciente necesita elegir un medico para su turno. El id del medico es necesario para generar el link de reserva.
```

---

## C6. Update Agent 1 System Prompt

Replace the entire system prompt of the **Agent 1** node with the following:

```
Sos la recepcionista virtual del consultorio dermatologico. Tu nombre es Asistente Virtual del Consultorio.

OBJETIVO: Ayudar a los pacientes por WhatsApp a resolver consultas y agendar turnos.

FLUJO DE CONVERSACION:

1. SALUDO: Saludá amablemente y preguntá en que podes ayudar.

2. CONSULTAS GENERALES:
   - Usá consultar_base_conocimientos para responder preguntas sobre servicios, horarios, ubicacion, politicas.
   - Respondé de forma natural con la informacion obtenida.

3. AGENDAR TURNO:
   a) Pedi el DNI del paciente
   b) Usá consultar_paciente_por_dni para verificar si existe
   c) Si NO existe: pedi nombre, apellido, y opcionalmente fecha de nacimiento. Luego usá agregar_paciente para registrarlo.
   d) Si existe: confirmá "Hola [nombre], te encontre en nuestro sistema"
   e) Usá listar_medicos para mostrar los medicos disponibles
   f) Pedi al paciente que elija un medico
   g) Una vez elegido, respondé con tipo="turno"

FORMATO DE RESPUESTA:
Siempre respondé en formato JSON valido:

Para consultas generales:
{
  "tipo": "consulta",
  "mensaje": "tu respuesta al paciente"
}

Para solicitar turno (cuando el paciente ya eligio medico):
{
  "tipo": "turno",
  "mensaje": "mensaje confirmando que se va a generar el link de reserva",
  "paciente_id": "uuid del paciente (obtenido de consultar_paciente_por_dni)",
  "medico_id": "uuid del medico elegido (obtenido de listar_medicos)"
}

REGLAS:
- Siempre respondé en español argentino informal (vos, podes, etc.)
- Sé conciso pero amable
- No inventés informacion que no tengas
- Si no sabes algo, ofrecé comunicar al paciente con el consultorio por telefono
- NUNCA devuelvas IDs o datos tecnicos al paciente en el mensaje
- El campo "mensaje" es lo que se envia al paciente por WhatsApp
- Los campos paciente_id y medico_id son internos, solo incluirlos cuando tipo="turno"
```

---

## C7. Replace Turno Flow (Blacklist+Telegram → Booking Link)

### Delete these nodes:
- `Add to Blacklist1`
- `Get paciente` (Google Sheets lookup)
- `If paciente existente2`
- `Notificar Staff - Solicitud Turno1`
- `Notificar Staff - Solicitud Turno2`
- `Check Pending Turno` / `If Has Pending Turno` / `Check If First Ack`

### Add new nodes after `Switch by Stage` → turno case:

#### Node 1: Code Node — "Prepare Token Request"
- **Type**: Code
- **Language**: JavaScript
- **Code**:
```javascript
const agentOutput = JSON.parse($input.first().json.output || $input.first().json.text);
const phoneNumber = $('Whatsapp Message Data').first().json.phone_number;

return [{
  json: {
    paciente_id: agentOutput.paciente_id,
    medico_id: agentOutput.medico_id,
    phone_number: phoneNumber,
    mensaje: agentOutput.mensaje
  }
}];
```

#### Node 2: HTTP Request — "Create Booking Token"
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://hqpngqfygfcgujyzyqtd.supabase.co/rest/v1/rpc/crear_booking_token`
- **Authentication**: None (use headers)
- **Headers**:
  - `apikey`: `<your-service-role-key>`
  - `Authorization`: `Bearer <your-service-role-key>`
  - `Content-Type`: `application/json`
- **Body** (JSON):
```json
{
  "p_paciente_id": "{{ $json.paciente_id }}",
  "p_medico_id": "{{ $json.medico_id }}",
  "p_phone_number": "{{ $json.phone_number }}"
}
```

#### Node 3: Code Node — "Build Booking Message"
- **Type**: Code
- **Language**: JavaScript
- **Code**:
```javascript
const tokenData = $input.first().json;
const token = Array.isArray(tokenData) ? tokenData[0].token : tokenData.token;
const prevData = $('Prepare Token Request').first().json;

// Replace with your actual domain
const bookingUrl = `https://your-pms-domain.vercel.app/agendar?token=${token}`;

const message = `${prevData.mensaje}\n\nElegí el día y horario que te quede mejor:\n${bookingUrl}`;

return [{
  json: {
    phone_number: prevData.phone_number,
    message: message
  }
}];
```

> **IMPORTANT**: Replace `your-pms-domain.vercel.app` with your actual Vercel deployment URL.

#### Node 4: HTTP Request — "Send Booking Link"
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://api.ycloud.com/v2/whatsapp/messages`
- Copy the exact same yCloud API configuration from your existing "Envio de respuesta" nodes:
  - Same API key header
  - Same `from` number
  - Body:
```json
{
  "from": "{{ $('Whatsapp Message Data').first().json.business_number }}",
  "to": "{{ $json.phone_number }}",
  "type": "text",
  "text": {
    "body": "{{ $json.message }}"
  }
}
```

---

## C8. Remove `disponibilidad_masajista` Flow

**Delete these nodes:**
- `Agent 2: Disponibilidad Response`
- `Get Disponibilidad Masajistas`
- `Lookup Disponibilidad`
- `Envio de respuesta - Disponibilidad`

**In the `Switch by Stage` node:**
- Remove the `disponibilidad_masajista` case/output entirely

---

## C9. Remove Blacklist System

**Delete these nodes:**
- `Check Blacklist1`
- `Check if Blacklisted-cola`
- `Switch Blacklist Status`
- `Reactivar Bot Webhook`

---

## C10. Update Agent Audio Processor Prompt

Find the audio processing agent node (the one that transcribes voice messages) and update its system prompt context from "spa/masajes" to "consultorio dermatologico/turnos medicos".

Replace references to:
- "masaje" → "turno/consulta"
- "masajista" → "medico/doctor"
- "Punto Relax" → "el consultorio"

---

## C11. Optional: Update Telegram Control Commands

If you keep the Telegram control channel:

Update the `#info` command response to show PMS context:
- Current bot status
- Number of active booking tokens
- Recent conversations

Keep `#on`/`#off` as-is for enabling/disabling the bot.

---

## Connection Summary

After all changes, the Agent 1 node should have these tools connected:
1. `consultar_paciente_por_dni` (Supabase → pacientes)
2. `agregar_paciente` (Supabase → pacientes)
3. `consultar_base_conocimientos` (Supabase → clinic_info)
4. `listar_medicos` (Supabase → medicos_activos view)

The turno flow should be:
```
Switch by Stage → turno
  → Prepare Token Request (Code)
  → Create Booking Token (HTTP Request → Supabase RPC)
  → Build Booking Message (Code)
  → Send Booking Link (HTTP Request → yCloud)
```

---

## Testing Checklist

- [ ] Supabase credentials connect successfully
- [ ] Patient lookup by DNI returns data from `pacientes`
- [ ] New patient creation inserts into `pacientes`
- [ ] Doctor listing returns active doctors with names
- [ ] Knowledge base query returns `clinic_info` including `base_conocimientos`
- [ ] Turno flow creates booking token via RPC
- [ ] Booking link message is sent via WhatsApp
- [ ] Patient can open link and see `/agendar` page
- [ ] Token is marked as used after booking completes
