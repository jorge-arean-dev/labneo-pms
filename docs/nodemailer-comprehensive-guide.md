# Nodemailer Documentation - Comprehensive Guide

**Documentation URL**: https://nodemailer.com/
**Review Date**: January 6, 2026
**Package**: `nodemailer` (npm)
**License**: MIT-0 (MIT No Attribution)

---

## Executive Summary

Nodemailer is the most popular email sending library for Node.js, offering a comprehensive, zero-dependency solution for SMTP-based email delivery. The documentation is exceptionally well-organized, feature-complete, and production-ready.

**Key Strengths**:
- Zero runtime dependencies - everything included in one package
- Security-focused design preventing remote code execution vulnerabilities
- Excellent Gmail/OAuth2 integration guides
- Comprehensive error reference with troubleshooting steps
- Well-documented connection pooling for high-volume sending
- Clear examples for all major use cases

**Primary Use Cases**:
1. Transactional emails (password resets, confirmations, notifications)
2. Batch email sending with connection pooling
3. OAuth2 authentication with Gmail/Outlook
4. HTML emails with embedded images and attachments
5. Development/testing with Ethereal test accounts

---

## 1. Gmail SMTP Setup

### Authentication Methods

| Method | Status | When to Use |
|--------|--------|-------------|
| **OAuth 2.0** | ✅ Recommended | All new integrations, personal Gmail + Google Workspace |
| **App Password** | ✅ Supported | When 2-Step Verification enabled, simpler than OAuth for internal tools |
| **"Less Secure App"** | ❌ Disabled since May 30, 2022 | Not available |

### Gmail SMTP Configuration

#### Option 1: OAuth 2.0 (Recommended)

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Shortcut that sets host/port automatically
  auth: {
    type: "OAuth2",
    user: "me@gmail.com",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});
```

**How to get OAuth2 credentials**: See [SMTP/OAuth2 guide](https://nodemailer.com/smtp/oauth2)

#### Option 2: App Password (Simpler for Internal Tools)

```javascript
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "me@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD, // 16-character App Password
  },
});
```

**To create an App Password**:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google," select **App Passwords** (requires 2-Step Verification)
3. Generate a new App Password for "Mail"
4. Copy the 16-character password

### Gmail Limitations & Quirks

#### 1. Gmail Rewrites the `From:` Header
Gmail **always** replaces the sender address with the authenticated account's email. To send from a different address:
- Set up an **alias** in Gmail settings, or
- Configure a **Send As** address in Google Workspace

#### 2. Daily Sending Limits
- **Personal Gmail**: 500 recipients per rolling 24-hour period
- **Google Workspace**: 2,000 recipients per rolling 24-hour period

Each recipient counts individually (To, Cc, Bcc all count).
Error when exceeded: `454 4.7.0 Too many recipients`

#### 3. Not Recommended for Production
Gmail is designed for individual users, not automated services. Google's security systems may block connections from:
- Different countries/IP addresses
- Unusual login patterns
- High-volume sending

**For production**: Use dedicated email services (SendGrid, Postmark, Amazon SES, Mailgun)

### Troubleshooting Gmail Issues

1. **Check Google security alerts**: [Recent activity page](https://myaccount.google.com/security)
2. **OAuth2 setup**:
   - Verify `refreshToken` hasn't expired
   - Ensure OAuth consent screen is "Production" status
3. **App Password**:
   - Verify 2-Step Verification is still enabled
   - Try generating a new App Password
4. **Server clock**: OAuth tokens are time-sensitive - use NTP for synchronization
5. **Test SMTP connection manually**:
   ```bash
   openssl s_client -connect smtp.gmail.com:465
   ```

---

## 2. SMTP Transport Configuration

### Basic SMTP Setup

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // Use STARTTLS (upgrade connection after connecting)
  auth: {
    user: "username",
    pass: "password",
  },
});
```

