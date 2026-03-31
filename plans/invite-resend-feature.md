# Implementation Plan: Re-send Invitation & Account Status Feature

## Overview

Add the ability for admins to re-send invitations to users who haven't completed their account setup, and display clear account status indicators.

## Problem Being Solved

1. Users who click invite link but abandon can't complete setup (token consumed)
2. "Restablecer Contraseña" doesn't work for users who never set a password
3. "Último acceso" shows misleading timestamps for incomplete invites
4. Admin has no visibility into whether invite was completed

## Solution

### Data Changes

**Add `email_confirmed_at` to fetched user data:**

| Entity | Fetch Function | File |
|--------|---------------|------|
| Médico | `fetchMedicos()` | `app/medicos/actions.ts` |
| Recepcionista | `fetchRecepcionistas()` | `app/recepcionistas/actions.ts` |

This field comes from Supabase auth user and indicates:
- `null` → Invite pending (never completed password setup)
- Has value → Account active (completed setup)

### New Server Actions

**1. `resendMedicoInvite(email: string)`** - `app/medicos/actions.ts`
```typescript
// Calls adminClient.auth.admin.inviteUserByEmail()
// Returns { success: boolean, error: string | null }
```

**2. `resendRecepcionistaInvite(email: string)`** - `app/recepcionistas/actions.ts`
```typescript
// Calls adminClient.auth.admin.inviteUserByEmail()
// Returns { success: boolean, error: string | null }
```

### Type Changes

**Update `Medico` interface** (`app/medicos/actions.ts`):
```typescript
export interface Medico {
  // ... existing fields
  email_confirmed_at: string | null  // NEW
}
```

**Update `Recepcionista` interface** (`app/recepcionistas/actions.ts`):
```typescript
export interface Recepcionista {
  // ... existing fields
  email_confirmed_at: string | null  // NEW
}
```

### UI Changes

#### 1. List Views (`/medicos` and `/recepcionistas`)

**3-dot menu conditional logic:**
```
if (email_confirmed_at === null) {
  Show: "Re-enviar Invitación" with Mail icon
} else {
  Show: "Restablecer Contraseña" with KeyRound icon
}
```

**Account status indicator (new):**
```
if (email_confirmed_at === null) {
  Show: Badge "⚠️ Pendiente" (yellow/warning style)
} else {
  Show: Badge "✅ Activa" (green/success style)
}
```

**Último acceso display:**
```
if (email_confirmed_at === null) {
  Show: "—" or hide entirely
} else {
  Show: formatted last_sign_in_at
}
```

**Files to modify:**
- `app/medicos/components/medicos-cards.tsx`
- `app/recepcionistas/components/recepcionistas-cards.tsx`

#### 2. Detail Pages (`/medicos/[id]` and `/recepcionistas/[id]`)

**Gestión de Contraseña card:**
```
if (email_confirmed_at === null) {
  Button: "Re-enviar Invitación"
  Description: "Envía un nuevo email de invitación..."
} else {
  Button: "Restablecer Contraseña"
  Description: "Envía un email con instrucciones..."
}
```

**Account status indicator:**
Same as list views - show badge in audit section or header

**Último acceso display:**
Same logic as list views

**Files to modify:**
- `app/medicos/[id]/components/medico-info-content.tsx`
- `app/medicos/[id]/actions.ts` (add `resendMedicoInvite`)
- `app/recepcionistas/[id]/components/recepcionista-detail-content.tsx`
- `app/recepcionistas/[id]/actions.ts` (add `resendRecepcionistaInvite`)

---

## Implementation Order

### Phase 1: Data Layer
1. Update `fetchMedicos()` to include `email_confirmed_at` from auth user
2. Update `fetchRecepcionistas()` to include `email_confirmed_at` from auth user
3. Update type interfaces

### Phase 2: New Actions
4. Add `resendMedicoInvite()` action
5. Add `resendRecepcionistaInvite()` action

### Phase 3: List Views UI
6. Update `medicos-cards.tsx`:
   - Add account status badge
   - Conditional 3-dot menu item
   - Conditional último acceso display
7. Update `recepcionistas-cards.tsx`:
   - Same changes as above

### Phase 4: Detail Pages UI
8. Update `medico-info-content.tsx`:
   - Add account status indicator
   - Conditional button in password card
   - Conditional último acceso display
9. Update `recepcionista-detail-content.tsx`:
   - Same changes as above

### Phase 5: Detail Page Actions
10. Add/update actions in `app/medicos/[id]/actions.ts`
11. Add/update actions in `app/recepcionistas/[id]/actions.ts`

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/medicos/actions.ts` | Add `email_confirmed_at` to fetch, add `resendMedicoInvite()` |
| `app/recepcionistas/actions.ts` | Add `email_confirmed_at` to fetch, add `resendRecepcionistaInvite()` |
| `app/medicos/components/medicos-cards.tsx` | Conditional menu, status badge, último acceso |
| `app/recepcionistas/components/recepcionistas-cards.tsx` | Conditional menu, status badge, último acceso |
| `app/medicos/[id]/components/medico-info-content.tsx` | Conditional button, status badge |
| `app/medicos/[id]/actions.ts` | Add `resendMedicoInvite()` |
| `app/recepcionistas/[id]/components/recepcionista-detail-content.tsx` | Conditional button, status badge |
| `app/recepcionistas/[id]/actions.ts` | Add `resendRecepcionistaInvite()` |

---

## UI Mockup

### Card View (List)
```
┌─────────────────────────────────────────┐
│  Dr. Juan Pérez              [⋮]       │
│  juan@email.com                         │
│  ─────────────────────────────────────  │
│  📞 +54 11 1234-5678                    │
│  [OSDE] [Swiss Medical]                 │
│                                         │
│  Estado: ⚠️ Pendiente                   │  ← NEW
│  Último acceso: —                       │  ← Changed
│                                         │
│                            [Ver]        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Dra. María López            [⋮]       │
│  maria@email.com                        │
│  ─────────────────────────────────────  │
│  📞 +54 11 5678-1234                    │
│  [OSDE]                                 │
│                                         │
│  Estado: ✅ Activa                      │  ← NEW
│  Último acceso: 28/01/2026 a las 10:30  │
│                                         │
│                            [Ver]        │
└─────────────────────────────────────────┘
```

### 3-dot Menu (Pending User)
```
┌─────────────────────┐
│  Editar             │  (disabled)
│  ────────────────── │
│  📧 Re-enviar       │  ← Shows this
│     Invitación      │
│  ────────────────── │
│  🗑️ Eliminar        │
└─────────────────────┘
```

### 3-dot Menu (Active User)
```
┌─────────────────────┐
│  Editar             │  (disabled)
│  ────────────────── │
│  🔑 Restablecer     │  ← Shows this
│     Contraseña      │
│  ────────────────── │
│  🗑️ Eliminar        │
└─────────────────────┘
```

---

## Testing Checklist

- [ ] New médico created → shows "Pendiente" + "Re-enviar Invitación"
- [ ] After completing invite → shows "Activa" + "Restablecer Contraseña"
- [ ] Re-send invite works for pending users
- [ ] Password reset works for active users
- [ ] Detail pages show same indicators
- [ ] Último acceso hidden/shown appropriately
