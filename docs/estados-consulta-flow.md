# Estados de Consulta - Flujo Completo

**Fecha:** 2025-11-15
**Versión:** 1.0

---

## Resumen

Este documento describe el flujo completo de estados de consulta en el sistema PMS, incluyendo transiciones permitidas, permisos por rol, y consideraciones de implementación.

---

## Estados Disponibles

### 1. **PROGRAMADA**
- **Código:** `programada`
- **Nombre:** Programada
- **Descripción:** Consulta agendada y pendiente de atención
- **Estado Final:** No
- **Orden:** 1

**Quién puede crear:**
- Recepcionista ✅
- Médico ✅
- Administrador ✅

**Transiciones permitidas desde este estado:**
- `programada` (reprogramar - misma consulta con nueva fecha/hora)
- `cancelada` (cancelar con aviso)
- `ausente` (marcar paciente ausente)
- `en_curso` (médico inicia atención)

---

### 2. **EN_CURSO**
- **Código:** `en_curso`
- **Nombre:** En Curso
- **Descripción:** El médico está atendiendo al paciente
- **Estado Final:** No
- **Orden:** 2

**Quién puede transicionar a este estado:**
- Médico ✅
- Administrador ✅
- Recepcionista ❌

**Transiciones permitidas desde este estado:**
- `completada` (finalizar consulta y guardar datos médicos)

**Importante:** Una vez en `en_curso`, NO se puede cancelar. Si hay un problema, el médico debe completar la consulta con notas apropiadas.

---

### 3. **COMPLETADA**
- **Código:** `completada`
- **Nombre:** Completada
- **Descripción:** Consulta completada con registro médico guardado
- **Estado Final:** ✅ SÍ
- **Orden:** 3

**Quién puede transicionar a este estado:**
- Médico ✅
- Administrador ✅
- Recepcionista ❌

**Transiciones permitidas desde este estado:**
- Ninguna (estado final)

**Campos editables post-completada:**
- `diagnostico`
- `tratamiento`
- `receta`
- `informe`
- `notas_privadas`
- `archivos_adjuntos`
- `proxima_consulta`

**Campos NO editables post-completada:**
- `estado_id`
- `fecha_hora`
- `paciente_id`
- `medico_id`
- `duracion_minutos`

---

### 4. **CANCELADA**
- **Código:** `cancelada`
- **Nombre:** Cancelada
- **Descripción:** Consulta cancelada con aviso previo
- **Estado Final:** ✅ SÍ
- **Orden:** 4

**Quién puede transicionar a este estado:**
- Recepcionista ✅
- Médico ✅
- Administrador ✅

**Cuándo usar:**
- Paciente llama para cancelar
- Médico no puede atender (emergencia, enfermedad)
- Clínica cierra (feriado, mantenimiento)

**NO bloquea la agenda:** Una vez cancelada, ese horario queda disponible para otra cita.

---

### 5. **AUSENTE**
- **Código:** `ausente`
- **Nombre:** Paciente Ausente
- **Descripción:** Paciente no se presentó a la consulta
- **Estado Final:** ✅ SÍ
- **Orden:** 5

**Quién puede transicionar a este estado:**
- Recepcionista ✅
- Médico ✅
- Administrador ✅

**Cuándo usar:**
- Paciente NO avisó que no vendría
- Pasó el horario de la cita y no se presentó

**NO bloquea la agenda:** Similar a cancelada, libera el horario.

---

## Diagrama de Flujo

```
                    ┌─────────────┐
                    │  PROGRAMADA │ ← Estado inicial al crear consulta
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┬──────────────┐
              │            │            │              │
              ▼            ▼            ▼              ▼
       ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
       │CANCELADA │  │ AUSENTE  │  │PROGRAMADA│  │ EN_CURSO │
       │(final)   │  │ (final)  │  │(reprog.) │  └────┬─────┘
       └──────────┘  └──────────┘  └──────────┘       │
                                                       ▼
                                                ┌──────────────┐
                                                │  COMPLETADA  │
                                                │   (final)    │
                                                └──────────────┘
```

---

## Matriz de Permisos por Rol

### Recepcionista

| Acción | Permitido | Notas |
|--------|-----------|-------|
| Crear consulta (programada) | ✅ | Estado inicial |
| Reprogramar consulta | ✅ | Solo si estado = programada |
| Cancelar consulta | ✅ | Solo desde programada |
| Marcar ausente | ✅ | Solo desde programada |
| Iniciar consulta (en_curso) | ❌ | Solo médico |
| Completar consulta | ❌ | Solo médico |
| Editar detalles médicos | ❌ | Solo médico/admin |

### Médico

| Acción | Permitido | Notas |
|--------|-----------|-------|
| Crear consulta (programada) | ✅ | Estado inicial |
| Reprogramar consulta | ✅ | Solo si estado = programada |
| Cancelar consulta | ✅ | Solo desde programada |
| Marcar ausente | ✅ | Solo desde programada |
| Iniciar consulta (en_curso) | ✅ | Solo desde programada |
| Completar consulta | ✅ | Solo desde en_curso |
| Editar detalles médicos | ✅ | Incluso después de completada |

### Administrador

