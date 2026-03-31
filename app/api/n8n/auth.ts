/**
 * Authentication helper for n8n API endpoints
 *
 * Validates API key from request headers.
 * The API key should be set in environment variable N8N_API_KEY.
 */

import { NextRequest } from "next/server"

export interface AuthResult {
  authorized: boolean
  error?: string
}

/**
 * Validate the API key from request headers
 *
 * Usage:
 * ```ts
 * const auth = validateApiKey(request)
 * if (!auth.authorized) {
 *   return Response.json({ error: auth.error }, { status: 401 })
 * }
 * ```
 */
export function validateApiKey(request: NextRequest): AuthResult {
  const apiKey = request.headers.get("x-api-key")

  if (!apiKey) {
    return {
      authorized: false,
      error: "Missing API key. Provide x-api-key header.",
    }
  }

  const expectedKey = process.env.N8N_API_KEY

  if (!expectedKey) {
    console.error("N8N_API_KEY environment variable is not set")
    return {
      authorized: false,
      error: "Server configuration error.",
    }
  }

  if (apiKey !== expectedKey) {
    return {
      authorized: false,
      error: "Invalid API key.",
    }
  }

  return { authorized: true }
}

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(error: string): Response {
  return Response.json({ success: false, error }, { status: 401 })
}

/**
 * Helper to create bad request response
 */
export function badRequestResponse(error: string): Response {
  return Response.json({ success: false, error }, { status: 400 })
}

/**
 * Helper to create server error response
 */
export function serverErrorResponse(error: string): Response {
  return Response.json({ success: false, error }, { status: 500 })
}

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T): Response {
  return Response.json({ success: true, data })
}
