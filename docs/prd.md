# PRD: Patient Management System (PMS) - Dermatology Clinic

**Version**: 1.2
**Date**: November 15, 2025
**Status**: Draft

---

## 1. Product Overview

### Product Name
This Patient Management System (PMS) app will serve as a template for patient management platforms developed for clinics and similar medical practices.
The product name and branding will be customized for each client implementation.

### Vision
A streamlined web-based patient management system for a dermatology clinic to digitize patient records, manage appointments, and document medical consultations.

### Goals
- Digitize patient records and medical history
- Manage appointment scheduling with conflict detection and doctor availability
- Enable efficient medical documentation
- Maintain secure, role-based access to information

### Language
The primary version of the system will be developed in Spanish, including all user-facing interfaces, labels, and messages.
An English version may be considered in future phases.

---

## 2. User Roles

**Role Name**: Recepcionista (Receptionist/Secretary)

---

## 3. Role Permissions

| Capability | Recepcionista | Médico | Administrador |
|------------|---------------|---------|---------------|
| Register & edit patients | ✅ | ✅ | ✅ |
| Search patients | ✅ | ✅ | ✅ |
| View medical history | ❌ | ✅ | ✅ |
| Schedule/cancel appointments | ✅ | ✅ | ✅ |
| Edit consultation details | ❌ | ✅ | ✅ |
| Update appointment status | Limited* | ✅ | ✅ |
| Manage doctors & schedules | ❌ | ❌ | ✅ |
| Manage insurance providers | ❌ | ❌ | ✅ |
| Manage system users | ❌ | ❌ | ✅ |

*Recepcionista can only change status to: cancelada, ausente (from programada only)

---

## 4. Core Features (MVP)

### 4.1 Patient Management
- **Register patients** with minimum required fields: DNI, nombre, apellido, fecha_nacimiento, obra_social_id
- **Search patients** by DNI, nombre, apellido, or teléfono
- **View/Edit patient profiles** with all information from pacientes table
- **Validation**: Unique DNI check, valid fecha_nacimiento

### 4.2 Appointment Scheduling
- **Create appointments** by selecting patient, doctor, date/time, duration (default 30 min)
- **Conflict detection**: Check for overlapping appointments with same doctor
- **Availability check**: Verify doctor is available based on their weekly schedule (medicos_horarios)
- **View appointments**: Calendar (day/week/month) and list views with filters
- **Status management**: programada, en_curso, completada, cancelada, ausente (see Section 7 for detailed flow)
- **Reschedule/Cancel**: Update appointment times or change status based on role permissions

### 4.3 Doctor Availability Management (Admin only)
- **Define weekly schedules** for each doctor (e.g., Monday-Friday, 10:00-15:00)
- **Multiple time blocks**: Support different hours per day (e.g., morning and afternoon shifts)
- **Activate/Deactivate**: Enable or disable specific schedule blocks
- **Used for**: Appointment scheduling validation and displaying available time slots

### 4.4 Medical Records (Médico & Admin only)
- **Complete consultations**: Add informe, diagnóstico, tratamiento, receta
- **Set follow-up**: Schedule próxima_consulta date
- **Upload files**: Store dermatology photos/documents (archivos_adjuntos as jsonb)
- **View patient history**: List all completed consultations with diagnoses and treatments
- **Private notes**: Add notas_privadas not visible to other roles

### 4.5 System Administration (Admin only)
- **Manage doctors**: CRUD operations on medicos table
- **Manage insurance providers**: CRUD operations on obras_sociales table
- **Manage doctor-insurance relationships**: Define coverage agreements, copays, authorization requirements
- **User management**: Create accounts and assign roles

---

## 5. Key User Flows

### Flow 1: Schedule Appointment
1. User searches for patient by DNI → If not found, creates new patient
2. Clicks "Agendar Consulta"
3. Selects doctor, date/time
4. System validates: (a) Doctor availability from medicos_horarios, (b) No scheduling conflicts
5. If valid → Creates appointment with estado "programada"

### Flow 2: Complete Consultation (Doctor)
1. Doctor views today's appointments
2. Selects appointment → Changes estado to "en_curso"
3. After consultation, fills: diagnóstico, tratamiento, receta, informe, próxima_consulta
4. Optionally uploads dermatology photos
5. Changes estado to "completada" → Saves

### Flow 3: Manage Doctor Availability (Admin)
1. Admin navigates to doctor profile
2. Clicks "Gestionar Horarios"
3. Adds weekly schedule entries (e.g., Monday 10:00-15:00, Tuesday 10:00-15:00)
4. Saves → System uses these schedules for appointment validation

---

## 6. Technical Stack
- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **Deployment**: Vercel

---

## 7. Appointment Status Flow & State Management

### 7.1 Available Appointment States

The system implements a strict state machine for appointment management with the following states:

