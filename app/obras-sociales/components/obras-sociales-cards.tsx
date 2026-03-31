"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ExternalLink, MoreHorizontal, Trash2, Building2, Plus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { deleteObraSocial, ObraSocial } from "../actions"
import { CrearObraSocialDialog } from "./crear-obra-social-dialog"

interface ObrasSocialesCardsProps {
  initialObrasSociales: ObraSocial[]
}

export function ObrasSocialesCards({ initialObrasSociales }: ObrasSocialesCardsProps) {
  const [obrasSociales, setObrasSociales] = useState(initialObrasSociales)
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [obraSocialToDelete, setObraSocialToDelete] = useState<{ id: string; nombre: string } | null>(null)
  const router = useRouter()

  const handleDeleteClick = (id: string, nombre: string) => {
    setObraSocialToDelete({ id, nombre })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!obraSocialToDelete) return

    startTransition(async () => {
      try {
        const result = await deleteObraSocial(obraSocialToDelete.id)

        if (result.success) {
          setObrasSociales(obrasSociales.filter((os) => os.id !== obraSocialToDelete.id))
          toast.success("Obra social eliminada exitosamente")
          setDeleteDialogOpen(false)
          setObraSocialToDelete(null)
          router.refresh()
        } else {
          toast.error(result.error || "Error al eliminar la obra social")
        }
      } catch (error) {
        toast.error("Error inesperado al eliminar la obra social")
        console.error("Error deleting obra social:", error)
      }
    })
  }

  const handleObraSocialCreated = (newObraSocial: ObraSocial) => {
    // Optimistically add the new obra social to the list
    setObrasSociales([newObraSocial, ...obrasSociales])
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Obras Sociales</h1>
            <p className="text-muted-foreground">Gestione las obras sociales disponibles en el sistema</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar obra social
          </Button>
        </div>

        {obrasSociales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No hay obras sociales registradas</h3>
            <p className="text-muted-foreground mb-4">Agregue la primera obra social para comenzar.</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar obra social
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {obrasSociales.map((obraSocial) => {
              return (
                <Card
                  key={obraSocial.id}
                  className="flex flex-col overflow-hidden rounded-lg border-border bg-card text-card-foreground shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl min-h-[180px] w-full p-0"
                >
                  <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{obraSocial.nombre}</h3>
                      <p className="text-xs text-muted-foreground">
                        {obraSocial.codigo || "Código no disponible"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={`Acciones para ${obraSocial.nombre}`}
                          disabled={isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(obraSocial.id, obraSocial.nombre)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-1.5 px-4 py-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex items-center text-xs text-foreground">
                      <span className="font-medium mr-2">Email:</span>
                      <span className="truncate">{obraSocial.email || "Email no disponible"}</span>
                    </div>
                    <div className="flex items-center text-xs text-foreground">
                      <span className="font-medium mr-2">Teléfono:</span>
                      <span className="truncate">{obraSocial.telefono || "Teléfono no disponible"}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="mt-auto flex justify-between items-center border-t border-border bg-muted/30 px-4 pt-3 pb-3 flex-shrink-0 m-0">
                    <div className="flex gap-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => obraSocial.sitio_web && window.open(obraSocial.sitio_web, '_blank', 'noopener,noreferrer')}
                            disabled={!obraSocial.sitio_web}
                            className={obraSocial.sitio_web ? "" : "opacity-50 cursor-not-allowed"}
                          >
                            <ExternalLink
                              className={`h-4 w-4 transition-colors ${
                                obraSocial.sitio_web
                                  ? "text-green-600 hover:text-green-700"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{obraSocial.sitio_web ? "Visitar sitio web" : "Sitio web no disponible"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Button
                      size="sm"
                      asChild
                    >
                      <Link href={`/obras-sociales/${obraSocial.id}`}>
                        Ver
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <CrearObraSocialDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onObraSocialCreated={handleObraSocialCreated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Obra Social</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar {obraSocialToDelete?.nombre}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setObraSocialToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
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
    </TooltipProvider>
  )
}
