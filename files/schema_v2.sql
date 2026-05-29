-- ============================================================
-- PROHIDRAUT S.A. — Schema v2 (ERP Industrial Hidráulico)
-- Ejecutar en Supabase SQL Editor
-- PASO 1: Primero ejecutar 00_reset.sql para limpiar todo
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS — estados y tipos controlados
-- ============================================================
CREATE TYPE rol_usuario AS ENUM ('admin', 'operativo', 'lectura');
CREATE TYPE estado_cotizacion AS ENUM ('borrador','enviada','aceptada','rechazada','vencida');
CREATE TYPE estado_oc AS ENUM ('recibido','desmontaje','diagnostico','esperando_aprobacion','en_reparacion','pruebas','pintura','listo_entrega','entregado','facturado','pagado','garantia','cancelado');
CREATE TYPE tipo_comprobante AS ENUM ('factura','boleta','sin_comprobante');
CREATE TYPE origen_pago AS ENUM ('yape','cuenta_prohidraut','caja_chica','efectivo','transferencia');
CREATE TYPE tipo_movimiento AS ENUM ('entrada','salida','ajuste');
CREATE TYPE tipo_asignacion_hora AS ENUM ('oc','administrativo','mantenimiento','capacitacion','vacaciones','feriado');

-- ============================================================
-- 1. USUARIOS (vinculado a Supabase Auth)
-- ============================================================
CREATE TABLE usuarios (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  rol          rol_usuario NOT NULL DEFAULT 'operativo',
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TRABAJADORES
-- ============================================================
CREATE TABLE trabajadores (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                      TEXT NOT NULL,
  dni                         TEXT UNIQUE NOT NULL,
  puesto                      TEXT NOT NULL,
  fecha_inicio                DATE NOT NULL,
  sueldo_semanal              NUMERIC(10,2) NOT NULL,
  dias_vacaciones_disponibles INTEGER DEFAULT 15,
  activo                      BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  created_by                  UUID REFERENCES usuarios(id),
  updated_by                  UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 3. CLIENTES
-- ============================================================
CREATE TABLE clientes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razon_social      TEXT NOT NULL,
  ruc               TEXT UNIQUE,
  direccion         TEXT,
  contacto_nombre   TEXT,
  contacto_email    TEXT,
  contacto_telefono TEXT,
  año_inicio        INTEGER,
  notas             TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES usuarios(id),
  updated_by        UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 4. TIPOS DE SELLO (modelado técnico real)
-- ============================================================
CREATE TABLE tipos_sello (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo              TEXT UNIQUE,           -- código interno PROHIDRAUT
  diametro_interno    NUMERIC(8,2),          -- mm
  diametro_externo    NUMERIC(8,2),          -- mm
  grosor              NUMERIC(8,2),          -- mm / altura
  material            TEXT,                  -- NBR, PU, PTFE, etc.
  tipo                TEXT,                  -- labio, anillo, raspador, guía, etc.
  marca               TEXT,                  -- SKF, Parker, Hallite, etc.
  descripcion         TEXT,
  equivalencias       TEXT[],                -- códigos equivalentes de otras marcas
  observaciones       TEXT,
  activo              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 5. EQUIPOS / CILINDROS (ficha técnica completa)
-- ============================================================
CREATE TABLE cilindros (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                TEXT NOT NULL,
  marca                 TEXT,
  modelo                TEXT,
  numero_serie          TEXT,
  -- Medidas técnicas
  diametro_vastago      NUMERIC(8,2),        -- mm
  diametro_tubo         NUMERIC(8,2),        -- mm (diámetro interno del cilindro)
  longitud_carrera      NUMERIC(8,2),        -- mm
  longitud_total        NUMERIC(8,2),        -- mm
  -- Especificaciones
  presion_trabajo       NUMERIC(8,2),        -- bar
  presion_maxima        NUMERIC(8,2),        -- bar
  material_vastago      TEXT,                -- acero, inox, etc.
  tipo_cromado          TEXT,                -- duro, decorativo, ninguno
  tipo_montaje          TEXT,                -- brida, horquilla, espárrago, etc.
  tipo_sello_principal  UUID REFERENCES tipos_sello(id),
  -- Contexto operativo
  aplicacion            TEXT,                -- brazo excavadora, volteo camión, etc.
  maquina               TEXT,               -- CAT 320, Komatsu PC200, etc.
  notas_tecnicas        TEXT,
  problema_recurrente   TEXT,               -- falla típica de este equipo
  activo                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES usuarios(id),
  updated_by            UUID REFERENCES usuarios(id)
);

-- Relación cilindro ↔ cliente (un cilindro puede ser de varios clientes)
CREATE TABLE cliente_cilindros (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id),
  cilindro_id UUID NOT NULL REFERENCES cilindros(id),
  alias       TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, cilindro_id)
);

-- ============================================================
-- 6. CATEGORÍAS DE INSUMOS
-- ============================================================
CREATE TABLE categorias_insumo (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categorias_insumo (nombre) VALUES
  ('Sello hidráulico'),('Vástago cromado'),('Tubo bruñido'),
  ('Pintura anticorrosiva'),('Conector hidráulico'),('Rodamiento'),
  ('Empaquetadura'),('Aceite hidráulico'),('Otro insumo');

-- ============================================================
-- 7. CATEGORÍAS DE MANO DE OBRA
-- ============================================================
CREATE TABLE categorias_mano_obra (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categorias_mano_obra (nombre) VALUES
  ('Tornero'),('Soldador'),('Limpieza'),('Pintura'),
  ('Ensamble'),('Administrativo'),('Pruebas'),('Otros');

-- ============================================================
-- 8. INVENTARIO / ALMACÉN
-- ============================================================
CREATE TABLE productos_almacen (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id          UUID REFERENCES categorias_insumo(id),
  tipo_sello_id         UUID REFERENCES tipos_sello(id), -- si es sello, link directo
  nombre                TEXT NOT NULL,
  medida                TEXT NOT NULL,
  unidad                TEXT DEFAULT 'unidad',
  stock_actual          NUMERIC(10,2) DEFAULT 0,
  stock_minimo          NUMERIC(10,2) DEFAULT 1,
  precio_costo_promedio NUMERIC(10,2),
  precio_venta_ref      NUMERIC(10,2),
  ubicacion_almacen     TEXT,              -- estante, cajón, etc.
  activo                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 9. MOVIMIENTOS DE ALMACÉN (trazabilidad completa)
-- ============================================================
CREATE TABLE movimientos_almacen (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id     UUID NOT NULL REFERENCES productos_almacen(id),
  tipo            tipo_movimiento NOT NULL,
  cantidad        NUMERIC(10,2) NOT NULL,
  stock_anterior  NUMERIC(10,2),
  stock_nuevo     NUMERIC(10,2),
  precio_unitario NUMERIC(10,2),
  oc_id           UUID,                   -- FK a ordenes_compra (se agrega después)
  motivo          TEXT,
  fecha           DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 10. SERVICIOS HISTÓRICOS
-- ============================================================
CREATE TABLE servicios_historicos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID REFERENCES clientes(id),
  cilindro_id     UUID REFERENCES cilindros(id),
  fecha_servicio  DATE,
  descripcion     TEXT,
  -- Costos separados: estimado vs real
  costo_estimado  NUMERIC(12,2),
  costo_real      NUMERIC(12,2),
  horas_estimadas NUMERIC(8,2),
  horas_reales    NUMERIC(8,2),
  -- Falla y diagnóstico
  falla_reportada TEXT,
  diagnostico     TEXT,
  trabajo_realizado TEXT,
  -- Garantía
  fecha_garantia_inicio DATE,
  fecha_garantia_fin    DATE,
  -- Flags
  fue_garantia    BOOLEAN DEFAULT FALSE,
  servicio_origen_id UUID REFERENCES servicios_historicos(id),
  notas           TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES usuarios(id),
  updated_by      UUID REFERENCES usuarios(id)
);

-- Insumos de servicios históricos
CREATE TABLE historico_insumos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_historico_id UUID NOT NULL REFERENCES servicios_historicos(id) ON DELETE CASCADE,
  categoria_id          UUID REFERENCES categorias_insumo(id),
  tipo_sello_id         UUID REFERENCES tipos_sello(id),
  producto_almacen_id   UUID REFERENCES productos_almacen(id),
  descripcion           TEXT NOT NULL,
  medida                TEXT,
  cantidad              NUMERIC(10,2) DEFAULT 1,
  precio_unitario       NUMERIC(10,2),
  igv                   NUMERIC(10,2),
  precio_total          NUMERIC(10,2),
  salio_de_almacen      BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Mano de obra de servicios históricos
CREATE TABLE historico_mano_obra (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_historico_id UUID NOT NULL REFERENCES servicios_historicos(id) ON DELETE CASCADE,
  categoria_id          UUID REFERENCES categorias_mano_obra(id),
  trabajador_id         UUID REFERENCES trabajadores(id),
  descripcion           TEXT,
  horas_estimadas       NUMERIC(8,2),
  horas_reales          NUMERIC(8,2),
  costo_estimado        NUMERIC(10,2),
  costo_real            NUMERIC(10,2),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. CHECKLIST TÉCNICO
-- ============================================================
CREATE TABLE checklist_templates (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre   TEXT NOT NULL,           -- "Checklist estándar cilindro hidráulico"
  activo   BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_items_template (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id  UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  orden        INTEGER,
  descripcion  TEXT NOT NULL,        -- "Revisión cromado vástago"
  obligatorio  BOOLEAN DEFAULT FALSE
);

-- Insertar template base
INSERT INTO checklist_templates (id, nombre) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Checklist estándar cilindro hidráulico');

INSERT INTO checklist_items_template (template_id, orden, descripcion, obligatorio) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Inspección visual exterior', true),
  ('00000000-0000-0000-0000-000000000001', 2, 'Revisión cromado vástago', true),
  ('00000000-0000-0000-0000-000000000001', 3, 'Medición diámetro vástago', true),
  ('00000000-0000-0000-0000-000000000001', 4, 'Revisión tubo interior', true),
  ('00000000-0000-0000-0000-000000000001', 5, 'Desmontaje y limpieza', true),
  ('00000000-0000-0000-0000-000000000001', 6, 'Cambio de sellos', true),
  ('00000000-0000-0000-0000-000000000001', 7, 'Cambio de rasquetas', false),
  ('00000000-0000-0000-0000-000000000001', 8, 'Pulida de vástago', false),
  ('00000000-0000-0000-0000-000000000001', 9, 'Cromado de vástago', false),
  ('00000000-0000-0000-0000-000000000001', 10, 'Pintura anticorrosiva', false),
  ('00000000-0000-0000-0000-000000000001', 11, 'Prueba de presión', true),
  ('00000000-0000-0000-0000-000000000001', 12, 'Prueba de fugas', true),
  ('00000000-0000-0000-0000-000000000001', 13, 'Armado final', true),
  ('00000000-0000-0000-0000-000000000001', 14, 'Inspección final', true);

-- Checklist ejecutado por servicio/OC
CREATE TABLE checklist_ejecucion (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_id        UUID,                -- FK a ordenes_compra
  template_id  UUID REFERENCES checklist_templates(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES usuarios(id)
);

CREATE TABLE checklist_respuestas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ejecucion_id    UUID NOT NULL REFERENCES checklist_ejecucion(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES checklist_items_template(id),
  completado      BOOLEAN DEFAULT FALSE,
  observacion     TEXT,
  fecha_completado TIMESTAMPTZ,
  completado_por  UUID REFERENCES trabajadores(id)
);

-- ============================================================
-- 12. COTIZACIONES
-- ============================================================
CREATE TABLE cotizaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT UNIQUE NOT NULL,
  numero_raiz     INTEGER NOT NULL,
  cliente_id      UUID REFERENCES clientes(id),
  cilindro_id     UUID REFERENCES cilindros(id),
  fecha           DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  forma_pago      TEXT DEFAULT '15 DIAS UTILES',
  tiempo_entrega  TEXT DEFAULT '02 DIAS',
  moneda          TEXT DEFAULT 'USD',
  tipo_cambio     NUMERIC(8,4),
  subtotal        NUMERIC(12,2),
  igv             NUMERIC(12,2),
  total           NUMERIC(12,2),
  -- Costos internos (no visibles al cliente)
  costo_estimado_interno NUMERIC(12,2),
  margen_estimado NUMERIC(5,2),
  estado          estado_cotizacion DEFAULT 'borrador',
  notas           TEXT,
  notas_internas  TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES usuarios(id),
  updated_by      UUID REFERENCES usuarios(id)
);

CREATE TABLE cotizacion_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cotizacion_id   UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  item_numero     INTEGER,
  cantidad        NUMERIC(10,2) DEFAULT 1,
  unidad          TEXT DEFAULT 'U',
  descripcion     TEXT NOT NULL,
  precio_unitario NUMERIC(12,2),
  precio_total    NUMERIC(12,2),
  costo_interno   NUMERIC(12,2),
  margen          NUMERIC(5,2),
  producto_almacen_id UUID REFERENCES productos_almacen(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. ÓRDENES DE COMPRA (pipeline operativo completo)
-- ============================================================
CREATE TABLE ordenes_compra (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            TEXT UNIQUE NOT NULL,
  numero_raiz       INTEGER NOT NULL,
  cotizacion_id     UUID REFERENCES cotizaciones(id),
  cliente_id        UUID REFERENCES clientes(id),
  cilindro_id       UUID REFERENCES cilindros(id),
  -- Estados y tiempos operativos
  estado            estado_oc DEFAULT 'recibido',
  fecha_recepcion   DATE DEFAULT CURRENT_DATE,
  fecha_desmontaje  DATE,
  fecha_diagnostico DATE,
  fecha_inicio_reparacion DATE,
  fecha_pruebas     DATE,
  fecha_pintura     DATE,
  fecha_listo       DATE,
  fecha_entrega     DATE,
  -- Garantía
  fecha_garantia    DATE,
  -- Falla reportada por cliente
  falla_reportada   TEXT,
  diagnostico_tecnico TEXT,
  -- Costos: estimado vs real
  ingreso_cotizado  NUMERIC(12,2),
  costo_estimado    NUMERIC(12,2),
  costo_real        NUMERIC(12,2),
  -- Garantía
  es_garantia       BOOLEAN DEFAULT FALSE,
  oc_garantia_origen UUID REFERENCES ordenes_compra(id),
  -- Técnico responsable
  tecnico_responsable_id UUID REFERENCES trabajadores(id),
  notas             TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES usuarios(id),
  updated_by        UUID REFERENCES usuarios(id)
);

-- FK diferida movimientos → OC
ALTER TABLE movimientos_almacen
  ADD CONSTRAINT fk_movimiento_oc
  FOREIGN KEY (oc_id) REFERENCES ordenes_compra(id);

-- FK diferida checklist → OC
ALTER TABLE checklist_ejecucion
  ADD CONSTRAINT fk_checklist_oc
  FOREIGN KEY (oc_id) REFERENCES ordenes_compra(id);

-- ============================================================
-- 14. FOTOS DE SERVICIO (Supabase Storage)
-- ============================================================
CREATE TABLE fotos_servicio (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_id       UUID REFERENCES ordenes_compra(id),
  servicio_historico_id UUID REFERENCES servicios_historicos(id),
  etapa       TEXT NOT NULL CHECK (etapa IN ('antes','durante','despues','diagnostico')),
  storage_path TEXT NOT NULL,   -- path en Supabase Storage
  nombre_archivo TEXT,
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 15. GASTOS POR OC
-- ============================================================
CREATE TABLE gastos_oc (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_id               UUID NOT NULL REFERENCES ordenes_compra(id),
  tipo                TEXT NOT NULL CHECK (tipo IN ('compra_externa','salida_almacen','gasto_operativo')),
  descripcion         TEXT NOT NULL,
  monto               NUMERIC(12,2) NOT NULL,
  origen_pago         origen_pago,
  tiene_comprobante   tipo_comprobante DEFAULT 'sin_comprobante',
  -- Datos de factura/boleta
  proveedor_ruc       TEXT,
  proveedor_razon     TEXT,
  numero_comprobante  TEXT,
  base_imponible      NUMERIC(12,2),
  igv_monto           NUMERIC(12,2),
  -- Salida de almacén
  producto_almacen_id UUID REFERENCES productos_almacen(id),
  cantidad_almacen    NUMERIC(10,2),
  -- Meta
  fecha               DATE DEFAULT CURRENT_DATE,
  activo              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES usuarios(id),
  updated_by          UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 16. HORAS-HOMBRE
-- ============================================================
CREATE TABLE partes_semanales (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semana_inicio DATE NOT NULL UNIQUE,
  semana_fin    DATE NOT NULL,
  cerrado       BOOLEAN DEFAULT FALSE,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES usuarios(id)
);

CREATE TABLE horas_semana_detalle (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parte_id        UUID NOT NULL REFERENCES partes_semanales(id) ON DELETE CASCADE,
  trabajador_id   UUID NOT NULL REFERENCES trabajadores(id),
  dia             DATE NOT NULL,
  horas           NUMERIC(4,2) DEFAULT 0,
  tipo_asignacion tipo_asignacion_hora NOT NULL,
  oc_id           UUID REFERENCES ordenes_compra(id),
  codigo_admin    TEXT,
  costo_calculado NUMERIC(10,2),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES usuarios(id)
);

-- Trigger: descuento automático de vacaciones
CREATE OR REPLACE FUNCTION descontar_vacaciones()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_asignacion = 'vacaciones' THEN
    UPDATE trabajadores
    SET dias_vacaciones_disponibles = dias_vacaciones_disponibles - 1,
        updated_at = NOW()
    WHERE id = NEW.trabajador_id
      AND dias_vacaciones_disponibles > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vacaciones
  AFTER INSERT ON horas_semana_detalle
  FOR EACH ROW EXECUTE FUNCTION descontar_vacaciones();

-- Trigger: calcular costo de hora automáticamente
CREATE OR REPLACE FUNCTION calcular_costo_hora()
RETURNS TRIGGER AS $$
DECLARE v_sueldo NUMERIC;
BEGIN
  SELECT sueldo_semanal INTO v_sueldo FROM trabajadores WHERE id = NEW.trabajador_id;
  NEW.costo_calculado := ROUND((v_sueldo / 48.0) * NEW.horas, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_costo_hora
  BEFORE INSERT OR UPDATE ON horas_semana_detalle
  FOR EACH ROW EXECUTE FUNCTION calcular_costo_hora();

-- ============================================================
-- 17. FACTURAS EMITIDAS
-- ============================================================
CREATE TABLE facturas_emitidas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            TEXT UNIQUE NOT NULL,
  numero_raiz       INTEGER NOT NULL,
  oc_id             UUID REFERENCES ordenes_compra(id),
  cliente_id        UUID REFERENCES clientes(id),
  fecha_emision     DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  subtotal          NUMERIC(12,2),
  igv               NUMERIC(12,2),
  total             NUMERIC(12,2),
  moneda            TEXT DEFAULT 'USD',
  tipo_cambio       NUMERIC(8,4),
  estado_pago       TEXT DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente','pagado','anulado')),
  fecha_pago        DATE,
  metodo_pago       TEXT,
  notas             TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 18. GASTOS FIJOS MENSUALES
-- ============================================================
CREATE TABLE categorias_gasto_fijo (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categorias_gasto_fijo (nombre) VALUES
  ('Luz'),('Agua'),('Alquiler'),('Internet'),('SCTR'),
  ('Membresía Claude'),('Agua personal'),('Otros gastos administrativos');

CREATE TABLE gastos_fijos_mensuales (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id        UUID NOT NULL REFERENCES categorias_gasto_fijo(id),
  mes                 INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  año                 INTEGER NOT NULL,
  monto               NUMERIC(12,2) NOT NULL,
  tiene_comprobante   tipo_comprobante DEFAULT 'sin_comprobante',
  proveedor_ruc       TEXT,
  proveedor_razon     TEXT,
  numero_comprobante  TEXT,
  base_imponible      NUMERIC(12,2),
  igv_monto           NUMERIC(12,2),
  origen_pago         origen_pago,
  notas               TEXT,
  activo              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES usuarios(id),
  UNIQUE(categoria_id, mes, año)
);

-- ============================================================
-- 19. DEUDAS / OBLIGACIONES
-- ============================================================
CREATE TABLE deudas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descripcion     TEXT NOT NULL,
  acreedor        TEXT,
  monto_total     NUMERIC(12,2),
  monto_pagado    NUMERIC(12,2) DEFAULT 0,
  cuota_mensual   NUMERIC(12,2),
  dia_vencimiento INTEGER,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES usuarios(id)
);

-- ============================================================
-- 20. SECUENCIA DE NUMERACIÓN
-- ============================================================
CREATE SEQUENCE seq_numero_servicio START 1;

CREATE OR REPLACE FUNCTION siguiente_numero()
RETURNS INTEGER AS $$
  SELECT nextval('seq_numero_servicio')::INTEGER;
$$ LANGUAGE SQL;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_oc_cliente ON ordenes_compra(cliente_id);
CREATE INDEX idx_oc_estado ON ordenes_compra(estado);
CREATE INDEX idx_oc_cilindro ON ordenes_compra(cilindro_id);
CREATE INDEX idx_gastos_oc ON gastos_oc(oc_id);
CREATE INDEX idx_horas_oc ON horas_semana_detalle(oc_id);
CREATE INDEX idx_horas_trabajador ON horas_semana_detalle(trabajador_id);
CREATE INDEX idx_cotizacion_cliente ON cotizaciones(cliente_id);
CREATE INDEX idx_historico_cliente ON servicios_historicos(cliente_id);
CREATE INDEX idx_historico_cilindro ON servicios_historicos(cilindro_id);
CREATE INDEX idx_movimientos_producto ON movimientos_almacen(producto_id);
CREATE INDEX idx_facturas_estado ON facturas_emitidas(estado_pago);
CREATE INDEX idx_sello_medidas ON tipos_sello(diametro_interno, diametro_externo, grosor);
CREATE INDEX idx_producto_almacen_sello ON productos_almacen(tipo_sello_id);
CREATE INDEX idx_fotos_oc ON fotos_servicio(oc_id);

-- ============================================================
-- VISTAS
-- ============================================================

-- Rentabilidad por OC
CREATE VIEW v_rentabilidad_oc AS
SELECT
  oc.id, oc.numero, oc.estado,
  cl.razon_social AS cliente,
  ci.nombre AS cilindro,
  oc.fecha_recepcion,
  oc.ingreso_cotizado,
  COALESCE(SUM(g.monto), 0) AS total_gastos_directos,
  COALESCE(SUM(h.costo_calculado), 0) AS total_costo_horas,
  oc.ingreso_cotizado
    - COALESCE(SUM(g.monto), 0)
    - COALESCE(SUM(h.costo_calculado), 0) AS margen_bruto,
  CASE
    WHEN oc.ingreso_cotizado > 0 THEN
      ROUND(((oc.ingreso_cotizado
        - COALESCE(SUM(g.monto), 0)
        - COALESCE(SUM(h.costo_calculado), 0))
        / oc.ingreso_cotizado) * 100, 2)
    ELSE 0
  END AS margen_pct,
  -- Tiempos operativos
  oc.fecha_entrega - oc.fecha_recepcion AS dias_totales
FROM ordenes_compra oc
LEFT JOIN clientes cl ON cl.id = oc.cliente_id
LEFT JOIN cilindros ci ON ci.id = oc.cilindro_id
LEFT JOIN gastos_oc g ON g.oc_id = oc.id AND g.activo = TRUE
LEFT JOIN horas_semana_detalle h ON h.oc_id = oc.id
GROUP BY oc.id, cl.razon_social, ci.nombre;

-- Stock bajo mínimo
CREATE VIEW v_stock_bajo AS
SELECT p.id, c.nombre AS categoria, p.nombre, p.medida,
  p.stock_actual, p.stock_minimo,
  p.stock_actual - p.stock_minimo AS diferencia
FROM productos_almacen p
JOIN categorias_insumo c ON c.id = p.categoria_id
WHERE p.stock_actual <= p.stock_minimo AND p.activo = TRUE;

-- Reporte contador (gastos con comprobante)
CREATE VIEW v_reporte_contador AS
SELECT
  g.fecha, g.descripcion, g.proveedor_ruc AS ruc,
  g.proveedor_razon AS proveedor, g.numero_comprobante,
  g.tiene_comprobante::TEXT AS tipo,
  g.base_imponible, g.igv_monto AS igv, g.monto AS total,
  oc.numero AS oc_asociada, 'gasto_oc' AS origen
FROM gastos_oc g
JOIN ordenes_compra oc ON oc.id = g.oc_id
WHERE g.tiene_comprobante IN ('factura','boleta') AND g.activo = TRUE
UNION ALL
SELECT
  gf.created_at::DATE, cat.nombre, gf.proveedor_ruc,
  gf.proveedor_razon, gf.numero_comprobante,
  gf.tiene_comprobante::TEXT,
  gf.base_imponible, gf.igv_monto, gf.monto,
  NULL, 'gasto_fijo'
FROM gastos_fijos_mensuales gf
JOIN categorias_gasto_fijo cat ON cat.id = gf.categoria_id
WHERE gf.tiene_comprobante IN ('factura','boleta') AND gf.activo = TRUE;

-- Base de conocimiento: sugerencias por cilindro
CREATE VIEW v_base_conocimiento AS
SELECT
  ci.id AS cilindro_id, ci.nombre AS cilindro,
  ci.marca, ci.modelo,
  COUNT(DISTINCT sh.id) AS total_servicios,
  AVG(sh.costo_real) AS costo_promedio,
  AVG(sh.horas_reales) AS horas_promedio,
  MAX(sh.fecha_servicio) AS ultimo_servicio,
  MODE() WITHIN GROUP (ORDER BY sh.falla_reportada) AS falla_mas_frecuente
FROM cilindros ci
LEFT JOIN servicios_historicos sh ON sh.cilindro_id = ci.id AND sh.activo = TRUE
GROUP BY ci.id, ci.nombre, ci.marca, ci.modelo;

-- ============================================================
-- RLS — Row Level Security por rol
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'usuarios','trabajadores','clientes','cilindros','cliente_cilindros',
    'tipos_sello','categorias_insumo','categorias_mano_obra',
    'productos_almacen','movimientos_almacen','servicios_historicos',
    'historico_insumos','historico_mano_obra','checklist_templates',
    'checklist_items_template','checklist_ejecucion','checklist_respuestas',
    'cotizaciones','cotizacion_items','ordenes_compra','fotos_servicio',
    'gastos_oc','partes_semanales','horas_semana_detalle','facturas_emitidas',
    'categorias_gasto_fijo','gastos_fijos_mensuales','deudas'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Lectura: todos los autenticados
    EXECUTE format('CREATE POLICY "select_auth" ON %I FOR SELECT USING (auth.role() = ''authenticated'')', t);
    -- Escritura: todos los autenticados (control de rol en la app)
    EXECUTE format('CREATE POLICY "insert_auth" ON %I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', t);
    EXECUTE format('CREATE POLICY "update_auth" ON %I FOR UPDATE USING (auth.role() = ''authenticated'')', t);
    EXECUTE format('CREATE POLICY "delete_auth" ON %I FOR DELETE USING (auth.role() = ''authenticated'')', t);
  END LOOP;
END $$;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- ============================================================
-- Supabase Storage bucket para fotos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-servicio', 'fotos-servicio', false)
ON CONFLICT DO NOTHING;

-- Política de storage: usuarios autenticados pueden subir y ver
CREATE POLICY "storage_auth_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-servicio' AND auth.role() = 'authenticated');
CREATE POLICY "storage_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos-servicio' AND auth.role() = 'authenticated');
CREATE POLICY "storage_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'fotos-servicio' AND auth.role() = 'authenticated');

-- ============================================================
-- FIN — Schema v2 PROHIDRAUT ERP Industrial
-- 28 tablas | 4 vistas | 3 triggers | Storage configurado
-- ============================================================
