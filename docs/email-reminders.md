# Email Reminders Feature

## Overview

The email reminders feature sends automated emails to patients for appointment confirmations, cancellations, and 24-hour reminders. Currently uses **Gmail SMTP** via Nodemailer, with architecture ready for **Resend** (custom domain) in the future.

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Action    │────▶│  Server Action  │────▶│  Email Service  │
│  (create/cancel)│     │  (consultas)    │     │  (Nodemailer)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  pg_cron        │────▶│  API Route      │────▶│  Email Service  │
│  (every 30 min) │     │  /api/send-     │     │  (Nodemailer)   │
│                 │     │  reminders      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Email Triggers

| Trigger | Email Type | When Sent |
|---------|------------|-----------|
| Appointment created | Confirmación | Immediately |
| Appointment cancelled | Cancelación | Immediately |
| Scheduled (pg_cron) | Recordatorio | 23-25 hours before appointment |

## Database Schema

### Tables

**`email_config`** - SMTP configuration (singleton)
- `enabled` - Master toggle for email sending
- `smtp_user` - Gmail address
- `smtp_password_encrypted` - AES-256-GCM encrypted app password
- `sender_name` - Display name in emails
- `reminders_enabled` - Toggle for automatic reminders
- `reminder_hours_before` - Hours before appointment (default: 24)

**`clinic_info`** - Clinic details for email templates (singleton)
- `nombre` - Clinic name (shown in email header)
- `direccion`, `ciudad`, `provincia`, `codigo_postal` - Address
- `telefono` - Contact phone
- `email`, `sitio_web` - Contact info

**`email_reminders`** - Tracks all sent/pending emails
- `consulta_id` - Associated appointment
- `email_type` - confirmacion, recordatorio_24h, cancelacion
- `status` - pending, sent, failed, cancelled
- `retry_count` - Auto-retry up to 3 times

**`cron_config`** - Configuration for pg_cron job
- `reminder_url` - Deployed app URL
- `cron_secret` - Authentication secret

## File Structure

```
lib/email/
├── index.ts              # Module exports
├── types.ts              # TypeScript interfaces
├── encryption.ts         # AES-256-GCM password encryption
├── service.ts            # Core email functions (with DI)
├── appointment-emails.ts # Confirmation/cancellation/reminder
├── providers/
│   └── gmail.ts          # Nodemailer Gmail SMTP
└── templates/
    ├── index.ts          # Template router
    ├── base.ts           # HTML wrapper + utilities
    ├── confirmacion.ts   # Appointment confirmation
    ├── recordatorio.ts   # 24h reminder
    └── cancelacion.ts    # Cancellation notice

app/admin/
├── page.tsx              # Server component
├── layout.tsx            # Auth guard (admin only)
├── actions.ts            # Server actions
└── components/
    ├── admin-page.tsx           # Tabs container
    ├── email-tab-content.tsx    # Email settings tab
    ├── clinic-info-tab-content.tsx # Clinic info tab
    ├── smtp-settings-card.tsx   # SMTP configuration
    ├── reminder-settings-card.tsx # Reminder toggle
    ├── email-templates-card.tsx # Template previews
    └── test-email-card.tsx      # Send test email

app/api/send-reminders/
└── route.ts              # Cron endpoint (secured)
```

## Architecture: Dependency Injection

All email service functions accept an optional Supabase client parameter:

```typescript
// User-triggered (uses RLS)
await sendConfirmationEmail(data)

// API route/cron (bypasses RLS)
await sendConfirmationEmail(data, supabaseAdmin)
```

This pattern allows:
- **User actions**: Use default client with RLS protection
- **Cron jobs**: Use admin client (service role) to bypass RLS

## Configuration

### Environment Variables

```env
# .env.local and Vercel
EMAIL_ENCRYPTION_KEY=<32-byte-hex-key>
CRON_SECRET=<random-secret-for-cron>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-dashboard>
```

### Admin Panel (`/admin`)

1. **SMTP Settings**: Gmail address + app password
2. **Reminder Settings**: Enable/disable, hours before
3. **Clinic Info**: Name, address, phone for templates
4. **Test Email**: Verify configuration works

### pg_cron Configuration

```sql
-- Update after deployment
UPDATE cron_config SET value = 'https://your-app.vercel.app' WHERE key = 'reminder_url';
UPDATE cron_config SET value = 'your-cron-secret' WHERE key = 'cron_secret';
```

## Security

- **SMTP passwords**: Encrypted with AES-256-GCM before storage
- **Cron endpoint**: Protected with Bearer token authentication
- **RLS policies**: Admin-only write, authenticated read for config tables
- **Service role**: Only used in API routes without user session

---

## Next Steps: Custom Domain Email (Resend)

When the clinic has a custom domain (e.g., `@clinica-silva.com`), switch from Gmail to **Resend** for better deliverability and professional appearance.

### Why Resend?

| Feature | Gmail SMTP | Resend |
|---------|------------|--------|
| Sender address | Gmail only | Custom domain |
| Daily limit | 500 emails | 3,000 free, then pay-as-you-go |
| Deliverability | Good | Excellent (dedicated IPs) |
| Setup | App password | API key + DNS records |

### Implementation Steps

1. **Create Resend account** at [resend.com](https://resend.com)

2. **Verify domain** - Add DNS records (SPF, DKIM, DMARC)

3. **Create provider file** `lib/email/providers/resend.ts`:

```typescript
import { Resend } from 'resend'
import type { SendEmailOptions, SendEmailResult } from '../types'

export async function sendEmailViaResend(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, messageId: data?.id }
}
```

4. **Update database schema** - Add fields to `email_config`:

```sql
ALTER TABLE email_config ADD COLUMN resend_api_key_encrypted TEXT;
ALTER TABLE email_config ADD COLUMN resend_from_email TEXT;
-- provider column already exists: 'gmail' | 'resend'
```

5. **Update Admin UI** - Add Resend configuration option:
   - Provider selector (Gmail / Resend)
   - API key input (encrypted storage)
   - From email input (e.g., `turnos@clinica-silva.com`)

6. **Update `sendEmail()` in service.ts**:

```typescript
if (config.provider === "resend") {
  const apiKey = decryptPassword(config.resend_api_key_encrypted)
  return sendEmailViaResend(
    apiKey,
    config.resend_from_email,
    config.sender_name,
    options
  )
}
```

### Cost Estimate (Resend)

- **Free tier**: 3,000 emails/month, 100/day
- **Pro**: $20/month for 50,000 emails
- **For most clinics**: Free tier is sufficient

### Migration Path

1. Keep Gmail as default (works without custom domain)
2. Add Resend as optional provider
3. Clinics can upgrade when they have a custom domain
4. No code changes needed - just database configuration