| Acción | Permitido | Notas |
|--------|-----------|-------|
| Crear consulta (programada) | ✅ | Estado inicial |
| Reprogramar consulta | ✅ | Cualquier estado |
| Cancelar consulta | ✅ | Cualquier estado |
| Marcar ausente | ✅ | Cualquier estado |
| Iniciar consulta (en_curso) | ✅ | Cualquier estado |
| Completar consulta | ✅ | Cualquier estado |
| Editar detalles médicos | ✅ | Cualquier estado |
| **Bypass restricciones** | ✅ | Puede hacer CUALQUIER transición |

---

## Casos de Uso Detallados

### Caso 1: Flujo Normal de Consulta

**Escenario:** Paciente tiene cita programada y asiste normalmente.

1. **Recepcionista** crea consulta → `programada`
2. **Médico** ve al paciente en sala de espera
3. **Médico** hace clic en "Iniciar consulta" → `en_curso`
4. **Médico** atiende al paciente (30 min aprox)
5. **Médico** completa formulario: diagnóstico, tratamiento, receta
6. **Médico** hace clic en "Guardar y finalizar" → `completada`

**Resultado:** Consulta completada con registro médico completo.

---

### Caso 2: Paciente Cancela con Aviso

**Escenario:** Paciente llama 1 día antes para cancelar.

1. Consulta está en estado `programada`
2. **Recepcionista** recibe llamada del paciente
3. **Recepcionista** cambia estado a `cancelada`

**Resultado:** Horario queda libre para agendar otro paciente.

---

### Caso 3: Paciente No Se Presenta

**Escenario:** Paciente no llega y no avisa.

1. Consulta está en estado `programada` a las 10:00
2. Son las 10:30 y paciente no llegó
3. **Recepcionista** marca consulta como `ausente`

**Resultado:** Se registra la ausencia para métricas. Horario se libera.

---

### Caso 4: Médico Corrige Información Después de Completar

**Escenario:** Médico se da cuenta que escribió mal un diagnóstico.

1. Consulta está en estado `completada`
2. **Médico** accede a la consulta completada
3. **Médico** edita campo `diagnostico` solamente
4. **Médico** guarda cambios

**Restricción:** NO puede cambiar estado, fecha, paciente, ni médico.

**Resultado:** Diagnóstico corregido, estado sigue siendo `completada`.

---

### Caso 5: Administrador Necesita Reabrir Consulta

**Escenario:** Error humano - se marcó como completada sin querer.

1. Consulta está en estado `completada`
2. **Administrador** tiene bypass de restricciones
3. **Administrador** puede cambiar a cualquier estado
4. **Administrador** cambia a `en_curso` o `programada`

**Nota:** Este es un caso excepcional. En producción, considerar agregar confirmación/auditoría.

---

## Validación de Conflictos de Horario

Al verificar disponibilidad de horario, **IGNORAR** consultas con estos estados:
- `cancelada`
- `ausente`

**Incluir en verificación de conflictos:**
- `programada`
- `en_curso`
- `completada` (por si consulta se extendió)

**Query de ejemplo:**

```sql
SELECT c.*
FROM consultas c
INNER JOIN estados_consulta ec ON c.estado_id = ec.id
WHERE c.medico_id = $1
  AND ec.codigo NOT IN ('cancelada', 'ausente')
  AND c.fecha_hora < $3  -- end time of new appointment
  AND (c.fecha_hora + (c.duracion_minutos * interval '1 minute')) > $2  -- start time of new appointment
```

---

## Consideraciones Técnicas

### Base de Datos

**Tabla:** `estados_consulta`
- Contiene metadata de los 5 estados
- Es una tabla de referencia (lookup table)
- RLS: Todos pueden leer, solo Admin puede modificar

**Tabla:** `consultas`
- Campo `estado_id` (UUID) con FK a `estados_consulta.id`
- Default value: `(SELECT id FROM estados_consulta WHERE codigo = 'programada')`
- Index en `estado_id` para performance

### TypeScript

**Archivo:** `lib/types/estados-consulta.ts`

**Funciones principales:**
- `puedeTransicionar(actual, nuevo)` - Valida lógica de transición
- `puedeTransicionarConRol(rol, actual, nuevo)` - Valida con permisos de rol
- `obtenerTransicionesPermitidas(actual, rol)` - Lista de opciones para UI
- `esEstadoFinal(codigo)` - Check si es estado terminal
- `bloqueaAgenda(codigo)` - Check si bloquea horario

### Server Actions (Pendiente)

**Archivo:** `app/actions/consultas.ts` (a implementar)

**Funciones necesarias:**
- `updateConsultaEstado(consultaId, nuevoEstadoCodigo, userRole)`
- `updateConsultaDetalles(consultaId, campos, userRole)`

---

## Próximos Pasos

Ver `backlog/backlog.md` para detalles de implementación pendiente:

1. ✅ Tabla `estados_consulta` creada
2. ✅ Tipos TypeScript definidos
3. ⚠️ Server Actions pendientes
4. ⚠️ UI Components pendientes
5. ⚠️ Validación client-side pendiente

---

## Referencias

- **PRD:** `docs/prd.md` (sección 4.2 Appointment Scheduling)
- **Migraciones:**
  - `supabase/migrations/20251114000004_create_estados_consulta_table.sql`
  - `supabase/migrations/20251114000006_create_consultas_table.sql`
- **Tipos:** `lib/types/estados-consulta.ts`
- **Backlog:** `backlog/backlog.md`
