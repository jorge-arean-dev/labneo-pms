"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MoreHorizontal, Trash2, UserCheck, KeyRound, Plus, Mail } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { deleteRecepcionista, resetRecepcionistaPassword, resendRecepcionistaInvite, Recepcionista } from "../actions"
import { CrearRecepcionistaDialog } from "./crear-recepcionista-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface RecepcionistasCardsProps {
  initialRecepcionistas: Recepcionista[]
  userRole: string | null
}

export function RecepcionistasCards({ initialRecepcionistas, userRole }: RecepcionistasCardsProps) {
  const [recepcionistas, setRecepcionistas] = useState(initialRecepcionistas)
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [recepcionistaToDelete, setRecepcionistaToDelete] = useState<{ id: string; nombre: string } | null>(null)
  const router = useRouter()

  const handleDeleteClick = (id: string, nombre: string, apellido: string) => {
    setRecepcionistaToDelete({ id, nombre: `${nombre} ${apellido}` })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!recepcionistaToDelete) return

    startTransition(async () => {
      try {
        const result = await deleteRecepcionista(recepcionistaToDelete.id)

        if (result.success) {
          setRecepcionistas(recepcionistas.filter((r) => r.id !== recepcionistaToDelete.id))
          toast.success("Recepcionista eliminado exitosamente")
          setDeleteDialogOpen(false)
          setRecepcionistaToDelete(null)
          router.refresh()
        } else {
          toast.error(result.error || "Error al eliminar el recepcionista")
        }
      } catch (error) {
        toast.error("Error inesperado al eliminar el recepcionista")
        console.error("Error deleting recepcionista:", error)
      }
    })
  }

  const handlePasswordReset = (email: string, nombre: string, apellido: string) => {
    startTransition(async () => {
      try {
        const result = await resetRecepcionistaPassword(email)

        if (result.success) {
          toast.success(`Email de restablecimiento enviado a ${nombre} ${apellido}`)
        } else {
          toast.error(result.error || "Error al enviar el email")
        }
      } catch (error) {
        toast.error("Error inesperado al restablecer la contraseña")
        console.error("Error resetting password:", error)
      }
    })
  }

  const handleResendInvite = (email: string, nombre: string, apellido: string) => {
    startTransition(async () => {
      try {
        const result = await resendRecepcionistaInvite(email)

        if (result.success) {
          toast.success(`Invitación reenviada a ${nombre} ${apellido}`)
        } else {
          toast.error(result.error || "Error al reenviar la invitación")
        }
      } catch (error) {
        toast.error("Error inesperado al reenviar la invitación")
        console.error("Error resending invite:", error)
      }
    })
  }

  const handleRecepcionistaCreated = (newRecepcionista: Recepcionista) => {
    // Optimistically add the new recepcionista to the list
    setRecepcionistas([newRecepcionista, ...recepcionistas])
  }

  const formatLastSignIn = (lastSignInAt: string | null, activatedAt: string | null) => {
    // If not activated, the user hasn't completed setup - don't show misleading data
    if (!activatedAt) {
      return "—"
    }

    if (!lastSignInAt) {
      return "Nunca ha iniciado sesión"
    }

    try {
      const date = new Date(lastSignInAt)
      return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es })
    } catch {
      return "Fecha inválida"
    }
  }

  const isAdmin = userRole === "Administrador"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepcionistas</h1>
          <p className="text-muted-foreground">Gestione los recepcionistas registrados en el sistema</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Recepcionista
          </Button>
        )}
      </div>

      {recepcionistas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <UserCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay recepcionistas registrados</h3>
          <p className="text-muted-foreground mb-4">
            {isAdmin ? "Cree el primer recepcionista para comenzar." : "No hay recepcionistas disponibles en este momento."}
          </p>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Recepcionista
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recepcionistas.map((recepcionista) => {
            const nombreCompleto = `${recepcionista.nombre} ${recepcionista.apellido}`

            return (
              <Card
                key={recepcionista.id}
                className="flex flex-col overflow-hidden rounded-lg border-border bg-card text-card-foreground shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl min-h-[200px] w-full p-0"
              >
                <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{nombreCompleto}</h3>
                    <p className="text-xs text-muted-foreground truncate">{recepcionista.email}</p>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          aria-label={`Acciones para ${nombreCompleto}`}
                          disabled={isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuItem disabled className="cursor-not-allowed">
                          Editar
                        </DropdownMenuItem>
                        {recepcionista.activated_at === null ? (
                          <DropdownMenuItem
                            onClick={() => handleResendInvite(recepcionista.email, recepcionista.nombre, recepcionista.apellido)}
                            className="cursor-pointer"
                            disabled={isPending}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Re-enviar Invitación
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handlePasswordReset(recepcionista.email, recepcionista.nombre, recepcionista.apellido)}
                            className="cursor-pointer"
                            disabled={isPending}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Restablecer Contraseña
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(recepcionista.id, recepcionista.nombre, recepcionista.apellido)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>

                <CardContent className="flex-1 space-y-2 px-4 py-2 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="font-medium flex-shrink-0">Estado:</span>
                    {recepcionista.activated_at ? (
                      <Badge variant="outline" className="border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start text-xs text-foreground">
                    <span className="font-medium mr-2 flex-shrink-0">Último acceso:</span>
                    <span className="text-muted-foreground text-xs">
                      {formatLastSignIn(recepcionista.last_sign_in_at, recepcionista.activated_at)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="mt-auto flex justify-end items-center border-t border-border bg-muted/30 px-4 pt-3 pb-3 flex-shrink-0 m-0">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/recepcionistas/${recepcionista.id}`}>
                      Ver
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <CrearRecepcionistaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onRecepcionistaCreated={handleRecepcionistaCreated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Recepcionista</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar a {recepcionistaToDelete?.nombre}? Esta acción eliminará permanentemente el recepcionista y revocará su acceso a la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecepcionistaToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
