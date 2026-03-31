# Resend Email API - Comprehensive Documentation Review

**Date:** January 6, 2026
**Purpose:** Implementation guide for Next.js email functionality with focus on scheduled emails

---

## Executive Summary

Resend is a developer-focused email API with excellent Next.js integration, native scheduled email support, comprehensive webhook system, and React Email template support. **CRITICAL FINDING:** Resend supports scheduled/delayed email delivery natively through the `scheduledAt` parameter, which is ideal for 24-hour appointment reminders.

---

## 1. Getting Started

### Prerequisites
- Create an API key at https://resend.com/api-keys
- Verify your domain at https://resend.com/domains
- Install the Resend Node.js SDK

### Installation

```bash
pnpm add resend
```

### Environment Setup

```env
RESEND_API_KEY=re_xxxxxxxxx
```

---

## 2. Authentication & Base Configuration

### Base URL
```
https://api.resend.com
```

### Authentication Header
```
Authorization: Bearer re_xxxxxxxxx
```

### Node.js SDK Setup

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
```

---

## 3. Sending Emails

### Basic Email (Node.js SDK)

```typescript
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  replyTo: 'onboarding@resend.dev',
});
```

### Next.js Integration (App Router with Server Actions)

**File: `app/api/send/route.ts`**

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      html: '<p>it works!</p>',
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
```

### Required Parameters
- `from` (string): Sender email address in format `"Name <email@domain.com>"`
- `to` (string | string[]): Recipient email address(es), max 50
- `subject` (string): Email subject

### Optional Parameters
- `html` (string): HTML version of the message
- `text` (string): Plain text version (auto-generated from HTML if not provided)
- `react` (React.ReactNode): React component for email (Node.js SDK only)
- `bcc` (string | string[]): BCC recipients
- `cc` (string | string[]): CC recipients
- `replyTo` (string | string[]): Reply-to addresses
- `headers` (object): Custom headers
- `attachments` (array): File attachments (max 40MB per email)
- `tags` (array): Custom key/value pairs for tracking
- `scheduledAt` (string): **Schedule email for future delivery**
- `topicId` (string): Topic ID for subscription management
- `template` (object): Use pre-built template

---

## 4. SCHEDULED EMAILS (Critical Feature)

### Native Support
**YES** - Resend supports scheduled/delayed email delivery natively through the `scheduledAt` parameter.

### Scheduling Limits
- Emails can be scheduled up to **30 days in advance**
- SMTP emails cannot be scheduled

### Method 1: Natural Language (Recommended)

```typescript
await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  scheduledAt: 'in 1 min',  // or 'in 24 hours', 'tomorrow at 9am', 'Friday at 3pm ET'
});
```

**Supported natural language formats:**
- `"in 1 hour"`
- `"in 24 hours"`
- `"tomorrow at 9am"`
- `"Friday at 3pm ET"`

### Method 2: ISO 8601 Date Format

```typescript
const scheduledDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
const isoDate = scheduledDate.toISOString(); // "2024-08-05T11:52:01.858Z"

await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  scheduledAt: isoDate,
});
```

### Reschedule a Scheduled Email

```typescript
resend.emails.update({
  id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794',
  scheduledAt: 'in 1 min',
});
```

### Cancel a Scheduled Email

```typescript
resend.emails.cancel('49a3999c-0ce1-4ea6-ab68-afcd6dc2e794');
```

**WARNING:** Once an email is canceled, it cannot be rescheduled.

### Scheduled Email Failures

Scheduled emails may fail for:
- **API key is no longer active** - Key deleted, expired, or suspended
- **Account under review** - Account suspended, contact support@resend.com

---

## 5. React Email Templates

### Overview
React Email is Resend's official library for creating email templates using React components. Latest version: **React Email 5.0** (November 2025).

### Installation

```bash
pnpm add @react-email/components
```

### Create Email Template

**File: `components/email-template.tsx`**

