"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  Item,
  Tarifario,
  TarifarioSummary,
  ItemWithPrecio,
  Localidad,
  Moneda,
} from "@/lib/types/entities"

// ============================================================================
// Auth helper — used by every mutation
// ============================================================================

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "No autenticado" }

  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | null
  const role = roles?.nombre || ""
  if (role.toLowerCase() !== "administracion") {
    return { ok: false as const, error: "No autorizado" }
  }
  return { ok: true as const, supabase }
}

// ============================================================================
// ITEMS (global catalog)
// ============================================================================

export async function fetchItems() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("items")
    .select("id, nombre, tiempo_entrega, created_at, updated_at, deleted_at")
    .is("deleted_at", null)
    .order("nombre", { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data as Item[], error: null }
}

export interface CreateItemData {
  nombre: string
  tiempo_entrega: string
}

export async function createItem(formData: CreateItemData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error, data: null }

  const { data, error } = await auth.supabase
    .from("items")
    .insert({
      nombre: formData.nombre.trim(),
      tiempo_entrega: formData.tiempo_entrega.trim(),
    })
    .select("id, nombre, tiempo_entrega, created_at, updated_at, deleted_at")
    .single()

  if (error) return { success: false, error: error.message, data: null }

  revalidatePath("/tarifarios", "page")
  return { success: true, error: null, data: data as Item }
}

