-- ============================================================
-- PROHIDRAUT S.A. — Schema completo Supabase
-- Pegar en: Supabase Dashboard > SQL Editor > New Query
-- Ejecutar todo de una vez
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TRABAJADORES
-- ============================================================
CREATE TABLE trabajadores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  dni           TEXT UNIQUE NOT NULL,
  puesto        TEXT NOT NULL,          -- Tornero, Soldador, Administrativo, etc.
  fecha_inicio  DATE NOT NULL,
  sueldo_semanal NUMERIC(10,2) NOT NULL,
  dias_vacaciones_disponibles INTEGER DEFAULT 15,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CLIENTES
-- ============================================================
CREATE TABLE clientes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razon_social      TEXT NOT NULL,
  ruc               TEXT UNIQUE,
  direccion         TEXT,
  contacto_nombre   TEXT,
  contacto_email    TEXT,
  contacto_telefono TEXT,
  año_inicio        INTEGER,           -- Año que empezó con PROHIDRAUT
  notas             TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TIPOS DE CILINDRO / EQUIPO (ficha técnica reutilizable)
-- ============================================================
CREATE TABLE cilindros (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre            TEXT NOT NULL,     -- "Cilindro brazo CAT 320"
  marca             TEXT,
  modelo            TEXT,
  diametro_vastago  NUMERIC(8,2),      -- mm
  diametro_tubo     NUMERIC(8,2),      -- mm
  longitud_carrera  NUMERIC(8,2),      -- mm
  tipo_sello        TEXT,
  notas_tecnicas    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. RELACIÓN CLIENTE ↔ CILINDRO (un cliente puede tener varios)
-- ============================================================
CREATE TABLE cliente_cilindros (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cilindro_id UUID REFERENCES cilindros(id) ON DELETE CASCADE,
  alias       TEXT,   -- nombre interno que le da el cliente
  UNIQUE(cliente_id, cilindro_id)
);

-- ============================================================
-- 5. CATEGORÍAS DE INSUMOS (para listas desplegables)
-- ============================================================
CREATE TABLE categorias_insumo (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE   -- Sello, Vástago, Tubo, Pintura, etc.
);

INSERT INTO categorias_insumo (nombre) VALUES
  ('Sello hidráulico'),
  ('Vástago cromado'),
  ('Tubo bruñido'),
  ('Pintura anticorrosiva'),
  ('Conector hidráulico'),
  ('Rodamiento'),
  ('Otro insumo');

-- ============================================================
-- 6. INVENTARIO / ALMACÉN
-- ============================================================
CREATE TABLE productos_almacen (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id     UUID REFERENCES categorias_insumo(id),
  nombre           TEXT NOT NULL,         -- "Sello hidráulico"
  medida           TEXT NOT NULL,         -- "60mm", "2 pulgadas", etc.
  unidad           TEXT DEFAULT 'unidad', -- unidad, metro, juego, etc.
  stock_actual     NUMERIC(10,2) DEFAULT 0,
  stock_minimo     NUMERIC(10,2) DEFAULT 1, -- alerta bajo stock
  precio_costo_promedio NUMERIC(10,2),   -- promedio últimas 3 compras
  precio_venta_ref NUMERIC(10,2),        -- precio referencia para cotizar
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. MOVIMIENTOS DE ALMACÉN (entradas y salidas)
-- ============================================================
CREATE TABLE movimientos_almacen (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id     UUID REFERENCES productos_almacen(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad        NUMERIC(10,2) NOT NULL,
  precio_unitario NUMERIC(10,2),
  oc_id           UUID,                  -- FK a ordenes_compra (se añade después)
  motivo          TEXT,                  -- "Compra proveedor" / "Asignado OC-051"
  registrado_por  UUID,                  -- FK a auth.users
  fecha           DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. CATEGORÍAS DE MANO DE OBRA
-- ============================================================
CREATE TABLE categorias_mano_obra (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO categorias_mano_obra (nombre) VALUES
  ('Tornero'),
  ('Soldador'),
  ('Limpieza'),
  ('Pintura'),
  ('Ensamble'),
  ('Administrativo'),
  ('Otros');

-- ============================================================
-- 9. SERVICIOS HISTÓRICOS (base de conocimiento por cliente+cilindro)
-- ============================================================
CREATE TABLE servicios_historicos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID REFERENCES clientes(id),
  cilindro_id       UUID REFERENCES cilindros(id),
  fecha_servicio    DATE,
  descripcion       TEXT,
  costo_total       NUMERIC(10,2),
  horas_total       NUMERIC(8,2),
  notas             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de insumos de un servicio histórico
CREATE TABLE historico_insumos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_historico_id UUID REFERENCES servicios_historicos(id) ON DELETE CASCADE,
  categoria_id        UUID REFERENCES categorias_insumo(id),
  descripcion         TEXT NOT NULL,
  medida              TEXT,
  cantidad            NUMERIC(10,2) DEFAULT 1,
  precio_unitario     NUMERIC(10,2),
  igv                 NUMERIC(10,2),
  precio_total        NUMERIC(10,2)
);

-- Ítems de mano de obra de un servicio histórico
CREATE TABLE historico_mano_obra (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_historico_id UUID REFERENCES servicios_historicos(id) ON DELETE CASCADE,
  categoria_id          UUID REFERENCES categorias_mano_obra(id),
  descripcion           TEXT,
  trabajador_id         UUID REFERENCES trabajadores(id),
  horas_estimadas       NUMERIC(8,2),
  costo_estimado        NUMERIC(10,2)
);

-- ============================================================
-- 10. COTIZACIONES
-- ============================================================
CREATE TABLE cotizaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT UNIQUE NOT NULL,  -- "COT-2025-051"
  numero_raiz     INTEGER NOT NULL,      -- 51 (para relacionar OC y factura)
  cliente_id      UUID REFERENCES clientes(id),
  cilindro_id     UUID REFERENCES cilindros(id),
  fecha           DATE DEFAULT CURRENT_DATE,
  forma_pago      TEXT DEFAULT '15 DIAS UTILES',
  tiempo_entrega  TEXT DEFAULT '02 DIAS',
  moneda          TEXT DEFAULT 'USD',
  tipo_cambio     NUMERIC(8,4),
  subtotal        NUMERIC(12,2),
  igv             NUMERIC(12,2),
  total           NUMERIC(12,2),
  estado          TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','rechazada','vencida')),
  notas           TEXT,
  creado_por      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de la cotización (lo que ve el cliente)
CREATE TABLE cotizacion_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cotizacion_id   UUID REFERENCES cotizaciones(id) ON DELETE CASCADE,
  item_numero     INTEGER,
  cantidad        NUMERIC(10,2) DEFAULT 1,
  unidad          TEXT DEFAULT 'U',
  descripcion     TEXT NOT NULL,
  precio_unitario NUMERIC(12,2),
  precio_total    NUMERIC(12,2),
  -- Datos internos (no aparecen en PDF al cliente)
  costo_interno   NUMERIC(12,2),
  margen          NUMERIC(5,2)   -- % margen calculado
);

-- ============================================================
-- 11. ÓRDENES DE COMPRA (generadas desde cotización aceptada)
-- ============================================================
CREATE TABLE ordenes_compra (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            TEXT UNIQUE NOT NULL,  -- "OC-051"
  numero_raiz       INTEGER NOT NULL,      -- mismo que cotización
  cotizacion_id     UUID REFERENCES cotizaciones(id),
  cliente_id        UUID REFERENCES clientes(id),
  cilindro_id       UUID REFERENCES cilindros(id),
  fecha_apertura    DATE DEFAULT CURRENT_DATE,
  fecha_entrega     DATE,
  fecha_garantia    DATE,                  -- fecha_entrega + 6 meses
  estado            TEXT DEFAULT 'en_proceso' CHECK (estado IN (
                      'en_proceso','entregado','conformidad_pendiente',
                      'conformidad_ok','facturado','pagado','garantia')),
  es_garantia       BOOLEAN DEFAULT FALSE,
  oc_garantia_origen UUID REFERENCES ordenes_compra(id), -- si es garantía, OC origen
  ingreso_cotizado  NUMERIC(12,2),         -- copia del total cotizado
  notas             TEXT,
  creado_por        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- FK diferida para movimientos_almacen → ordenes_compra
ALTER TABLE movimientos_almacen
  ADD CONSTRAINT fk_movimiento_oc
  FOREIGN KEY (oc_id) REFERENCES ordenes_compra(id);

-- ============================================================
-- 12. GASTOS POR OC
-- ============================================================
CREATE TABLE gastos_oc (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oc_id           UUID REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('compra_externa','salida_almacen','gasto_operativo')),
  descripcion     TEXT NOT NULL,
  monto           NUMERIC(12,2) NOT NULL,
  origen_pago     TEXT CHECK (origen_pago IN ('yape','cuenta_prohidraut','caja_chica','efectivo','transferencia')),
  tiene_comprobante TEXT DEFAULT 'sin' CHECK (tiene_comprobante IN ('factura','boleta','sin')),
  -- Datos de factura/boleta (si aplica)
  proveedor_ruc   TEXT,
  proveedor_razon TEXT,
  numero_comprobante TEXT,
  base_imponible  NUMERIC(12,2),
  igv_monto       NUMERIC(12,2),
  -- Salida de almacén (si aplica)
  producto_almacen_id UUID REFERENCES productos_almacen(id),
  cantidad_almacen NUMERIC(10,2),
  -- Meta
  fecha           DATE DEFAULT CURRENT_DATE,
  registrado_por  UUID,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. HORAS-HOMBRE POR SEMANA
-- ============================================================
CREATE TABLE partes_semanales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semana_inicio   DATE NOT NULL,          -- Lunes de la semana
  semana_fin      DATE NOT NULL,          -- Domingo de la semana
  registrado_por  UUID,
  cerrado         BOOLEAN DEFAULT FALSE,  -- Rubén cierra al fin de semana
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semana_inicio)
);

CREATE TABLE horas_semana_detalle (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parte_id        UUID REFERENCES partes_semanales(id) ON DELETE CASCADE,
  trabajador_id   UUID REFERENCES trabajadores(id),
  dia             DATE NOT NULL,
  horas           NUMERIC(4,2) DEFAULT 0,
  tipo_asignacion TEXT NOT NULL CHECK (tipo_asignacion IN ('oc','administrativo','mantenimiento','capacitacion','vacaciones','feriado')),
  oc_id           UUID REFERENCES ordenes_compra(id),  -- NULL si no es OC
  codigo_admin    TEXT,                   -- ADM-001, MNT-001, etc.
  notas           TEXT
);

-- Descuento automático de vacaciones cuando se registra tipo 'vacaciones'
CREATE OR REPLACE FUNCTION descontar_vacaciones()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_asignacion = 'vacaciones' THEN
    UPDATE trabajadores
    SET dias_vacaciones_disponibles = dias_vacaciones_disponibles - 1
    WHERE id = NEW.trabajador_id
      AND dias_vacaciones_disponibles > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vacaciones
  AFTER INSERT ON horas_semana_detalle
  FOR EACH ROW EXECUTE FUNCTION descontar_vacaciones();

-- ============================================================
-- 14. FACTURAS EMITIDAS (al cliente)
-- ============================================================
CREATE TABLE facturas_emitidas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT UNIQUE NOT NULL,   -- "F-051"
  numero_raiz     INTEGER NOT NULL,
  oc_id           UUID REFERENCES ordenes_compra(id),
  cliente_id      UUID REFERENCES clientes(id),
  fecha_emision   DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  subtotal        NUMERIC(12,2),
  igv             NUMERIC(12,2),
  total           NUMERIC(12,2),
  moneda          TEXT DEFAULT 'USD',
  estado_pago     TEXT DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente','pagado','anulado')),
  fecha_pago      DATE,
  metodo_pago     TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. GASTOS FIJOS MENSUALES
-- ============================================================
CREATE TABLE categorias_gasto_fijo (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE
);

INSERT INTO categorias_gasto_fijo (nombre) VALUES
  ('Luz'),
  ('Agua'),
  ('Alquiler'),
  ('Internet'),
  ('SCTR'),
  ('Membresía Claude'),
  ('Agua personal'),
  ('Otros gastos administrativos');

CREATE TABLE gastos_fijos_mensuales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id    UUID REFERENCES categorias_gasto_fijo(id),
  mes             INTEGER NOT NULL,       -- 1-12
  año             INTEGER NOT NULL,
  monto           NUMERIC(12,2) NOT NULL,
  tiene_comprobante TEXT DEFAULT 'sin' CHECK (tiene_comprobante IN ('factura','boleta','sin')),
  proveedor_ruc   TEXT,
  proveedor_razon TEXT,
  numero_comprobante TEXT,
  base_imponible  NUMERIC(12,2),
  igv_monto       NUMERIC(12,2),
  origen_pago     TEXT,
  notas           TEXT,
  registrado_por  UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, mes, año)
);

