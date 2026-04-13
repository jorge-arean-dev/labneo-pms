-- ============================================================================
-- Migration: Move Vevi credentials to odontologos_perfil
-- ============================================================================
-- Changes:
--   1. Add Vevi columns to odontologos_perfil (per-odontólogo storage)
--   2. Allow reuse of estado codigos across tipo_solicitud by making the
--      UNIQUE constraint composite (codigo, tipo_solicitud).
--   3. Rename existing prótesis estados to clean codigos:
--        pendiente_protesis → pendiente  (tipo='protesis')
--        registrado_vevi    → procesada  (tipo='protesis')
--   4. Drop now-unused Vevi columns from solicitudes (no data to preserve —
--      verified empty at migration time).
--   5. Add two admin-controlled email notification toggles to email_config.
-- ============================================================================

-- 1. Vevi columns on odontologos_perfil
ALTER TABLE public.odontologos_perfil
  ADD COLUMN vevi_usuario       text,
  ADD COLUMN vevi_password      text,
  ADD COLUMN vevi_registrado_at timestamptz,
  ADD COLUMN vevi_comentarios   text;

COMMENT ON COLUMN public.odontologos_perfil.vevi_usuario IS 'Vevi Dental username assigned by admin';
COMMENT ON COLUMN public.odontologos_perfil.vevi_password IS 'Vevi Dental password (plain text — TODO: encrypt)';
COMMENT ON COLUMN public.odontologos_perfil.vevi_registrado_at IS 'Timestamp when Vevi credentials were first assigned. NULL = not registered.';
COMMENT ON COLUMN public.odontologos_perfil.vevi_comentarios IS 'Admin comments attached to the Vevi registration';

-- 2. Replace single-column UNIQUE(codigo) with composite UNIQUE(codigo, tipo_solicitud)
ALTER TABLE public.estados_solicitud
  DROP CONSTRAINT estados_solicitud_codigo_key;

ALTER TABLE public.estados_solicitud
  ADD CONSTRAINT estados_solicitud_codigo_tipo_key UNIQUE (codigo, tipo_solicitud);

-- 3. Rename prótesis estados to clean codigos (estado_ids remain the same, so
--    existing solicitudes keep pointing at the right rows)
UPDATE public.estados_solicitud
   SET codigo      = 'pendiente',
       descripcion = 'Solicitud de prótesis pendiente de procesamiento por el administrador'
 WHERE codigo = 'pendiente_protesis';

UPDATE public.estados_solicitud
   SET codigo      = 'procesada',
       nombre      = 'Procesada',
       descripcion = 'Solicitud de prótesis procesada por el administrador'
 WHERE codigo = 'registrado_vevi';

-- 4. Drop unused Vevi columns from solicitudes
ALTER TABLE public.solicitudes
  DROP COLUMN vevi_usuario,
  DROP COLUMN vevi_password,
  DROP COLUMN comentarios_admin;

-- 5. Email notification toggles on email_config singleton
ALTER TABLE public.email_config
  ADD COLUMN protesis_first_notification_enabled      boolean NOT NULL DEFAULT true,
  ADD COLUMN protesis_subsequent_notification_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.email_config.protesis_first_notification_enabled IS 'When true, send credentials email on first-time processing of a prótesis solicitud';
COMMENT ON COLUMN public.email_config.protesis_subsequent_notification_enabled IS 'When true, send confirmation email on subsequent processing of prótesis solicitudes';