```typescript
import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
  appointmentDate: string;
  doctorName: string;
}

export function AppointmentReminderEmail({
  firstName,
  appointmentDate,
  doctorName
}: EmailTemplateProps) {
  return (
    <div>
      <h1>Recordatorio de Consulta</h1>
      <p>Hola {firstName},</p>
      <p>Este es un recordatorio de tu consulta programada para {appointmentDate} con {doctorName}.</p>
      <p>Por favor, llega 10 minutos antes de tu hora programada.</p>
    </div>
  );
}
```

### Send Email with React Template

```typescript
import { AppointmentReminderEmail } from '@/components/email-template';

const { data, error } = await resend.emails.send({
  from: 'Clínica <noreply@clinica.com>',
  to: ['patient@email.com'],
  subject: 'Recordatorio de Consulta',
  react: AppointmentReminderEmail({
    firstName: 'Juan',
    appointmentDate: '15/01/2026 a las 10:00',
    doctorName: 'Dr. García'
  }),
});
```

### React Email 5.0 Features (2025)
- Preview support for dark mode
- Tailwind 4 support
- New Resend integration (upload templates directly to Resend dashboard)
- 8 new components
- Real-time collaboration in visual editor
- Full versioning, collaboration, and rollback capabilities

### Upload Templates to Resend Dashboard

```bash
npx react-email@latest resend setup
# Paste API key when prompted
# Upload templates via the Resend tab in the toolbar
```

---

## 6. Webhooks

### Overview
Resend provides real-time HTTPS webhooks to notify your application about email events.

### Setup Process

1. **Create webhook endpoint** in your Next.js app
2. **Register webhook URL** at https://resend.com/webhooks
3. **Select events** to observe
4. **Handle webhook payloads** in your application

### Example Webhook Endpoint

**File: `app/api/webhooks/route.ts`**

```typescript
export async function POST(req: Request) {
  const event = await req.json();

  console.log('Webhook event:', event.type);

  switch (event.type) {
    case 'email.sent':
      // Handle email sent
      break;
    case 'email.delivered':
      // Handle email delivered
      break;
    case 'email.bounced':
      // Handle email bounced
      break;
    case 'email.failed':
      // Handle email failed
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  return Response.json({ received: true }, { status: 200 });
}
```

### Webhook Event Types

#### Email Events
- `email.sent` - API request successful, attempting delivery
- `email.delivered` - Successfully delivered to recipient's mail server
- `email.delivery_delayed` - Temporary delivery issue (full inbox, transient error)
- `email.complained` - Recipient marked email as spam
- `email.bounced` - Recipient's mail server permanently rejected email
- `email.opened` - Recipient opened the email
- `email.clicked` - Recipient clicked a link in the email
- `email.received` - Resend successfully received an inbound email
- `email.failed` - Email failed to send due to error (invalid recipients, API key issues, domain verification issues, quota limits)

#### Contact Events
- `contact.created` - Contact successfully created
- `contact.updated` - Contact successfully updated
- `contact.deleted` - Contact successfully deleted

#### Domain Events
- `domain.created` - Domain successfully created
- `domain.updated` - Domain successfully updated (includes status changes)
- `domain.deleted` - Domain successfully deleted

### Webhook Payload Example

```json
{
  "type": "email.bounced",
  "created_at": "2024-11-22T23:41:12.126Z",
  "data": {
    "broadcast_id": "8b146471-e88e-4322-86af-016cd36fd216",
    "created_at": "2024-11-22T23:41:11.894719+00:00",
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "Sending this example",
    "template_id": "43f68331-0622-4e15-8202-246a0388854b",
    "bounce": {
      "message": "The recipient's email address is on the suppression list because it has a recent history of producing hard bounces.",
      "subType": "Suppressed",
      "type": "Permanent"
    },
    "tags": {
      "category": "confirm_email"
    }
  }
}
```

