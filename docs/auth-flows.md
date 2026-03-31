# Authentication Flows

This document describes the authentication and account management processes in the Patient Management System, including user invitations, password resets, re-sending invitations, account status detection, and médico reactivation.

## Overview

The system handles four main authentication scenarios:

| Scenario | Email Template | Route | Token Type |
|----------|---------------|-------|------------|
| New user invitation | Invite User | `/auth/set-password` | `invite` |
| Re-send invitation | Invite User | `/auth/set-password` | `invite` |
| Password reset | Reset Password | `/auth/reset-password` | `recovery` |
| Médico reactivation | Invite User | `/auth/set-password` | `invite` |

All password pages share the same layout structure as the login page, displaying the clinic name fetched from the `clinic_info` table.

---

## Account Status Detection

The system tracks whether a user has completed their account setup using the `email_confirmed_at` field from Supabase Auth.

| `email_confirmed_at` Value | Account Status | Available Action |
|---------------------------|----------------|------------------|
| `null` | Pendiente (Pending) | Re-enviar Invitación |
| Has timestamp | Activa (Active) | Restablecer Contraseña |

### Why This Matters

- **Password reset doesn't work for pending users:** `resetPasswordForEmail()` only works for users who have confirmed their email (completed the invite flow)
- **Invite tokens are single-use:** When a user clicks an invite link, the token is consumed immediately. If they abandon the process, they cannot use the same link again
- **Misleading "último acceso":** Users who clicked the invite link but didn't complete setup may show a timestamp, which doesn't mean they actually logged in

### Where Status is Displayed

- **List views** (`/medicos`, `/recepcionistas`): Badge showing "Pendiente" or "Activa"
- **Detail pages** (`/medicos/[id]`, `/recepcionistas/[id]`): Badge in audit section
- **3-dot menu**: Conditional action based on status

---

## New User Invitation Flow

When an administrator creates a new médico or recepcionista, the system sends an invitation email.

### Process

1. Admin navigates to `/medicos` or `/recepcionistas`
2. Admin clicks "Crear Médico" or "Crear Recepcionista"
3. Admin fills out the form (nombre, apellido, email, etc.)
4. System creates:
   - Auth user in Supabase
   - Entry in `usuarios_pms` table
   - Entry in `medicos` or role assignment for recepcionista
5. System sends invitation email using the **Invite User** template
6. New user receives email and clicks the link
7. Link goes to `/auth/confirm` with `type=invite`
8. System verifies token and redirects to `/auth/set-password`
9. User sets their password and is redirected to login

### Relevant Files

| File | Purpose |
|------|---------|
| `app/medicos/actions.ts` | `createMedicoWithAccess()` - Creates médico and sends invite |
| `app/recepcionistas/actions.ts` | `createRecepcionista()` - Creates recepcionista and sends invite |
| `app/medicos/components/crear-medico-dialog.tsx` | Form dialog for creating médicos |
| `app/recepcionistas/components/crear-recepcionista-dialog.tsx` | Form dialog for creating recepcionistas |
| `app/auth/confirm/route.ts` | Verifies token and routes to correct page |
| `app/auth/set-password/page.tsx` | First-time password setup page |
| `components/set-password-form.tsx` | Form component for setting password |

---

## Re-send Invitation Flow

When a user receives an invitation but doesn't complete the password setup (token consumed but abandoned), the admin can re-send the invitation.

### When to Use

- User clicked the invite link but didn't complete password setup
- Original invite link has expired
- User reports they can't access the system

### Process

1. Admin navigates to `/medicos` or `/recepcionistas`
2. Admin locates the user with "Pendiente" status badge
3. Admin clicks the 3-dot menu → "Re-enviar Invitación"
4. System sends a new invitation email using the **Invite User** template
5. User receives email and clicks the link
6. Link goes to `/auth/confirm` with `type=invite`
7. System verifies token and redirects to `/auth/set-password`
8. User sets their password and is redirected to login

### Alternative: From Detail Page

1. Admin navigates to `/medicos/[id]` or `/recepcionistas/[id]`
2. Admin sees "Gestión de Invitación" card (only shown for pending users)
3. Admin clicks "Re-enviar Invitación"
4. Same flow as above (steps 4-8)

### Conditional UI Logic

The system shows different actions based on `email_confirmed_at`:

```
if (email_confirmed_at === null) {
  // User hasn't completed setup
  Show: "Re-enviar Invitación" with Mail icon
} else {
  // User has completed setup
  Show: "Restablecer Contraseña" with KeyRound icon
}
```

### Relevant Files

