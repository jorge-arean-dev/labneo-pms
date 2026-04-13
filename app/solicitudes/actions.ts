"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  SolicitudWithRelations,
  EstadoSolicitud,
  Localidad,
  TipoSolicitud,
  SubtipoServicio,
  OdontologoPerfilWithLocalidad,
  OdontologoHorario,
  Tarifario,
  ItemWithPrecio,
  Item,
} from "@/lib/types/entities"

// ============================================================================
// Fetch solicitudes (list)
// ============================================================================

export async function fetchSolicitudes() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "No autenticado" }
  }

  // Get user role
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | null
  const role = roles?.nombre?.toLowerCase() || ""

  let query = supabase
    .from("solicitudes")
    .select(`
      *,
      estados_solicitud(id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at),
      localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)
    `)
    .order("created_at", { ascending: false })

  // Odontólogos only see their own
  if (role === "odontologo") {
    query = query.eq("odontologo_id", user.id)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as SolicitudWithRelations[], error: null }
}

// ============================================================================
// Fetch single solicitud by ID
// ============================================================================

export async function fetchSolicitudById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      *,
      estados_solicitud(id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at),
      localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at),
      solicitudes_items(id, solicitud_id, item_id, nombre_snapshot, tiempo_entrega_snapshot, precio_snapshot, cantidad, subtotal_snapshot, created_at)
    `)
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as SolicitudWithRelations, error: null }
}

// ============================================================================
// Fetch estados
// ============================================================================

export async function fetchEstadosSolicitud() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("estados_solicitud")
    .select("id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at")
    .eq("activo", true)
    .order("orden")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as EstadoSolicitud[], error: null }
}

// ============================================================================
// Fetch localidades (active only)
// ============================================================================

export async function fetchLocalidades() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("localidades")
    .select("id, codigo, nombre_display, provincia, activo, created_at, updated_at")
    .eq("activo", true)
    .order("nombre_display")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Localidad[], error: null }
}

// ============================================================================
// Fetch odontologo profile + horarios (for preloading the form)
// ============================================================================

export async function fetchOdontologoProfileForForm() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { usuario: null, perfil: null, horarios: null, error: "No autenticado" }
  }

  // Fetch base user data
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email")
    .eq("id", user.id)
    .single()

  if (usuarioError) {
    return { usuario: null, perfil: null, horarios: null, error: usuarioError.message }
  }

  // Fetch odontologo perfil with localidad join
  const { data: perfilData } = await supabase
    .from("odontologos_perfil")
    .select("id, usuario_id, localidad_id, telefono, cuit, situacion_iva, direccion_consultorio, created_at, updated_at, localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)")
    .eq("usuario_id", user.id)
    .single()

  // Fetch horarios
  const { data: horariosData } = await supabase
    .from("odontologos_horarios")
    .select("id, usuario_id, dia_semana, hora_inicio, hora_fin, activo, created_at, updated_at")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .order("dia_semana")
    .order("hora_inicio")

  return {
    usuario: usuarioData,
    perfil: perfilData as unknown as OdontologoPerfilWithLocalidad | null,
    horarios: (horariosData || []) as OdontologoHorario[],
    error: null,
  }
}

// ============================================================================
// Fetch tarifario + items for the current odontólogo
// ============================================================================

/**
 * Resolves the tarifario that applies to the current odontólogo based on their
 * localidad, and returns all catalog items LEFT-joined to their prices in that
 * tarifario. Items without a price in the tarifario come back with precio=null.
 *
 * If the odontólogo has no localidad set OR the localidad has no tarifario
 * linked, returns every catalog item with precio=null (allowing submission
 * per product decision).
 */
export async function fetchTarifarioForCurrentOdontologo() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { tarifario: null, items: null, error: "No autenticado" }
  }

  // 1. Read odontólogo perfil to get localidad_id
  const { data: perfilData } = await supabase
    .from("odontologos_perfil")
    .select("localidad_id")
    .eq("usuario_id", user.id)
    .single()

  const localidadId = perfilData?.localidad_id as string | null | undefined

  // 2. Resolve the tarifario via localidades.tarifario_id (nullable)
  let tarifario: Tarifario | null = null
  if (localidadId) {
    const { data: localidadData } = await supabase
      .from("localidades")
      .select("tarifario_id")
      .eq("id", localidadId)
      .single()

    const tarifarioId = (localidadData as { tarifario_id: string | null } | null)
      ?.tarifario_id

    if (tarifarioId) {
      const { data: tarifarioData } = await supabase
        .from("tarifarios")
        .select("id, nombre, moneda, created_at, updated_at, deleted_at")
        .eq("id", tarifarioId)
        .is("deleted_at", null)
        .single()
      tarifario = (tarifarioData as Tarifario | null) ?? null
    }
  }

  // 3. Fetch catalog items
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, nombre, tiempo_entrega, created_at, updated_at, deleted_at")
    .is("deleted_at", null)
    .order("nombre", { ascending: true })

  if (itemsError) {
    return { tarifario: null, items: null, error: itemsError.message }
  }

  // 4. If we have a tarifario, fetch its prices and attach them
  let priceMap = new Map<string, number>()
  if (tarifario) {
    const { data: precios, error: preciosError } = await supabase
      .from("tarifarios_items")
      .select("item_id, precio")
      .eq("tarifario_id", tarifario.id)
    if (preciosError) {
      return { tarifario: null, items: null, error: preciosError.message }
    }
    priceMap = new Map(
      (precios || []).map((p) => {
        const row = p as { item_id: string; precio: number }
        return [row.item_id, Number(row.precio)]
      })
    )
  }

  const itemsWithPrecio: ItemWithPrecio[] = ((items || []) as Item[]).map((it) => ({
    ...it,
    precio: priceMap.get(it.id) ?? null,
  }))

  return { tarifario, items: itemsWithPrecio, error: null }
}

// ============================================================================
// Create solicitud
// ============================================================================

/**
 * Only editable fields come from the client. Read-only profile fields
 * (nombre, apellido, email, telefono, localidad, cuit, situacion_iva,
 * direccion_consultorio) are pulled server-side from the odontologo profile
 * to ensure data consistency and prevent client-side tampering.
 */
export interface CreateSolicitudItemInput {
  item_id: string
  cantidad: number
}

export interface CreateSolicitudData {
  tipo_solicitud: TipoSolicitud
  // Alquiler-specific (editable)
  subtipo_servicio: SubtipoServicio | null
  fecha_propuesta: string | null
  // Shared optional (editable)
  observaciones: string | null
  // Prótesis-specific: selected items with quantities (ignored for alquiler)
  items?: CreateSolicitudItemInput[]
}

export async function createSolicitud(formData: CreateSolicitudData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autenticado", data: null }
  }

  // Pull profile data server-side for historical snapshot
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuarios_pms")
    .select("nombre, apellido, email")
    .eq("id", user.id)
    .single()

  if (usuarioError || !usuarioData) {
    return { success: false, error: "Error al obtener datos del usuario", data: null }
  }

  const { data: perfilData, error: perfilError } = await supabase
    .from("odontologos_perfil")
    .select("telefono, localidad_id, cuit, situacion_iva, direccion_consultorio")
    .eq("usuario_id", user.id)
    .single()

  if (perfilError || !perfilData) {
    return {
      success: false,
      error: "Debés completar tu perfil en Configuración antes de crear una solicitud",
      data: null,
    }
  }

  // Validate ALL required profile fields (server-side guard — matches
  // lib/odontologo-profile.ts). Any missing field blocks submission.
  const missing: string[] = []
  if (!perfilData.telefono) missing.push("Teléfono")
  if (!perfilData.localidad_id) missing.push("Localidad")
  if (!perfilData.cuit) missing.push("CUIT")
  if (!perfilData.situacion_iva) missing.push("Situación frente al IVA")
  if (!perfilData.direccion_consultorio) missing.push("Dirección del consultorio")

  if (missing.length > 0) {
    return {
      success: false,
      error: `Completá tu perfil en Configuración antes de continuar. Falta: ${missing.join(", ")}.`,
      data: null,
    }
  }

  // Fetch default estado. Both tipos use codigo='pendiente' now; they are
  // disambiguated by tipo_solicitud (composite unique key). Prótesis has its
  // own row; alquiler_equipos reuses the shared ('pendiente','todos') row.
  const estadoTipoFilter = formData.tipo_solicitud === "protesis" ? "protesis" : "todos"
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_solicitud")
    .select("id")
    .eq("codigo", "pendiente")
    .eq("tipo_solicitud", estadoTipoFilter)
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "Error al obtener estado inicial", data: null }
  }

  // ==========================================================================
  // Prótesis-only: resolve tarifario + validate/snapshot line items
  // ==========================================================================
  let tarifarioIdSnapshot: string | null = null
  let monedaSnapshot: "ARS" | "USD" | null = null
  let totalSnapshot: number | null = null
  let linesToInsert: {
    item_id: string
    nombre_snapshot: string
    tiempo_entrega_snapshot: string
    precio_snapshot: number
    cantidad: number
    subtotal_snapshot: number
  }[] = []

  if (formData.tipo_solicitud === "protesis") {
    const selected = (formData.items || []).filter((x) => x.cantidad > 0)
    if (selected.length === 0) {
      return {
        success: false,
        error: "Seleccioná al menos un ítem antes de enviar la solicitud",
        data: null,
      }
    }

    // Resolve tarifario via localidad (source of truth server-side)
    if (perfilData.localidad_id) {
      const { data: localidadRow } = await supabase
        .from("localidades")
        .select("tarifario_id")
        .eq("id", perfilData.localidad_id)
        .single()
      tarifarioIdSnapshot =
        (localidadRow as { tarifario_id: string | null } | null)?.tarifario_id ?? null
    }

    if (tarifarioIdSnapshot) {
      const { data: tarifarioRow } = await supabase
        .from("tarifarios")
        .select("moneda")
        .eq("id", tarifarioIdSnapshot)
        .is("deleted_at", null)
        .single()
      monedaSnapshot =
        (tarifarioRow as { moneda: "ARS" | "USD" } | null)?.moneda ?? null
    }

    // Fetch the selected items from the catalog (for snapshot fields)
    const itemIds = selected.map((x) => x.item_id)
    const { data: itemRows, error: itemsError } = await supabase
      .from("items")
      .select("id, nombre, tiempo_entrega")
      .in("id", itemIds)
      .is("deleted_at", null)

    if (itemsError) {
      return { success: false, error: itemsError.message, data: null }
    }
    const itemMap = new Map(
      (itemRows || []).map((r) => {
        const row = r as { id: string; nombre: string; tiempo_entrega: string }
        return [row.id, row]
      })
    )

    // Fetch prices for these items in the resolved tarifario (may be empty)
    let precioMap = new Map<string, number>()
    if (tarifarioIdSnapshot) {
      const { data: preciosRows } = await supabase
        .from("tarifarios_items")
        .select("item_id, precio")
        .eq("tarifario_id", tarifarioIdSnapshot)
        .in("item_id", itemIds)
      precioMap = new Map(
        (preciosRows || []).map((p) => {
          const row = p as { item_id: string; precio: number }
          return [row.item_id, Number(row.precio)]
        })
      )
    }

    // Build line snapshots; items without a price use precio=0 ("sin precio")
    linesToInsert = selected
      .map((line) => {
        const itemData = itemMap.get(line.item_id)
        if (!itemData) return null
        const precio = precioMap.get(line.item_id) ?? 0
        const subtotal = precio * line.cantidad
        return {
          item_id: line.item_id,
          nombre_snapshot: itemData.nombre,
          tiempo_entrega_snapshot: itemData.tiempo_entrega,
          precio_snapshot: precio,
          cantidad: line.cantidad,
          subtotal_snapshot: subtotal,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (linesToInsert.length === 0) {
      return {
        success: false,
        error: "No se pudieron resolver los ítems seleccionados",
        data: null,
      }
    }

    totalSnapshot = linesToInsert.reduce((acc, l) => acc + l.subtotal_snapshot, 0)
  }

  // ==========================================================================
  // Insert the solicitud
  // ==========================================================================
  const { data, error } = await supabase
    .from("solicitudes")
    .insert({
      odontologo_id: user.id,
      tipo_solicitud: formData.tipo_solicitud,
      estado_id: estadoData.id,
      // Profile snapshot (historical copies)
      nombre: usuarioData.nombre,
      apellido: usuarioData.apellido,
      email: usuarioData.email,
      telefono: perfilData.telefono,
      localidad_id: perfilData.localidad_id,
      cuit: perfilData.cuit,
      situacion_iva: perfilData.situacion_iva,
      direccion_consultorio: perfilData.direccion_consultorio,
      // Editable fields
      subtipo_servicio: formData.subtipo_servicio,
      fecha_propuesta: formData.fecha_propuesta,
      observaciones: formData.observaciones,
      // Tarifario snapshot (prótesis only — null otherwise)
      tarifario_id: tarifarioIdSnapshot,
      moneda_snapshot: monedaSnapshot,
      total_snapshot: totalSnapshot,
    })
    .select(`
      *,
      estados_solicitud(id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at),
      localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)
    `)
    .single()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  // Insert line items (prótesis only)
  if (linesToInsert.length > 0) {
    const solicitudId = (data as { id: string }).id
    const { error: linesError } = await supabase.from("solicitudes_items").insert(
      linesToInsert.map((l) => ({
        solicitud_id: solicitudId,
        ...l,
      }))
    )
    if (linesError) {
      // Best-effort rollback of the parent solicitud
      await supabase.from("solicitudes").delete().eq("id", solicitudId)
      return { success: false, error: linesError.message, data: null }
    }
  }

  revalidatePath("/solicitudes", "page")
  return { success: true, error: null, data: data as unknown as SolicitudWithRelations }
}

// ============================================================================
// Update solicitud estado (admin only)
// ============================================================================

export async function updateSolicitudEstado(
  id: string,
  estadoId: string,
  notas_admin?: string
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { estado_id: estadoId }
  if (notas_admin !== undefined) {
    updateData.notas_admin = notas_admin
  }

  const { error } = await supabase
    .from("solicitudes")
    .update(updateData)
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/solicitudes", "page")
  revalidatePath(`/solicitudes/${id}`, "page")
  return { success: true, error: null }
}

// ============================================================================
// Fetch odontólogo Vevi registration state (used by solicitud detail page)
// ============================================================================

export async function fetchOdontologoVeviState(odontologoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("odontologos_perfil")
    .select("vevi_usuario, vevi_registrado_at")
    .eq("usuario_id", odontologoId)
    .maybeSingle()

  if (error) {
    return { isRegistered: false, usuario: null, error: error.message }
  }

  return {
    isRegistered: !!data?.vevi_registrado_at,
    usuario: data?.vevi_usuario ?? null,
    error: null,
  }
}

// ============================================================================
// Mark prótesis solicitud as procesada (admin only)
// ============================================================================
//
// Flow:
//   - Reads the solicitud to get odontólogo id.
//   - Reads odontologos_perfil.vevi_registrado_at to decide first-time vs
//     subsequent processing.
//   - First-time: credentials in payload are required; writes them to
//     odontologos_perfil (with vevi_registrado_at=now()) and transitions the
//     solicitud estado to 'procesada'. If the admin toggle
//     email_config.protesis_first_notification_enabled is true, sends the
//     credentials email to the odontólogo.
//   - Subsequent: payload must NOT include credentials; transitions the
//     solicitud to 'procesada'. If
//     email_config.protesis_subsequent_notification_enabled is true, sends a
//     short confirmation email.
//
// Atomicity note: Supabase JS client lacks client-side transactions; if the
// odontologos_perfil UPDATE succeeds and the solicitudes UPDATE fails, we
// return an error but the perfil write has already happened. Given the flow
// (admin clicks a button, low concurrency), the next retry is idempotent
// because the same credentials would be written again. Acceptable trade-off.

export interface MarcarProcesadaPayload {
  vevi_usuario?: string
  vevi_password?: string
  vevi_comentarios?: string | null
}

export async function marcarSolicitudProtesisProcesada(
  id: string,
  payload: MarcarProcesadaPayload = {}
) {
  const supabase = await createClient()

  // 1. Load the solicitud + current estado
  const { data: solicitud, error: solicitudError } = await supabase
    .from("solicitudes")
    .select(
      "id, odontologo_id, tipo_solicitud, nombre, apellido, email, estados_solicitud(codigo)"
    )
    .eq("id", id)
    .single()

  if (solicitudError || !solicitud) {
    return { success: false, error: "No se encontró la solicitud" }
  }

  if (solicitud.tipo_solicitud !== "protesis") {
    return { success: false, error: "Solo las solicitudes de prótesis pueden marcarse como procesadas" }
  }

  const currentEstado = (solicitud.estados_solicitud as unknown as { codigo: string } | null)?.codigo
  if (currentEstado !== "pendiente") {
    return { success: false, error: "Solo se pueden procesar solicitudes en estado 'Pendiente'" }
  }

  // 2. Load the odontólogo's Vevi state
  const { data: perfil, error: perfilError } = await supabase
    .from("odontologos_perfil")
    .select("id, vevi_registrado_at")
    .eq("usuario_id", solicitud.odontologo_id)
    .single()

  if (perfilError || !perfil) {
    return { success: false, error: "No se encontró el perfil del odontólogo" }
  }

  const isFirstTime = !perfil.vevi_registrado_at

  // 3. Validate payload matches the variant
  if (isFirstTime) {
    if (!payload.vevi_usuario?.trim() || !payload.vevi_password?.trim()) {
      return {
        success: false,
        error: "El usuario y contraseña de Vevi son obligatorios para la primera solicitud",
      }
    }
  } else {
    if (payload.vevi_usuario || payload.vevi_password) {
      return {
        success: false,
        error: "El odontólogo ya está registrado en Vevi; no envíes credenciales nuevas",
      }
    }
  }

  // 4. If first-time, write credentials to odontologos_perfil
  if (isFirstTime) {
    const { error: perfilUpdateError } = await supabase
      .from("odontologos_perfil")
      .update({
        vevi_usuario: payload.vevi_usuario!.trim(),
        vevi_password: payload.vevi_password!.trim(),
        vevi_comentarios: payload.vevi_comentarios?.trim() || null,
        vevi_registrado_at: new Date().toISOString(),
      })
      .eq("id", perfil.id)

    if (perfilUpdateError) {
      return { success: false, error: `Error al guardar credenciales: ${perfilUpdateError.message}` }
    }
  }

  // 5. Transition solicitud estado to 'procesada' (tipo='protesis')
  const { data: procesadaEstado, error: estadoError } = await supabase
    .from("estados_solicitud")
    .select("id")
    .eq("codigo", "procesada")
    .eq("tipo_solicitud", "protesis")
    .single()

  if (estadoError || !procesadaEstado) {
    return { success: false, error: "Error al obtener estado 'Procesada'" }
  }

  const { error: solicitudUpdateError } = await supabase
    .from("solicitudes")
    .update({ estado_id: procesadaEstado.id })
    .eq("id", id)

  if (solicitudUpdateError) {
    return { success: false, error: solicitudUpdateError.message }
  }

  // 6. Send email (best-effort; failures do not rollback the estado change)
  try {
    const { data: emailConfig } = await supabase
      .from("email_config")
      .select("protesis_first_notification_enabled, protesis_subsequent_notification_enabled")
      .single()

    const shouldSend =
      (isFirstTime && emailConfig?.protesis_first_notification_enabled) ||
      (!isFirstTime && emailConfig?.protesis_subsequent_notification_enabled)

    if (shouldSend && solicitud.email) {
      const { sendEmail } = await import("@/lib/email")
      const {
        protesisFirstProcesadaEmail,
        protesisSubsequentProcesadaEmail,
      } = await import("@/lib/email/templates")

      const { subject, html } = isFirstTime
        ? protesisFirstProcesadaEmail({
            nombre: solicitud.nombre,
            apellido: solicitud.apellido,
            usuario: payload.vevi_usuario!.trim(),
            password: payload.vevi_password!.trim(),
            comentarios: payload.vevi_comentarios?.trim() || null,
          })
        : protesisSubsequentProcesadaEmail({
            nombre: solicitud.nombre,
            apellido: solicitud.apellido,
          })

      await sendEmail({
        to: solicitud.email,
        toName: `${solicitud.nombre} ${solicitud.apellido}`,
        subject,
        html,
      })
    }
  } catch (emailError) {
    console.error("Error sending prótesis procesada email:", emailError)
  }

  revalidatePath("/solicitudes", "page")
  revalidatePath(`/solicitudes/${id}`, "page")
  revalidatePath("/acceso-vevi", "page")
  return { success: true, error: null }
}

// ============================================================================
// Delete solicitud (admin only)
// ============================================================================

export async function deleteSolicitud(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("solicitudes")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/solicitudes", "page")
  return { success: true, error: null }
}