### Webhook Best Practices
- Always respond with `HTTP 200 OK` to acknowledge receipt
- Process webhook events asynchronously if needed
- Webhooks automatically retry on failure
- Implement webhook signature verification for security
- Use ngrok or VS Code Port Forwarding for local testing

---

## 7. Rate Limits & Quotas

### Rate Limit
- **Default:** 2 requests per second
- **Increase:** Contact support for trusted sender status
- **Response Code:** 429 when rate limit exceeded

### Email Quotas
- **Free tier:** Limited emails per day/month
- **Paid tiers:** Higher quotas based on plan
- Both sent and received emails count towards quota

### Error Codes for Limits
- `rate_limit_exceeded` (429) - Too many requests per second
- `daily_quota_exceeded` (429) - Daily email quota reached
- `monthly_quota_exceeded` (429) - Monthly email quota reached

### Response Headers for Rate Limiting
Check response headers to implement proper rate limiting:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## 8. Error Handling

### Standard HTTP Response Codes
- `200` - Successful request
- `400` - Invalid parameters
- `401` - Missing API key
- `403` - Invalid API key or unverified domain
- `404` - Resource not found
- `422` - Validation error (invalid data format)
- `429` - Rate limit or quota exceeded
- `451` - Security error
- `500` - Internal server error

### Common Errors

#### `validation_error` (400)
Error with request fields. Check error message for details.

#### `missing_api_key` (401)
```typescript
// Solution: Include Authorization header
headers: {
  'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
}
```

#### `invalid_api_key` (403)
API key is invalid. Generate new key at https://resend.com/api-keys

#### `validation_error` (403) - Unverified Domain
Domain in `from` field is not verified. Verify domain at https://resend.com/domains

#### `rate_limit_exceeded` (429)
Too many requests. Implement queue mechanism or reduce concurrent requests.

#### `monthly_quota_exceeded` (429)
Upgrade plan at https://resend.com/settings/billing

### Error Response Format

```typescript
{
  error: {
    message: "Error description",
    code: "error_code"
  }
}
```

### Recommended Error Handling Pattern

```typescript
try {
  const { data, error } = await resend.emails.send({
    // email config
  });

  if (error) {
    console.error('Resend error:', error);

    // Handle specific error codes
    if (error.message?.includes('quota exceeded')) {
      // Handle quota errors
    }

    return { success: false, error: error.message };
  }

  return { success: true, data };

} catch (error) {
  console.error('Unexpected error:', error);
  return { success: false, error: 'Failed to send email' };
}
```

---

## 9. Best Practices for Transactional Emails

### 1. Domain Verification
Always verify your sending domain to avoid 403 errors and improve deliverability.

### 2. Use Idempotency Keys
Prevent duplicate emails by using idempotency keys (expires after 24 hours):

```typescript
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['user@example.com'],
  subject: 'Your order confirmation',
  html: '<p>Order #12345</p>',
}, {
  headers: {
    'Idempotency-Key': `order-12345-${Date.now()}`
  }
});
```

### 3. Use Tags for Tracking
Tag emails for better analytics and debugging:

```typescript
const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['user@example.com'],
  subject: 'Appointment Reminder',
  html: '<p>Your appointment is tomorrow</p>',
  tags: [
    { name: 'category', value: 'appointment_reminder' },
    { name: 'patient_id', value: 'P12345' }
  ]
});
```

### 4. Implement Retry Logic
For critical emails, implement retry logic with exponential backoff:

```typescript
async function sendEmailWithRetry(emailData: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await resend.emails.send(emailData);

    if (!error) return { success: true, data };

    if (error.message?.includes('rate_limit')) {
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      continue;
    }

    // Don't retry for non-retryable errors
    return { success: false, error };
  }

  return { success: false, error: 'Max retries exceeded' };
}
```

### 5. Use React Email for Complex Templates
For maintainable, testable email templates, use React Email instead of raw HTML.