#### 1. PROGRAMADA (Scheduled)
- **Code**: `programada`
- **Description**: Appointment scheduled and pending attention
- **Final State**: No
- **Who can create**: Recepcionista, Médico, Administrador
- **Allowed transitions**:
  - `programada` (reschedule - same appointment with new date/time)
  - `cancelada` (cancel with notice)
  - `ausente` (mark patient absent)
  - `en_curso` (doctor starts consultation)

#### 2. EN_CURSO (In Progress)
- **Code**: `en_curso`
- **Description**: Doctor is actively seeing the patient
- **Final State**: No
- **Who can transition to this state**: Médico, Administrador
- **Allowed transitions**:
  - `completada` (finish consultation and save medical records)
- **Important**: Once `en_curso`, appointment CANNOT be cancelled. If there's an issue, doctor must complete with appropriate notes.

#### 3. COMPLETADA (Completed)
- **Code**: `completada`
- **Description**: Consultation completed with medical record saved
- **Final State**: YES
- **Who can transition to this state**: Médico, Administrador
- **Allowed transitions**: None (terminal state)
- **Editable fields after completion**:
  - `diagnostico`, `tratamiento`, `receta`, `informe`
  - `notas_privadas`, `archivos_adjuntos`, `proxima_consulta`
- **Non-editable fields after completion**:
  - `estado_id`, `fecha_hora`, `paciente_id`, `medico_id`, `duracion_minutos`

#### 4. CANCELADA (Cancelled)
- **Code**: `cancelada`
- **Description**: Appointment cancelled with advance notice
- **Final State**: YES
- **Who can transition to this state**: Recepcionista, Médico, Administrador
- **When to use**:
  - Patient calls to cancel
  - Doctor unavailable (emergency, illness)
  - Clinic closed (holiday, maintenance)
- **Effect**: Time slot becomes available for other appointments

#### 5. AUSENTE (No-Show)
- **Code**: `ausente`
- **Description**: Patient did not show up for appointment
- **Final State**: YES
- **Who can transition to this state**: Recepcionista, Médico, Administrador
- **When to use**:
  - Patient did NOT notify of absence
  - Appointment time passed and patient did not arrive
- **Effect**: Time slot becomes available, absence recorded for metrics

### 7.2 State Transition Diagram

```
                    ┌─────────────┐
                    │  PROGRAMADA │ ← Initial state on creation
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┬──────────────┐
              │            │            │              │
              ▼            ▼            ▼              ▼
       ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
       │CANCELADA │  │ AUSENTE  │  │PROGRAMADA│  │ EN_CURSO │
       │(final)   │  │ (final)  │  │(reschedule)  └────┬─────┘
       └──────────┘  └──────────┘  └──────────┘       │
                                                       ▼
                                                ┌──────────────┐
                                                │  COMPLETADA  │
                                                │   (final)    │
                                                └──────────────┘
```

### 7.3 Role-Based State Transition Permissions

#### Recepcionista
| Action | Permitted | Notes |
|--------|-----------|-------|
| Create appointment (programada) | ✅ | Initial state |
| Reschedule appointment | ✅ | Only if estado = programada |
| Cancel appointment | ✅ | Only from programada |
| Mark absent | ✅ | Only from programada |
| Start consultation (en_curso) | ❌ | Médico only |
| Complete consultation | ❌ | Médico only |
| Edit medical details | ❌ | Médico/Admin only |

#### Médico
| Action | Permitted | Notes |
|--------|-----------|-------|
| Create appointment (programada) | ✅ | Initial state |
| Reschedule appointment | ✅ | Only if estado = programada |
| Cancel appointment | ✅ | Only from programada |
| Mark absent | ✅ | Only from programada |
| Start consultation (en_curso) | ✅ | Only from programada |
| Complete consultation | ✅ | Only from en_curso |
| Edit medical details | ✅ | Even after completada |

#### Administrador
| Action | Permitted | Notes |
|--------|-----------|-------|
| All transitions | ✅ | Can perform ANY state change |
| Edit medical details | ✅ | Any state |
| **Bypass restrictions** | ✅ | Override normal flow (use with caution) |

### 7.4 Schedule Conflict Detection

When verifying schedule availability, **EXCLUDE** appointments with these states:
- `cancelada`
- `ausente`

**INCLUDE** in conflict checking:
- `programada`
- `en_curso`
- `completada` (in case consultation extended)

### 7.5 Common Use Cases

**Case 1: Normal Flow**
1. Recepcionista creates appointment → `programada`
2. Médico sees patient waiting
3. Médico clicks "Iniciar consulta" → `en_curso`
4. Médico completes examination
5. Médico fills diagnosis, treatment, prescription
6. Médico clicks "Guardar y finalizar" → `completada`

**Case 2: Patient Cancels with Notice**
1. Appointment in `programada`
2. Recepcionista receives cancellation call
3. Recepcionista changes to `cancelada`
4. Time slot freed for other patients