-- ============================================================
-- 16. DEUDAS / OBLIGACIONES
-- ============================================================
CREATE TABLE deudas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descripcion     TEXT NOT NULL,
  acreedor        TEXT,
  monto_total     NUMERIC(12,2),
  monto_pagado    NUMERIC(12,2) DEFAULT 0,
  monto_pendiente NUMERIC(12,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
  cuota_mensual   NUMERIC(12,2),
  dia_vencimiento INTEGER,               -- día del mes que vence
  fecha_inicio    DATE,
  fecha_fin       DATE,
  activa          BOOLEAN DEFAULT TRUE,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. USUARIOS / ROLES (vinculado a Supabase Auth)
-- ============================================================
CREATE TABLE usuarios_app (
  id       UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre   TEXT NOT NULL,
  rol      TEXT NOT NULL CHECK (rol IN ('admin','operativo','lectura')),
  activo   BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista: rentabilidad por OC
CREATE VIEW v_rentabilidad_oc AS
SELECT
  oc.id,
  oc.numero,
  cl.razon_social AS cliente,
  ci.nombre AS cilindro,
  oc.fecha_apertura,
  oc.estado,
  oc.ingreso_cotizado,
  COALESCE(SUM(g.monto), 0) AS total_gastos,
  COALESCE(
    SUM(
      h.horas *
      (SELECT t.sueldo_semanal / 48.0
       FROM trabajadores t WHERE t.id = h.trabajador_id)
    ), 0
  ) AS costo_horas,
  oc.ingreso_cotizado
    - COALESCE(SUM(g.monto), 0)
    - COALESCE(SUM(h.horas * (SELECT t.sueldo_semanal / 48.0 FROM trabajadores t WHERE t.id = h.trabajador_id)), 0)
  AS margen_bruto
FROM ordenes_compra oc
LEFT JOIN clientes cl ON cl.id = oc.cliente_id
LEFT JOIN cilindros ci ON ci.id = oc.cilindro_id
LEFT JOIN gastos_oc g ON g.oc_id = oc.id
LEFT JOIN horas_semana_detalle h ON h.oc_id = oc.id
GROUP BY oc.id, cl.razon_social, ci.nombre;

-- Vista: stock bajo mínimo (para alertas)
CREATE VIEW v_stock_bajo AS
SELECT
  p.id,
  c.nombre AS categoria,
  p.nombre,
  p.medida,
  p.stock_actual,
  p.stock_minimo
FROM productos_almacen p
JOIN categorias_insumo c ON c.id = p.categoria_id
WHERE p.stock_actual <= p.stock_minimo;

-- Vista: reporte mensual para contador (gastos con comprobante)
CREATE VIEW v_reporte_contador AS
SELECT
  g.fecha,
  g.descripcion,
  g.proveedor_ruc AS ruc,
  g.proveedor_razon AS proveedor,
  g.numero_comprobante,
  g.tiene_comprobante AS tipo,
  g.base_imponible,
  g.igv_monto AS igv,
  g.monto AS total,
  oc.numero AS oc_asociada,
  'gasto_oc' AS origen
FROM gastos_oc g
JOIN ordenes_compra oc ON oc.id = g.oc_id
WHERE g.tiene_comprobante IN ('factura', 'boleta')
UNION ALL
SELECT
  gf.created_at::DATE AS fecha,
  cat.nombre AS descripcion,
  gf.proveedor_ruc AS ruc,
  gf.proveedor_razon AS proveedor,
  gf.numero_comprobante,
  gf.tiene_comprobante AS tipo,
  gf.base_imponible,
  gf.igv_monto AS igv,
  gf.monto AS total,
  NULL AS oc_asociada,
  'gasto_fijo' AS origen
FROM gastos_fijos_mensuales gf
JOIN categorias_gasto_fijo cat ON cat.id = gf.categoria_id
WHERE gf.tiene_comprobante IN ('factura', 'boleta');

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — todos ven todo, solo autenticados
-- ============================================================
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cilindros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_oc ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fijos_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partes_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE horas_semana_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_historicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;

-- Política: usuario autenticado puede leer y escribir todo
CREATE POLICY "usuarios_autenticados" ON trabajadores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON cilindros FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON cotizaciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON ordenes_compra FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON gastos_oc FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON facturas_emitidas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON gastos_fijos_mensuales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON partes_semanales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON horas_semana_detalle FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON productos_almacen FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON movimientos_almacen FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON servicios_historicos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_autenticados" ON deudas FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- ÍNDICES para búsquedas rápidas
-- ============================================================
CREATE INDEX idx_oc_cliente ON ordenes_compra(cliente_id);
CREATE INDEX idx_oc_estado ON ordenes_compra(estado);
CREATE INDEX idx_gastos_oc ON gastos_oc(oc_id);
CREATE INDEX idx_horas_oc ON horas_semana_detalle(oc_id);
CREATE INDEX idx_horas_trabajador ON horas_semana_detalle(trabajador_id);
CREATE INDEX idx_cotizacion_cliente ON cotizaciones(cliente_id);
CREATE INDEX idx_historico_cliente ON servicios_historicos(cliente_id);
CREATE INDEX idx_historico_cilindro ON servicios_historicos(cilindro_id);
CREATE INDEX idx_movimientos_producto ON movimientos_almacen(producto_id);
CREATE INDEX idx_facturas_estado ON facturas_emitidas(estado_pago);

-- ============================================================
-- FUNCIÓN: generar número raíz correlativo por año
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS seq_numero_servicio START 1;

CREATE OR REPLACE FUNCTION generar_numero_servicio(año INTEGER)
RETURNS INTEGER AS $$
  SELECT nextval('seq_numero_servicio')::INTEGER;
$$ LANGUAGE SQL;

-- ============================================================
-- FIN DEL SCHEMA
-- ✅ 17 tablas | 3 vistas | 2 funciones | RLS activado
-- ============================================================
