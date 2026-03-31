"use client"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { activateUserAccount } from "@/app/auth/actions"

/**
 * Translates common Supabase Auth error messages to Spanish
 */
function translateAuthError(errorMessage: string): string {
  const errorTranslations: Record<string, string> = {
    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres",
    "Auth session missing":
      "Sesión no encontrada. Por favor, solicite un nuevo enlace.",
    "Password is too weak": "La contraseña es demasiado débil",
  }

  return errorTranslations[errorMessage] || errorMessage
}

/**
 * Parse hash parameters from URL fragment
 */
function getHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const hash = window.location.hash.substring(1)
  if (!hash) return {}

  const params: Record<string, string> = {}
  hash.split("&").forEach((pair) => {
    const [key, value] = pair.split("=")
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value)
    }
  })
  return params
}

export function SetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const sessionFoundRef = useRef(false)
  const supabaseRef = useRef(createClient())

  const markSessionReady = useCallback(() => {
    sessionFoundRef.current = true
    setIsSessionReady(true)
    setIsCheckingSession(false)
  }, [])

  // Process the hash token and establish session on mount
  useEffect(() => {
    const supabase = supabaseRef.current

    // Check if we have hash params with access_token
    const hashParams = getHashParams()
    const hasHashToken = !!hashParams.access_token

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !sessionFoundRef.current) {
        markSessionReady()
      }
    })

    const initSession = async () => {
      // If we have a hash token, try to set the session explicitly
      if (hasHashToken && hashParams.refresh_token) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: hashParams.access_token,
          refresh_token: hashParams.refresh_token,
        })

        if (data.session && !sessionError) {
          markSessionReady()
          // Clear the hash from URL
          window.history.replaceState(null, "", window.location.pathname)
          return
        }
      }

      // Wait a bit for auto-detection to work
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        markSessionReady()
      } else if (!sessionFoundRef.current) {
        setError("El enlace ha expirado o es inválido.")
        setIsCheckingSession(false)
      }
    }

    initSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [markSessionReady])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Mark the account as activated in usuarios_pms
      // This sets activated_at which is used for the "Activa/Pendiente" badge
      console.log("[SetPasswordForm] Calling activateUserAccount...")
      const activationResult = await activateUserAccount()
      console.log("[SetPasswordForm] activateUserAccount result:", activationResult)
      if (activationResult.error) {
        console.error("[SetPasswordForm] Error activating account:", activationResult.error)
        // Don't block the user - password was set successfully
      }

      toast.success("Cuenta activada exitosamente")

      // Redirect to home after password set - use hard navigation for cache clearing
      window.location.href = "/"
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error"
      setError(translateAuthError(errorMessage))
      setIsLoading(false)
    }
  }

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className={cn("w-full", className)} {...props}>
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Verificando enlace...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if no session found
  if (!isSessionReady) {
    return (
      <div className={cn("w-full", className)} {...props}>
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  Enlace Inválido
                </h2>
                <p className="text-sm text-muted-foreground">
                  {error}
                </p>
              </div>
              <Button asChild className="w-full mt-2">
                <Link href="/">
                  Volver al inicio
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                Configurar Contraseña
              </h2>
              <p className="text-sm text-muted-foreground">
                Ingrese una contraseña para activar su cuenta.
              </p>
            </div>
            <form onSubmit={handleSetPassword}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activando...
                    </>
                  ) : (
                    "Activar cuenta"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
