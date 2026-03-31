"use client"

import { Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const medicos = [
    "Todos",
    "Dr. Carlos Ruiz",
    "Dra. María González",
    "Dr. Jorge Pérez",
    "Dra. Laura Díaz",
    "Dr. Antonio Méndez",
]

const estados = ["Todos", "Programada", "En Curso", "Completada", "Cancelada", "Paciente Ausente"]

interface ConsultasFiltersProps {
    searchDniNombre: string
    setSearchDniNombre: (value: string) => void
    selectedMedico: string
    setSelectedMedico: (value: string) => void
    selectedEstado: string
    setSelectedEstado: (value: string) => void
    dateFilter: "hoy" | "semana" | "rango"
    setDateFilter: (value: "hoy" | "semana" | "rango") => void
    fechaDesde: string
    setFechaDesde: (value: string) => void
    fechaHasta: string
    setFechaHasta: (value: string) => void
}

export function ConsultasFilters({
    searchDniNombre,
    setSearchDniNombre,
    selectedMedico,
    setSelectedMedico,
    selectedEstado,
    setSelectedEstado,
    dateFilter,
    setDateFilter,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
}: ConsultasFiltersProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Busca y filtra las consultas por diferentes criterios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Datetime filter row with segmented control */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Período</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex rounded-lg border bg-muted p-1">
                            <Button
                                variant={dateFilter === "hoy" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setDateFilter("hoy")}
                                className="rounded-md"
                            >
                                Hoy
                            </Button>
                            <Button
                                variant={dateFilter === "semana" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setDateFilter("semana")}
                                className="rounded-md"
                            >
                                Esta semana
                            </Button>
                            <Button
                                variant={dateFilter === "rango" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setDateFilter("rango")}
                                className="rounded-md"
                            >
                                Rango personalizado
                            </Button>
                        </div>

                        {dateFilter === "rango" && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="fecha-desde" className="text-sm text-muted-foreground">
                                        Desde:
                                    </label>
                                    <Input
                                        id="fecha-desde"
                                        type="date"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                        className="w-[160px]"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="fecha-hasta" className="text-sm text-muted-foreground">
                                        Hasta:
                                    </label>
                                    <Input
                                        id="fecha-hasta"
                                        type="date"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                        className="w-[160px]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <Input
                        placeholder="Buscar por DNI o Nombre"
                        value={searchDniNombre}
                        onChange={(e) => setSearchDniNombre(e.target.value)}
                        className="max-w-xs"
                    />

                    <Select value={selectedMedico} onValueChange={setSelectedMedico}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Médicos" />
                        </SelectTrigger>
                        <SelectContent>
                            {medicos.map((medico) => (
                                <SelectItem key={medico} value={medico}>
                                    {medico}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Estados" />
                        </SelectTrigger>
                        <SelectContent>
                            {estados.map((estado) => (
                                <SelectItem key={estado} value={estado}>
                                    {estado}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}