### Key Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `"localhost"` | SMTP server hostname or IP |
| `port` | number | `587` (or `465` if `secure: true`) | SMTP port |
| `secure` | boolean | `false` | `true` = TLS immediately (port 465), `false` = STARTTLS upgrade (port 587/25) |
| `service` | string | - | Shortcut for well-known services (`"gmail"`, `"outlook"`, etc.) - overrides host/port/secure |
| `auth` | object | - | Authentication credentials |
| `pool` | boolean | `false` | Enable connection pooling for multiple messages |

### TLS/SSL Options

| Option | Type | Description |
|--------|------|-------------|
| `secure` | boolean | Use TLS immediately on port 465 |
| `tls` | object | Additional Node.js `TLSSocket` options |
| `tls.rejectUnauthorized` | boolean | Set to `false` to accept self-signed certificates (dev only!) |
| `tls.servername` | string | Hostname for TLS certificate validation (required when using IP address) |
| `ignoreTLS` | boolean | Don't use STARTTLS even if server supports it |
| `requireTLS` | boolean | Require STARTTLS upgrade or fail |

**Important**: `secure: false` does NOT mean unencrypted! Most servers use STARTTLS to upgrade the connection automatically.

### Connection Timeout Options

| Option | Default | Description |
|--------|---------|-------------|
| `connectionTimeout` | 120000 ms (2 min) | Time to establish TCP connection |
| `greetingTimeout` | 30000 ms (30 sec) | Time to receive server greeting |
| `socketTimeout` | 600000 ms (10 min) | Idle connection timeout |
| `dnsTimeout` | 30000 ms (30 sec) | DNS lookup timeout |

### Authentication Options

#### Username/Password (Most Common)

```javascript
auth: {
  type: "login", // Optional, this is the default
  user: "username",
  pass: "password",
}
```

#### OAuth 2.0

```javascript
auth: {
  type: "oauth2",
  user: "user@example.com",
  accessToken: "generated_access_token",
  expires: 1484314697598, // Token expiration timestamp
}
```

For auto-refreshing tokens, see [OAuth 2.0 guide](https://nodemailer.com/smtp/oauth2).

#### No Authentication

```javascript
// Omit auth object for unauthenticated relay servers
const transporter = nodemailer.createTransport({
  host: "internal-relay.example.com",
  port: 25,
});
```

### Security Options

| Option | Description |
|--------|-------------|
| `disableFileAccess` | Prevent reading attachments from filesystem paths |
| `disableUrlAccess` | Prevent fetching attachments from URLs |

**Use when processing untrusted JSON data** to prevent attackers from reading arbitrary files or triggering SSRF attacks.

### Debug Options

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  logger: true, // Enable console logging
  debug: true,  // Log raw SMTP traffic (commands and responses)
});
```

---

## 3. Connection Pooling for Multiple Emails

**When to use pooling**:
- Sending large batches of emails quickly
- SMTP provider limits simultaneous connections
- Need to queue messages within connection limits

### Pooled Connection Setup

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  pool: true, // Enable connection pooling
  maxConnections: 5, // Max simultaneous connections (default: 5)
  maxMessages: 100,  // Messages per connection before reconnect (default: 100)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### Pooling Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pool` | boolean | `false` | Enable pooling |
| `maxConnections` | number | `5` | Max simultaneous SMTP connections |
| `maxMessages` | number | `100` | Messages per connection before reconnecting |
| `maxRequeues` | number | `-1` | Retry attempts if connection closes mid-send (`-1` = unlimited) |

### Runtime Helpers

```javascript
// Check if transporter can accept more messages
if (transporter.isIdle()) {
  await transporter.sendMail(message);
}

// Close all connections (for graceful shutdown)
process.on("SIGTERM", () => {
  transporter.close();
  process.exit(0);
});
```

### Event-Driven Pattern (High-Volume Sending)

```javascript
const { getNextMessage } = require("./messageQueue");

// Pull messages from external queue only when ready
transporter.on("idle", async () => {
  while (transporter.isIdle()) {
    const message = await getNextMessage();
    if (!message) return; // Queue empty

    try {
      await transporter.sendMail(message);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  }
});
```

