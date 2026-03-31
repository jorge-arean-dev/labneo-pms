"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { es } from "date-fns/locale"

// Mock data configuration following the naming convention
const configuracion_horarios = {
  lunes: { hora_inicio: "09:00", hora_fin: "18:00", duracion_consulta: 30 },
  martes: { hora_inicio: "09:00", hora_fin: "18:00", duracion_consulta: 30 },
  miercoles: { hora_inicio: "09:00", hora_fin: "17:00", duracion_consulta: 30 },
  jueves: { hora_inicio: "10:00", hora_fin: "19:00", duracion_consulta: 30 },
  viernes: { hora_inicio: "09:00", hora_fin: "16:00", duracion_consulta: 30 },
  sabado: { hora_inicio: "09:00", hora_fin: "13:00", duracion_consulta: 30 },
  domingo: { hora_inicio: "10:00", hora_fin: "14:00", duracion_consulta: 30 },
}

// Mock data for scheduled appointments count per time slot
const consultas_agendadas_mock = {
  "2025-11-26": {
    "09:00": 2,
    "09:30": 1,
    "10:00": 3,
    "10:30": 0,
    "11:00": 1,
    "11:30": 2,
    "13:00": 1,
    "13:30": 0,
    "14:00": 2,
    "14:30": 1,
    "15:00": 0,
    "15:30": 1,
    "16:00": 2,
    "16:30": 1,
    "17:00": 0,
    "17:30": 1,
  },
}

function generateTimeSlots(horaInicio: string, horaFin: string, duracion: number): string[] {
  const slots: string[] = []
  const [startHour, startMinute] = horaInicio.split(":").map(Number)
  const [endHour, endMinute] = horaFin.split(":").map(Number)

  let currentMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60)
    const minute = currentMinutes % 60
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)
    currentMinutes += duracion
  }

  return slots
}

function getDayName(date: Date): keyof typeof configuracion_horarios {
  const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const
  return days[date.getDay()]
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function AgendarConsultaPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const dayName = getDayName(selectedDate)
  const dayConfig = configuracion_horarios[dayName]
  const timeSlots = generateTimeSlots(dayConfig.hora_inicio, dayConfig.hora_fin, dayConfig.duracion_consulta)

  const dateKey = formatDateKey(selectedDate)
  const appointmentCounts = consultas_agendadas_mock[dateKey] || {}

  return (
    <div className="flex h-screen">
      <main className="flex-1 overflow-y-auto bg-background p-8 pl-4 pr-8 pt-8">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">Agendar Consulta</h1>
          <p className="text-muted-foreground">Seleccione una fecha y horario disponible para agendar una consulta.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[350px_1fr]">
          {/* Calendar Section */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Seleccionar Fecha</h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date)
                  setSelectedTime(null)
                }
              }}
              locale={es}
              className="rounded-md border"
            />
          </Card>

          <Card className="p-6">
            <div className="mb-4 grid grid-cols-[auto_120px] gap-4">
              <h2 className="text-lg font-semibold">Horarios Disponibles</h2>
              <h2 className="text-center text-lg font-semibold">Consultas Agendadas</h2>
            </div>

            <div className="max-h-[500px] space-y-2 overflow-y-auto">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time
                const count = appointmentCounts[time] || 0

                return (
                  <div key={time} className="grid grid-cols-[auto_120px] items-center gap-4">
                    <button
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {time}
                    </button>

                    <div className="flex items-center justify-center">
                      <Badge variant={count > 0 ? "default" : "secondary"} className="font-semibold">
                        {count}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