### 6. Monitor Webhooks
Set up webhooks to track delivery status and handle bounces/complaints:

```typescript
// Remove bounced emails from your database
case 'email.bounced':
  await removeFromMailingList(event.data.to[0]);
  break;
```

### 7. Environment-Specific Configuration
Use different domains/API keys for development and production:

```typescript
const resend = new Resend(
  process.env.NODE_ENV === 'production'
    ? process.env.RESEND_API_KEY_PROD
    : process.env.RESEND_API_KEY_DEV
);
```

### 8. Scheduled Email Best Practices
- Always validate scheduled dates are in the future
- Don't schedule more than 30 days in advance
- Store email IDs to enable cancellation if needed
- Handle scheduled email failures via webhooks

---

## 10. Implementation Example: 24-Hour Appointment Reminder

### Server Action (`app/consultas/actions.ts`)

```typescript
"use server"

import { Resend } from 'resend';
import { createClient } from "@/lib/supabase/server";
import { AppointmentReminderEmail } from '@/components/emails/appointment-reminder';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function scheduleAppointmentReminder(consultaId: string) {
  const supabase = await createClient();

  // Fetch consultation details
  const { data: consulta, error } = await supabase
    .from('consultas')
    .select(`
      id,
      fecha_hora,
      paciente:pacientes (
        nombre,
        apellido,
        email
      ),
      medico:medicos (
        nombre,
        apellido
      )
    `)
    .eq('id', consultaId)
    .single();

  if (error || !consulta) {
    return { success: false, error: 'Consulta not found' };
  }

  // Calculate scheduled time (24 hours before appointment)
  const appointmentDate = new Date(consulta.fecha_hora);
  const reminderDate = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000));

  // Validate reminder is in the future
  if (reminderDate < new Date()) {
    return { success: false, error: 'Appointment is within 24 hours' };
  }

  try {
    const { data, error: resendError } = await resend.emails.send({
      from: 'Clínica Dermatología <noreply@clinica.com>',
      to: [consulta.paciente.email],
      subject: 'Recordatorio de Consulta - 24 horas',
      react: AppointmentReminderEmail({
        patientName: `${consulta.paciente.nombre} ${consulta.paciente.apellido}`,
        doctorName: `Dr. ${consulta.medico.apellido}`,
        appointmentDate: appointmentDate.toLocaleString('es-AR', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
      }),
      scheduledAt: reminderDate.toISOString(),
      tags: [
        { name: 'type', value: 'appointment_reminder' },
        { name: 'consulta_id', value: consultaId },
      ],
    });

    if (resendError) {
      console.error('Failed to schedule reminder:', resendError);
      return { success: false, error: resendError.message };
    }

    // Store email ID in database for potential cancellation
    await supabase
      .from('consultas')
      .update({
        reminder_email_id: data.id,
        reminder_scheduled_at: reminderDate.toISOString()
      })
      .eq('id', consultaId);

    return { success: true, data };

  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Failed to schedule reminder' };
  }
}

export async function cancelAppointmentReminder(consultaId: string) {
  const supabase = await createClient();

  // Fetch email ID
  const { data: consulta } = await supabase
    .from('consultas')
    .select('reminder_email_id')
    .eq('id', consultaId)
    .single();

  if (!consulta?.reminder_email_id) {
    return { success: false, error: 'No reminder scheduled' };
  }

  try {
    await resend.emails.cancel(consulta.reminder_email_id);

    // Clear email ID from database
    await supabase
      .from('consultas')
      .update({
        reminder_email_id: null,
        reminder_scheduled_at: null
      })
      .eq('id', consultaId);

    return { success: true };

  } catch (error) {
    console.error('Failed to cancel reminder:', error);
    return { success: false, error: 'Failed to cancel reminder' };
  }
}
```

### Email Template Component

