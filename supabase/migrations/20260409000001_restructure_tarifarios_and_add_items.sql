-- ============================================================================
-- Portal Labneo — Restructure tarifarios + add global items catalog
-- ============================================================================
--
-- Changes introduced in this migration:
--   1. Drop legacy tarifarios_items (prices embedded in each list)
--   2. Drop legacy localidades_tarifarios (M:N join table)
--   3. Drop tarifarios.is_active; add tarifarios.deleted_at (soft delete)
--   4. Create items (global catalog: nombre + tiempo_entrega)
--   5. Recreate tarifarios_items as a sparse price table (tarifario_id, item_id, precio)
--   6. Add localidades.tarifario_id (nullable FK enforcing 1 localidad → max 1 lista)
--   7. Create solicitudes_items (line items with FK + snapshot)
--   8. Add solicitudes.tarifario_id / moneda_snapshot / total_snapshot
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop legacy tables (both are empty in the reference DB)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.tarifarios_items CASCADE;
DROP TABLE IF EXISTS public.localidades_tarifarios CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Tarifarios — drop is_active, add deleted_at
-- ----------------------------------------------------------------------------

ALTER TABLE public.tarifarios DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.tarifarios ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_tarifarios_deleted_at ON public.tarifarios(deleted_at);

-- ----------------------------------------------------------------------------
-- 3. Items (global catalog)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  tiempo_entrega  text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_items_nombre ON public.items(nombre);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON public.items(deleted_at);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read items (admin + odontólogo need the catalog)
CREATE POLICY "authenticated_read_items" ON public.items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin CRUD
CREATE POLICY "admin_insert_items" ON public.items
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_items" ON public.items
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_delete_items" ON public.items
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Tarifarios_items (sparse price entries: tarifario_id × item_id → precio)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tarifarios_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarifario_id   uuid NOT NULL REFERENCES public.tarifarios(id) ON DELETE CASCADE,
  item_id        uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  precio         numeric(12,2) NOT NULL CHECK (precio >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tarifarios_items_unique_pair UNIQUE (tarifario_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_tarifarios_items_item_id ON public.tarifarios_items(item_id);
CREATE INDEX IF NOT EXISTS idx_tarifarios_items_tarifario_id ON public.tarifarios_items(tarifario_id);

ALTER TABLE public.tarifarios_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_tarifarios_items" ON public.tarifarios_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_insert_tarifarios_items" ON public.tarifarios_items
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_tarifarios_items" ON public.tarifarios_items
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_delete_tarifarios_items" ON public.tarifarios_items
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER update_tarifarios_items_updated_at
  BEFORE UPDATE ON public.tarifarios_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Localidades — add tarifario_id (1 localidad → max 1 tarifario)
-- ----------------------------------------------------------------------------

ALTER TABLE public.localidades
  ADD COLUMN IF NOT EXISTS tarifario_id uuid NULL
  REFERENCES public.tarifarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_localidades_tarifario_id ON public.localidades(tarifario_id);

-- ----------------------------------------------------------------------------
-- 6. Solicitudes — add tarifario_id + moneda_snapshot + total_snapshot
-- ----------------------------------------------------------------------------

ALTER TABLE public.solicitudes
  ADD COLUMN IF NOT EXISTS tarifario_id uuid NULL
  REFERENCES public.tarifarios(id) ON DELETE SET NULL;

ALTER TABLE public.solicitudes
  ADD COLUMN IF NOT EXISTS moneda_snapshot text NULL
  CHECK (moneda_snapshot IS NULL OR moneda_snapshot IN ('ARS', 'USD'));

ALTER TABLE public.solicitudes
  ADD COLUMN IF NOT EXISTS total_snapshot numeric(12,2) NULL;

-- ----------------------------------------------------------------------------
-- 7. Solicitudes_items (line items on a prótesis solicitud)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.solicitudes_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id            uuid NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  item_id                 uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  nombre_snapshot         text NOT NULL,
  tiempo_entrega_snapshot text NOT NULL,
  precio_snapshot         numeric(12,2) NOT NULL CHECK (precio_snapshot >= 0),
  cantidad                integer NOT NULL CHECK (cantidad > 0),
  subtotal_snapshot       numeric(12,2) NOT NULL CHECK (subtotal_snapshot >= 0),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_items_solicitud_id
  ON public.solicitudes_items(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_items_item_id
  ON public.solicitudes_items(item_id);

ALTER TABLE public.solicitudes_items ENABLE ROW LEVEL SECURITY;

-- Read: admin sees all; odontólogo sees only line items of their own solicitudes
CREATE POLICY "read_solicitudes_items" ON public.solicitudes_items
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.solicitudes s
      WHERE s.id = solicitudes_items.solicitud_id
        AND s.odontologo_id = auth.uid()
    )
  );

-- Insert: odontólogo can insert line items for solicitudes they own; admin can insert any
CREATE POLICY "insert_solicitudes_items" ON public.solicitudes_items
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.solicitudes s
      WHERE s.id = solicitudes_items.solicitud_id
        AND s.odontologo_id = auth.uid()
    )
  );

-- Update: admin only (line items are immutable after creation for odontólogo)
CREATE POLICY "admin_update_solicitudes_items" ON public.solicitudes_items
  FOR UPDATE USING (public.is_admin());

-- Delete: admin only
CREATE POLICY "admin_delete_solicitudes_items" ON public.solicitudes_items
  FOR DELETE USING (public.is_admin());
