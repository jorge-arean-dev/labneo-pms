# Sistema de Gestión de Pacientes (PMS) - Descripción Funcional

**Versión**: 1.1
**Última actualización**: Enero 2026
**Idioma de la aplicación**: Español (Argentina)

---

## Resumen Ejecutivo

El **Sistema de Gestión de Pacientes (PMS)** es una aplicación web diseñada específicamente para clínicas dermatológicas. Permite digitalizar historiales médicos, gestionar citas con detección inteligente de conflictos, y documentar consultas médicas con control de acceso basado en roles.

El sistema está desarrollado con tecnologías modernas: **Next.js 14+**, **React**, **TypeScript**, **Tailwind CSS** y **Supabase** (PostgreSQL). Incluye funcionalidades de tiempo real, recordatorios automáticos por correo electrónico, y un portal público de reservas integrado con WhatsApp mediante automatización n8n.

---

## Tabla de Contenidos

1. [Roles de Usuario y Permisos](#1-roles-de-usuario-y-permisos)
2. [Módulos del Sistema](#2-módulos-del-sistema)
3. [Flujos de Trabajo Principales](#3-flujos-de-trabajo-principales)
4. [Gestión de Citas](#4-gestión-de-citas)
5. [Panel de Control del Médico](#5-panel-de-control-del-médico)
6. [Administración del Sistema](#6-administración-del-sistema)
7. [Funcionalidades en Tiempo Real](#7-funcionalidades-en-tiempo-real)
8. [Integraciones](#8-integraciones)
9. [Seguridad](#9-seguridad)

---

## 1. Roles de Usuario y Permisos

### 1.1 Recepcionista

El rol de **Recepcionista** está diseñado para el personal de recepción de la clínica. Sus capacidades incluyen:

**Puede hacer:**
- Registrar y editar información de pacientes
- Buscar pacientes por DNI, nombre, apellido o teléfono
- Agendar, confirmar y cancelar citas
- Ver el listado completo de citas
- Cambiar estado de citas a: confirmada, cancelada, ausente
- Ver información básica de pacientes

**No puede hacer:**
- Ver historial médico detallado (diagnósticos, tratamientos, recetas)
- Editar detalles clínicos de consultas
- Gestionar médicos ni obras sociales
- Acceder a configuración del sistema

### 1.2 Médico

El rol de **Médico** permite gestionar consultas y documentación clínica:

**Puede hacer:**
- Ver información completa de pacientes
- Acceder al historial médico de cualquier paciente
- Completar documentación de consultas propias
- Registrar diagnósticos, tratamientos, recetas e informes
- Gestionar su propio perfil y horarios de disponibilidad
- Ver panel personal con citas del día y pacientes en espera
- Actualizar estado de sus consultas

**No puede hacer:**
- Gestionar otros médicos
- Administrar obras sociales
- Acceder a configuración del sistema
- Eliminar pacientes

### 1.3 Administrador

El rol de **Administrador** tiene acceso completo al sistema:

**Puede hacer:**
- Todo lo que pueden hacer Recepcionista y Médico
- Crear, editar y eliminar médicos
- Gestionar recepcionistas
- Administrar obras sociales y convenios
- Configurar marca de la clínica (logo, nombre)
- Configurar correo electrónico y recordatorios
- Personalizar plantillas de correo
- Ver auditoría de cambios en el sistema

---

## 2. Módulos del Sistema

### 2.1 Módulo de Pacientes

**Ubicación:** `/pacientes`

Este módulo permite la gestión integral de pacientes:

#### Listado de Pacientes
- Tabla con todos los pacientes registrados
- Columnas: Nombre, DNI, Obra Social, Última Consulta, Próxima Consulta
- Búsqueda en tiempo real por DNI, nombre, apellido o teléfono
- Filtrado y paginación del lado del cliente
- Botón para crear nuevo paciente

#### Ficha de Paciente (`/pacientes/[id]`)
- **Datos personales**: DNI, nombre, apellido, fecha de nacimiento, género
- **Contacto**: Teléfono, correo electrónico, domicilio
- **Obra social**: Proveedor, plan, número de afiliado
- **Historial médico**: Lista de todas las consultas realizadas
- **Auditoría**: Fecha de creación, creado por, última modificación
- **Consentimiento**: Estado del consentimiento de datos

#### Crear/Editar Paciente
- Validación de DNI único
- Campos obligatorios: DNI, nombre, apellido, fecha de nacimiento, obra social
- Selector de obras sociales activas
- Foto de perfil opcional

---

### 2.2 Módulo de Consultas

**Ubicación:** `/consultas`

Gestión completa de citas médicas y documentación clínica:

#### Listado de Consultas
- Tabla con todas las consultas del sistema
- Columnas: Fecha/Hora, Paciente, Médico, Estado, Tipo
- Filtros por:
  - Rango de fechas
  - Médico
  - Paciente
  - Estado (programada, confirmada, en curso, completada, cancelada, ausente)
- Badges de estado con colores distintivos
- Actualización en tiempo real vía Supabase Realtime

#### Detalle de Consulta (`/consultas/[id]`)

**Información de la cita:**
- Paciente (con enlace a ficha)
- Médico asignado
- Fecha y hora programada
- Tipo de consulta: Primera vez, Control, Urgencia
- Motivo de la consulta
- Estado actual

**Documentación médica (solo visible para Médico/Admin):**
- Diagnóstico
- Tratamiento
- Receta
- Informe médico
- Notas internas

**Seguimiento de tiempos:**
- Hora programada de la cita
- Hora de llegada del paciente
- Cálculo automático de demora o llegada tardía

**Estados de la consulta:**
```
Programada → Confirmada → En Curso → Completada
                ↓            ↓
            Cancelada     Ausente
```

---

### 2.3 Módulo de Médicos

**Ubicación:** `/medicos`

Administración de profesionales médicos:

#### Listado de Médicos
- Tarjetas con información de cada médico
- Muestra: Nombre, especialidad, teléfono, matrícula
- Indicador de disponibilidad
- Acceso rápido al perfil

#### Perfil del Médico (`/medicos/[id]`)
- Datos personales y de contacto
- Número de matrícula profesional
- Horarios de atención configurados
- Obras sociales que acepta
- Función para restablecer contraseña (Admin)
- Los médicos pueden editar su propio perfil

#### Gestión de Horarios
- Definir disponibilidad por día de la semana
- Configurar hora de inicio y fin
- Establecer duración de consultas (por defecto 30 min)
- Configurar tiempo de buffer entre citas
- Activar/desactivar bloques horarios

---

### 2.4 Módulo de Obras Sociales

**Ubicación:** `/obras-sociales`

Gestión de convenios con aseguradoras:

#### Listado de Obras Sociales
- Tarjetas con información de cada proveedor
- Nombre, código, teléfono, email, sitio web
- Estado (activa/inactiva)

#### Detalle de Obra Social (`/obras-sociales/[id]`)
- Información completa del proveedor
- Lista de médicos que la aceptan
- Condiciones de cobertura por médico:
  - Porcentaje de cobertura
  - Monto de copago
  - Si requiere autorización previa

---

### 2.5 Módulo de Recepcionistas

**Ubicación:** `/recepcionistas`

Gestión del personal de recepción:

- Listado de recepcionistas
- Perfil individual con información de contacto
- Estado de la cuenta (activa/inactiva)
- Gestión de acceso (solo Admin)

---

## 3. Flujos de Trabajo Principales

### 3.1 Agendar una Cita

**Paso 1: Identificar al paciente**
1. Buscar paciente por DNI en `/pacientes`
2. Si no existe, crear nuevo paciente con datos mínimos

**Paso 2: Crear la cita**
1. Ir a `/consultas` o al botón "Nueva Consulta"
2. Seleccionar paciente
3. Seleccionar médico
4. Elegir fecha y hora
5. Seleccionar tipo: Primera vez, Control, o Urgencia
6. Ingresar motivo de la consulta

**Paso 3: Validación automática**
El sistema verifica:
- Que el médico tenga disponibilidad ese día/hora según `medicos_horarios`
- Que no exista otra cita que se superponga con el mismo médico
- Si hay conflicto, muestra mensaje de error con alternativas

**Paso 4: Confirmación**
- Se crea la consulta con estado "Programada"
- Se envía correo de confirmación al paciente (si está configurado)
- La cita aparece en el panel del médico

---

### 3.2 Atender una Consulta (Flujo del Médico)

**Paso 1: Inicio del día**
1. Médico inicia sesión
2. Ve panel personal con:
   - Contador de "Pacientes en Espera"
   - Lista de citas del día
   - Indicadores de demora

**Paso 2: Recibir al paciente**
1. Recepcionista marca llegada del paciente
2. El sistema registra `paciente_llego_timestamp`
3. El contador de espera se actualiza en tiempo real

**Paso 3: Iniciar consulta**
1. Médico selecciona la cita de la lista
2. Cambia estado a "En Curso"
3. Ve la información del paciente y su historial

**Paso 4: Documentar consulta**
1. Completa los campos médicos:
   - **Diagnóstico**: Conclusión clínica
   - **Tratamiento**: Plan terapéutico
   - **Receta**: Medicamentos indicados
   - **Informe**: Documentación detallada
   - **Notas**: Observaciones internas
2. Indica si requiere seguimiento
3. Cambia estado a "Completada"

**Paso 5: Actualización automática**
- El panel se actualiza en tiempo real
- La cita sale de la lista de pendientes
- El historial del paciente se actualiza

---

### 3.3 Reserva por WhatsApp (Portal Público)

**Ubicación:** `/agendar?token=xyz`

Este flujo permite que pacientes agenden citas mediante un enlace de WhatsApp:

**Paso 1: Generación del enlace**
1. El sistema n8n recibe mensaje de WhatsApp del paciente
2. Genera token único con fecha de expiración
3. Envía enlace personalizado al paciente

**Paso 2: Reserva del paciente**
1. Paciente abre el enlace `/agendar?token=xyz`
2. Ve los horarios disponibles del médico
3. Selecciona fecha y hora
4. Confirma la reserva

**Paso 3: Creación de la cita**
- Se valida que el token no haya expirado
- Se crea la consulta con origen "whatsapp"
- Se envía confirmación por correo
- El token queda marcado como usado

---

### 3.4 Recordatorios Automáticos

El sistema envía recordatorios por correo electrónico de forma automática:

**Configuración:**
1. Admin configura SMTP en `/admin`
2. Habilita recordatorios
3. Define horas de anticipación (por defecto 24 horas)
4. Personaliza plantilla de correo

**Funcionamiento:**
1. Cron job (pg_cron) ejecuta cada 30 minutos
2. Busca citas dentro de la ventana de recordatorio
3. Verifica que no se haya enviado recordatorio previo
4. Envía correo con plantilla personalizada
5. Registra el envío en `email_reminders`

**Plantillas disponibles:**
- Confirmación de cita
- Recordatorio de cita
- Cancelación de cita

**Placeholders disponibles:**
- `{{paciente_nombre}}`, `{{paciente_apellido}}`
- `{{fecha_consulta}}`, `{{hora_consulta}}`
- `{{medico_nombre}}`, `{{nombre_clinica}}`

---

## 4. Gestión de Citas

### 4.1 Estados de Consulta

| Estado | Código | Color | Descripción |
|--------|--------|-------|-------------|
| Programada | `programada` | Azul | Cita agendada, pendiente de confirmación |
| Confirmada | `confirmada` | Verde claro | Paciente confirmó asistencia |
| En Curso | `en_curso` | Amarillo | Consulta en progreso |
| Completada | `completada` | Verde | Consulta finalizada |
| Cancelada | `cancelada` | Rojo | Cita cancelada |
| Ausente | `ausente` | Gris | Paciente no se presentó |

### 4.2 Tipos de Consulta

- **Primera vez**: Paciente nuevo o primera consulta por esta patología
- **Control**: Seguimiento de tratamiento previo
- **Urgencia**: Atención prioritaria

### 4.3 Validación de Disponibilidad

Al agendar una cita, el sistema verifica:

```sql
-- Verificar disponibilidad del médico
SELECT * FROM medicos_horarios
WHERE medico_id = [médico_seleccionado]
  AND dia_semana = [día_de_la_semana]
  AND hora_inicio <= [hora_cita]
  AND hora_fin > [hora_cita]
  AND activo = true;
```

```sql
-- Verificar conflictos de horario
SELECT * FROM consultas
WHERE medico_id = [médico_seleccionado]
  AND estado NOT IN ('cancelada', 'ausente')
  AND (rango de tiempo se superpone con la nueva cita);
```

### 4.4 Seguimiento de Tiempos

El sistema calcula automáticamente:

- **Demora de la clínica**: Paciente llegó a tiempo pero la cita se demoró
  - Badge amarillo: "Retraso: 15m"
- **Llegada tardía**: Paciente llegó después de la hora programada
  - Badge gris: "Llegada tardía"
- **Pacientes en espera**: Contador de pacientes que ya llegaron pero no han sido atendidos

---

## 5. Panel de Control del Médico

### 5.1 Vista General

El panel personal del médico muestra:

**Sección superior:**
- Nombre del médico y foto de perfil
- Contador de "Pacientes en Espera" (tiempo real)
- Fecha actual

**Consultas de hoy:**
- Lista de todas las citas del día
- Estado de cada cita con badge de color
- Indicador de demora o llegada tardía
- Hora programada vs hora de llegada

**Próximos 7 días:**
- Vista previa de citas futuras
- Ayuda a planificar la semana

**Pacientes recientes:**
- Acceso rápido a pacientes atendidos recientemente

### 5.2 Actualizaciones en Tiempo Real

El panel utiliza Supabase Realtime para:

- Actualizar contador de espera cuando llega un paciente
- Refrescar lista de citas cuando cambia un estado
- Recalcular tiempos de demora cada 60 segundos
- No requiere refrescar la página manualmente

---

## 6. Administración del Sistema

### 6.1 Configuración de la Clínica

**Ubicación:** `/admin`

**Marca de la clínica:**
- Subir logo de la clínica
- Configurar nombre que aparece en correos y login
- Información de contacto

**Configuración de correo:**
- Servidor SMTP (host, puerto)
- Credenciales de autenticación
- Habilitar/deshabilitar notificaciones
- Habilitar/deshabilitar recordatorios
- Configurar horas de anticipación para recordatorios

### 6.2 Plantillas de Correo

El administrador puede personalizar tres plantillas:

1. **Confirmación de cita**: Se envía al agendar
2. **Recordatorio**: Se envía automáticamente antes de la cita
3. **Cancelación**: Se envía al cancelar una cita

Cada plantilla incluye:
- Asunto personalizable
- Cuerpo con soporte de placeholders
- Vista previa antes de guardar

### 6.3 Gestión de Usuarios

**Médicos:**
- Crear nuevos médicos con cuenta de usuario
- Editar información y especialidad
- Gestionar horarios de disponibilidad
- Configurar obras sociales que acepta
- Restablecer contraseña
- Eliminar (soft delete para preservar historial)

**Recepcionistas:**
- Crear cuentas de recepción
- Editar información de contacto
- Activar/desactivar acceso

**Obras sociales:**
- Agregar nuevos proveedores
- Editar información de contacto
- Configurar convenios con médicos
- Definir porcentajes de cobertura y copagos

---

## 7. Funcionalidades en Tiempo Real

### 7.1 Suscripciones Realtime

El sistema utiliza Supabase Realtime para:

**Panel del médico:**
- Escucha cambios en tabla `consultas` del médico actual
- Detecta cuando `paciente_llego_timestamp` cambia
- Actualiza contador de espera instantáneamente
- Refresca datos cuando cambia `estado_id`

**Lista de consultas:**
- Escucha INSERT/UPDATE/DELETE en `consultas`
- Actualiza la tabla sin refrescar página
- Muestra cambios de estado en tiempo real

### 7.2 Beneficios

- Recepcionista marca llegada → Médico ve actualización inmediata
- Médico completa consulta → Lista se actualiza para todos
- No requiere polling ni refrescos manuales
- Reduce carga en el servidor

---

## 8. Integraciones

### 8.1 n8n (Automatización WhatsApp)

**Endpoints disponibles:**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/n8n/create-token` | POST | Genera token de reserva |
| `/api/n8n/patients` | GET | Lista pacientes para n8n |
| `/api/n8n/doctors` | GET | Lista médicos para n8n |

**Flujo de integración:**
1. Paciente envía mensaje a WhatsApp de la clínica
2. n8n recibe el mensaje y procesa la solicitud
3. Llama a `/api/n8n/create-token` para generar enlace
4. Envía enlace de reserva al paciente
5. Paciente completa reserva en `/agendar`

### 8.2 Correo Electrónico

**Configuración SMTP:**
- Compatible con cualquier proveedor SMTP
- Soporta autenticación TLS/SSL
- Configuración desde panel de administración

**Tipos de correo:**
- Confirmaciones de cita
- Recordatorios automáticos
- Notificaciones de cancelación

---

## 9. Seguridad

### 9.1 Autenticación

- Basada en Supabase Auth
- Sesiones con cookies seguras
- Refresh automático de tokens
- Protección de rutas en middleware

### 9.2 Autorización

**Row Level Security (RLS):**
- Todas las tablas tienen RLS habilitado
- Políticas basadas en `auth.uid()` y rol del usuario
- Datos médicos solo accesibles para roles autorizados

**Control de acceso:**
- Verificación de permisos en servidor y cliente
- Funciones de permisos centralizadas en `lib/permissions.ts`
- Campos editables según rol y propiedad

### 9.3 Protección de Datos

- Borrado suave (soft delete) para médicos
- Auditoría completa: created_by, created_at, updated_by, updated_at
- Sin caché de datos de usuario (previene filtración entre sesiones)
- Variables de entorno para credenciales sensibles

### 9.4 Validación

- Validación de entrada con Zod
- Sanitización de datos antes de guardar
- Prevención de inyección SQL mediante Supabase client
- Tokens de reserva con expiración temporal

---

## Glosario

| Término | Descripción |
|---------|-------------|
| **Consulta** | Cita médica o registro de atención |
| **Obra Social** | Proveedor de seguro médico |
| **Estado** | Situación actual de una consulta |
| **Matrícula** | Número de licencia profesional del médico |
| **DNI** | Documento Nacional de Identidad |
| **Copago** | Monto que paga el paciente |
| **Buffer** | Tiempo entre consultas |
| **Token** | Código único para reserva por WhatsApp |

---

## Soporte

Para consultas técnicas o reportar problemas:
- Revisar la documentación en `/docs`
- Consultar FAQ en `/faq`
- Contactar al administrador del sistema

---

*Documento generado automáticamente - Sistema PMS v1.1*