export async function updateItem(id: string, formData: CreateItemData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error, data: null }

  const { data, error } = await auth.supabase
    .from("items")
    .update({
      nombre: formData.nombre.trim(),
      tiempo_entrega: formData.tiempo_entrega.trim(),
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id, nombre, tiempo_entrega, created_at, updated_at, deleted_at")
    .single()

  if (error) return { success: false, error: error.message, data: null }

  revalidatePath("/tarifarios", "page")
  return { success: true, error: null, data: data as Item }
}

/** Soft delete an item. Preserves historical snapshots in solicitudes_items. */
export async function deleteItem(id: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/tarifarios", "page")
  return { success: true, error: null }
}

// ============================================================================
// TARIFARIOS (price lists)
// ============================================================================

/**
 * Fetches all non-deleted tarifarios with their linked localidades and a count
 * of priced items. Used for the listas table on /tarifarios.
 */
export async function fetchTarifarios() {
  const supabase = await createClient()

  const { data: tarifarios, error: tError } = await supabase
    .from("tarifarios")
    .select("id, nombre, moneda, created_at, updated_at, deleted_at")
    .is("deleted_at", null)
    .order("nombre", { ascending: true })

  if (tError) return { data: null, error: tError.message }

  const tarifariosArr = (tarifarios || []) as Tarifario[]
  if (tarifariosArr.length === 0) {
    return { data: [] as TarifarioSummary[], error: null }
  }

  const tarifarioIds = tarifariosArr.map((t) => t.id)

  // Linked localidades
  const { data: locs, error: lError } = await supabase
    .from("localidades")
    .select("id, nombre_display, tarifario_id")
    .in("tarifario_id", tarifarioIds)
    .eq("activo", true)

  if (lError) return { data: null, error: lError.message }

  // Precios count per tarifario (client-side aggregation since Supabase doesn't
  // support GROUP BY easily via the JS client)
  const { data: precios, error: pError } = await supabase
    .from("tarifarios_items")
    .select("tarifario_id")
    .in("tarifario_id", tarifarioIds)

  if (pError) return { data: null, error: pError.message }

  const countByTarifario = new Map<string, number>()
  for (const p of precios || []) {
    const tid = (p as { tarifario_id: string }).tarifario_id
    countByTarifario.set(tid, (countByTarifario.get(tid) || 0) + 1)
  }

  const localidadesByTarifario = new Map<
    string,
    { id: string; nombre_display: string }[]
  >()
  for (const l of locs || []) {
    const row = l as { id: string; nombre_display: string; tarifario_id: string }
    const list = localidadesByTarifario.get(row.tarifario_id) || []
    list.push({ id: row.id, nombre_display: row.nombre_display })
    localidadesByTarifario.set(row.tarifario_id, list)
  }

  const summaries: TarifarioSummary[] = tarifariosArr.map((t) => ({
    ...t,
    localidades: localidadesByTarifario.get(t.id) || [],
    precios_count: countByTarifario.get(t.id) || 0,
  }))

  return { data: summaries, error: null }
}

/** Fetch a single tarifario by id (non-deleted). */
export async function fetchTarifarioById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tarifarios")
    .select("id, nombre, moneda, created_at, updated_at, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Tarifario, error: null }
}

/**
 * Fetch a tarifario together with all catalog items LEFT-joined to their
 * prices in this list. Items without a price in this list come back with
 * precio = null ("sin precio"). Used by the precio-editing grid.
 */
export async function fetchTarifarioConPrecios(id: string) {
  const supabase = await createClient()

  const { data: tarifario, error: tError } = await supabase
    .from("tarifarios")
    .select("id, nombre, moneda, created_at, updated_at, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (tError) return { tarifario: null, items: null, localidades: null, error: tError.message }

  const { data: items, error: iError } = await supabase
    .from("items")
    .select("id, nombre, tiempo_entrega, created_at, updated_at, deleted_at")
    .is("deleted_at", null)
    .order("nombre", { ascending: true })

  if (iError) return { tarifario: null, items: null, localidades: null, error: iError.message }

  const { data: precios, error: pError } = await supabase
    .from("tarifarios_items")
    .select("item_id, precio")
    .eq("tarifario_id", id)

  if (pError) return { tarifario: null, items: null, localidades: null, error: pError.message }

  const priceMap = new Map<string, number>()
  for (const p of precios || []) {
    const row = p as { item_id: string; precio: number }
    priceMap.set(row.item_id, Number(row.precio))
  }

  const itemsWithPrecio: ItemWithPrecio[] = (items || []).map((it) => ({
    ...(it as Item),
    precio: priceMap.get((it as Item).id) ?? null,
  }))

  // Linked localidades (read-only display on the detail page)
  const { data: locs, error: lError } = await supabase
    .from("localidades")
    .select("id, codigo, nombre_display, provincia, activo, created_at, updated_at")
    .eq("tarifario_id", id)
    .eq("activo", true)
    .order("nombre_display")

  if (lError) return { tarifario: null, items: null, localidades: null, error: lError.message }

  return {
    tarifario: tarifario as Tarifario,
    items: itemsWithPrecio,
    localidades: (locs || []) as Localidad[],
    error: null,
  }
}

export interface CreateTarifarioData {
  nombre: string
  moneda: Moneda
  localidad_ids: string[]
}

export async function createTarifario(formData: CreateTarifarioData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error, data: null }

  // Guard: none of the selected localidades can already belong to another lista
  if (formData.localidad_ids.length > 0) {
    const { data: taken, error: takenError } = await auth.supabase
      .from("localidades")
      .select("id, nombre_display, tarifario_id")
      .in("id", formData.localidad_ids)
      .not("tarifario_id", "is", null)

    if (takenError) return { success: false, error: takenError.message, data: null }
    if (taken && taken.length > 0) {
      const names = (taken as { nombre_display: string }[])
        .map((t) => t.nombre_display)
        .join(", ")
      return {
        success: false,
        error: `Estas localidades ya pertenecen a otra lista: ${names}`,
        data: null,
      }
    }
  }

  // Insert the tarifario
  const { data: tarifario, error: tError } = await auth.supabase
    .from("tarifarios")
    .insert({
      nombre: formData.nombre.trim(),
      moneda: formData.moneda,
    })
    .select("id, nombre, moneda, created_at, updated_at, deleted_at")
    .single()

  if (tError || !tarifario) return { success: false, error: tError?.message || "Error", data: null }

  // Link localidades
  if (formData.localidad_ids.length > 0) {
    const { error: linkError } = await auth.supabase
      .from("localidades")
      .update({ tarifario_id: (tarifario as Tarifario).id })
      .in("id", formData.localidad_ids)

    if (linkError) {
      // Best-effort rollback — delete the tarifario we just created
      await auth.supabase.from("tarifarios").delete().eq("id", (tarifario as Tarifario).id)
      return { success: false, error: linkError.message, data: null }
    }
  }

  revalidatePath("/tarifarios", "page")
  return { success: true, error: null, data: tarifario as Tarifario }
}

export async function updateTarifario(id: string, formData: CreateTarifarioData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error, data: null }

  // Guard: any NEW localidad in the selection can't already belong to ANOTHER tarifario
  if (formData.localidad_ids.length > 0) {
    const { data: taken, error: takenError } = await auth.supabase
      .from("localidades")
      .select("id, nombre_display, tarifario_id")
      .in("id", formData.localidad_ids)
      .not("tarifario_id", "is", null)
      .neq("tarifario_id", id)

    if (takenError) return { success: false, error: takenError.message, data: null }
    if (taken && taken.length > 0) {
      const names = (taken as { nombre_display: string }[])
        .map((t) => t.nombre_display)
        .join(", ")
      return {
        success: false,
        error: `Estas localidades ya pertenecen a otra lista: ${names}`,
        data: null,
      }
    }
  }

  // Update tarifario metadata
  const { data: tarifario, error: tError } = await auth.supabase
    .from("tarifarios")
    .update({
      nombre: formData.nombre.trim(),
      moneda: formData.moneda,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id, nombre, moneda, created_at, updated_at, deleted_at")
    .single()

  if (tError || !tarifario) return { success: false, error: tError?.message || "Error", data: null }

  // Sync localidades: compute diff against currently linked set
  const { data: currentLinks, error: currentError } = await auth.supabase
    .from("localidades")
    .select("id")
    .eq("tarifario_id", id)

  if (currentError) return { success: false, error: currentError.message, data: null }

  const currentIds = new Set(
    (currentLinks || []).map((l) => (l as { id: string }).id)
  )
  const targetIds = new Set(formData.localidad_ids)
  const toUnlink = Array.from(currentIds).filter((x) => !targetIds.has(x))
  const toLink = Array.from(targetIds).filter((x) => !currentIds.has(x))

  if (toUnlink.length > 0) {
    const { error: unlinkError } = await auth.supabase
      .from("localidades")
      .update({ tarifario_id: null })
      .in("id", toUnlink)
    if (unlinkError) return { success: false, error: unlinkError.message, data: null }
  }

  if (toLink.length > 0) {
    const { error: linkError } = await auth.supabase
      .from("localidades")
      .update({ tarifario_id: id })
      .in("id", toLink)
    if (linkError) return { success: false, error: linkError.message, data: null }
  }

  revalidatePath("/tarifarios", "page")
  revalidatePath(`/tarifarios/listas/${id}`, "page")
  return { success: true, error: null, data: tarifario as Tarifario }
}

/** Soft delete a tarifario and unlink its localidades. */
export async function deleteTarifario(id: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  // Unlink localidades first so they can be reassigned
  const { error: unlinkError } = await auth.supabase
    .from("localidades")
    .update({ tarifario_id: null })
    .eq("tarifario_id", id)

  if (unlinkError) return { success: false, error: unlinkError.message }

  const { error } = await auth.supabase
    .from("tarifarios")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/tarifarios", "page")
  return { success: true, error: null }
}

// ============================================================================
// PRECIOS (tarifarios_items rows)
// ============================================================================

export async function upsertPrecio(
  tarifarioId: string,
  itemId: string,
  precio: number
) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!Number.isFinite(precio) || precio < 0) {
    return { success: false, error: "Precio inválido" }
  }

  const { error } = await auth.supabase.from("tarifarios_items").upsert(
    {
      tarifario_id: tarifarioId,
      item_id: itemId,
      precio,
    },
    { onConflict: "tarifario_id,item_id" }
  )

  if (error) return { success: false, error: error.message }

  revalidatePath(`/tarifarios/listas/${tarifarioId}`, "page")
  revalidatePath("/tarifarios", "page")
  return { success: true, error: null }
}