### Best Practices

1. **Create one transporter and reuse it** - Don't create new transporters for each message
2. **Match `maxConnections` to provider limits** - Check provider documentation
3. **Use `idle` event for high-volume** - Pull-based pattern prevents memory overload
4. **Close pool on shutdown** - Call `transporter.close()` for clean exit

---

## 4. Sending HTML Emails

### Basic HTML Email

```javascript
const message = {
  from: '"Sender Name" <sender@server.com>',
  to: "receiver@example.com",
  subject: "Hello World",
  text: "This is the plaintext version of the email.", // Fallback for non-HTML clients
  html: "<p>This is the <strong>HTML version</strong> of the email.</p>",
};

await transporter.sendMail(message);
```

### Common Message Fields

| Field | Description |
|-------|-------------|
| `from` | Sender address (`"Name <email>"` or just `"email"`) |
| `to` | Recipients (comma-separated string or array) |
| `cc` | Carbon copy recipients |
| `bcc` | Blind carbon copy (hidden from other recipients) |
| `subject` | Subject line |
| `text` | Plaintext body (fallback) |
| `html` | HTML body |
| `attachments` | Array of attachment objects |

### HTML with Embedded Images

```javascript
const message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Image Embed Example",
  html: '<p>Here is an image: <img src="cid:unique@logo.com"/></p>',
  attachments: [
    {
      filename: "logo.png",
      path: "/path/to/logo.png",
      cid: "unique@logo.com", // Same as referenced in <img src="cid:..."/>
    },
  ],
};
```

### Attachments

```javascript
attachments: [
  // File path
  {
    filename: "report.pdf",
    path: "/path/to/report.pdf",
  },

  // URL
  {
    filename: "image.jpg",
    path: "https://example.com/image.jpg",
  },

  // Buffer
  {
    filename: "data.txt",
    content: Buffer.from("Hello World"),
  },

  // Stream
  {
    filename: "content.html",
    content: fs.createReadStream("content.html"),
  },
]
```

### Advanced Message Options

#### Routing Options

| Field | Description |
|-------|-------------|
| `replyTo` | Reply-To address (where replies are sent) |
| `inReplyTo` | Message-ID of email being replied to (for threading) |
| `references` | Array of Message-IDs for conversation threading |

#### Header Options

| Field | Description |
|-------|-------------|
| `priority` | `"high"`, `"normal"`, or `"low"` |
| `headers` | Custom headers object: `{ "X-Custom": "value" }` |
| `messageId` | Custom Message-ID (auto-generated if omitted) |
| `date` | Custom Date header (defaults to current UTC time) |

#### Content Options

| Field | Description |
|-------|-------------|
| `attachDataUrls` | Auto-convert `data:` URI images in HTML to attachments |
| `encoding` | String encoding (default: `"utf-8"`) |
| `textEncoding` | Force content-transfer-encoding: `"quoted-printable"` or `"base64"` |

#### Security Options (Message-Level)

| Field | Description |
|-------|-------------|
| `disableFileAccess` | Prevent reading files from filesystem |
| `disableUrlAccess` | Prevent fetching content from URLs |

---

## 5. Error Handling

### Error Object Structure

```javascript
{
  message: 'Invalid login: 535 5.7.8 Authentication failed',
  code: 'EAUTH',              // Error code
  command: 'AUTH PLAIN',      // SMTP command that failed
  response: '535 5.7.8 Authentication failed',
  responseCode: 535           // SMTP numeric code
}
```

### Common Error Codes

#### Connection Errors

| Code | Cause | Fix |
|------|-------|-----|
| `ECONNECTION` | Connection failed/closed unexpectedly | Check host/port, firewall, server status |
| `ETIMEDOUT` | Operation timed out | Increase timeout values, check network latency |
| `EDNS` | DNS resolution failed | Verify hostname, check DNS server |
| `ESOCKET` | Low-level socket error | Network interruption, connection reset |

