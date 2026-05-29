import { supabase } from "./supabase";

export const expedientesService = {

  // ── Categorías ─────────────────────────────────────────
  async getCategorias() {
    const { data, error } = await supabase
      .from("categorias_servicio")
      .select("*, subcategorias_servicio(*, modelos_servicio(*))")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;
    return data || [];
  },

  async createCategoria(nombre) {
    const { data, error } = await supabase
      .from("categorias_servicio")
      .insert([{ nombre }])
      .select().single();
    if (error) throw error;
    return data;
  },

  async createSubcategoria(categoria_id, nombre) {
    const { data, error } = await supabase
      .from("subcategorias_servicio")
      .insert([{ categoria_id, nombre }])
      .select().single();
    if (error) throw error;
    return data;
  },

  async createModelo(subcategoria_id, nombre, descripcion = "") {
    const { data, error } = await supabase
      .from("modelos_servicio")
      .insert([{ subcategoria_id, nombre, descripcion }])
      .select().single();
    if (error) throw error;
    return data;
  },

  // ── Expedientes ────────────────────────────────────────
  async getAll(filtros = {}) {
    let q = supabase
      .from("expedientes")
      .select(`
        id, nro_cotizacion, nro_oc, nro_factura, estado, es_historico,
        fecha_cotizacion, fecha_finalizacion, fecha_pago,
        total_cliente, costo_total_interno, margen_bruto,
        marca_equipo, descripcion_equipo, tuvo_reclamo,
        clientes(razon_social),
        categorias_servicio(nombre),
        subcategorias_servicio(nombre),
        modelos_servicio(nombre)
      `)
      .eq("activo", true)
      .order("fecha_cotizacion", { ascending: false });

    if (filtros.cliente_id) q = q.eq("cliente_id", filtros.cliente_id);
    if (filtros.estado) q = q.eq("estado", filtros.estado);
    if (filtros.categoria_id) q = q.eq("categoria_id", filtros.categoria_id);
    if (filtros.es_historico !== undefined) q = q.eq("es_historico", filtros.es_historico);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from("expedientes")
      .select(`
        *,
        clientes(*),
        categorias_servicio(nombre),
        subcategorias_servicio(nombre),
        modelos_servicio(nombre),
        expediente_items_cotizacion(*),
        expediente_sellos(*),
        expediente_tubos_barras(*),
        expediente_otros_insumos(*),
        expediente_mano_obra(*,trabajadores(nombre,sueldo_semanal)),
        expediente_gastos_reclamo(*)
      `)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async getSugerenciasParaNuevo(categoria_id, subcategoria_id, cliente_id) {
    // Busca el último expediente similar para sugerir ítems
    let q = supabase
      .from("expedientes")
      .select(`
        id, nro_cotizacion, total_cliente, fecha_finalizacion,
        expediente_items_cotizacion(*),
        expediente_sellos(*),
        expediente_tubos_barras(*),
        expediente_otros_insumos(*),
        expediente_mano_obra(*)
      `)
      .eq("activo", true)
      .eq("categoria_id", categoria_id)
      .order("fecha_cotizacion", { ascending: false })
      .limit(1);

    if (subcategoria_id) q = q.eq("subcategoria_id", subcategoria_id);

    const { data } = await q;
    return data?.[0] || null;
  },

  async getSiguienteNro() {
    const { data } = await supabase
      .from("expedientes")
      .select("nro_cotizacion")
      .not("nro_cotizacion", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data?.[0]?.nro_cotizacion) return "";
    const num = parseInt(data[0].nro_cotizacion);
    return isNaN(num) ? "" : String(num + 1);
  },

  async create(payload) {
    const { data, error } = await supabase
      .from("expedientes")
      .insert([{ ...payload, updated_at: new Date().toISOString() }])
      .select().single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from("expedientes")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select().single();
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const { error } = await supabase
      .from("expedientes")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  // ── Items cotización ───────────────────────────────────
  async saveItemsCotizacion(expediente_id, items) {
    await supabase.from("expediente_items_cotizacion").delete().eq("expediente_id", expediente_id);
    if (items.length === 0) return;
    const { error } = await supabase.from("expediente_items_cotizacion").insert(
      items.map((it, i) => ({
        expediente_id,
        item_numero: i + 1,
        cantidad: parseFloat(it.cantidad) || 1,
        unidad: it.unidad || "U",
        descripcion: it.descripcion,
        sub_items: it.sub_items?.filter(s => s.trim()) || [],
        precio_unitario: parseFloat(it.precio_unitario) || null,
        precio_total: parseFloat(it.precio_total) || null,
        costo_interno: parseFloat(it.costo_interno) || null,
        orden: i,
      }))
    );
    if (error) throw error;
  },

  // ── Sellos ─────────────────────────────────────────────
  async saveSellos(expediente_id, sellos) {
    await supabase.from("expediente_sellos").delete().eq("expediente_id", expediente_id);
    if (sellos.length === 0) return;
    const { error } = await supabase.from("expediente_sellos").insert(
      sellos.map(s => ({
        expediente_id,
        tipo_sello: s.tipo_sello || null,
        marca: s.marca || null,
        diametro_interno: parseFloat(s.diametro_interno) || null,
        diametro_externo: parseFloat(s.diametro_externo) || null,
        grosor: parseFloat(s.grosor) || null,
        largo_vastago: parseFloat(s.largo_vastago) || null,
        cantidad: parseFloat(s.cantidad) || 1,
        costo_unitario: parseFloat(s.costo_unitario) || null,
        tiene_factura: s.tiene_factura || false,
        nro_factura: s.nro_factura || null,
        proveedor: s.proveedor || null,
        salio_almacen: s.salio_almacen || false,
        producto_almacen_id: s.producto_almacen_id || null,
        notas: s.notas || null,
      }))
    );
    if (error) throw error;
  },

  // ── Tubos y barras ─────────────────────────────────────
  async saveTubosBarras(expediente_id, tubos) {
    await supabase.from("expediente_tubos_barras").delete().eq("expediente_id", expediente_id);
    if (tubos.length === 0) return;
    const { error } = await supabase.from("expediente_tubos_barras").insert(
      tubos.map(t => ({
        expediente_id,
        tipo: t.tipo,
        descripcion: t.descripcion || null,
        diametro_interno: parseFloat(t.diametro_interno) || null,
        diametro_externo: parseFloat(t.diametro_externo) || null,
        largo: parseFloat(t.largo) || null,
        material: t.material || null,
        cantidad: parseFloat(t.cantidad) || 1,
        costo_unitario: parseFloat(t.costo_unitario) || null,
        tiene_factura: t.tiene_factura || false,
        nro_factura: t.nro_factura || null,
        proveedor: t.proveedor || null,
        salio_almacen: t.salio_almacen || false,
        producto_almacen_id: t.producto_almacen_id || null,
      }))
    );
    if (error) throw error;
  },

  // ── Otros insumos ──────────────────────────────────────
  async saveOtrosInsumos(expediente_id, insumos) {
    await supabase.from("expediente_otros_insumos").delete().eq("expediente_id", expediente_id);
    if (insumos.length === 0) return;
    const { error } = await supabase.from("expediente_otros_insumos").insert(
      insumos.map(i => ({
        expediente_id,
        categoria: i.categoria || null,
        descripcion: i.descripcion,
        cantidad: parseFloat(i.cantidad) || 1,
        unidad: i.unidad || "unidad",
        costo_unitario: parseFloat(i.costo_unitario) || null,
        origen_pago: i.origen_pago || null,
        tiene_factura: i.tiene_factura || false,
        nro_factura: i.nro_factura || null,
        proveedor: i.proveedor || null,
        salio_almacen: i.salio_almacen || false,
        producto_almacen_id: i.producto_almacen_id || null,
      }))
    );
    if (error) throw error;
  },

  // ── Mano de obra ───────────────────────────────────────
  async saveManoObra(expediente_id, mo) {
    await supabase.from("expediente_mano_obra").delete().eq("expediente_id", expediente_id);
    if (mo.length === 0) return;
    const { error } = await supabase.from("expediente_mano_obra").insert(
      mo.map(m => ({
        expediente_id,
        trabajador_id: m.trabajador_id || null,
        nombre_manual: m.nombre_manual || null,
        semanas: parseFloat(m.semanas) || null,
        horas_semana: parseFloat(m.horas_semana) || 48,
        costo_hora: parseFloat(m.costo_hora) || null,
        descripcion: m.descripcion || null,
      }))
    );
    if (error) throw error;
  },

  // ── Gastos de reclamo ──────────────────────────────────
  async saveGastosReclamo(expediente_id, gastos) {
    await supabase.from("expediente_gastos_reclamo").delete().eq("expediente_id", expediente_id);
    if (gastos.length === 0) return;
    const { error } = await supabase.from("expediente_gastos_reclamo").insert(
      gastos.map(g => ({
        expediente_id,
        descripcion: g.descripcion,
        tipo: g.tipo || null,
        monto: parseFloat(g.monto) || null,
        origen_pago: g.origen_pago || null,
        tiene_factura: g.tiene_factura || false,
        nro_factura: g.nro_factura || null,
        fecha: g.fecha || new Date().toISOString().split("T")[0],
      }))
    );
    if (error) throw error;
  },

  // ── Guardar expediente completo (todas las tablas) ─────
  async saveCompleto(expedienteId, { cabecera, items, sellos, tubos, otrosInsumos, manoObra, gastosReclamo }) {
    // Calcular totales de costos internos
    const costoSellos = sellos.reduce((s, x) => s + (parseFloat(x.cantidad || 1) * parseFloat(x.costo_unitario || 0)), 0);
    const costoTubos = tubos.reduce((s, x) => s + (parseFloat(x.cantidad || 1) * parseFloat(x.costo_unitario || 0)), 0);
    const costoOtros = otrosInsumos.reduce((s, x) => s + (parseFloat(x.cantidad || 1) * parseFloat(x.costo_unitario || 0)), 0);
    const costoMO = manoObra.reduce((s, x) => s + (parseFloat(x.semanas || 0) * parseFloat(x.horas_semana || 48) * parseFloat(x.costo_hora || 0)), 0);
    const costoReclamo = gastosReclamo.reduce((s, x) => s + parseFloat(x.monto || 0), 0);

    const totalItems = items.reduce((s, x) => s + parseFloat(x.precio_total || 0), 0);
    const igv = totalItems * 0.18;

    const payloadFinal = {
      ...cabecera,
      costo_insumos: costoSellos + costoTubos + costoOtros,
      costo_mano_obra: costoMO,
      costo_otros_gastos: costoReclamo,
      subtotal_cliente: totalItems,
      igv_cliente: cabecera.moneda === "USD" ? 0 : igv,
      total_cliente: cabecera.moneda === "USD" ? totalItems : totalItems + igv,
      updated_at: new Date().toISOString(),
    };

    await this.update(expedienteId, payloadFinal);
    await Promise.all([
      this.saveItemsCotizacion(expedienteId, items),
      this.saveSellos(expedienteId, sellos),
      this.saveTubosBarras(expedienteId, tubos),
      this.saveOtrosInsumos(expedienteId, otrosInsumos),
      this.saveManoObra(expedienteId, manoObra),
      this.saveGastosReclamo(expedienteId, gastosReclamo),
    ]);
  },

  // ── Vistas ─────────────────────────────────────────────
  async getRentabilidad(filtros = {}) {
    let q = supabase.from("v_rentabilidad_expedientes").select("*");
    if (filtros.cliente_id) q = q.eq("cliente_id", filtros.cliente_id);
    if (filtros.año) q = q.gte("fecha_cotizacion", `${filtros.año}-01-01`).lte("fecha_cotizacion", `${filtros.año}-12-31`);
    const { data, error } = await q.order("fecha_cotizacion", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getSeguimientoClientes() {
    const { data, error } = await supabase
      .from("v_seguimiento_clientes")
      .select("*")
      .order("dias_sin_contacto", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async calcularProrrateoFijos(expedienteId) {
    const { data, error } = await supabase.rpc("calcular_gastos_fijos_prorrateados", { p_expediente_id: expedienteId });
    if (error) throw error;
    return data || 0;
  },
};