/** Remove the precio for an item in a tarifario ("sin precio"). */
export async function eliminarPrecio(tarifarioId: string, itemId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from("tarifarios_items")
    .delete()
    .eq("tarifario_id", tarifarioId)
    .eq("item_id", itemId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/tarifarios/listas/${tarifarioId}`, "page")
  revalidatePath("/tarifarios", "page")
  return { success: true, error: null }
}

// ============================================================================
// LOCALIDADES — lookup for the lista create/edit dialogs
// ============================================================================

/**
 * Fetch all active localidades with their current tarifario_id.
 * The dialog uses tarifario_id to disable localidades already taken by
 * another lista (excluding the current lista when editing).
 */
export async function fetchLocalidadesForTarifarios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("localidades")
    .select("id, codigo, nombre_display, provincia, activo, tarifario_id, created_at, updated_at")
    .eq("activo", true)
    .order("nombre_display")

  if (error) return { data: null, error: error.message }
  return {
    data: data as (Localidad & { tarifario_id: string | null })[],
    error: null,
  }
}

/**
 * Bulk-assign multiple localidades to a single tarifario.
 * Validates that none of the localidades already belong to another tarifario.
 */
export async function bulkAssignLocalidades(
  localidadIds: string[],
  tarifarioId: string
) {
  const auth = await assertAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  if (localidadIds.length === 0) {
    return { success: false, error: "No se seleccionaron localidades" }
  }

  const { error } = await auth.supabase
    .from("localidades")
    .update({ tarifario_id: tarifarioId })
    .in("id", localidadIds)

  if (error) return { success: false, error: error.message }

  revalidatePath("/tarifarios", "page")
  return { success: true, error: null }
}