| File | Purpose |
|------|---------|
| `app/medicos/actions.ts` | `resendMedicoInvite(email)` - Re-sends invite by email |
| `app/recepcionistas/actions.ts` | `resendRecepcionistaInvite(email)` - Re-sends invite by email |
| `app/medicos/[id]/actions.ts` | `resendMedicoInvite(id)` - Re-sends invite by ID |
| `app/recepcionistas/[id]/actions.ts` | `resendRecepcionistaInvite(id)` - Re-sends invite by ID |
| `app/medicos/components/medicos-cards.tsx` | List view with conditional menu |
| `app/recepcionistas/components/recepcionistas-cards.tsx` | List view with conditional menu |
| `app/medicos/[id]/components/medico-info-content.tsx` | Detail page with conditional button |
| `app/recepcionistas/[id]/components/recepcionista-detail-content.tsx` | Detail page with conditional button |

---

## Password Reset Flow

Existing users can reset their password through two methods:

### Method 1: Self-Service (Forgot Password)

1. User navigates to `/auth/forgot-password`
2. User enters their email address
3. System sends reset email using the **Reset Password** template
4. User receives email and clicks the link
5. Link goes to `/auth/confirm` with `type=recovery`
6. System verifies token and redirects to `/auth/reset-password`
7. User enters new password and is redirected to login

### Method 2: Admin-Initiated Reset

1. Admin navigates to `/medicos/[id]` or `/recepcionistas/[id]`
2. Admin clicks "Restablecer Contraseña"
3. System sends reset email to the user
4. User follows the same flow as Method 1 (steps 4-7)

### Method 3: Self-Service from Settings

1. Logged-in user navigates to `/configuracion`
2. User clicks "Restablecer Contraseña" in the password management section
3. System sends reset email to the user's email
4. User follows the same flow (steps 4-7 from Method 1)

### Relevant Files

| File | Purpose |
|------|---------|
| `app/auth/forgot-password/page.tsx` | Forgot password page |
| `components/landing-forgot-password-form.tsx` | Form to request password reset |
| `app/medicos/[id]/actions.ts` | `resetMedicoPassword()` - Admin resets médico password |
| `app/recepcionistas/[id]/actions.ts` | `resetRecepcionistaPassword()` - Admin resets recepcionista password |
| `app/configuracion/actions.ts` | `resetOwnPassword()` - User resets own password |
| `app/auth/confirm/route.ts` | Verifies token and routes to correct page |
| `app/auth/reset-password/page.tsx` | Password reset page |
| `components/reset-password-form.tsx` | Form component for resetting password |

---

## Token Verification and Routing

The `/auth/confirm` route handles all email link verifications and routes users to the appropriate page based on the token type.

### Routing Logic

| Token Type | Redirect To | Use Case |
|------------|-------------|----------|
| `invite` | `/auth/set-password` | New user setting password for first time |
| `recovery` | `/auth/reset-password` | Existing user resetting password |
| Other types | Uses `next` parameter or `/` | Other email verifications |

### Relevant Files

| File | Purpose |
|------|---------|
| `app/auth/confirm/route.ts` | Token verification and routing logic |

---

## Médico Reactivation Flow

When a médico is deleted, they are **soft-deleted** (not permanently removed). This preserves historical data like consultas. If an admin tries to create a new médico with an email that belongs to a soft-deleted médico, the system offers to reactivate them instead.

### Soft-Delete vs Hard-Delete

| Entity | Delete Type | What Happens |
|--------|-------------|--------------|
| Médico | Soft-delete | `medicos.deleted_at` is set, auth user is banned |
| Recepcionista | Hard-delete | Auth user is deleted, `usuarios_pms` is cascade deleted |

**Why soft-delete for médicos?**
Médicos have `consultas` (medical appointments) linked to them. Historical medical records must preserve the doctor's information for audit and compliance purposes.

### Reactivation Process

1. Admin creates a médico with an email that was previously used
2. System detects the email belongs to an existing auth user
3. System checks if there's a soft-deleted médico with that user ID
4. **If found:** Shows confirmation dialog with:
   - Previous médico's name
   - Date they were deleted
   - Options: "Reactivar" or "Cancelar"
5. **If admin confirms:**
   - Auth user is unbanned
   - `medicos.deleted_at` is cleared
   - Médico info is updated with new form data
   - Invite email is sent
6. **If admin cancels:** No action taken

### Confirmation Dialog

The dialog informs the admin that:
- The email was previously used
- Shows the previous médico's information
- Asks for confirmation before reactivating

### Relevant Files

| File | Purpose |
|------|---------|
| `app/medicos/actions.ts` | `checkDeletedMedicoByEmail()` - Checks if email belongs to deleted médico |
| `app/medicos/actions.ts` | `reactivateMedico()` - Handles the reactivation process |
| `app/medicos/actions.ts` | `createMedicoWithAccess()` - Detects and handles reactivation scenario |
| `app/medicos/components/crear-medico-dialog.tsx` | Contains the reactivation confirmation dialog |

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Active médico exists with email | "Ya existe un médico activo con este correo electrónico" |
| Email belongs to different user type | "Este correo electrónico ya está asociado a otro usuario del sistema" |

---

## Supabase Email Template Configuration

Email templates are configured in the Supabase Dashboard.

### How to Access

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Email Templates**

### Important: Using `{{ .RedirectTo }}`

