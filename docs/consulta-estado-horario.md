# Consulta Estado Horario Logic

This document explains the logic for determining and displaying the "Estado Horario" (schedule status) for consultas, including "Retraso" (delay - clinic fault) and "Llegada tardía" (late arrival - patient fault).

## Overview

The system tracks two scenarios when a patient is waiting:

| Scenario | Condition | Badge | Color | Meaning |
|----------|-----------|-------|-------|---------|
| **Retraso** | Patient arrived on time or early, but appointment time has passed | "Retraso: Xm" | Yellow | Clinic is behind schedule (clinic's fault) |
| **Llegada tardía** | Patient arrived after the scheduled appointment time | "Llegada tardía" | Gray | Patient arrived late (patient's fault) |

## Logic Definition

A consulta's "Estado Horario" is determined by comparing three timestamps:

- `fecha_hora` - Scheduled appointment time
- `paciente_llego_timestamp` - Time when patient arrived (registered their arrival)
- `NOW` - Current time

### Decision Tree

```
Patient arrived? (paciente_llego_timestamp exists?)
├── NO → Show "—" (no badge)
└── YES → Has appointment time passed? (NOW > fecha_hora?)
    ├── NO → Show "A tiempo" (on time, no badge on dashboard)
    └── YES → Did patient arrive late? (paciente_llego_timestamp > fecha_hora?)
        ├── YES → "Llegada tardía" (gray badge - patient's fault)
        └── NO → "Retraso: Xm" (yellow badge - clinic's fault)
```

### Code Implementation

```typescript
function getEstadoHorario(fechaHora: string, pacienteLlegoTimestamp: string | null) {
  // No badge if patient hasn't arrived
  if (!pacienteLlegoTimestamp) return { type: "none" }

  const appointmentTime = new Date(fechaHora)
  const arrivalTime = new Date(pacienteLlegoTimestamp)
  const currentTime = new Date()

  // No badge if appointment time hasn't passed yet
  if (currentTime <= appointmentTime) return { type: "a_tiempo" }

  // Check if patient arrived late (patient's fault)
  if (arrivalTime > appointmentTime) {
    return { type: "llegada_tardia" }
  }

  // Patient arrived on time or early, but appointment time has passed (clinic's fault)
  const delayMinutes = Math.floor((currentTime - appointmentTime) / 60000)
  return { type: "retraso", minutos: delayMinutes }
}
```

## Display Locations

### 1. Dashboard (Root Route `/`)

The dashboard shows a summary banner and individual badges in the "Consultas de Hoy" section.

#### "Pacientes en Espera" Banner

- **Title**: "Pacientes en Espera"
- **Color**: Blue (`border-blue-500 bg-blue-50`)
- **Icon**: Users icon
- **Count**: ALL patients waiting (both "Retraso" and "Llegada tardía" cases)
- **Purpose**: Quick glance at total patients waiting to be attended

```
┌──────────────────────────────────────────────────────────────┐
│  👥  Pacientes en Espera                                      │
│      Hay 3 pacientes esperando                               │
└──────────────────────────────────────────────────────────────┘
```

#### "Consultas de Hoy" Section Badges

Each consulta row shows an individual badge when applicable:

**Médico Dashboard:**
```
┌───────────────────────────────────────────────────────────────┐
│  4:30 pm  │  Arean, Jorge  │  [Retraso: 15m]  │  [→]         │
│           │  DNI: 34842197 │  (yellow badge)  │              │
└───────────────────────────────────────────────────────────────┘
```

**Recepcionista Dashboard** (includes doctor badge):
```
┌───────────────────────────────────────────────────────────────────────┐
│  4:30 pm  │  Arean, Jorge  │  [Llegada tardía]  │  Dr. Silva  │  [→] │
│           │  DNI: 34842197 │  (gray badge)      │             │      │
└───────────────────────────────────────────────────────────────────────┘
```

### 2. Consultas Table (`/consultas`)

The "Estado Horario" column shows the status for each consulta.

| Estado Horario Value | Color | Condition |
|---------------------|-------|-----------|
| "—" | Muted | Patient hasn't arrived OR status is not "Programada" |
| "A tiempo" | Muted | Patient arrived, appointment time hasn't passed |
| "Retraso: Xm" | Amber/Yellow | Clinic fault - patient waiting |
| "Llegada tardía" | Gray | Patient fault - arrived late |

#### Auto-Update Behavior

Both the dashboard and `/consultas` table automatically update the "Estado Horario" every 60 seconds without requiring a page refresh. This ensures the delay time (e.g., "Retraso: 15m" → "Retraso: 16m") stays accurate.

## Role-Based Views

### Médico View

| Location | What They See |
|----------|--------------|
| Dashboard | Their own consultas only |
| Banner | Count of their patients waiting |
| Consultas Table | All consultas (filtered by default to their own) |

### Recepcionista View

| Location | What They See |
|----------|--------------|
| Dashboard | All médicos' consultas |
| Banner | Count of all patients waiting (all médicos) |
| Consultas de Hoy | Includes "Dr. [Apellido]" badge for each consulta |
| Consultas Table | All consultas (all médicos) |

### Administrador View

| Location | What They See |
|----------|--------------|
| Dashboard | Generic welcome (no Consultas de Hoy section) |
| Consultas Table | All consultas (all médicos) with full access |

## Database Fields

The logic relies on these fields from the `consultas` table:

| Field | Type | Description |
|-------|------|-------------|
| `fecha_hora` | timestamp | Scheduled appointment date/time |
| `paciente_llego_timestamp` | timestamp (nullable) | When patient registered arrival |
| `estado_id` | uuid | Foreign key to `estados_consulta` |

**Note**: The Estado Horario logic only applies to consultas with `estado_codigo = "programada"`. Once a consulta moves to another status (e.g., "en_curso", "completada"), the Estado Horario column shows "—".

## Visual Styling Reference

### Badge Colors

| Badge | Light Mode | Dark Mode |
|-------|------------|-----------|
| **Retraso** (Yellow) | `bg-yellow-100 text-yellow-700` | `bg-yellow-950 text-yellow-300` |
| **Llegada tardía** (Gray) | `bg-gray-100 text-gray-700` | `bg-gray-950 text-gray-300` |

### Banner Colors

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Border** | `border-blue-500` | `border-blue-500` |
| **Background** | `bg-blue-50` | `bg-blue-950/20` |
| **Icon Circle** | `bg-blue-500 text-white` | `bg-blue-500 text-white` |

## Files Reference

| File | Purpose |
|------|---------|
| `app/home/actions.ts` | Server actions for fetching dashboard data |
| `app/home/components/medico-dashboard.tsx` | Médico dashboard UI |
| `app/home/components/recepcionista-dashboard.tsx` | Recepcionista dashboard UI |
| `app/consultas/components/consultas-table.tsx` | Consultas table with Estado Horario column |
| `tailwind.config.ts` | Safelist for dynamic badge colors |
