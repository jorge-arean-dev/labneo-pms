# PRD — Portal de gestión para Labneo
**Versión:** 0.1 (borrador)
**Fecha:** Marzo 2026
**Autor:** Jorge | Nexa
**Estado:** En definición — pendiente confirmación de ítems abiertos

---

## 1. Contexto y objetivos

### 1.1 El cliente
Labneo es un laboratorio dental digital especializado en prótesis y rehabilitaciones. Opera a nivel nacional desde Buenos Aires y trabaja exclusivamente con odontólogos y consultorios (no con pacientes directos). Utiliza un sistema interno llamado **VEVI** para la gestión operativa de casos y el proceso de fabricación de prótesis.

El área de comunicación del laboratorio (Malena y Valentina) es el contacto principal del proyecto.

### 1.2 Problema actual
El proceso de incorporación de un odontólogo nuevo al laboratorio es completamente manual:

- El odontólogo se contacta por WhatsApp o mail.
- Recepción recopila los datos necesarios en una conversación de ida y vuelta.
- Recepción envía manualmente el tarifario correspondiente según la localidad.
- Una vez aceptado el presupuesto, recepción da el alta en VEVI de forma manual.
- Recepción envía el acceso y tutorial al odontólogo también de forma manual.

El flujo de agendamiento del servicio de fotogrametría también es manual y sin trazabilidad: el odontólogo agenda a través de un link de Google Calendar, el técnico confirma por mail, y no existe ningún registro centralizado del estado de las citas.

### 1.3 Objetivos del proyecto
1. Digitalizar y automatizar el proceso de alta de odontólogos nuevos mediante un portal web.
2. Centralizar y dar trazabilidad al agendamiento del servicio de fotogrametría.
3. Reducir la carga manual del equipo de recepción, eliminando el ida y vuelta de información.

### 1.4 Fuera de alcance (fase 1)
- Integración directa con VEVI. El resultado del portal es información estructurada lista para que recepción la cargue manualmente en VEVI.
- Automatización de la cotización. La generación del presupuesto final sigue siendo responsabilidad de administración.
- Gestión de archivos clínicos (escáneres, diseños de prótesis). Esto se maneja directamente en VEVI.

---

## 2. Usuarios y roles

| Rol | Descripción | Accesos |
|---|---|---|
| **Odontólogo** | Cliente del laboratorio. Envía solicitudes y pide turnos de fotogrametría. | Portal público con login propio |
| **Administración** | Personal de Labneo. Recibe y gestiona las solicitudes entrantes. | Panel de administración |
| **Tecnico** | Responsable de las visitas de fotogrametría. Acepta y cierra las citas. | Vista de agenda de fotogrametría |

---

## 3. Flujos y funcionalidades

### 3.1 Flujo 1 — Alta de odontólogo nuevo

#### Estado futuro (con el portal)

