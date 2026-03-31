# WhatsApp Appointment Booking Agent - Implementation Plan

## Overview

Build an AI agent orchestrated by n8n that handles appointment scheduling via WhatsApp. The agent manages patient identification, doctor selection, and generates a secure booking link. The actual date/time selection happens in a new responsive web UI.

**Reference workflow:** `context/workflow.json` (existing n8n workflow for "Punto Relax Hombres" to be adapted)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHATSAPP (via yCloud)                                              │
│  └── n8n Workflow                                                   │
│      ├── Agent: Receptionist (handles conversation)                 │
│      ├── Tools: Supabase (pacientes, medicos queries)               │
│      └── Output: Booking link with secure token                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NEXT.JS (/agendar)                                                 │
│  └── Public booking page                                            │
│      ├── Validates token                                            │
│      ├── Shows calendar + available time slots                      │
│      ├── Creates consulta on confirmation                           │
│      └── Triggers confirmation email (existing system)              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Changes

### 1.1 New Table: `booking_tokens`

```sql
CREATE TABLE booking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  phone_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  consulta_id UUID REFERENCES consultas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX idx_booking_tokens_token ON booking_tokens(token);

-- RLS policies for public access (read-only for valid tokens)
ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
```

### 1.2 Schema Modification: `consultas.origen`

```sql
ALTER TABLE consultas
ADD COLUMN origen TEXT NOT NULL DEFAULT 'web'
CHECK (origen IN ('web', 'whatsapp'));

COMMENT ON COLUMN consultas.origen IS 'Source of appointment: web (staff), whatsapp (patient booking)';
```

**Files to create:**
- `supabase/migrations/YYYYMMDD000001_create_booking_tokens.sql`
- `supabase/migrations/YYYYMMDD000002_add_consultas_origen.sql`

---

## Phase 2: Next.js Booking Page (`/agendar`)

### 2.1 Page Structure

```
app/agendar/
├── page.tsx              # Server component - validates token, fetches data
├── actions.ts            # Server actions - token validation, booking creation
├── types.ts              # TypeScript interfaces
└── components/
    ├── booking-form.tsx       # Client component - main booking UI
    ├── booking-calendar.tsx   # Date selection (reuses Calendar component)
    ├── booking-slots.tsx      # Time slots (reuses SlotSelector)
    ├── booking-summary.tsx    # Header with patient/doctor info
    ├── booking-success.tsx    # Confirmation screen
    └── booking-error.tsx      # Error states (expired, used, invalid)
```

### 2.2 Key Features

| Feature | Implementation |
|---------|---------------|
| **Token validation** | Server-side check: exists, not expired, not used |
| **Calendar** | Reuse `/components/ui/calendar.tsx` |
| **Time slots** | Reuse `/app/consultas/components/slot-selector.tsx` |
| **Slot calculation** | Reuse `/lib/utils/slot-calculator.ts` |
| **Booking creation** | Server action creates consulta with `origen='whatsapp'` |
| **Email notification** | Calls existing `sendConfirmationEmail()` function |
| **Responsive design** | Mobile-first, matches provided screenshot |

### 2.3 User Flow

1. Patient opens link: `/agendar?token=abc123`
2. Server validates token → shows error if invalid/expired/used
3. UI displays: Patient name, Doctor name, Calendar
4. Patient selects date → loads available time slots
5. Patient selects time → clicks "Confirmar Turno"
6. Server creates consulta, marks token as used
7. UI shows success message with appointment details
8. Email confirmation sent automatically (existing system)

---

## Phase 3: n8n Workflow

### 3.1 Workflow Overview

Adapt the existing workflow structure (`context/workflow.json`) with these modifications:

| Component | Change |
|-----------|--------|
| **Data storage** | Replace Google Sheets → Supabase |
| **Knowledge base** | Replace Google Docs → Supabase or static prompts |
| **Agent prompts** | Adapt for dermatology clinic context |
| **Booking output** | Generate secure booking link instead of human handoff |

### 3.2 Agent Capabilities

**Main Agent (Receptionist):**
- Greet patient
- Ask for DNI
- Query/create patient in Supabase
- Show available doctors
- Generate booking link
- Detect cancellation/rescheduling intent → defer to human

