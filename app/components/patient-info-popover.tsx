"use client"

import { Copy, Eye, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/utils/date-format"

interface PatientData {
  id: string
  nombre: string
  apellido: string
  dni: string
  email: string | null
  fecha_nacimiento: string
  plan: string | null
  numero_afiliado: string | null
  obra_social: {
    id: string
    nombre: string
  } | null
}

interface PatientInfoPopoverProps {
  paciente: PatientData
}

interface FieldRowProps {
  label: string
  value: string | null | undefined
  fieldName: string
}

function FieldRow({ label, value, fieldName }: FieldRowProps) {
  const copyToClipboard = async () => {
    if (!value) {
      toast.error("No hay valor para copiar")
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${fieldName} copiado al portapapeles`)
    } catch {
      toast.error("Error al copiar al portapapeles")
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-70 hover:opacity-100"
          onClick={copyToClipboard}
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="sr-only">Copiar {fieldName}</span>
        </Button>
      </div>
      <p className="text-sm font-medium">
        {value || <span className="text-muted-foreground">-</span>}
      </p>
    </div>
  )
}

export function PatientInfoPopover({ paciente }: PatientInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Ver información del paciente"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">Ver información del paciente</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="start">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">Información del Paciente</h3>
          <PopoverClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </PopoverClose>
        </div>
        <div className="space-y-3 p-4 max-h-[400px] overflow-y-auto">
          <FieldRow label="Nombre" value={paciente.nombre} fieldName="Nombre" />
          <FieldRow label="Apellido" value={paciente.apellido} fieldName="Apellido" />
          <FieldRow label="DNI" value={paciente.dni} fieldName="DNI" />
          <FieldRow label="Email" value={paciente.email} fieldName="Email" />
          <FieldRow
            label="Fecha de Nacimiento"
            value={formatDate(paciente.fecha_nacimiento)}
            fieldName="Fecha de nacimiento"
          />
          <FieldRow
            label="Obra Social"
            value={paciente.obra_social?.nombre}
            fieldName="Obra social"
          />
          <FieldRow label="Plan" value={paciente.plan} fieldName="Plan" />
          <FieldRow
            label="Número de Afiliado"
            value={paciente.numero_afiliado}
            fieldName="Número de afiliado"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