#### TLS/SSL Errors

| Code | Cause | Fix |
|------|-------|-----|
| `ETLS` | TLS connection/upgrade failed | Use `tls: { rejectUnauthorized: false }` for self-signed certs (dev only), verify certificate validity |

#### Authentication Errors

| Code | Cause | Fix |
|------|-------|-----|
| `EAUTH` | Authentication failed | Check username/password, use App Password for Gmail with 2FA, verify OAuth2 token |
| `NoAuth` | No credentials provided | Add `auth` object to config |

#### Envelope/Message Errors

| Code | Cause | Fix |
|------|-------|-----|
| `EENVELOPE` | Invalid sender/recipient addresses | Check email address format, ensure at least one recipient |
| `EMESSAGE` | Message content rejected | Check message size limits, review content for policy violations |

#### Pool Errors

| Code | Cause | Fix |
|------|-------|-----|
| `EMAXLIMIT` | Pool exhausted or max retries reached | Increase `maxConnections`, reduce sending rate |

### SMTP Response Codes

#### Success (2xx)
- `220` - Service ready
- `235` - Authentication successful
- `250` - Action completed
- `354` - Start mail input

#### Temporary Failure (4xx) - Retry Later
- `421` - Service not available
- `450` - Mailbox unavailable
- `451` - Local error
- `452` - Insufficient storage
- `454` - Temporary auth failure (Gmail quota exceeded)

#### Permanent Failure (5xx) - Don't Retry
- `530` - Authentication required
- `535` - Authentication credentials invalid
- `550` - Mailbox unavailable (not found, no access)
- `552` - Storage allocation exceeded
- `553` - Invalid mailbox name
- `554` - Transaction failed

### Error Handling Patterns

#### Basic Error Handling

```javascript
try {
  const info = await transporter.sendMail(message);
  console.log('Message sent:', info.messageId);
} catch (err) {
  console.error('Send failed:', err.message);
  console.error('Error code:', err.code);
  if (err.responseCode) {
    console.error('SMTP response:', err.responseCode, err.response);
  }
}
```

#### Handling Specific Error Types

```javascript
try {
  await transporter.sendMail(message);
} catch (err) {
  switch (err.code) {
    case 'ECONNECTION':
    case 'ETIMEDOUT':
      console.error('Network error - will retry later');
      // Schedule retry
      break;

    case 'EAUTH':
      console.error('Authentication failed - check credentials');
      // Do NOT retry without fixing credentials
      break;

    case 'EENVELOPE':
      console.error('Invalid recipients:', err.rejected);
      // Remove invalid recipients and retry
      break;

    case 'EMESSAGE':
      console.error('Message rejected by server');
      // Check message content/size
      break;

    default:
      console.error('Unexpected error:', err);
  }
}
```

#### Handling Partial Failures

```javascript
const info = await transporter.sendMail(message);

if (info.rejected && info.rejected.length > 0) {
  console.log('Message sent, but some recipients were rejected:');
  console.log('Accepted:', info.accepted);
  console.log('Rejected:', info.rejected);

  if (info.rejectedErrors) {
    info.rejectedErrors.forEach(err => {
      console.log(`  ${err.recipient}: ${err.message}`);
    });
  }
}
```

#### Verify Configuration Before Sending

```javascript
try {
  await transporter.verify();
  console.log('Server is ready to accept messages');
} catch (err) {
  console.error('Configuration error:', err.message);
}
```

**Note**: `verify()` tests DNS, TCP, TLS, and authentication - but NOT sender address acceptance (only known when actually sending).

---

## 6. Rate Limiting & Best Practices

### Gmail Rate Limits
- **Personal Gmail**: 500 recipients/day
- **Google Workspace**: 2,000 recipients/day
- Error when exceeded: `454 4.7.0 Too many recipients`

### Best Practices for Production

1. **Use Dedicated Email Services** for production (not Gmail):
   - SendGrid, Postmark, Amazon SES, Mailgun
   - Higher sending limits
   - Better deliverability
   - No sender address rewriting
   - Analytics and monitoring

