# Pendientes de confirmación — Portal Labneo

**Última actualización:** 2026-04-01
**Estado:** Pre-demo — pendiente validación con cliente

---

## Ítems del PRD pendientes de respuesta del cliente

### #1 — Flujo del tarifario (crítico)
**Pregunta:** ¿El odontólogo selecciona un ítem concreto de la lista de precios para completar la solicitud, o la lista es solo de referencia?
**Estado actual:** Se implementó como informativo — al seleccionar localidad se muestra el tarifario correspondiente, pero no se selecciona un ítem.
**Impacto:** Si el cliente quiere selección de ítem, hay que modificar el formulario de solicitud para incluir un paso de selección con precio visible.
**Hipótesis de trabajo:** Tarifario informativo (implementado).

### #2 — Mapa de localidades por tarifario (bloqueante)
**Pregunta:** ¿Qué localidades corresponden a cada una de las 3 listas de precios (Lista A zona 1, Lista B zona 2, Lista C dólares)?
**Estado actual:** Las 3 listas están creadas en la DB pero sin localidades asignadas. El formulario acepta texto libre como fallback.
**Impacto:** Sin este mapeo no funciona la asignación automática de tarifario por localidad.
**Acción:** El cliente debe enviar el listado de localidades con su lista asignada.

### #3 — Formato de los tarifarios (bloqueante)
**Pregunta:** ¿En qué formato están los tarifarios actualmente? (PDF, Excel, Google Sheets, etc.)
**Estado actual:** Se creó la estructura de base de datos para cargar ítems con servicio + precio. No hay ítems cargados.
**Impacto:** Define si se muestran como tabla (implementado), como PDF descargable, o como link externo.

### #4 — Campos del formulario de fotogrametría (pendiente)
**Pregunta:** ¿Cuáles son los campos exactos que captura el formulario actual de Google Calendar?
**Estado actual:** Se implementaron campos provisionales: dirección del consultorio, tipo de servicio (texto libre), fecha/hora propuesta, observaciones.
**Acción:** Solicitar el link del formulario actual al cliente para comparar/ajustar campos.

### #5 — Casilla de administración para notificaciones (pendiente)
**Pregunta:** ¿A qué email deben llegar las notificaciones de nuevas solicitudes? ¿Casilla única o múltiples destinatarios?
**Estado actual:** Infraestructura de email existe (SMTP), pero no se implementaron notificaciones automáticas en esta iteración.

### #6 — Alcance del acceso del técnico (pendiente)
**Pregunta:** ¿El técnico tiene su propio login o las citas las gestiona administración en su nombre?
**Estado actual:** Se implementó con login propio para el técnico (rol "Tecnico"). El técnico ve solo la sección de Fotogrametría y puede aceptar/rechazar/finalizar citas.
**Decisión tomada:** Enfoque más simple — login propio. Pendiente confirmación del cliente.

---

## Decisiones técnicas pendientes de revisión

### #7 — Tipo de servicio: selección simple vs múltiple
**Contexto:** Jorge propuso selección simple (dropdown). Se mantuvo selección múltiple (checkboxes) hasta confirmar con el cliente.
**Estado actual:** Multi-select con checkboxes implementado.
**Decisión pendiente:** ¿Puede un odontólogo solicitar más de un servicio por solicitud, o debe crear una solicitud por servicio?

### #8 — Estados como CHECK constraints vs tablas dedicadas
**Contexto:** Se implementaron estados con CHECK constraints en la DB (más simple). La alternativa es usar tablas dedicadas como en el PMS de referencia.
**Estado actual:** CHECK constraints implementados.
**Decisión:** Si el cliente necesita estados configurables o nuevos estados en el futuro, migrar a tablas dedicadas.

### #9 — Registro de odontólogos: abierto vs controlado por admin
**Estado actual:** Sign-up abierto — cualquier odontólogo puede crear cuenta.
**Alternativa:** El admin crea la cuenta y envía invitación (como en el PMS de referencia).
**Decisión pendiente:** Confirmar con cliente cuál prefiere.

---

## Funcionalidades pendientes de implementación

### Prioridad alta (pre-demo)
- [ ] Cargar datos de localidades y tarifarios (requiere #2 y #3)
- [ ] Notificaciones por email al cambiar estado de solicitud (nice-to-have para demo)

### Prioridad media (post-demo)
- [ ] Módulo de Tarifarios completo (CRUD admin para gestionar listas de precios)
- [ ] Notificación email al admin cuando llega nueva solicitud
- [ ] Notificación email al odontólogo cuando cambia estado de solicitud
- [ ] Notificación de confirmación de turno de fotogrametría
- [ ] Templates de email configurables desde el panel admin
- [ ] Exportación de datos desde el panel admin

### Prioridad baja (futuro)
- [ ] Integración con VEVI (fuera de alcance fase 1)
- [ ] Automatización de cotización
- [ ] Gestión de archivos clínicos

---

*Este documento se actualiza después de cada demo o reunión con el cliente.*