**Do NOT use `{{ .ConfirmationURL }}`** for the link href. This placeholder ignores the `redirectTo` parameter passed from the application code.

Instead, construct the URL manually using `{{ .RedirectTo }}` to ensure the user is redirected to the correct page (`/auth/set-password` or `/auth/reset-password`).

### Template: Invite User

Used for new user invitations and re-sending invitations.

**Subject:**
```
Bienvenido al Sistema de Gestión de Pacientes
```

**Body:**
```html
<h2>Bienvenido al Sistema de Gestión de Pacientes</h2>

<p>Se le ha otorgado acceso al Sistema de Gestión de Pacientes.</p>

<p>Haga clic en el siguiente enlace para configurar su contraseña:</p>

<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}">Configurar contraseña</a></p>

<p>Si no esperaba este correo, puede ignorarlo.</p>
```

### Template: Reset Password

Used for password reset requests.

**Subject:**
```
Restablecer contraseña - Sistema de Gestión de Pacientes
```

**Body:**
```html
<h2>Restablecer Contraseña</h2>

<p>Ha solicitado restablecer su contraseña para el Sistema de Gestión de Pacientes.</p>

<p>Haga clic en el siguiente enlace para crear una nueva contraseña:</p>

<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}">Restablecer contraseña</a></p>

<p>Si no solicitó este cambio, puede ignorar este correo.</p>
```

### Template Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{ .SiteURL }}` | The site URL configured in Supabase (e.g., `https://pms-beta-red.vercel.app`) |
| `{{ .TokenHash }}` | The hashed token for verification |
| `{{ .RedirectTo }}` | The redirect URL passed from application code (e.g., `/auth/set-password`) |
| `{{ .Email }}` | The user's email address |
| `{{ .Token }}` | The raw token (rarely used directly) |
| `{{ .ConfirmationURL }}` | **⚠️ Avoid using** - Pre-built URL that ignores `redirectTo` parameter |

### URL Configuration (Required)

In Supabase Dashboard → Authentication → URL Configuration:

**Redirect URLs** (must include):
- `https://pms-beta-red.vercel.app/auth/set-password`
- `https://pms-beta-red.vercel.app/auth/reset-password`

---

## Page Layout Consistency

All password-related pages share the same layout structure:

- **Header:** Clinic name from `clinic_info.nombre`
- **Subtitle:** "Sistema de gestión de pacientes"
- **Form:** Centered card with appropriate wording
- **Footer:** "Desarrollado por Nexa" with link
- **Theme switcher:** Top right corner

### Page Wording

| Page | Title | Description | Button |
|------|-------|-------------|--------|
| `/auth/set-password` | Configurar Contraseña | Ingrese una contraseña para activar su cuenta. | Activar cuenta |
| `/auth/reset-password` | Restablecer Contraseña | Ingrese su nueva contraseña. | Guardar contraseña |
| `/auth/forgot-password` | Recuperar contraseña | Ingrese su correo electrónico... | Enviar enlace |

### Error State (Invalid/Expired Link)

Both `/auth/set-password` and `/auth/reset-password` show an error state if the session is invalid:

- **Title:** Enlace Inválido
- **Message:** El enlace ha expirado o es inválido.
- **Button:** Volver al inicio

---

## Troubleshooting

### Issue: User clicks invite link but lands on login page (not `/auth/set-password`)

**Symptom:** URL looks like `https://domain.com/#access_token=...&type=invite` instead of `https://domain.com/auth/set-password#access_token=...`

**Cause:** Email template is using `{{ .ConfirmationURL }}` which ignores the `redirectTo` parameter.

**Solution:** Update the "Invite user" email template to use the manual URL construction with `{{ .RedirectTo }}`. See [Template: Invite User](#template-invite-user).

### Issue: Password reset link shows "Enlace Inválido"

**Symptom:** User with "Pendiente" status tries to use password reset, but link is invalid.

**Cause:** `resetPasswordForEmail()` doesn't work for users who haven't confirmed their email (completed the initial invite).

**Solution:** Use "Re-enviar Invitación" instead of "Restablecer Contraseña" for pending users. The system now automatically shows the correct option based on `email_confirmed_at`.

### Issue: "Último acceso" shows timestamp but user never logged in

**Symptom:** User shows a timestamp for "Último acceso" but claims they never completed setup.

**Cause:** When a user clicks an invite link, `verifyOtp()` is called which creates a session and updates `last_sign_in_at`. If they abandon before setting their password, this timestamp is misleading.

**Solution:** The system now shows "—" for último acceso when `email_confirmed_at` is null, indicating the user hasn't completed setup.

### Issue: Invite token consumed but user didn't complete setup

**Symptom:** User clicked the invite link, saw the password page, but closed the browser. Now the original link doesn't work.

**Cause:** Invite tokens are single-use. Once clicked, the token is consumed regardless of whether the user completes the flow.

**Solution:** Admin can use "Re-enviar Invitación" from the list view or detail page to send a fresh invite.
