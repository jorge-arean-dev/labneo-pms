/**
 * Email service module
 *
 * Provides email sending capabilities for the PMS system.
 * Supports Gmail SMTP (default) with future support for Resend.
 */

// Re-export types
export * from "./types"

// Re-export encryption utilities
export { encrypt, decrypt, encryptPassword, decryptPassword } from "./encryption"

// Re-export email service functions
export {
  getEmailConfig,
  isEmailConfigured,
  getClinicInfo,
  prepareEmailTemplateData,
  sendEmail,
  testEmailConnection,
  scheduleReminder,
  cancelRemindersForConsulta,
  getPendingReminders,
  markReminderSent,
  markReminderFailed,
} from "./service"

// Re-export Gmail provider (for direct access if needed)
export {
  createGmailTransporter,
  verifyGmailConnection,
  sendEmailViaGmail,
} from "./providers/gmail"

// Re-export email templates
export {
  generateEmailContent,
  generateTestEmailContent,
  confirmacionTemplate,
  recordatorioTemplate,
  cancelacionTemplate,
} from "./templates"

// Re-export appointment email functions
export {
  sendConfirmationEmail,
  sendCancellationEmail,
  sendReminderEmail,
} from "./appointment-emails"
