"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/utils/date-format"
import {
  fetchOdontologoVeviCredentials,
  updateOdontologoVeviCredentials,
} from "../actions"
import type { OdontologoListItem } from "@/lib/types/entities"

interface EditarVeviCredencialesDialogProps {
  odontologo: OdontologoListItem | null
  onClose: () => void
  onUpdated: (updated: OdontologoListItem) => void
}

export function EditarVeviCredencialesDialog({
  odontologo,
  onClose,
  onUpdated,
}: EditarVeviCredencialesDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [comentarios, setComentarios] = useState("")

  const isOpen = odontologo !== null
  const isRegistered = !!odontologo?.vevi_registrado_at

  // Load current credentials when the dialog opens for a specific odontólogo
  useEffect(() => {
    if (!odontologo) return

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      // Reset fields to empty first so leftover state from a previous edit
      // doesn't leak into the new one before fetch completes.
      setUsuario("")
      setPassword("")
      setPasswordConfirm("")
      setComentarios("")

      const { data, error } = await fetchOdontologoVeviCredentials(odontologo.id)
      if (cancelled) return

      if (error) {
        toast.error(error)
      } else if (data) {
        setUsuario(data.vevi_usuario || "")
        setPassword(data.vevi_password || "")
        setPasswordConfirm(data.vevi_password || "")
        setComentarios(data.vevi_comentarios || "")
      }
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [odontologo])

  const handleSubmitClick = () => {
    if (!usuario.trim() || !password.trim()) {
      toast.error("El usuario y la contraseña son obligatorios")
      return
    }
    if (password !== passwordConfirm) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    setConfirmOpen(true)
  }

  const runUpdate = async () => {
    if (!odontologo) return

    setIsSaving(true)
    setConfirmOpen(false)

    const { success, error, data } = await updateOdontologoVeviCredentials(
      odontologo.id,
      {
        vevi_usuario: usuario.trim(),
        vevi_password: password.trim(),
        vevi_comentarios: comentarios.trim() || null,
      }
    )

    if (success && data) {
      toast.success(
        isRegistered
          ? "Credenciales actualizadas — Email enviado al odontólogo"
          : "Odontólogo registrado en Vevi — Email enviado"
      )
      onUpdated(data)
      onClose()
    } else {
      toast.error(error || "Error al guardar las credenciales")
    }

    setIsSaving(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isRegistered ? "Editar credenciales Vevi" : "Registrar en Vevi"}
            </DialogTitle>
            <DialogDescription>
              {odontologo && (
                <>
                  {odontologo.nombre} {odontologo.apellido} · {odontologo.email}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Registration context */}
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {isRegistered ? (
                  <p>
                    <span className="text-muted-foreground">Registrado el </span>
                    <span className="font-medium">
                      {formatDateTime(odontologo!.vevi_registrado_at!)}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Este odontólogo aún no está registrado en Vevi. Al guardar,
                    quedará marcado como registrado y recibirá un email con las
                    credenciales.
                  </p>
                )}
              </div>

              {/* Form fields */}
              <div className="space-y-2">
                <Label htmlFor="edit-vevi-usuario">Usuario *</Label>
                <Input
                  id="edit-vevi-usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="usuario@vevidental.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vevi-password">Contraseña *</Label>
                <Input
                  id="edit-vevi-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vevi-password-confirm">Repetir contraseña *</Label>
                <Input
                  id="edit-vevi-password-confirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repetir contraseña"
                />
                {password && passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vevi-comentarios">Comentarios (opcional)</Label>
                <Textarea
                  id="edit-vevi-comentarios"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Comentarios visibles para el odontólogo..."
                  rows={3}
                />
              </div>

              {/* Warning about the email */}
              <div className="flex gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Al guardar, se enviará automáticamente un email al odontólogo con
                  las nuevas credenciales. Esta notificación no puede desactivarse.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitClick} disabled={isLoading || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isRegistered ? (
                "Guardar cambios"
              ) : (
                "Registrar en Vevi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRegistered ? "Confirmar cambio de credenciales" : "Confirmar registro en Vevi"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Se enviarán los siguientes datos al odontólogo por email:</p>
                <div className="rounded-md border p-3 bg-muted/40 space-y-1 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground">Usuario: </span>
                    {usuario}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contraseña: </span>
                    {password}
                  </div>
                </div>
                {isRegistered && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Las credenciales anteriores dejarán de funcionar en cuanto el
                    odontólogo actualice su acceso en Vevi Dental.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runUpdate()}>
              Confirmar y guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