2. **Connection Pooling** for batch sending:
   - Create ONE transporter instance and reuse it
   - Match `maxConnections` to provider limits
   - Use `idle` event for high-volume sending

3. **Error Handling**:
   - Always wrap `sendMail()` in try/catch
   - Handle network errors (retry) vs auth errors (don't retry)
   - Check `rejected` array for partial failures

4. **Security**:
   - Store credentials in environment variables
   - Use `disableFileAccess`/`disableUrlAccess` with untrusted data
   - Use OAuth2 instead of passwords when possible
   - Never commit credentials to version control

5. **Testing**:
   - Use [Ethereal.email](https://ethereal.email) for development (captures emails without sending)
   - Call `transporter.verify()` to test configuration
   - Test with single recipient before batch sending

---

## 7. Next.js Server Actions Integration

### Installation

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer  # TypeScript types
```

### Email Service Setup

**File**: `lib/email/nodemailer.ts`

```typescript
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Create ONE transporter instance and reuse it
let transporter: Transporter | null = null;

export function getEmailTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail", // or configure SMTP manually
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD, // Gmail App Password
      },
      pool: true, // Enable pooling for multiple emails
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  return transporter;
}

// For graceful shutdown (optional)
export function closeEmailTransporter() {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
```

### Email Templates

**File**: `lib/email/templates.ts`

```typescript
interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export function getAppointmentConfirmationEmail(
  patientName: string,
  doctorName: string,
  appointmentDateTime: string
): EmailTemplate {
  return {
    subject: `Confirmación de consulta - ${appointmentDateTime}`,
    text: `
Hola ${patientName},

Su consulta con el Dr. ${doctorName} ha sido confirmada para:
${appointmentDateTime}

Por favor llegue 10 minutos antes de su cita.

Saludos,
Clínica Dermatológica
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Confirmación de Consulta</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Su consulta con el <strong>Dr. ${doctorName}</strong> ha sido confirmada para:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
            ${appointmentDateTime}
          </p>
        </div>
        <p>Por favor llegue 10 minutos antes de su cita.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          Saludos,<br>
          <strong>Clínica Dermatológica</strong>
        </p>
      </div>
    `,
  };
}

export function getPasswordResetEmail(
  resetLink: string,
  expirationMinutes: number = 60
): EmailTemplate {
  return {
    subject: "Restablecer contraseña - PMS",
    text: `
Recibimos una solicitud para restablecer su contraseña.

Para continuar, haga clic en el siguiente enlace:
${resetLink}

Este enlace es válido por ${expirationMinutes} minutos.

Si no solicitó este cambio, ignore este correo.
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Restablecer Contraseña</h2>
        <p>Recibimos una solicitud para restablecer su contraseña.</p>
        <p>
          <a href="${resetLink}"
             style="display: inline-block; background: #2563eb; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Restablecer Contraseña
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Este enlace es válido por ${expirationMinutes} minutos.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Si no solicitó este cambio, ignore este correo.
        </p>
      </div>
    `,
  };
}
```

### Server Actions

**File**: `app/consultas/actions.ts`

```typescript
"use server";

import { getEmailTransporter } from "@/lib/email/nodemailer";
import { getAppointmentConfirmationEmail } from "@/lib/email/templates";
import { revalidatePath } from "next/cache";

export async function sendAppointmentConfirmation(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  appointmentDateTime: string
) {
  try {
    const transporter = getEmailTransporter();
    const emailContent = getAppointmentConfirmationEmail(
      patientName,
      doctorName,
      appointmentDateTime
    );

    const info = await transporter.sendMail({
      from: '"Clínica Dermatológica" <noreply@clinica.com>',
      to: patientEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    console.log("Confirmation email sent:", info.messageId);

    return {
      success: true,
      error: null,
      messageId: info.messageId
    };
  } catch (err) {
    console.error("Failed to send confirmation email:", err);

    // Return user-friendly error based on error code
    const error = err as any;
    let errorMessage = "No se pudo enviar el correo de confirmación";

    if (error.code === "EAUTH") {
      errorMessage = "Error de autenticación del servidor de correo";
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      errorMessage = "No se pudo conectar al servidor de correo";
    } else if (error.code === "EENVELOPE") {
      errorMessage = "Dirección de correo inválida";
    }

    return { success: false, error: errorMessage };
  }
}
```

### Environment Variables

**.env.local**:

```bash
# Gmail SMTP (using App Password)
SMTP_USER=your-email@gmail.com
SMTP_APP_PASSWORD=your-16-char-app-password

# Or custom SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
```

### Component Usage

```typescript
"use client";

import { sendAppointmentConfirmation } from "./actions";
import { toast } from "sonner";

async function handleCreateAppointment() {
  // ... create appointment logic

  // Send confirmation email
  const { success, error } = await sendAppointmentConfirmation(
    paciente.email,
    `${paciente.nombre} ${paciente.apellido}`,
    medico.nombre,
    formatDateTime(consulta.fecha_hora)
  );

  if (success) {
    toast.success("Consulta creada y correo enviado");
  } else {
    toast.warning(`Consulta creada, pero no se pudo enviar correo: ${error}`);
  }
}
```

---

## 8. Testing & Development

### Ethereal Email (Free Test Accounts)

Ethereal captures outgoing emails for testing without actually delivering them.

```javascript
const nodemailer = require("nodemailer");

// Auto-generate test account
const testAccount = await nodemailer.createTestAccount();

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass,
  },
});

