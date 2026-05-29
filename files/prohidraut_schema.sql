-- ============================================================
-- PROHIDRAUT S.A. — Schema completo Supabase
-- ============================================================

-- ============================================================
-- 1. USUARIOS Y ROLES
-- ============================================================
create table public.perfiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text not null check (rol in ('admin', 'operativo', 'lectura')),
  activo boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. TRABAJADORES (personal del taller)
-- ============================================================
create table public.trabajadores (
  id serial primary key,
  nombre text not null,
  dni text unique not null,
  puesto text not null,
  fecha_inicio date not null,
  sueldo_semanal numeric(10,2) not null,
  dias_vacaciones_disponibles numeric(5,1) default 30,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 3. CLIENTES
-- ============================================================
create table public.clientes (
  id serial primary key,
  razon_social text not null,
  ruc text unique,
  direccion text,
  contacto_nombre text,
  contacto_email text,
  contacto_telefono text,
  año_inicio integer,
  notas text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 4. EQUIPOS / CILINDROS (ficha técnica independiente del cliente)
-- ============================================================
create table public.equipos (
  id serial primary key,
  nombre text not null,           -- ej. "Cilindro hidráulico CAT 320"
  marca text,
  modelo text,
  tipo text,                      -- cilindro, bomba, válvula, otro
  diametro_vastago_mm numeric(8,2),
  diametro_tubo_mm numeric(8,2),
  longitud_mm numeric(8,2),
  tipo_sello text,
  notas_tecnicas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- relación equipo ↔ cliente (un equipo puede pertenecer a varios clientes)
create table public.cliente_equipos (
  id serial primary key,
  cliente_id integer references public.clientes(id) on delete cascade,
  equipo_id integer references public.equipos(id) on delete cascade,
  codigo_interno text,            -- código que le asigna PROHIDRAUT
  unique(cliente_id, equipo_id)
);

-- ============================================================
-- 5. CATEGORÍAS DE INSUMOS Y MANO DE OBRA (listas desplegables)
-- ============================================================
create table public.categorias_insumo (
  id serial primary key,
  nombre text not null unique,    -- sello, vástago, tubo, barra, pintura, etc.
  unidad text default 'u'
);

create table public.categorias_mano_obra (
  id serial primary key,
  nombre text not null unique     -- tornero, limpieza, pintura, administrativo, etc.
);

-- seed categorías insumo
insert into public.categorias_insumo (nombre, unidad) values
  ('Sello hidráulico', 'u'),
  ('Vástago', 'u'),
  ('Tubo bruñido', 'm'),
  ('Barra cromada', 'm'),
  ('Pintura anticorrosiva', 'lt'),
  ('Conector hidráulico', 'u'),
  ('Válvula', 'u'),
  ('Otro insumo', 'u');

-- seed categorías mano de obra
insert into public.categorias_mano_obra (nombre) values
  ('Tornero'),
  ('Limpieza'),
  ('Pintura'),
  ('Ensamble / Desensamble'),
  ('Rectificado'),
  ('Administrativo'),
  ('Transporte / Flete'),
  ('Otro');

-- ============================================================
-- 6. INVENTARIO (productos en stock)
-- ============================================================
create table public.productos (
  id serial primary key,
  categoria_id integer references public.categorias_insumo(id),
  descripcion text not null,      -- ej. "Sello hidráulico 50mm"
  medida text,                    -- ej. "50mm", "2 pulgadas"
  unidad text default 'u',
  stock_actual numeric(10,2) default 0,
  stock_minimo numeric(10,2) default 0,   -- para alerta de stock bajo
  precio_costo_promedio numeric(10,2),    -- promedio últimas 3 compras
  precio_referencia_venta numeric(10,2),  -- precio sugerido al cotizar
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.movimientos_inventario (
  id serial primary key,
  producto_id integer references public.productos(id),
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad numeric(10,2) not null,
  precio_unitario numeric(10,2),
  precio_sin_igv numeric(10,2),
  igv numeric(10,2),
  referencia text,                -- nro de OC o "compra directa"
  oc_id integer,                  -- se llena con FK tras crear tabla OC
  proveedor text,
  nro_comprobante text,
  ruc_proveedor text,
  registrado_por uuid references public.perfiles(id),
  fecha timestamptz default now(),
  notas text
);

-- ============================================================
-- 7. SERVICIOS HISTÓRICOS (base de datos de trabajos pasados)
-- ============================================================
create table public.servicios_historicos (
  id serial primary key,
  cliente_id integer references public.clientes(id),
  equipo_id integer references public.equipos(id),
  fecha_servicio date,
  descripcion text not null,
  observaciones text,
  horas_totales numeric(6,2),
  costo_total_insumos numeric(12,2),
  costo_total_mano_obra numeric(12,2),
  costo_total numeric(12,2),
  precio_cobrado numeric(12,2),
  ingresado_por uuid references public.perfiles(id),
  created_at timestamptz default now()
);

create table public.historico_insumos (
  id serial primary key,
  servicio_id integer references public.servicios_historicos(id) on delete cascade,
  producto_id integer references public.productos(id),
  categoria_id integer references public.categorias_insumo(id),
  descripcion text not null,
  medida text,
  cantidad numeric(10,2),
  precio_unitario_sin_igv numeric(10,2),
  igv numeric(10,2),
  precio_unitario_total numeric(10,2),
  total numeric(12,2)
);

create table public.historico_mano_obra (
  id serial primary key,
  servicio_id integer references public.servicios_historicos(id) on delete cascade,
  categoria_id integer references public.categorias_mano_obra(id),
  descripcion text,
  trabajador_id integer references public.trabajadores(id),
  horas numeric(6,2),
  costo_hora numeric(10,2),
  total numeric(12,2)
);

-- ============================================================
-- 8. COTIZACIONES
-- ============================================================
create table public.cotizaciones (
  id serial primary key,
  numero text unique not null,    -- COT-2025-051
  numero_raiz text not null,      -- 051 (para linkear OC y factura)
  año integer not null,
  cliente_id integer references public.clientes(id),
  equipo_id integer references public.equipos(id),
  fecha date not null default current_date,
  contacto_atencion text,
  forma_pago text,
  tiempo_entrega text,
  moneda text default 'USD',
  tipo_cambio numeric(6,3),
  estado text default 'borrador' check (estado in ('borrador','enviada','aceptada','rechazada','vencida')),
  subtotal numeric(12,2),
  igv numeric(12,2),
  total numeric(12,2),
  notas text,
  referencia_historico_id integer references public.servicios_historicos(id),
  creado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.cotizacion_items (
  id serial primary key,
  cotizacion_id integer references public.cotizaciones(id) on delete cascade,
  tipo text not null check (tipo in ('insumo', 'mano_obra', 'otro')),
  descripcion text not null,
  cantidad numeric(10,2) default 1,
  unidad text,
  precio_unitario_cliente numeric(12,2),   -- precio que ve el cliente
  precio_unitario_costo numeric(12,2),     -- costo interno (solo admin ve)
  total_cliente numeric(12,2),
  total_costo numeric(12,2),
  margen numeric(5,2),                     -- % calculado
  orden integer
);

-- ============================================================
-- 9. ÓRDENES DE COMPRA (OC)
-- ============================================================
create table public.ordenes_compra (
  id serial primary key,
  numero text unique not null,    -- OC-2025-051
  numero_raiz text not null,      -- 051
  cotizacion_id integer references public.cotizaciones(id),
  cliente_id integer references public.clientes(id),
  equipo_id integer references public.equipos(id),
  fecha_apertura date default current_date,
  fecha_entrega date,
  fecha_garantia_vence date,      -- fecha_entrega + 6 meses
  estado text default 'en_proceso' check (estado in ('en_proceso','entregado','conformidad_pendiente','facturado','pagado','garantia')),
  ingreso_estimado numeric(12,2),
  costo_insumos numeric(12,2) default 0,
  costo_mano_obra numeric(12,2) default 0,
  costo_otros numeric(12,2) default 0,
  costo_total numeric(12,2) default 0,
  margen numeric(5,2),
  es_garantia boolean default false,
  oc_origen_garantia_id integer references public.ordenes_compra(id),
  notas text,
  creado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 10. GASTOS POR OC
-- ============================================================
create table public.gastos_oc (
  id serial primary key,
  oc_id integer references public.ordenes_compra(id) on delete cascade,
  tipo text not null check (tipo in ('insumo_comprado','salida_almacen','mano_obra','gasto_operativo')),
  descripcion text not null,
  cantidad numeric(10,2) default 1,
  precio_unitario numeric(12,2),
  monto_total numeric(12,2) not null,
  origen_pago text check (origen_pago in ('yape','cuenta_prohidraut','caja_chica','efectivo','transferencia')),
  tipo_comprobante text check (tipo_comprobante in ('factura','boleta','sin_comprobante')),
  -- datos de factura/boleta
  ruc_proveedor text,
  razon_social_proveedor text,
  nro_comprobante text,
  base_imponible numeric(12,2),
  igv numeric(12,2),
  -- si es salida de almacén
  producto_id integer references public.productos(id),
  -- si es mano de obra (referencia al parte semanal)
  parte_horas_id integer,
  registrado_por uuid references public.perfiles(id),
  fecha timestamptz default now(),
  notas text
);

-- ============================================================
-- 11. PARTE SEMANAL DE HORAS-HOMBRE
-- ============================================================
create table public.partes_semanales (
  id serial primary key,
  semana_inicio date not null,    -- lunes de la semana
  semana_fin date not null,       -- domingo de la semana
  registrado_por uuid references public.perfiles(id),
  cerrado boolean default false,
  created_at timestamptz default now(),
  unique(semana_inicio)
);

create table public.horas_trabajador (
  id serial primary key,
  parte_id integer references public.partes_semanales(id) on delete cascade,
  trabajador_id integer references public.trabajadores(id),
  -- destino de las horas
  tipo_destino text not null check (tipo_destino in ('oc','administrativo','mantenimiento','capacitacion','vacaciones','feriado','otro')),
  oc_id integer references public.ordenes_compra(id),
  codigo_destino text,            -- ADM-001, MNT-001, etc. si no hay OC
  horas numeric(5,2) not null,
  costo_calculado numeric(10,2),  -- horas × (sueldo_semanal / horas_semana)
  fecha date not null,
  notas text,
  -- si es vacaciones, se descuenta del trabajador
  descuenta_vacaciones boolean default false
);

-- FK diferida para gastos_oc.parte_horas_id
alter table public.gastos_oc
  add constraint fk_parte_horas
  foreign key (parte_horas_id) references public.horas_trabajador(id);

-- FK diferida para movimientos_inventario.oc_id
alter table public.movimientos_inventario
  add constraint fk_mov_oc
  foreign key (oc_id) references public.ordenes_compra(id);

-- ============================================================
-- 12. FACTURAS EMITIDAS
-- ============================================================
create table public.facturas (
  id serial primary key,
  numero text unique not null,    -- F-2025-051
  numero_raiz text not null,      -- 051
  oc_id integer references public.ordenes_compra(id),
  cotizacion_id integer references public.cotizaciones(id),
  cliente_id integer references public.clientes(id),
  fecha_emision date default current_date,
  fecha_vencimiento date,
  moneda text default 'USD',
  tipo_cambio numeric(6,3),
  subtotal numeric(12,2),
  igv numeric(12,2),
  total numeric(12,2),
  estado text default 'pendiente' check (estado in ('pendiente','pagada','vencida')),
  fecha_pago date,
  metodo_pago text,
  notas text,
  creado_por uuid references public.perfiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 13. GASTOS FIJOS MENSUALES
-- ============================================================
create table public.categorias_gasto_fijo (
  id serial primary key,
  nombre text not null unique,
  descripcion text
);

insert into public.categorias_gasto_fijo (nombre) values
  ('Luz'),
  ('Agua'),
  ('Alquiler'),
  ('Sueldos fijos'),
  ('SCTR'),
  ('Internet'),
  ('Claude / Software'),
  ('Agua personal'),
  ('Otros');

create table public.gastos_fijos_mes (
  id serial primary key,
  mes integer not null,           -- 1-12
  año integer not null,
  categoria_id integer references public.categorias_gasto_fijo(id),
  descripcion text,
  monto numeric(12,2) not null,
  origen_pago text,
  tipo_comprobante text,
  ruc_proveedor text,
  razon_social_proveedor text,
  nro_comprobante text,
  base_imponible numeric(12,2),
  igv numeric(12,2),
  registrado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  unique(mes, año, categoria_id)
);

-- ============================================================
-- 14. DEUDAS Y OBLIGACIONES
-- ============================================================
create table public.deudas (
  id serial primary key,
  descripcion text not null,
  acreedor text,
  monto_total numeric(12,2),
  monto_pendiente numeric(12,2),
  fecha_inicio date,
  fecha_vencimiento date,
  cuota_mensual numeric(12,2),
  activa boolean default true,
  notas text,
  created_at timestamptz default now()
);

-- ============================================================
-- 15. ÍNDICES para búsquedas rápidas
-- ============================================================
create index idx_cotizaciones_cliente on public.cotizaciones(cliente_id);
create index idx_cotizaciones_estado on public.cotizaciones(estado);
create index idx_oc_estado on public.ordenes_compra(estado);
create index idx_oc_cliente on public.ordenes_compra(cliente_id);
create index idx_gastos_oc on public.gastos_oc(oc_id);
create index idx_horas_parte on public.horas_trabajador(parte_id);
create index idx_horas_oc on public.horas_trabajador(oc_id);
create index idx_facturas_estado on public.facturas(estado);
create index idx_productos_categoria on public.productos(categoria_id);
create index idx_servicios_cliente on public.servicios_historicos(cliente_id);
create index idx_servicios_equipo on public.servicios_historicos(equipo_id);

-- ============================================================
-- 16. ROW LEVEL SECURITY (RLS) — seguridad por usuario
-- ============================================================
alter table public.perfiles enable row level security;
alter table public.trabajadores enable row level security;
alter table public.clientes enable row level security;
alter table public.equipos enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.ordenes_compra enable row level security;
alter table public.gastos_oc enable row level security;
alter table public.partes_semanales enable row level security;
alter table public.horas_trabajador enable row level security;
alter table public.facturas enable row level security;
alter table public.productos enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.gastos_fijos_mes enable row level security;
alter table public.servicios_historicos enable row level security;

-- Política: usuarios autenticados ven todo (control de rol en la app)
create policy "autenticados_ven_todo" on public.perfiles for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.trabajadores for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.clientes for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.equipos for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.cotizaciones for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.ordenes_compra for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.gastos_oc for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.partes_semanales for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.horas_trabajador for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.facturas for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.productos for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.movimientos_inventario for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.gastos_fijos_mes for all using (auth.role() = 'authenticated');
create policy "autenticados_ven_todo" on public.servicios_historicos for all using (auth.role() = 'authenticated');

-- ============================================================
-- 17. FUNCIÓN: auto-actualizar updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_trabajadores_updated before update on public.trabajadores for each row execute function public.handle_updated_at();
create trigger trg_clientes_updated before update on public.clientes for each row execute function public.handle_updated_at();
create trigger trg_equipos_updated before update on public.equipos for each row execute function public.handle_updated_at();
create trigger trg_cotizaciones_updated before update on public.cotizaciones for each row execute function public.handle_updated_at();
create trigger trg_oc_updated before update on public.ordenes_compra for each row execute function public.handle_updated_at();
create trigger trg_productos_updated before update on public.productos for each row execute function public.handle_updated_at();

-- ============================================================
-- 18. FUNCIÓN: descuento automático de stock al registrar salida
-- ============================================================
create or replace function public.handle_salida_almacen()
returns trigger as $$
begin
  if new.tipo = 'salida_almacen' and new.producto_id is not null then
    update public.productos
    set stock_actual = stock_actual - new.cantidad
    where id = new.producto_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_descuento_stock
after insert on public.gastos_oc
for each row execute function public.handle_salida_almacen();

-- ============================================================
-- 19. FUNCIÓN: descuento de vacaciones al registrar parte
-- ============================================================
create or replace function public.handle_vacaciones()
returns trigger as $$
begin
  if new.tipo_destino = 'vacaciones' and new.descuenta_vacaciones = true then
    update public.trabajadores
    set dias_vacaciones_disponibles = dias_vacaciones_disponibles - 1
    where id = new.trabajador_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_descuento_vacaciones
after insert on public.horas_trabajador
for each row execute function public.handle_vacaciones();

-- ============================================================
-- 20. FUNCIÓN: generar número correlativo de cotización
-- ============================================================
create or replace function public.siguiente_numero_cotizacion(p_año integer)
returns text as $$
declare
  v_siguiente integer;
  v_raiz text;
begin
  select coalesce(max(cast(numero_raiz as integer)), 0) + 1
  into v_siguiente
  from public.cotizaciones
  where año = p_año;

  v_raiz := lpad(v_siguiente::text, 3, '0');
  return 'COT-' || p_año || '-' || v_raiz;
end;
$$ language plpgsql;

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
