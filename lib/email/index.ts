/**
 * Email service module — Portal Labneo
 *
 * Provides email sending capabilities.
 * Supports Gmail SMTP.
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
  sendEmail,
  testEmailConnection,
} from "./service"

// Re-export Gmail provider
export {
  createGmailTransporter,
  verifyGmailConnection,
  sendEmailViaGmail,
} from "./providers/gmail"

// Re-export base template utilities
export {
  baseTemplate,
  formatDateSpanish,
  formatTimeSpanish,
  capitalize,
} from "./templates"