const info = await transporter.sendMail({
  from: '"Test Sender" <test@example.com>',
  to: "recipient@example.com",
  subject: "Test Email",
  text: "This is a test",
  html: "<p>This is a <strong>test</strong></p>",
});

// View email in browser
console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
// https://ethereal.email/message/xxx...
```

### Verify Configuration

```javascript
// Test SMTP config before sending
try {
  await transporter.verify();
  console.log("✅ SMTP server ready");
} catch (err) {
  console.error("❌ SMTP config error:", err);
}
```

---

## Documentation Quality Assessment

### Strengths

1. **Comprehensive Coverage**: Every feature is documented with clear examples
2. **Excellent Error Reference**: Complete error code catalog with troubleshooting steps
3. **Production-Ready Guidance**: Clear warnings about Gmail limitations, pooling best practices
4. **Security Conscious**: Documentation emphasizes OAuth2, warns about self-signed certs
5. **Well-Organized**: Logical structure with sidebar navigation, breadcrumbs, search
6. **Code Examples**: Every section includes copy-paste ready examples
7. **Gmail-Specific Guide**: Dedicated page for most common use case

### Areas for Improvement

1. **Rate Limiting**: Gmail limits are mentioned, but general SMTP rate limiting strategies could be expanded
2. **TypeScript Examples**: Most examples use JavaScript; TypeScript examples would be helpful
3. **Next.js Integration**: No official Next.js or Server Actions guide (implementation is straightforward though)
4. **Email Validation**: No built-in email address validation utilities mentioned

### Overall Rating

**9/10** - One of the best-documented Node.js libraries. Production-ready, security-conscious, and comprehensive.

---

## Recommendations for PMS Project

1. **Use App Password for Gmail** (simpler than OAuth2 for internal clinic tool)
2. **Create singleton transporter** in `lib/email/nodemailer.ts`
3. **Template-based emails** in `lib/email/templates.ts` for consistency
4. **Server actions** for sending (never expose credentials to client)
5. **Error handling**:
   - Log detailed errors server-side
   - Return user-friendly messages to client
   - Don't fail appointment creation if email fails (warn user instead)
6. **Environment variables** for credentials (never commit to git)
7. **Test with Ethereal** during development
8. **Consider alternatives** if sending volume increases (Resend, SendGrid, etc.)

---

**End of Documentation Review**
