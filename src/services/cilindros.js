import { supabase } from "./supabase";

export const cilindrosService = {
  async getAll() {
    const { data, error } = await supabase
      .from("cilindros")
      .select("*, tipos_sello(codigo, diametro_interno, diametro_externo, tipo, marca)")
      .eq("activo", true)
      .order("nombre");
    if (error) throw error;
    return data;
  },

  async getByCliente(clienteId) {
    const { data, error } = await supabase
      .from("cliente_cilindros")
      .select("*, cilindros(*)")
      .eq("cliente_id", clienteId)
      .eq("activo", true);
    if (error) throw error;
    return data?.map(r => r.cilindros) || [];
  },

  async getHistorial(cilindroId) {
    const { data, error } = await supabase
      .from("servicios_historicos")
      .select("*, clientes(razon_social), historico_insumos(*), historico_mano_obra(*)")
      .eq("cilindro_id", cilindroId)
      .eq("activo", true)
      .order("fecha_servicio", { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabase
      .from("cilindros")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from("cilindros")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const { error } = await supabase
      .from("cilindros")
      .update({ activo: false })
      .eq("id", id);
    if (error) throw error;
  },

  async vincularCliente(clienteId, cilindroId, alias = "") {
    const { error } = await supabase
      .from("cliente_cilindros")
      .upsert([{ cliente_id: clienteId, cilindro_id: cilindroId, alias }]);
    if (error) throw error;
  },
};
