import { supabase } from "./supabase";

export const ocService = {
  async getAll(filtros = {}) {
    let q = supabase
      .from("ordenes_compra")
      .select("*, clientes(razon_social), cilindros(nombre, marca, modelo), trabajadores(nombre)")
      .eq("activo", true)
      .order("created_at", { ascending: false });

    if (filtros.estado) q = q.eq("estado", filtros.estado);
    if (filtros.cliente_id) q = q.eq("cliente_id", filtros.cliente_id);

    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from("ordenes_compra")
      .select("*, clientes(*), cilindros(*), gastos_oc(*), horas_semana_detalle(*, trabajadores(nombre))")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(cotizacion) {
    const numero_raiz = await supabase.rpc("siguiente_numero").then(r => r.data);
    const { data, error } = await supabase
      .from("ordenes_compra")
      .insert([{
        numero: `OC-${new Date().getFullYear()}-${String(numero_raiz).padStart(3, "0")}`,
        numero_raiz,
        cotizacion_id: cotizacion.id,
        cliente_id: cotizacion.cliente_id,
        cilindro_id: cotizacion.cilindro_id,
        ingreso_cotizado: cotizacion.total,
        costo_estimado: cotizacion.costo_estimado_interno,
        falla_reportada: "",
        estado: "recibido",
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateEstado(id, estado, fechaCampo = null) {
    const updatePayload = {
      estado,
      updated_at: new Date().toISOString(),
    };
    if (fechaCampo) {
      updatePayload[fechaCampo] = new Date().toISOString().split("T")[0];
    }
    const { error } = await supabase
      .from("ordenes_compra")
      .update(updatePayload)
      .eq("id", id);
    if (error) throw error;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from("ordenes_compra")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Gastos por OC
  async getGastos(ocId) {
    const { data, error } = await supabase
      .from("gastos_oc")
      .select("*")
      .eq("oc_id", ocId)
      .eq("activo", true)
      .order("created_at");
    if (error) throw error;
    return data;
  },

  async addGasto(payload) {
    const { data, error } = await supabase
      .from("gastos_oc")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteGasto(id) {
    const { error } = await supabase
      .from("gastos_oc")
      .update({ activo: false })
      .eq("id", id);
    if (error) throw error;
  },

  // Rentabilidad
  async getRentabilidad() {
    const { data, error } = await supabase
      .from("v_rentabilidad_oc")
      .select("*")
      .order("fecha_recepcion", { ascending: false });
    if (error) throw error;
    return data;
  },
};

// Mapa de estado → fecha campo correspondiente
export const ESTADO_FECHA_MAP = {
  recibido: "fecha_recepcion",
  desmontaje: "fecha_desmontaje",
  diagnostico: "fecha_diagnostico",
  en_reparacion: "fecha_inicio_reparacion",
  pruebas: "fecha_pruebas",
  pintura: "fecha_pintura",
  listo_entrega: "fecha_listo",
  entregado: "fecha_entrega",
};

export const ESTADOS_OC = [
  { id: "recibido", label: "Recibido", color: "#7F8C8D" },
  { id: "desmontaje", label: "Desmontaje", color: "#E67E22" },
  { id: "diagnostico", label: "Diagnóstico", color: "#F39C12" },
  { id: "esperando_aprobacion", label: "Esp. aprobación", color: "#E74C3C" },
  { id: "en_reparacion", label: "En reparación", color: "#3498DB" },
  { id: "pruebas", label: "Pruebas", color: "#9B59B6" },
  { id: "pintura", label: "Pintura", color: "#1ABC9C" },
  { id: "listo_entrega", label: "Listo entrega", color: "#2ECC71" },
  { id: "entregado", label: "Entregado", color: "#27AE60" },
  { id: "facturado", label: "Facturado", color: "#16A085" },
  { id: "pagado", label: "Pagado", color: "#95A5A6" },
];
