/**
 * Email password encryption utilities
 *
 * Uses AES-256-GCM for encrypting sensitive data like SMTP passwords.
 * The encryption key should be stored in EMAIL_ENCRYPTION_KEY environment variable.
 *
 * Key format: 64-character hex string (32 bytes = 256 bits)
 * Generate with: openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM recommended IV length
const AUTH_TAG_LENGTH = 16 // GCM auth tag length

/**
 * Get the encryption key from environment
 * @throws Error if key is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32"
    )
  }

  if (keyHex.length !== 64) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: openssl rand -hex 32"
    )
  }

  return Buffer.from(keyHex, "hex")
}

/**
 * Encrypt a plaintext string
 * @param plaintext The text to encrypt
 * @returns Base64-encoded string containing IV + ciphertext + auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Combine IV + ciphertext + auth tag into single buffer
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString("base64")
}

/**
 * Decrypt an encrypted string
 * @param encryptedBase64 Base64-encoded string from encrypt()
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedBase64, "base64")

  // Extract IV, ciphertext, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(
    IV_LENGTH,
    combined.length - AUTH_TAG_LENGTH
  )

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

/**
 * Check if a value is encrypted (basic format check)
 * @param value The value to check
 * @returns True if it looks like an encrypted value
 */
export function isEncrypted(value: string): boolean {
  // Encrypted values are base64 and at minimum contain IV + auth tag
  const minLength = (IV_LENGTH + AUTH_TAG_LENGTH) * 1.4 // Base64 expansion factor
  return value.length >= minLength && /^[A-Za-z0-9+/]+=*$/.test(value)
}

/**
 * Safely encrypt a password, handling empty/null values
 * @param password The password to encrypt (can be null/empty)
 * @returns Encrypted password or null
 */
export function encryptPassword(password: string | null | undefined): string | null {
  if (!password || password.trim() === "") {
    return null
  }
  return encrypt(password)
}

/**
 * Safely decrypt a password, handling empty/null values
 * @param encryptedPassword The encrypted password (can be null/empty)
 * @returns Decrypted password or null
 */
export function decryptPassword(
  encryptedPassword: string | null | undefined
): string | null {
  if (!encryptedPassword || encryptedPassword.trim() === "") {
    return null
  }
  try {
    return decrypt(encryptedPassword)
  } catch {
    console.error("Failed to decrypt password - may be corrupted or wrong key")
    return null
  }
}
