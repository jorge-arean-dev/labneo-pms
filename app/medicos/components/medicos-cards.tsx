"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MoreHorizontal, Trash2, UserCog, KeyRound, Plus, Phone, Mail } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { resetMedicoPassword, resendMedicoInvite, Medico } from "../actions"
import { CrearMedicoDialog } from "./crear-medico-dialog"
import { EliminarMedicoDialog } from "./eliminar-medico-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MedicosCardsProps {
  initialMedicos: Medico[]
  userRole: string | null
}

export function MedicosCards({ initialMedicos, userRole }: MedicosCardsProps) {
  const [medicos, setMedicos] = useState(initialMedicos)
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [medicoToDelete, setMedicoToDelete] = useState<{ id: string; nombre: string } | null>(null)
  const router = useRouter()

  const handleDeleteClick = (id: string, nombre: string, apellido: string) => {
    setMedicoToDelete({ id, nombre: `${nombre} ${apellido}` })
    setDeleteDialogOpen(true)
  }

  const handleDeleteSuccess = () => {
    if (medicoToDelete) {
      setMedicos(medicos.filter((m) => m.id !== medicoToDelete.id))
    }
    setDeleteDialogOpen(false)
    setMedicoToDelete(null)
    router.refresh()
  }

  const handlePasswordReset = (email: string, nombre: string, apellido: string) => {
    startTransition(async () => {
      try {
        const result = await resetMedicoPassword(email)

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
        const result = await resendMedicoInvite(email)

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

  const handleMedicoCreated = (newMedico: Medico) => {
    // Optimistically add the new médico to the list
    setMedicos([newMedico, ...medicos])
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

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const isAdmin = userRole === "Administrador"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Médicos</h1>
          <p className="text-muted-foreground">Gestione los médicos registrados en el sistema</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Médico
          </Button>
        )}
      </div>

      {medicos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <UserCog className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay médicos registrados</h3>
          <p className="text-muted-foreground mb-4">
            {isAdmin ? "Cree el primer médico para comenzar." : "No hay médicos disponibles en este momento."}
          </p>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Médico
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicos.map((medico) => {
            const initials = getInitials(medico.nombre, medico.apellido)
            const nombreCompleto = `${medico.nombre} ${medico.apellido}`

            return (
              <Card
                key={medico.id}
                className="flex flex-col overflow-hidden rounded-lg border-border bg-card text-card-foreground shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl min-h-[240px] w-full p-0"
              >
                <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={medico.foto_perfil_url || undefined} alt={nombreCompleto} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-sm font-semibold truncate">{nombreCompleto}</h3>
                      <p className="text-xs text-muted-foreground truncate">{medico.email}</p>
                    </div>
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
                        {medico.activated_at === null ? (
                          <DropdownMenuItem
                            onClick={() => handleResendInvite(medico.email, medico.nombre, medico.apellido)}
                            className="cursor-pointer"
                            disabled={isPending}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Re-enviar Invitación
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handlePasswordReset(medico.email, medico.nombre, medico.apellido)}
                            className="cursor-pointer"
                            disabled={isPending}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Restablecer Contraseña
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(medico.id, medico.nombre, medico.apellido)}
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
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{medico.telefono || "Teléfono no disponible"}</span>
                  </div>
                  {medico.obras_sociales && medico.obras_sociales.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {medico.obras_sociales.map((os) => (
                        <span
                          key={os.id}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          {os.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin obras sociales</span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="font-medium flex-shrink-0">Estado:</span>
                    {medico.activated_at ? (
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
                      {formatLastSignIn(medico.last_sign_in_at, medico.activated_at)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="mt-auto flex justify-end items-center border-t border-border bg-muted/30 px-4 pt-3 pb-3 flex-shrink-0 m-0">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/medicos/${medico.id}`}>
                      Ver
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <CrearMedicoDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onMedicoCreated={handleMedicoCreated}
      />

      {medicoToDelete && (
        <EliminarMedicoDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setMedicoToDelete(null)
          }}
          medicoId={medicoToDelete.id}
          medicoNombre={medicoToDelete.nombre}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}