**Case 3: Patient No-Show**
1. Appointment `programada` at 10:00
2. Time is 10:30, patient hasn't arrived
3. Recepcionista marks as `ausente`
4. Absence recorded, slot freed

**Case 4: Doctor Corrects Information**
1. Appointment in `completada`
2. Médico accesses completed consultation
3. Médico edits `diagnostico` only
4. Cannot change estado, fecha, paciente, or médico
5. Saves changes, estado remains `completada`

**Case 5: Admin Emergency Override**
1. Appointment in `completada`
2. Administrador has bypass privileges
3. Administrador can change to any state (exceptional case)
4. Should include confirmation/audit trail

---

## 8. Appointment Validation Logic

### Check Doctor Availability
```sql
-- Verify doctor has availability for the requested time
SELECT * FROM medicos_horarios
WHERE medico_id = [selected_doctor]
  AND dia_semana = EXTRACT(DOW FROM [appointment_datetime])
  AND hora_inicio <= [appointment_time]::time
  AND hora_fin > [appointment_time]::time
  AND activo = true;
```

### Check Scheduling Conflicts
```sql
-- Verify no overlapping appointments exist
-- Only check appointments that block the schedule (exclude cancelada and ausente)
SELECT c.*
FROM consultas c
INNER JOIN estados_consulta ec ON c.estado_id = ec.id
WHERE c.medico_id = [selected_doctor]
  AND ec.codigo NOT IN ('cancelada', 'ausente')
  AND c.fecha_hora < [new_end_time]
  AND (c.fecha_hora + (c.duracion_minutos * interval '1 minute')) > [new_start_time]
```

---

## 9. Database Schema Summary

### Tables:
1. **pacientes** - Patient information and demographics
2. **medicos** - Doctor profiles and credentials
3. **consultas** - Appointments and medical consultations
4. **estados_consulta** - Appointment state definitions (lookup table)
5. **obras_sociales** - Insurance providers
6. **medicos_obras_sociales** - Doctor-insurance relationships and coverage terms
7. **medicos_horarios** - Doctor weekly availability schedules

### Key Relationships:
- `pacientes.obra_social_id` → `obras_sociales.id`
- `consultas.paciente_id` → `pacientes.id`
- `consultas.medico_id` → `medicos.id`
- `consultas.estado_id` → `estados_consulta.id`
- `medicos_obras_sociales.medico_id` → `medicos.id`
- `medicos_obras_sociales.obra_social_id` → `obras_sociales.id`
- `medicos_horarios.medico_id` → `medicos.id`

### estados_consulta (Lookup Table)
Defines the available appointment states and their metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| codigo | varchar | Unique state code (programada, en_curso, completada, cancelada, ausente) |
| nombre | varchar | Display name in Spanish |
| descripcion | text | State description |
| es_estado_final | boolean | Whether this is a terminal state |
| orden | integer | Display order |
| created_at | timestamptz | Record creation |
| updated_at | timestamptz | Record update |

**Notes:**
- This is a reference table containing exactly 5 states
- RLS: All roles can read, only Admin can modify
- Default estado_id in consultas table: `(SELECT id FROM estados_consulta WHERE codigo = 'programada')`

### medicos_horarios
Stores weekly recurring availability schedules for doctors.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| medico_id | uuid | FK to medicos |
| dia_semana | integer | Day of week (0=Sunday...6=Saturday) |
| hora_inicio | time | Start time (e.g., 10:00:00) |
| hora_fin | time | End time (e.g., 15:00:00) |
| activo | boolean | Whether schedule is active |
| created_at | timestamptz | Record creation |
| updated_at | timestamptz | Record update |

**Example**: Doctor Diego Silva works Monday-Friday, 10:00-15:00
- 5 rows, one for each day (dia_semana 1-5)
- hora_inicio: 10:00:00, hora_fin: 15:00:00

---

## 10. Out of Scope (Future Phases)
- Patient self-service portal
- Automated appointment reminders (SMS/email)
- Billing & invoicing
- Advanced reporting & analytics
- Multi-clinic support
- Mobile app
- Exception handling for doctor schedules (holidays, vacations)

## 11. Success Criteria
- All 3 roles functional with correct permissions
- Patient search < 1 second response time
- Appointment scheduling validates both availability and conflicts
- State transitions enforce proper workflow (e.g., cannot cancel appointments in `en_curso`)
- Doctor can complete consultation documentation in < 3 minutes
- Zero unauthorized access to medical records
- Zero unauthorized state transitions

## 12. Implementation References

For detailed implementation guidelines on the appointment status flow, refer to:
- **Estado Flow Documentation**: `docs/estados-consulta-flow.md`
- **TypeScript Types**: `lib/types/estados-consulta.ts`
- **Database Migrations**:
  - `supabase/migrations/20251114000004_create_estados_consulta_table.sql`
  - `supabase/migrations/20251114000006_create_consultas_table.sql`

---

**End of PRD**
