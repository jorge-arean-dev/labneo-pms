"use client"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { Loader2, MailCheck } from "lucide-react"

export function LandingForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Translate common Supabase auth errors to Spanish
        if (error.message.includes("rate limit")) {
          setError("Demasiados intentos. Por favor espere unos minutos.")
        } else if (error.message.includes("Invalid email")) {
          setError("El correo electrónico no es válido.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Ocurrió un error inesperado")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {success ? (
            // Success State
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-3">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  Revise su correo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Hemos enviado instrucciones para restablecer su contraseña a:
                </p>
                <p className="text-sm font-medium text-foreground">
                  {email}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Si no recibe el correo en unos minutos, verifique su carpeta de spam o intente nuevamente.
              </p>
              <Button asChild className="w-full mt-2">
                <Link href="/">
                  Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          ) : (
            // Form State
            <div className="space-y-4">
              <div className="space-y-2 text-center">
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  Recuperar contraseña
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
                </p>
              </div>
              <form onSubmit={handleForgotPassword}>
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
                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar enlace"
                    )}
                  </Button>
                </div>
              </form>
              <div className="text-center">
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4 transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
