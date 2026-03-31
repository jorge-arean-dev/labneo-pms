/**
 * Gets the base URL for the application.
 * Works in both development and production (Vercel) environments.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (explicit override)
 * 2. NEXT_PUBLIC_APP_URL (legacy)
 * 3. VERCEL_PROJECT_PRODUCTION_URL (auto-set by Vercel in production)
 * 4. localhost fallback for development
 */
export function getBaseUrl(): string {
  // Explicit override takes priority
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // Legacy env var
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Vercel's auto-provided production URL (doesn't include protocol)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  // Vercel's deployment URL (for preview deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Local development fallback
  return "http://localhost:3000"
}
