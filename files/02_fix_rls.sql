-- Arreglar políticas RLS para que los datos se muestren correctamente
-- Ejecutar en Supabase SQL Editor

-- Eliminar políticas anteriores que pueden estar bloqueando
DROP POLICY IF EXISTS "usuarios_autenticados" ON trabajadores;
DROP POLICY IF EXISTS "usuarios_autenticados" ON clientes;
DROP POLICY IF EXISTS "usuarios_autenticados" ON cilindros;
DROP POLICY IF EXISTS "usuarios_autenticados" ON cotizaciones;
DROP POLICY IF EXISTS "usuarios_autenticados" ON ordenes_compra;
DROP POLICY IF EXISTS "usuarios_autenticados" ON gastos_oc;
DROP POLICY IF EXISTS "usuarios_autenticados" ON facturas_emitidas;
DROP POLICY IF EXISTS "usuarios_autenticados" ON gastos_fijos_mensuales;
DROP POLICY IF EXISTS "usuarios_autenticados" ON partes_semanales;
DROP POLICY IF EXISTS "usuarios_autenticados" ON horas_semana_detalle;
DROP POLICY IF EXISTS "usuarios_autenticados" ON productos_almacen;
DROP POLICY IF EXISTS "usuarios_autenticados" ON movimientos_almacen;
DROP POLICY IF EXISTS "usuarios_autenticados" ON servicios_historicos;
DROP POLICY IF EXISTS "usuarios_autenticados" ON deudas;
DROP POLICY IF EXISTS "usuarios_autenticados" ON categorias_insumo;
DROP POLICY IF EXISTS "usuarios_autenticados" ON categorias_mano_obra;
DROP POLICY IF EXISTS "usuarios_autenticados" ON categorias_gasto_fijo;
DROP POLICY IF EXISTS "usuarios_autenticados" ON cliente_cilindros;
DROP POLICY IF EXISTS "usuarios_autenticados" ON historico_insumos;
DROP POLICY IF EXISTS "usuarios_autenticados" ON historico_mano_obra;
DROP POLICY IF EXISTS "usuarios_autenticados" ON cotizacion_items;

-- Recrear políticas correctas (SELECT + INSERT + UPDATE + DELETE por separado)
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'trabajadores','clientes','cilindros','cotizaciones','ordenes_compra',
    'gastos_oc','facturas_emitidas','gastos_fijos_mensuales','partes_semanales',
    'horas_semana_detalle','productos_almacen','movimientos_almacen',
    'servicios_historicos','deudas','categorias_insumo','categorias_mano_obra',
    'categorias_gasto_fijo','cliente_cilindros','historico_insumos',
    'historico_mano_obra','cotizacion_items'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "allow_auth_select" ON %I FOR SELECT USING (auth.role() = ''authenticated'')', t);
    EXECUTE format('CREATE POLICY "allow_auth_insert" ON %I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', t);
    EXECUTE format('CREATE POLICY "allow_auth_update" ON %I FOR UPDATE USING (auth.role() = ''authenticated'')', t);
    EXECUTE format('CREATE POLICY "allow_auth_delete" ON %I FOR DELETE USING (auth.role() = ''authenticated'')', t);
  END LOOP;
END $$;

-- Verificar que los datos existen
SELECT 'clientes' as tabla, COUNT(*) as registros FROM clientes
UNION ALL
SELECT 'trabajadores', COUNT(*) FROM trabajadores
UNION ALL
SELECT 'productos_almacen', COUNT(*) FROM productos_almacen
UNION ALL
SELECT 'categorias_insumo', COUNT(*) FROM categorias_insumo
UNION ALL
SELECT 'categorias_gasto_fijo', COUNT(*) FROM categorias_gasto_fijo;