1. El odontólogo ingresa al portal y se registra con su mail.
2. Completa el formulario de solicitud con sus datos.
3. Al seleccionar su **localidad**, el sistema muestra dinámicamente el tarifario correspondiente. *(ver ítem abierto #1)*
4. El odontólogo completa la solicitud y la envía.
5. Administración recibe un mail automático con todos los datos estructurados.
6. Administración da el alta en VEVI manualmente con esa información.
7. Administración envía el acceso y tutorial al odontólogo.
8. El odontólogo puede seguir el estado de su solicitud desde el portal.

#### Campos del formulario de solicitud

| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre | Texto | Sí |
| Apellido | Texto | Sí |
| Localidad / Dirección | Selector | Sí — dispara tarifario |
| Teléfono | Texto | Sí |
| Días y horarios de atención | Texto | Sí |
| CUIT y situación frente al IVA | Texto | Sí |
| Mail | Email | Sí |
| Tipo de servicio | Selector múltiple | No |

**Valores para "Tipo de servicio":** Prótesis, Fotogrametría, Alquiler de escáner, Soldadura de titanio, Full Arch.

#### Lógica de tarifarios por localidad
Existen 3 listas de precios:
- Lista A — pesos (zona 1)
- Lista B — pesos (zona 2)
- Lista C — dólares

La asignación de localidad a lista de precios **está pendiente de confirmación** por parte del cliente *(ver ítem abierto #2)*.

#### Notificación a recepción
Al enviarse la solicitud, se genera automáticamente un mail a la casilla de administración del laboratorio con todos los datos del formulario en un formato claro y estructurado.

#### Estados de la solicitud (visibles para el odontólogo)
- `Enviada` — recibida por el laboratorio
- `En proceso` — siendo gestionada por recepción
- `Alta generada` — dado de alta en VEVI, acceso enviado

---

### 3.2 Flujo 2 — Agendamiento de fotogrametría

#### Contexto
La fotogrametría es un servicio presencial donde un técnico del laboratorio se desplaza al consultorio del odontólogo para realizar un escaneo intraoral. La sesión dura aproximadamente 30–40 minutos. Actualmente hay un solo técnico asignado a este servicio.

#### Estado futuro (con el portal)

1. El odontólogo, desde su cuenta en el portal, solicita un turno de fotogrametría.
2. La solicitud queda registrada con estado `Pendiente` y es visible para el laboratorio.
3. El técnico revisa la solicitud y la acepta o rechaza.
4. El estado se actualiza a `Aceptada` y el odontólogo recibe confirmación por mail.
5. El técnico realiza la visita y marca el turno como `Finalizado` desde el panel.
6. El laboratorio tiene visibilidad completa del historial de citas en todo momento.

#### Estados de la cita de fotogrametría
- `Pendiente` — solicitud recibida, sin confirmar
- `Aceptada` — confirmada por el técnico
- `Finalizada` — visita realizada y cerrada por el técnico
- `Rechazada` — no pudo realizarse

#### Datos capturados en la solicitud de fotogrametría
*(a confirmar con el cliente — actualmente se captura mediante Google Calendar)*
- Nombre del odontólogo / consultorio
- Dirección del consultorio
- Tipo de servicio solicitado
- Descripción / observaciones adicionales

---

## 4. Requerimientos técnicos

### 4.1 Plataforma general
- Aplicación web responsive (accesible desde desktop y mobile).
- Autenticación por mail y contraseña para odontólogos.
- Panel de administración con acceso separado para el personal del laboratorio.
- Hosting en la nube (sin dependencia de hardware local).

### 4.2 Módulo de formulario dinámico
- Al seleccionar la localidad, el sistema debe mostrar el tarifario correspondiente de forma dinámica, sin recargar la página.
- Los tarifarios deben ser configurables por el administrador sin necesidad de intervención técnica.
- Validación de campos obligatorios antes de permitir el envío.

### 4.3 Notificaciones por mail
- Envío automático a administración al recibirse una nueva solicitud.
- Confirmación automática al odontólogo al enviar su solicitud.
- Notificación al odontólogo cuando su solicitud cambia de estado.
- Notificación de confirmación de turno de fotogrametría.
- Templates de mail configurables.

### 4.4 Panel de administración
- Vista de todas las solicitudes entrantes con filtros por estado y fecha.
- Posibilidad de actualizar el estado de cada solicitud.
- Vista de agenda de fotogrametría con estados por cita.
- Exportación de datos (deseable, no bloqueante para el MVP).

### 4.5 Configuración del sistema
- Los tarifarios (archivos o contenido) deben poder actualizarse desde el panel sin tocar código.
- La lógica de asignación localidad → tarifario debe ser configurable.

---

## 5. Preguntas abiertas y pendientes

### #1 — Flujo del tarifario *(crítico para el diseño del formulario)*
**Pregunta enviada al cliente el 28/03.**

¿El odontólogo tiene que seleccionar un ítem concreto de la lista de precios para completar la solicitud, o la lista es solo de referencia y la solicitud se envía de forma independiente?

**Impacto:** Define si el formulario incluye un paso de selección de servicio con precio visible, o si el tarifario es únicamente informativo.

**Hipótesis de trabajo:** Mostrar el tarifario de forma dinámica al seleccionar la localidad y permitir que el odontólogo elija el servicio directamente — eliminando el paso de esperar el envío por mail.

---

### #2 — Mapa de localidades por tarifario *(bloqueante para desarrollo)*
¿Qué localidades corresponden a cada una de las 3 listas de precios?

**Pendiente:** El cliente debe enviar este mapeo. Sin esto no es posible implementar la lógica de asignación automática.

---

### #3 — Formato de los tarifarios *(bloqueante para desarrollo)*
¿En qué formato están los tarifarios actualmente? (PDF, Excel, Google Sheets, etc.)

**Impacto:** Define si se muestran como documento descargable, como tabla dentro del formulario, o como link externo.

---

### #4 — Datos capturados en el formulario de fotogrametría *(pendiente)*
El cliente actualmente usa un formulario de Google Calendar. Se necesita el listado exacto de campos que captura ese formulario para replicarlo o mejorarlo dentro del portal.

**Acción:** Solicitar el link del formulario actual (fue mencionado en la call pero no enviado aún).

---

### #5 — Casilla de administración para notificaciones *(pendiente)*
¿A qué mail deben llegar las notificaciones de nuevas solicitudes? ¿Es una casilla única o va a múltiples destinatarios?

---

### #6 — Alcance del acceso del técnico *(a definir en call)*
¿El técnico tiene su propio login en el sistema, o las citas de fotogrametría las gestiona alguien de administración en su nombre?

---

## 6. Criterios de aceptación del MVP

- [ ] Un odontólogo puede completar una solicitud tanto desde la web app como desde el celular.
- [ ] Al seleccionar la localidad, se muestra el tarifario correcto de forma automática.
- [ ] Administración recibe el mail con los datos completos y estructurados al enviarse la solicitud.
- [ ] El odontólogo puede ver el estado de su solicitud desde el portal.
- [ ] El odontólogo puede solicitar un turno de fotogrametría desde el mismo portal.
- [ ] El laboratorio tiene un panel donde ver todas las solicitudes y citas con sus estados.
- [ ] El técnico puede marcar una cita de fotogrametría como finalizada.

---

*Documento sujeto a cambios según respuestas del cliente a los ítems abiertos.*