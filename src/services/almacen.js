import { supabase } from "./supabase";

export const almacenService = {
  async getProductos() {
    const { data, error } = await supabase
      .from("productos_almacen")
      .select("*, categorias_insumo(nombre), tipos_sello(codigo, diametro_interno, diametro_externo, grosor, tipo, marca)")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;
    return data;
  },

  async getCategorias() {
    const { data, error } = await supabase
      .from("categorias_insumo")
      .select("*")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;
    return data;
  },

  async getTiposSellos() {
    const { data, error } = await supabase
      .from("tipos_sello")
      .select("*")
      .eq("activo", true)
      .order("diametro_interno");
    if (error) throw error;
    return data;
  },

  async getStockBajo() {
    const { data, error } = await supabase
      .from("v_stock_bajo")
      .select("*");
    if (error) throw error;
    return data;
  },

  async createProducto(payload) {
    const { data, error } = await supabase
      .from("productos_almacen")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProducto(id, payload) {
    const { data, error } = await supabase
      .from("productos_almacen")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async registrarEntrada(productoId, cantidad, precio, motivo = "Ingreso manual") {
    const { data: prod } = await supabase
      .from("productos_almacen")
      .select("stock_actual")
      .eq("id", productoId)
      .single();

    const stockAnterior = prod.stock_actual;
    const stockNuevo = stockAnterior + cantidad;

    await supabase.from("productos_almacen").update({
      stock_actual: stockNuevo,
      ...(precio ? { precio_costo_promedio: precio } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", productoId);

    await supabase.from("movimientos_almacen").insert([{
      producto_id: productoId,
      tipo: "entrada",
      cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      precio_unitario: precio,
      motivo,
    }]);
  },

  async registrarSalida(productoId, cantidad, ocId, motivo) {
    const { data: prod } = await supabase
      .from("productos_almacen")
      .select("stock_actual, precio_costo_promedio")
      .eq("id", productoId)
      .single();

    const stockAnterior = prod.stock_actual;
    const stockNuevo = Math.max(0, stockAnterior - cantidad);

    await supabase.from("productos_almacen").update({
      stock_actual: stockNuevo,
      updated_at: new Date().toISOString(),
    }).eq("id", productoId);

    await supabase.from("movimientos_almacen").insert([{
      producto_id: productoId,
      tipo: "salida",
      cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      precio_unitario: prod.precio_costo_promedio,
      oc_id: ocId || null,
      motivo: motivo || `Salida OC`,
    }]);

    return prod.precio_costo_promedio;
  },

  async createCategoria(nombre) {
    const { data, error } = await supabase
      .from("categorias_insumo")
      .insert([{ nombre }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createTipoSello(payload) {
    const { data, error } = await supabase
      .from("tipos_sello")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
