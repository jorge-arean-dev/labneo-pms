"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Patient {
  id: number
  name: string
  dni: string
  obraSocial: string
  genero: string
  edad: number
  ultimaConsulta: string
  proximaConsulta: string
  telefono: string
}

const mockPatients: Patient[] = [
  {
    id: 1234,
    name: "María González",
    dni: "35.456.789",
    obraSocial: "OSDE",
    genero: "Femenino",
    edad: 34,
    ultimaConsulta: "15 de Enero, 2024",
    proximaConsulta: "22 de Febrero, 2024",
    telefono: "+54 11 4567-8901",
  },
  {
    id: 1567,
    name: "Carlos Rodríguez",
    dni: "28.123.456",
    obraSocial: "Swiss Medical",
    genero: "Masculino",
    edad: 45,
    ultimaConsulta: "20 de Enero, 2024",
    proximaConsulta: "18 de Marzo, 2024",
    telefono: "+54 11 4567-8902",
  },
  {
    id: 1892,
    name: "Ana Martínez",
    dni: "42.789.012",
    obraSocial: "Galeno",
    genero: "Femenino",
    edad: 28,
    ultimaConsulta: "18 de Enero, 2024",
    proximaConsulta: "25 de Febrero, 2024",
    telefono: "+54 11 4567-8903",
  },
  {
    id: 2034,
    name: "Jorge Fernández",
    dni: "31.234.567",
    obraSocial: "OSDE",
    genero: "Masculino",
    edad: 52,
    ultimaConsulta: "22 de Enero, 2024",
    proximaConsulta: "15 de Marzo, 2024",
    telefono: "+54 11 4567-8904",
  },
  {
    id: 2156,
    name: "Lucía Sánchez",
    dni: "39.876.543",
    obraSocial: "Medicus",
    genero: "Femenino",
    edad: 41,
    ultimaConsulta: "19 de Enero, 2024",
    proximaConsulta: "10 de Marzo, 2024",
    telefono: "+54 11 4567-8905",
  },
  {
    id: 2398,
    name: "Roberto Pérez",
    dni: "25.345.678",
    obraSocial: "Swiss Medical",
    genero: "Masculino",
    edad: 58,
    ultimaConsulta: "17 de Enero, 2024",
    proximaConsulta: "20 de Febrero, 2024",
    telefono: "+54 11 4567-8906",
  },
  {
    id: 2467,
    name: "Patricia López",
    dni: "37.654.321",
    obraSocial: "OSDE",
    genero: "Femenino",
    edad: 36,
    ultimaConsulta: "21 de Enero, 2024",
    proximaConsulta: "28 de Febrero, 2024",
    telefono: "+54 11 4567-8907",
  },
  {
    id: 2589,
    name: "Martín Díaz",
    dni: "33.987.654",
    obraSocial: "Galeno",
    genero: "Masculino",
    edad: 47,
    ultimaConsulta: "16 de Enero, 2024",
    proximaConsulta: "12 de Marzo, 2024",
    telefono: "+54 11 4567-8908",
  },
]

const obrasSociales = ["Todas", "OSDE", "Swiss Medical", "Galeno", "Medicus", "IOMA", "PAMI"]
const generos = ["Todos", "Masculino", "Femenino", "Otro"]

export default function PacientesPage() {
  const [searchName, setSearchName] = useState("")
  const [searchPhone, setSearchPhone] = useState("")
  const [selectedObraSocial, setSelectedObraSocial] = useState("Todas")
  const [selectedGenero, setSelectedGenero] = useState("Todos")
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const filteredPatients = mockPatients

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">
            Gestiona la información de tus pacientes, historiales médicos y citas programadas.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Crear paciente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="Buscar por teléfono"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="w-48"
        />
        <Select value={selectedObraSocial} onValueChange={setSelectedObraSocial}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Obra Social" />
          </SelectTrigger>
          <SelectContent>
            {obrasSociales.map((os) => (
              <SelectItem key={os} value={os}>
                {os}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedGenero} onValueChange={setSelectedGenero}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Género" />
          </SelectTrigger>
          <SelectContent>
            {generos.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[180px]">Paciente</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">DNI</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Obra Social</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Género</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Edad</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Última Consulta</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Próxima Consulta</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Teléfono</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <span className="font-semibold text-sm">{patient.name}</span>
                  </td>
                  <td className="px-4 py-4 text-sm">{patient.dni}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {patient.obraSocial}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">{patient.genero}</td>
                  <td className="px-4 py-4 text-sm">{patient.edad}</td>
                  <td className="px-4 py-4 text-sm">{patient.ultimaConsulta}</td>
                  <td className="px-4 py-4 text-sm">{patient.proximaConsulta}</td>
                  <td className="px-4 py-4 text-sm">{patient.telefono}</td>
                  <td className="px-4 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Nueva consulta</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{filteredPatients.length}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filas por página</span>
              <Select value={rowsPerPage.toString()} onValueChange={(v) => setRowsPerPage(Number(v))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1}>
                &lt;
              </Button>
              <Button variant="outline" size="sm" className="h-8 min-w-8">
                1
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                2
              </Button>
              <Button variant="outline" size="sm" className="h-8 min-w-8">
                ...
              </Button>
              <Button variant="outline" size="sm" className="h-8 min-w-8">
                3
              </Button>
              <Button variant="outline" size="sm" className="h-8 min-w-8">
                4
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                &gt;
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
