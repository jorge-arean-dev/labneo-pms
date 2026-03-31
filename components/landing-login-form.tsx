"use client"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export function LandingLoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Wait for session to be established
      if (data.session) {
        // Redirect to root page after successful login - use hard navigation for cache clearing
        window.location.href = "/"
      } else {
        throw new Error("No se pudo establecer la sesión")
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Translate common Supabase auth errors to Spanish
        if (error.message === "Invalid login credentials") {
          setError("Credenciales inválidas. Verifique su correo y contraseña.")
        } else if (error.message === "Email not confirmed") {
          setError("El correo electrónico no ha sido confirmado.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Ocurrió un error inesperado")
      }
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline underline-offset-4"
                    tabIndex={-1}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