```typescript
// components/emails/appointment-reminder.tsx
import * as React from 'react';

interface AppointmentReminderEmailProps {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
}

export function AppointmentReminderEmail({
  patientName,
  doctorName,
  appointmentDate,
}: AppointmentReminderEmailProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#333' }}>Recordatorio de Consulta</h1>
      <p>Estimado/a {patientName},</p>
      <p>
        Le recordamos que tiene una consulta programada para <strong>{appointmentDate}</strong> con {doctorName}.
      </p>
      <p>Por favor, llegue 10 minutos antes de su hora programada.</p>
      <p>Si necesita cancelar o reprogramar, por favor contáctenos con anticipación.</p>
      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <p style={{ fontSize: '12px', color: '#666' }}>
        Este es un mensaje automático. Por favor no responda a este correo.
      </p>
    </div>
  );
}
```

---

## 11. Additional Resources

### Official Documentation
- Main Documentation: https://resend.com/docs/introduction
- API Reference: https://resend.com/docs/api-reference/introduction
- Next.js Guide: https://resend.com/docs/send-with-nextjs
- React Email: https://react.email/docs/integrations/resend

### GitHub Examples
- Next.js App Router Example: https://github.com/resend/resend-nextjs-app-router-example
- Next.js Pages Router Example: https://github.com/resend/resend-nextjs-pages-router-example
- Webhook Example: https://github.com/resend/resend-examples/tree/main/with-webhooks
- React Email: https://github.com/resend/react-email

### Support
- Status Page: https://resend-status.com
- Contact Support: https://resend.com/contact
- Community: https://github.com/resend

---

## 12. Summary & Recommendations

### Key Findings

1. **Scheduled Emails: SUPPORTED** - Native support via `scheduledAt` parameter (up to 30 days in advance)
2. **Next.js Integration: EXCELLENT** - First-class support for App Router and Server Actions
3. **React Email: MATURE** - Version 5.0 with dark mode, Tailwind 4, and visual editor
4. **Webhooks: COMPREHENSIVE** - 15+ event types covering all email lifecycle stages
5. **Rate Limits: REASONABLE** - 2 req/sec default, upgradeable for trusted senders

### Recommended Implementation for PMS

1. **Use scheduled emails** with `scheduledAt` for 24-hour appointment reminders
2. **Store email IDs** in `consultas` table to enable cancellation if appointments change
3. **Implement webhooks** to track delivery status and handle failures
4. **Use React Email** for maintainable Spanish-language templates
5. **Add retry logic** for critical transactional emails (appointment confirmations)
6. **Tag all emails** with `consulta_id` and `type` for tracking and debugging

### Migration Path

1. Set up Resend account and verify clinic domain
2. Create React Email templates for appointment reminders
3. Add `reminder_email_id` and `reminder_scheduled_at` columns to `consultas` table
4. Implement server actions for scheduling/canceling reminders
5. Set up webhook endpoint to handle delivery failures
6. Test with staging environment before production rollout

---

## Sources

- [Send email using Resend - React Email](https://react.email/docs/integrations/resend)
- [GitHub - resend/react-email](https://github.com/resend/react-email)
- [Resend Email API](https://resend.com)
- [Create and Send Email Templates Using React Email and Resend in Next.js](https://www.freecodecamp.org/news/create-and-send-email-templates-using-react-email-and-resend-in-nextjs/)
- [How to send emails using Resend and React Email](https://dev.to/blaise_tiong/how-to-send-emails-using-resend-and-react-email--1f78)
- [React Email 5.0 · Resend](https://resend.com/blog/react-email-5)
- [Top 10 new features in 2025 · Resend](https://resend.com/blog/new-features-in-2025)
- [React Email with Resend Template](https://vercel.com/templates/other/react-email-resend)
- [Send emails with Next.js · Resend](https://resend.com/nextjs)
- [How to Send Emails in React with React Email & Resend](https://spacejelly.dev/posts/how-to-send-emails-in-react-with-react-email-resend)
