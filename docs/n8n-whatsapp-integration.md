# n8n WhatsApp Integration for Appointment Booking

This document describes the integration between the PMS (Patient Management System) and n8n for WhatsApp-based appointment booking.

## Overview

The system allows patients to book appointments via WhatsApp using an AI agent orchestrated by n8n. The flow is:

1. Patient sends message via WhatsApp
2. n8n receives the message and processes it with an AI agent
3. AI agent identifies the patient (or creates new one)
4. AI agent shows available doctors
5. AI agent generates a booking link (token)
6. Patient opens link and selects date/time
7. Appointment is created with `origen: 'whatsapp'`

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  WhatsApp   │────▶│    n8n      │────▶│  PMS API    │────▶│  Supabase   │
│  (Patient)  │◀────│  (AI Agent) │◀────│  /api/n8n/* │◀────│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   OpenAI    │
                    │   (LLM)     │
                    └─────────────┘
```

## API Endpoints

All endpoints require the `x-api-key` header for authentication.

### Authentication

Set the API key in your environment:

```bash
# .env.local (Next.js)
N8N_API_KEY=your-secure-api-key-here

# n8n credentials
# Add as HTTP Header Auth or in workflow
```

### 1. Create Booking Token

**Endpoint:** `POST /api/n8n/create-token`

Creates a unique booking token that generates a booking link for the patient.

**Request:**
```json
{
  "paciente_id": "uuid-of-patient",
  "medico_id": "uuid-of-doctor",
  "phone_number": "+5491155555555",  // optional
  "expires_in_hours": 24             // optional, default: 24, max: 168
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "token": "a46cae1b-e6a5-4315-9c7e-a96618c1f41d",
    "booking_url": "https://your-app.vercel.app/agendar?token=a46cae1b-e6a5-4315-9c7e-a96618c1f41d",
    "expires_at": "2026-01-18T15:30:00.000Z",
    "patient_name": "Carlos Rodríguez"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Patient not found: uuid"
}
```

---

### 2. Look Up Patient by DNI

**Endpoint:** `GET /api/n8n/patients?dni=12345678`

Searches for a patient by their DNI number.

**Response (Found):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dni": "12345678",
    "nombre": "Carlos",
    "apellido": "Rodríguez",
    "telefono": "+5491155555555",
    "email": "carlos@email.com",
    "fecha_nacimiento": "1985-03-15",
    "found": true
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Patient not found",
  "found": false
}
```

---

### 3. Create New Patient

**Endpoint:** `POST /api/n8n/patients`

Creates a new patient record.

**Request:**
```json
{
  "dni": "12345678",
  "nombre": "Carlos",
  "apellido": "Rodríguez",
  "fecha_nacimiento": "1985-03-15",
  "telefono": "+5491155555555",     // optional
  "email": "carlos@email.com",       // optional
  "obra_social_id": "uuid"           // optional
}
```

**Response (Created - 201):**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "dni": "12345678",
    "nombre": "Carlos",
    "apellido": "Rodríguez",
    "telefono": "+5491155555555",
    "email": "carlos@email.com",
    "fecha_nacimiento": "1985-03-15"
  },
  "created": true
}
```

**Response (Conflict - 409):**
```json
{
  "success": false,
  "error": "Patient with DNI 12345678 already exists",
  "existing_patient": {
    "id": "existing-uuid",
    "nombre": "Carlos",
    "apellido": "Rodríguez"
  }
}
```

---

### 4. List Active Doctors

**Endpoint:** `GET /api/n8n/doctors`

Returns list of active doctors available for appointments.

**Query Parameters:**
- `especialidad` (optional): Filter by specialty

**Response:**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": "uuid",
        "nombre": "Juan",
        "apellido": "Rattalino",
        "nombre_completo": "Dr. Juan Rattalino",
        "especialidad": "Dermatología",
        "matricula": "12345"
      }
    ],
    "count": 1
  }
}
```

---

## Database Schema

### booking_tokens Table

```sql
CREATE TABLE booking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  phone_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,              -- Set when booking is completed
  consulta_id UUID REFERENCES consultas(id),  -- Links to created appointment
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### consultas.origen Column

The `origen` column in `consultas` table tracks how the appointment was created:
- `'web'` - Created through the web application
- `'whatsapp'` - Created through WhatsApp booking flow

---

## Booking Page (/agendar)

The public booking page at `/agendar?token=xxx` allows patients to:

1. View their name and assigned doctor
2. Select a date from the calendar (Calendly-style UI)
3. Select an available time slot
4. Confirm the booking

**Features:**
- Mobile-responsive design
- Light mode enforced (regardless of system preferences)
- Available dates highlighted with blue circles
- Sticky header on time selection screen
- Token validation (expired, used, invalid states handled)

**Token States:**
- Valid: Shows booking form
- Expired: Shows expiration message
- Used: Shows "already used" message
- Invalid: Shows error message

---

## n8n Workflow Configuration (Guidance)

### Recommended Workflow Structure

```
┌──────────────────┐
│ WhatsApp Trigger │
│ (Webhook)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ AI Agent Node    │
│ (OpenAI/Claude)  │
│                  │
│ Tools:           │
│ - lookup_patient │
│ - create_patient │
│ - list_doctors   │
│ - create_token   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ WhatsApp Send    │
│ (Response)       │
└──────────────────┘
```

### AI Agent Tools Configuration

Define these as HTTP Request tools for the AI Agent:

#### Tool 1: lookup_patient
```json
{
  "name": "lookup_patient",
  "description": "Search for a patient by their DNI number. Returns patient info if found.",
  "method": "GET",
  "url": "https://your-app.vercel.app/api/n8n/patients",
  "query_params": {
    "dni": "{{dni}}"
  },
  "headers": {
    "x-api-key": "{{$credentials.apiKey}}"
  }
}
```

#### Tool 2: create_patient
```json
{
  "name": "create_patient",
  "description": "Register a new patient. Use when lookup_patient returns not found.",
  "method": "POST",
  "url": "https://your-app.vercel.app/api/n8n/patients",
  "headers": {
    "x-api-key": "{{$credentials.apiKey}}",
    "Content-Type": "application/json"
  },
  "body": {
    "dni": "{{dni}}",
    "nombre": "{{nombre}}",
    "apellido": "{{apellido}}",
    "fecha_nacimiento": "{{fecha_nacimiento}}",
    "telefono": "{{telefono}}"
  }
}
```

#### Tool 3: list_doctors
```json
{
  "name": "list_doctors",
  "description": "Get list of available doctors for appointments.",
  "method": "GET",
  "url": "https://your-app.vercel.app/api/n8n/doctors",
  "headers": {
    "x-api-key": "{{$credentials.apiKey}}"
  }
}
```

#### Tool 4: create_booking_link
```json
{
  "name": "create_booking_link",
  "description": "Generate a booking link for the patient to schedule their appointment.",
  "method": "POST",
  "url": "https://your-app.vercel.app/api/n8n/create-token",
  "headers": {
    "x-api-key": "{{$credentials.apiKey}}",
    "Content-Type": "application/json"
  },
  "body": {
    "paciente_id": "{{paciente_id}}",
    "medico_id": "{{medico_id}}",
    "phone_number": "{{phone_number}}"
  }
}
```

### Sample AI Agent System Prompt

```
You are a helpful assistant for a dermatology clinic. Your job is to help patients book appointments via WhatsApp.

WORKFLOW:
1. Greet the patient and ask for their DNI to identify them
2. Use lookup_patient tool to find them
3. If not found, collect: nombre, apellido, fecha_nacimiento, and use create_patient
4. Show available doctors using list_doctors
5. Once patient selects a doctor, use create_booking_link
6. Send the booking_url to the patient

IMPORTANT:
- Always communicate in Spanish
- Be friendly and professional
- Confirm information before creating records
- The booking link expires in 24 hours
```

---

## Environment Variables

### Next.js App (.env.local)

```bash
# API key for n8n endpoints
N8N_API_KEY=your-secure-random-key

# App URL (for booking links)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### n8n

Store the API key in n8n credentials and reference in workflows.

---

## Testing

### Manual Token Creation (SQL)

```sql
INSERT INTO booking_tokens (paciente_id, medico_id, expires_at)
VALUES (
  'patient-uuid-here',
  'doctor-uuid-here',
  NOW() + INTERVAL '24 hours'
)
RETURNING token;
```

### Test Booking URL

```
http://localhost:3000/agendar?token=<token-from-above>
```

### Test API Endpoints (cURL)

```bash
# List doctors
curl -H "x-api-key: your-key" \
  https://your-app.vercel.app/api/n8n/doctors

# Look up patient
curl -H "x-api-key: your-key" \
  "https://your-app.vercel.app/api/n8n/patients?dni=12345678"

# Create patient
curl -X POST \
  -H "x-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"dni":"12345678","nombre":"Test","apellido":"Patient","fecha_nacimiento":"1990-01-01"}' \
  https://your-app.vercel.app/api/n8n/patients

# Create booking token
curl -X POST \
  -H "x-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"paciente_id":"uuid","medico_id":"uuid"}' \
  https://your-app.vercel.app/api/n8n/create-token
```

---

## Security Considerations

1. **API Key Protection**: The `N8N_API_KEY` should be a long, random string
2. **Token Expiration**: Booking tokens expire after 24 hours by default
3. **One-Time Use**: Each token can only be used once
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Consider adding rate limiting for production

---

## File Structure

```
app/
├── api/
│   └── n8n/
│       ├── auth.ts              # API key validation helper
│       ├── create-token/
│       │   └── route.ts         # POST /api/n8n/create-token
│       ├── patients/
│       │   └── route.ts         # GET & POST /api/n8n/patients
│       └── doctors/
│           └── route.ts         # GET /api/n8n/doctors
├── agendar/
│   ├── page.tsx                 # Public booking page
│   ├── actions.ts               # Server actions for booking
│   ├── types.ts                 # TypeScript types
│   └── components/
│       ├── booking-form.tsx     # Main booking form
│       ├── booking-calendar.tsx # Date picker (Calendly-style)
│       ├── booking-calendar.css # Calendar custom styles
│       ├── booking-summary.tsx  # Patient/doctor header
│       ├── booking-date-step.tsx
│       ├── booking-time-step.tsx
│       ├── booking-success.tsx  # Confirmation screen
│       └── booking-error.tsx    # Error states
```

---

## Changelog

- **Phase 1**: Created `booking_tokens` table and `consultas.origen` column
- **Phase 2**: Built booking page (`/agendar`) with Calendly-inspired UI
- **Phase 3**: Added n8n API endpoints for WhatsApp integration