**Tools (Supabase):**
- `consultar_paciente_por_dni` - Query pacientes by DNI
- `agregar_paciente` - Create new patient (minimum fields: DNI, nombre, apellido, fecha_nacimiento)
- `listar_medicos` - Get active doctors
- `crear_booking_token` - Generate booking token (24h expiration)

### 3.3 Conversation Flow

```
1. Patient: "Hola, quiero sacar un turno"
2. Agent: "¡Hola! ¿Me pasás tu DNI?"
3. Patient: "12345678"
4. Agent: [Queries Supabase]
   → If found: "Hola [Nombre], ¿con qué médico querés atenderte?"
   → If not found: "No te encontré. ¿Me decís tu nombre, apellido y fecha de nacimiento?"
5. Patient: [Provides info if needed]
6. Agent: [Creates patient if needed] "¿Con qué médico querés atenderte?
   1. Dr. Lotocki
   2. Dra. García"
7. Patient: "Con Lotocki"
8. Agent: [Creates booking token] "Perfecto! Elegí día y horario acá: [link]"
```

### 3.4 Intent Detection

| Intent | Action |
|--------|--------|
| Greeting / General inquiry | Respond naturally |
| Appointment booking | Start booking flow |
| Cancellation / Rescheduling | Defer to human + notify staff |
| Other | Answer or defer |

---

## Phase 4: Testing & Verification

### 4.1 Database

- [ ] Run migrations successfully
- [ ] Verify `booking_tokens` table created
- [ ] Verify `consultas.origen` column added
- [ ] Test RLS policies

### 4.2 Booking Page

- [ ] Invalid token shows error
- [ ] Expired token shows error
- [ ] Used token shows error
- [ ] Valid token loads booking UI
- [ ] Calendar shows only doctor's working days
- [ ] Time slots load correctly for selected date
- [ ] Past dates are disabled
- [ ] Booking creates consulta with `origen='whatsapp'`
- [ ] Token marked as used after booking
- [ ] Confirmation email sent
- [ ] Mobile responsive layout

### 4.3 n8n Workflow

- [ ] WhatsApp messages received correctly
- [ ] Patient lookup by DNI works
- [ ] New patient creation works
- [ ] Doctor list displays correctly
- [ ] Booking token created in Supabase
- [ ] Link returned to patient
- [ ] Cancellation intent detected and deferred

---

## Implementation Order

1. **Database migrations** (Phase 1)
   - Create `booking_tokens` table
   - Add `origen` column to `consultas`

2. **Booking page** (Phase 2)
   - Server actions for token validation and booking
   - UI components (reusing existing calendar/slots)
   - Success/error states

3. **n8n workflow** (Phase 3)
   - Configure Supabase credentials
   - Create Supabase tools for agent
   - Adapt agent prompts
   - Test end-to-end flow

---

## Files to Create/Modify

### New Files
- `supabase/migrations/YYYYMMDD000001_create_booking_tokens.sql`
- `supabase/migrations/YYYYMMDD000002_add_consultas_origen.sql`
- `app/agendar/page.tsx`
- `app/agendar/actions.ts`
- `app/agendar/types.ts`
- `app/agendar/components/booking-form.tsx`
- `app/agendar/components/booking-calendar.tsx`
- `app/agendar/components/booking-slots.tsx`
- `app/agendar/components/booking-summary.tsx`
- `app/agendar/components/booking-success.tsx`
- `app/agendar/components/booking-error.tsx`

### Modified Files
- `lib/types/index.ts` (export new types)

### Reused (No Changes)
- `components/ui/calendar.tsx`
- `app/consultas/components/slot-selector.tsx`
- `lib/utils/slot-calculator.ts`
- `lib/email/appointment-emails.ts`

---

## Out of Scope (v1)

- WhatsApp confirmation message after booking
- Cancellation via WhatsApp (defers to human)
- Rescheduling via WhatsApp (defers to human)
- Motivo field in booking UI
- Tipo de consulta selection

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Link security** | Database token (24h expiration) | Trackable, single-use, enables follow-up |
| **Appointment source tracking** | `origen` column: `web` / `whatsapp` | Analytics, auditing |
| **Tipo de consulta** | Excluded from flow | Not mandatory, simplifies UX |
| **Cancellation/Rescheduling** | Defer to human | v1 scope management |
| **Post-booking notification** | Email only (existing system) | No WhatsApp confirmation in v1 |
