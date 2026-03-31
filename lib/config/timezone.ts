/**
 * Application Timezone Configuration
 *
 * Currently hardcoded to Argentina timezone.
 * Future: This will be configurable via /configuracion route by admin users.
 */

// Default timezone for the application
// TODO: In the future, this will be fetched from database/user settings
export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires'

/**
 * Get the current application timezone.
 * Future: This function could read from database, environment variable, or user session.
 */
export function getAppTimezone(): string {
  return APP_TIMEZONE
}
