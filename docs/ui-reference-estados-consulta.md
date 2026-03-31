# UI Reference - Estados de Consulta

**Fecha:** 2025-11-15
**Versión:** 1.0
**Propósito:** Guía de referencia para implementar la UI de gestión de estados de consulta

---

## 📋 Índice

1. [Importaciones Necesarias](#importaciones-necesarias)
2. [Tipos y Constantes](#tipos-y-constantes)
3. [Componentes UI Sugeridos](#componentes-ui-sugeridos)
4. [Patrones de Validación](#patrones-de-validación)
5. [Queries de Supabase](#queries-de-supabase)
6. [Ejemplos de Implementación](#ejemplos-de-implementación)
7. [Errores Comunes a Evitar](#errores-comunes-a-evitar)
8. [Checklist de Implementación](#checklist-de-implementación)

---

## Importaciones Necesarias

### Tipos y Funciones de Validación

```typescript
import {
  // Tipos
  CodigoEstadoConsulta,
  EstadoConsulta,
  UserRole,

  // Funciones de validación
  puedeTransicionarConRol,
  obtenerTransicionesPermitidas,
  esEstadoFinal,
  puedeEditarConsultaCompletada,
  bloqueaAgenda,

  // Constantes para UI
  NOMBRES_ESTADOS,
  DESCRIPCIONES_ESTADOS,
  CAMPOS_EDITABLES_COMPLETADA,
  CAMPOS_NO_EDITABLES_COMPLETADA,
  ESTADOS_NO_BLOQUEAN_AGENDA
} from '@/lib/types'
```

---

## Tipos y Constantes

### Estados Válidos

```typescript
type CodigoEstadoConsulta =
  | 'programada'    // Estado inicial
  | 'en_curso'      // Médico atendiendo
  | 'completada'    // Finalizada
  | 'cancelada'     // Cancelada con aviso
  | 'ausente'       // Paciente no se presentó
```

### Roles de Usuario

```typescript
type UserRole = 'Recepcionista' | 'Medico' | 'Administrador'
```

### Nombres para Display (UI)

```typescript
NOMBRES_ESTADOS = {
  programada: 'Programada',
  en_curso: 'En Curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  ausente: 'Paciente Ausente'
}
```

### Descripciones (Tooltips)

```typescript
DESCRIPCIONES_ESTADOS = {
  programada: 'Consulta agendada y pendiente de atención',
  en_curso: 'El médico está atendiendo al paciente',
  completada: 'Consulta completada con registro médico guardado',
  cancelada: 'Consulta cancelada con aviso previo',
  ausente: 'Paciente no se presentó a la consulta'
}
```

---

## Componentes UI Sugeridos

### 1. Badge de Estado

**Componente:** `EstadoConsultaBadge.tsx`

**Propósito:** Mostrar el estado actual de una consulta con colores distintivos

**Props:**
```typescript
interface EstadoConsultaBadgeProps {
  codigo: CodigoEstadoConsulta
  mostrarDescripcion?: boolean
}
```

**Ejemplo de implementación:**

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { NOMBRES_ESTADOS, DESCRIPCIONES_ESTADOS, CodigoEstadoConsulta } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const colores: Record<CodigoEstadoConsulta, string> = {
  programada: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  en_curso: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  completada: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelada: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  ausente: 'bg-red-100 text-red-800 hover:bg-red-100'
}

export function EstadoConsultaBadge({
  codigo,
  mostrarDescripcion = true
}: EstadoConsultaBadgeProps) {
  if (mostrarDescripcion) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={colores[codigo]}>
              {NOMBRES_ESTADOS[codigo]}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{DESCRIPCIONES_ESTADOS[codigo]}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Badge className={colores[codigo]}>
      {NOMBRES_ESTADOS[codigo]}
    </Badge>
  )
}
```

**Uso:**
```tsx
<EstadoConsultaBadge codigo="programada" />
<EstadoConsultaBadge codigo="completada" mostrarDescripcion={false} />
```

---

### 2. Selector de Estado (Dropdown/Select)

**Componente:** `CambiarEstadoSelect.tsx`

**Propósito:** Permitir cambiar el estado de una consulta según permisos

**Props:**
```typescript
interface CambiarEstadoSelectProps {
  consultaId: string
  estadoActual: CodigoEstadoConsulta
  userRole: UserRole
  onCambio: (nuevoEstado: CodigoEstadoConsulta) => Promise<void>
  disabled?: boolean
}
```

**Ejemplo de implementación:**

```typescript
'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { obtenerTransicionesPermitidas, NOMBRES_ESTADOS, CodigoEstadoConsulta, UserRole } from '@/lib/types'
import { toast } from 'sonner'

export function CambiarEstadoSelect({
  consultaId,
  estadoActual,
  userRole,
  onCambio,
  disabled = false
}: CambiarEstadoSelectProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Obtener transiciones permitidas para este rol
  const transicionesPermitidas = obtenerTransicionesPermitidas(estadoActual, userRole)

  // Si no hay transiciones disponibles, mostrar solo el estado actual
  if (transicionesPermitidas.length === 0 || (transicionesPermitidas.length === 1 && transicionesPermitidas[0] === estadoActual)) {
    return (
      <div className="text-sm text-muted-foreground">
        {NOMBRES_ESTADOS[estadoActual]} (estado final)
      </div>
    )
  }

  const handleCambio = async (nuevoEstado: string) => {
    if (nuevoEstado === estadoActual) return

    setIsLoading(true)
    try {
      await onCambio(nuevoEstado as CodigoEstadoConsulta)
      toast.success(`Estado cambiado a ${NOMBRES_ESTADOS[nuevoEstado as CodigoEstadoConsulta]}`)
    } catch (error) {
      toast.error('Error al cambiar estado')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Select
      value={estadoActual}
      onValueChange={handleCambio}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {transicionesPermitidas.map((estado) => (
          <SelectItem key={estado} value={estado}>
            {NOMBRES_ESTADOS[estado]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Uso:**
```tsx
<CambiarEstadoSelect
  consultaId={consulta.id}
  estadoActual={consulta.estado_codigo}
  userRole={user.role}
  onCambio={handleCambiarEstado}
/>
```

---

### 3. Botones de Acción Específicos

**Componente:** `ConsultaActionButtons.tsx`

**Propósito:** Mostrar botones de acción específicos según el estado actual

**Props:**
```typescript
interface ConsultaActionButtonsProps {
  consultaId: string
  estadoActual: CodigoEstadoConsulta
  userRole: UserRole
  onIniciarConsulta?: () => void
  onCompletarConsulta?: () => void
  onCancelar?: () => void
  onMarcarAusente?: () => void
}
```

**Ejemplo de implementación:**

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { puedeTransicionarConRol, CodigoEstadoConsulta, UserRole } from '@/lib/types'
import { Play, CheckCircle, XCircle, UserX } from 'lucide-react'

export function ConsultaActionButtons({
  consultaId,
  estadoActual,
  userRole,
  onIniciarConsulta,
  onCompletarConsulta,
  onCancelar,
  onMarcarAusente
}: ConsultaActionButtonsProps) {

  // Verificar qué acciones están disponibles
  const puedeIniciar = puedeTransicionarConRol(userRole, estadoActual, 'en_curso')
  const puedeCompletar = puedeTransicionarConRol(userRole, estadoActual, 'completada')
  const puedeCancelar = puedeTransicionarConRol(userRole, estadoActual, 'cancelada')
  const puedeMarcarAusente = puedeTransicionarConRol(userRole, estadoActual, 'ausente')

  return (
    <div className="flex gap-2">
      {puedeIniciar && onIniciarConsulta && (
        <Button onClick={onIniciarConsulta} variant="default" size="sm">
          <Play className="mr-2 h-4 w-4" />
          Iniciar Consulta
        </Button>
      )}

      {puedeCompletar && onCompletarConsulta && (
        <Button onClick={onCompletarConsulta} variant="default" size="sm">
          <CheckCircle className="mr-2 h-4 w-4" />
          Completar
        </Button>
      )}

      {puedeCancelar && onCancelar && (
        <Button onClick={onCancelar} variant="outline" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      )}

      {puedeMarcarAusente && onMarcarAusente && (
        <Button onClick={onMarcarAusente} variant="outline" size="sm">
          <UserX className="mr-2 h-4 w-4" />
          Marcar Ausente
        </Button>
      )}
    </div>
  )
}
```

**Uso:**
```tsx
<ConsultaActionButtons
  consultaId={consulta.id}
  estadoActual={consulta.estado_codigo}
  userRole={user.role}
  onIniciarConsulta={() => handleCambiarEstado('en_curso')}
  onCompletarConsulta={() => router.push(`/consultas/${consulta.id}/completar`)}
  onCancelar={() => handleCambiarEstado('cancelada')}
  onMarcarAusente={() => handleCambiarEstado('ausente')}
/>
```

---

### 4. Formulario de Consulta (con validación de campos editables)

**Componente:** `ConsultaForm.tsx`

**Propósito:** Formulario que adapta campos editables según el estado

**Ejemplo de lógica de validación:**

```typescript
'use client'

import { esEstadoFinal, puedeEditarConsultaCompletada, CAMPOS_EDITABLES_COMPLETADA } from '@/lib/types'

export function ConsultaForm({ consulta, userRole }) {
  const esCompletada = consulta.estado_codigo === 'completada'
  const puedeEditar = esCompletada
    ? puedeEditarConsultaCompletada(userRole)
    : true

  // Campos que NUNCA se pueden editar si está completada
  const camposDeshabilitados = esCompletada ? [
    'fecha_hora',
    'paciente_id',
    'medico_id',
    'duracion_minutos'
  ] : []

  return (
    <form>
      {/* Fecha y hora */}
      <input
        name="fecha_hora"
        disabled={camposDeshabilitados.includes('fecha_hora') || !puedeEditar}
        // ...
      />

      {/* Paciente */}
      <select
        name="paciente_id"
        disabled={camposDeshabilitados.includes('paciente_id') || !puedeEditar}
        // ...
      />

      {/* Diagnóstico - SIEMPRE editable para Médico/Admin */}
      <textarea
        name="diagnostico"
        disabled={!puedeEditar}
        // ...
      />

      {/* Tratamiento - SIEMPRE editable para Médico/Admin */}
      <textarea
        name="tratamiento"
        disabled={!puedeEditar}
        // ...
      />
    </form>
  )
}
```

---

## Patrones de Validación

### Patrón 1: Validar antes de mostrar opción en UI

```typescript
import { puedeTransicionarConRol } from '@/lib/types'

// ✅ CORRECTO: Verificar antes de renderizar
function AccionesConsulta({ estadoActual, userRole }) {
  const puedeIniciar = puedeTransicionarConRol(userRole, estadoActual, 'en_curso')

  return (
    <>
      {puedeIniciar && (
        <Button onClick={iniciarConsulta}>Iniciar Consulta</Button>
      )}
    </>
  )
}

// ❌ INCORRECTO: Mostrar botón deshabilitado sin validar
function AccionesConsulta({ estadoActual, userRole }) {
  return (
    <Button
      onClick={iniciarConsulta}
      disabled={estadoActual !== 'programada'} // No valida permisos de rol
    >
      Iniciar Consulta
    </Button>
  )
}
```

### Patrón 2: Validar en Server Action (CRÍTICO)

```typescript
'use server'

import { puedeTransicionarConRol, CodigoEstadoConsulta, UserRole } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

export async function cambiarEstadoConsulta(
  consultaId: string,
  nuevoEstado: CodigoEstadoConsulta
) {
  const supabase = await createClient()

  // 1. Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 2. Obtener rol del usuario
  const { data: usuario } = await supabase
    .from('usuarios_pms')
    .select('roles(nombre)')
    .eq('id', user.id)
    .single()

  const userRole = usuario?.roles?.nombre as UserRole

  // 3. Obtener consulta actual con estado
  const { data: consulta } = await supabase
    .from('consultas')
    .select(`
      id,
      estados_consulta!inner(codigo)
    `)
    .eq('id', consultaId)
    .single()

  if (!consulta) return { error: 'Consulta no encontrada' }

  const estadoActual = consulta.estados_consulta.codigo as CodigoEstadoConsulta

  // 4. ⚠️ VALIDACIÓN CRÍTICA: Verificar que la transición es permitida
  if (!puedeTransicionarConRol(userRole, estadoActual, nuevoEstado)) {
    return {
      error: `No tiene permisos para cambiar de ${estadoActual} a ${nuevoEstado}`
    }
  }

  // 5. Obtener ID del nuevo estado
  const { data: estadoData } = await supabase
    .from('estados_consulta')
    .select('id')
    .eq('codigo', nuevoEstado)
    .single()

  // 6. Actualizar consulta
  const { error } = await supabase
    .from('consultas')
    .update({ estado_id: estadoData.id })
    .eq('id', consultaId)

  if (error) return { error: 'Error al actualizar consulta' }

  return { success: true }
}
```

### Patrón 3: Obtener opciones dinámicas para Select

```typescript
import { obtenerTransicionesPermitidas, NOMBRES_ESTADOS } from '@/lib/types'

function EstadoSelect({ estadoActual, userRole }) {
  // Obtener solo las transiciones permitidas para este rol
  const opcionesPermitidas = obtenerTransicionesPermitidas(estadoActual, userRole)

  return (
    <select>
      {opcionesPermitidas.map(codigo => (
        <option key={codigo} value={codigo}>
          {NOMBRES_ESTADOS[codigo]}
        </option>
      ))}
    </select>
  )
}
```

---

## Queries de Supabase

### Query 1: Obtener consulta con estado expandido

```typescript
const { data: consulta } = await supabase
  .from('consultas')
  .select(`
    *,
    estados_consulta!inner(
      codigo,
      nombre,
      descripcion,
      es_estado_final
    ),
    pacientes(
      nombre,
      apellido,
      dni
    ),
    medicos(
      nombre,
      apellido
    )
  `)
  .eq('id', consultaId)
  .single()

// Acceso al estado:
// consulta.estados_consulta.codigo → 'programada'
// consulta.estados_consulta.nombre → 'Programada'
```

### Query 2: Filtrar consultas por estado(s)

```typescript
// Obtener solo consultas programadas
const { data: consultasProgramadas } = await supabase
  .from('consultas')
  .select(`
    *,
    estados_consulta!inner(codigo, nombre)
  `)
  .eq('estados_consulta.codigo', 'programada')

// Obtener consultas activas (no finales)
const { data: consultasActivas } = await supabase
  .from('consultas')
  .select(`
    *,
    estados_consulta!inner(codigo, nombre, es_estado_final)
  `)
  .eq('estados_consulta.es_estado_final', false)
```

### Query 3: Verificar conflictos de horario (excluir canceladas/ausentes)

```typescript
import { ESTADOS_NO_BLOQUEAN_AGENDA } from '@/lib/types'

const { data: conflictos } = await supabase
  .from('consultas')
  .select(`
    id,
    fecha_hora,
    duracion_minutos,
    estados_consulta!inner(codigo)
  `)
  .eq('medico_id', medicoId)
  .not('estados_consulta.codigo', 'in', `(${ESTADOS_NO_BLOQUEAN_AGENDA.join(',')})`)
  .gte('fecha_hora', inicio)
  .lte('fecha_hora', fin)

// Esto excluye automáticamente 'cancelada' y 'ausente'
```

### Query 4: Actualizar estado de consulta

```typescript
// Paso 1: Obtener ID del estado por código
const { data: estado } = await supabase
  .from('estados_consulta')
  .select('id')
  .eq('codigo', 'en_curso')
  .single()

// Paso 2: Actualizar consulta
const { error } = await supabase
  .from('consultas')
  .update({ estado_id: estado.id })
  .eq('id', consultaId)
```

---

## Ejemplos de Implementación

### Ejemplo 1: Página de detalle de consulta

```typescript
// app/consultas/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { EstadoConsultaBadge } from '@/components/consultas/estado-badge'
import { ConsultaActionButtons } from '@/components/consultas/action-buttons'

export default async function ConsultaDetallePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Obtener consulta con estado
  const { data: consulta } = await supabase
    .from('consultas')
    .select(`
      *,
      estados_consulta!inner(codigo, nombre, descripcion),
      pacientes(nombre, apellido, dni),
      medicos(nombre, apellido)
    `)
    .eq('id', params.id)
    .single()

  // Obtener rol del usuario
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios_pms')
    .select('roles(nombre)')
    .eq('id', user.id)
    .single()

  const userRole = usuario.roles.nombre

  return (
    <div>
      <h1>Consulta #{consulta.id}</h1>

      {/* Badge de estado */}
      <EstadoConsultaBadge codigo={consulta.estados_consulta.codigo} />

      {/* Botones de acción */}
      <ConsultaActionButtons
        consultaId={consulta.id}
        estadoActual={consulta.estados_consulta.codigo}
        userRole={userRole}
        onIniciarConsulta={handleIniciar}
        onCompletarConsulta={handleCompletar}
        onCancelar={handleCancelar}
        onMarcarAusente={handleMarcarAusente}
      />

      {/* Resto del contenido */}
    </div>
  )
}
```

### Ejemplo 2: Lista de consultas con filtro por estado

```typescript
// app/consultas/page.tsx
'use client'

import { useState } from 'react'
import { NOMBRES_ESTADOS, CodigoEstadoConsulta } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ConsultasPage() {
  const [filtroEstado, setFiltroEstado] = useState<CodigoEstadoConsulta | 'todas'>('todas')

  return (
    <div>
      <h1>Consultas</h1>

      <Tabs value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="programada">{NOMBRES_ESTADOS.programada}</TabsTrigger>
          <TabsTrigger value="en_curso">{NOMBRES_ESTADOS.en_curso}</TabsTrigger>
          <TabsTrigger value="completada">{NOMBRES_ESTADOS.completada}</TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          {/* Lista todas las consultas */}
        </TabsContent>

        <TabsContent value="programada">
          {/* Lista solo programadas */}
        </TabsContent>

        {/* ... */}
      </Tabs>
    </div>
  )
}
```

### Ejemplo 3: Server Action completo con validación

```typescript
// app/actions/consultas.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { puedeTransicionarConRol, CodigoEstadoConsulta, UserRole } from '@/lib/types'

export async function cambiarEstadoConsulta(
  consultaId: string,
  nuevoEstadoCodigo: CodigoEstadoConsulta
) {
  const supabase = await createClient()

  // 1. Autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autenticado' }
  }

  // 2. Obtener rol del usuario
  const { data: userData, error: userError } = await supabase
    .from('usuarios_pms')
    .select('roles(nombre)')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.roles) {
    return { error: 'No se pudo obtener el rol del usuario' }
  }

  const userRole = userData.roles.nombre as UserRole

  // 3. Obtener consulta actual con estado
  const { data: consulta, error: consultaError } = await supabase
    .from('consultas')
    .select(`
      id,
      estados_consulta!inner(codigo)
    `)
    .eq('id', consultaId)
    .single()

  if (consultaError || !consulta) {
    return { error: 'Consulta no encontrada' }
  }

  const estadoActual = consulta.estados_consulta.codigo as CodigoEstadoConsulta

  // 4. ⚠️ VALIDACIÓN CRÍTICA
  if (!puedeTransicionarConRol(userRole, estadoActual, nuevoEstadoCodigo)) {
    return {
      error: `No tiene permisos para cambiar de "${estadoActual}" a "${nuevoEstadoCodigo}"`
    }
  }

  // 5. Obtener ID del nuevo estado
  const { data: nuevoEstado, error: estadoError } = await supabase
    .from('estados_consulta')
    .select('id')
    .eq('codigo', nuevoEstadoCodigo)
    .single()

  if (estadoError || !nuevoEstado) {
    return { error: 'Estado no encontrado' }
  }

  // 6. Actualizar consulta
  const { error: updateError } = await supabase
    .from('consultas')
    .update({ estado_id: nuevoEstado.id })
    .eq('id', consultaId)

  if (updateError) {
    console.error('Error actualizando consulta:', updateError)
    return { error: 'Error al actualizar el estado de la consulta' }
  }

  // 7. Revalidar caché
  revalidatePath('/consultas')
  revalidatePath(`/consultas/${consultaId}`)

  return {
    success: true,
    message: `Estado cambiado exitosamente a "${nuevoEstadoCodigo}"`
  }
}
```

---

## Errores Comunes a Evitar

### ❌ Error 1: Confiar solo en validación client-side

```typescript
// ❌ MALO: Solo validar en el cliente
function CambiarEstadoButton({ consultaId }) {
  const handleClick = async () => {
    // Directamente actualizar sin validar en servidor
    await supabase
      .from('consultas')
      .update({ estado_id: nuevoEstadoId })
      .eq('id', consultaId)
  }
}

// ✅ BUENO: Validar en Server Action
function CambiarEstadoButton({ consultaId }) {
  const handleClick = async () => {
    // Server Action que valida permisos
    const result = await cambiarEstadoConsulta(consultaId, 'en_curso')
    if (result.error) {
      toast.error(result.error)
    }
  }
}
```

### ❌ Error 2: No usar las funciones de validación

```typescript
// ❌ MALO: Lógica hardcodeada
function puedeIniciar(userRole: string, estado: string) {
  if (userRole === 'Recepcionista') return false
  if (estado !== 'programada') return false
  return true
}

// ✅ BUENO: Usar función de validación
import { puedeTransicionarConRol } from '@/lib/types'

const puedeIniciar = puedeTransicionarConRol(userRole, estadoActual, 'en_curso')
```

### ❌ Error 3: Comparar estados por nombre en lugar de código

```typescript
// ❌ MALO: Comparar por nombre de display
if (consulta.estados_consulta.nombre === 'Programada') {
  // ...
}

// ✅ BUENO: Comparar por código
if (consulta.estados_consulta.codigo === 'programada') {
  // ...
}
```

### ❌ Error 4: No manejar estados finales

```typescript
// ❌ MALO: Mostrar opciones incluso en estados finales
<select>
  {['programada', 'en_curso', 'completada'].map(estado => (
    <option value={estado}>{estado}</option>
  ))}
</select>

// ✅ BUENO: Verificar si es estado final
import { esEstadoFinal, obtenerTransicionesPermitidas } from '@/lib/types'

if (esEstadoFinal(estadoActual)) {
  return <div>Estado final - No se puede modificar</div>
}

const opciones = obtenerTransicionesPermitidas(estadoActual, userRole)
```

### ❌ Error 5: Olvidar excluir estados en verificación de conflictos

```typescript
// ❌ MALO: Incluir todas las consultas en verificación
const { data: conflictos } = await supabase
  .from('consultas')
  .select('*')
  .eq('medico_id', medicoId)
  .gte('fecha_hora', inicio)
  // Incluye canceladas y ausentes - INCORRECTO

// ✅ BUENO: Excluir estados que no bloquean agenda
import { ESTADOS_NO_BLOQUEAN_AGENDA } from '@/lib/types'

const { data: conflictos } = await supabase
  .from('consultas')
  .select(`*, estados_consulta!inner(codigo)`)
  .eq('medico_id', medicoId)
  .not('estados_consulta.codigo', 'in', `(${ESTADOS_NO_BLOQUEAN_AGENDA.join(',')})`)
  .gte('fecha_hora', inicio)
```

---

## Checklist de Implementación

### Antes de empezar
- [ ] Importar tipos desde `@/lib/types`
- [ ] Verificar que las migraciones están aplicadas (`supabase db push`)
- [ ] Entender los permisos por rol

### Al crear componentes de UI
- [ ] Usar `NOMBRES_ESTADOS` para display text
- [ ] Usar `DESCRIPCIONES_ESTADOS` para tooltips
- [ ] Implementar colores consistentes por estado
- [ ] Validar permisos antes de mostrar opciones
- [ ] Manejar estados finales (no mostrar transiciones)

### Al implementar cambios de estado
- [ ] Crear Server Action para cambio de estado
- [ ] Validar con `puedeTransicionarConRol()` en el servidor
- [ ] Obtener ID de estado desde tabla `estados_consulta`
- [ ] Actualizar campo `estado_id` (no `estado`)
- [ ] Revalidar caché después de actualización
- [ ] Mostrar mensajes de error claros al usuario

### Al implementar formularios
- [ ] Verificar si consulta está completada
- [ ] Usar `CAMPOS_EDITABLES_COMPLETADA` para permitir edición
- [ ] Deshabilitar `CAMPOS_NO_EDITABLES_COMPLETADA`
- [ ] Validar permisos con `puedeEditarConsultaCompletada()`

### Al verificar conflictos de horario
- [ ] Usar JOIN con `estados_consulta`
- [ ] Excluir `ESTADOS_NO_BLOQUEAN_AGENDA`
- [ ] Considerar `duracion_minutos` en el cálculo

### Testing
- [ ] Probar con cada rol (Recepcionista, Médico, Administrador)
- [ ] Verificar que Admin puede hacer bypass
- [ ] Verificar que estados finales no permiten transiciones
- [ ] Verificar que Recepcionista no puede iniciar consulta
- [ ] Verificar conflictos de horario correctamente

---

## Recursos Adicionales

- **Tipos TypeScript:** `lib/types/estados-consulta.ts`
- **Flujo Completo:** `docs/estados-consulta-flow.md`
- **Backlog de Tareas:** `backlog/backlog.md`
- **PRD:** `docs/prd.md`

---

**Última actualización:** 2025-11-15
**Mantenedor:** Sistema PMS
**Versión de esquema DB:** 1.0
