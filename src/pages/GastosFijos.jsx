import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Modal, EmptyState, Badge } from "../components/ui";

const FORM0 = { categoria_id: "", monto: "", tiene_comprobante: "sin_comprobante", proveedor_ruc: "", proveedor_razon: "", numero_comprobante: "", base_imponible: "", igv_monto: "", origen_pago: "cuenta_prohidraut", notas: "" };
const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

export default function GastosFijosPage() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [año, setAño] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(false);
  const [modalCat, setModalCat] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM0);
  const [nuevaCat, setNuevaCat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, [mes, año]);

  async function cargar() {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from("gastos_fijos_mensuales").select("*, categorias_gasto_fijo(nombre)").eq("mes", mes).eq("año", año).eq("activo", true),
      supabase.from("categorias_gasto_fijo").select("*").eq("activo", true).order("nombre"),
    ]);
    setGastos(g || []); setCategorias(c || []);
  }

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  function abrirNuevo() { setEditando(null); setForm(FORM0); setModal(true); }
  function abrirEditar(g) {
    setEditando(g.id);
    setForm({ categoria_id: g.categoria_id || "", monto: g.monto || "", tiene_comprobante: g.tiene_comprobante || "sin_comprobante", proveedor_ruc: g.proveedor_ruc || "", proveedor_razon: g.proveedor_razon || "", numero_comprobante: g.numero_comprobante || "", base_imponible: g.base_imponible || "", igv_monto: g.igv_monto || "", origen_pago: g.origen_pago || "cuenta_prohidraut", notas: g.notas || "" });
    setModal(true);
  }

  async function guardar() {
    if (!form.categoria_id || !form.monto) return;
    setSaving(true);
    try {
      const payload = { ...form, mes, año, monto: parseFloat(form.monto), base_imponible: parseFloat(form.base_imponible) || null, igv_monto: parseFloat(form.igv_monto) || null };
      if (editando) await supabase.from("gastos_fijos_mensuales").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editando);
      else await supabase.from("gastos_fijos_mensuales").insert([payload]);
      setModal(false); cargar();
    } finally { setSaving(false); }
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("gastos_fijos_mensuales").update({ activo: false }).eq("id", id);
    cargar();
  }

  async function guardarCat() {
    if (!nuevaCat.trim()) return;
    await supabase.from("categorias_gasto_fijo").insert([{ nombre: nuevaCat.trim() }]);
    setNuevaCat(""); setModalCat(false); cargar();
  }

  const total = gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Gastos fijos mensuales</h2>
          <p className="page-subtitle">{MESES[mes]} {año} — Total: <strong style={{ color: "var(--orange)" }}>S/ {total.toFixed(2)}</strong></p>
        </div>
        <div className="page-actions">
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ width: 120 }}>{MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select>
          <select value={año} onChange={e => setAño(parseInt(e.target.value))} style={{ width: 90 }}>{[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}</select>
          <button className="btn-secondary btn-sm" onClick={() => setModalCat(true)}><i className="ti ti-tag" /> Categoría</button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Agregar</button>
        </div>
      </div>

      {gastos.length === 0 ? (
        <EmptyState icon="ti-home" title={`Sin gastos en ${MESES[mes]} ${año}`} subtitle="Registra los gastos fijos del mes" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Agregar gasto</button>} />
      ) : (
        <table>
          <thead><tr><th>Categoría</th><th>Monto</th><th>Comprobante</th><th>Proveedor</th><th>Origen pago</th><th></th></tr></thead>
          <tbody>
            {gastos.map(g => (
              <tr key={g.id}>
                <td><strong>{g.categorias_gasto_fijo?.nombre}</strong></td>
                <td className="mono">S/ {parseFloat(g.monto || 0).toFixed(2)}</td>
                <td><Badge color={g.tiene_comprobante === "factura" ? "blue" : g.tiene_comprobante === "boleta" ? "green" : "gray"}>{g.tiene_comprobante.replace("_", " ")}</Badge></td>
                <td style={{ color: "var(--text2)" }}>{g.proveedor_razon || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{(g.origen_pago || "—").replace("_", " ")}</td>
                <td>
                  <div className="actions-col">
                    <button className="btn-icon" onClick={() => abrirEditar(g)}><i className="ti ti-pencil" /></button>
                    <button className="btn-icon" onClick={() => eliminar(g.id)} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ textAlign: "right", fontWeight: 600, color: "var(--orange)", paddingTop: 12 }}>Total del mes</td>
              <td className="mono" style={{ fontWeight: 600, color: "var(--orange)" }}>S/ {total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {modalCat && <Modal title="Nueva categoría de gasto" onClose={() => setModalCat(false)}>
        <div style={{ marginBottom: 8, fontSize: 13, color: "var(--text2)" }}>Existentes: {categorias.map(c => <span key={c.id} className="tag">{c.nombre}</span>)}</div>
        <div className="form-field"><label>Nombre</label><input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} placeholder="Ej. Gas, telefonía, seguridad..." /></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalCat(false)}>Cancelar</button><button className="btn-primary" onClick={guardarCat}>Crear</button></div>
      </Modal>}

      {modal && <Modal title={editando ? "Editar gasto" : `Agregar gasto — ${MESES[mes]} ${año}`} onClose={() => setModal(false)}>
        <div className="form-row col2">
          <div className="form-field"><label>Categoría *</label><select value={form.categoria_id} onChange={e => upd("categoria_id", e.target.value)}><option value="">Seleccionar...</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-field"><label>Monto (S/) *</label><input type="number" value={form.monto} onChange={e => upd("monto", e.target.value)} className="mono" /></div>
        </div>
        <div className="form-row col2">
          <div className="form-field"><label>Comprobante</label><select value={form.tiene_comprobante} onChange={e => upd("tiene_comprobante", e.target.value)}><option value="sin_comprobante">Sin comprobante</option><option value="boleta">Boleta</option><option value="factura">Factura</option></select></div>
          <div className="form-field"><label>Origen del pago</label><select value={form.origen_pago} onChange={e => upd("origen_pago", e.target.value)}><option value="cuenta_prohidraut">Cuenta PROHIDRAUT</option><option value="yape">Yape</option><option value="caja_chica">Caja chica</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option></select></div>
        </div>
        {form.tiene_comprobante !== "sin_comprobante" && (
          <div className="form-row col3">
            <div className="form-field"><label>RUC proveedor</label><input value={form.proveedor_ruc} onChange={e => upd("proveedor_ruc", e.target.value)} className="mono" /></div>
            <div className="form-field"><label>Razón social</label><input value={form.proveedor_razon} onChange={e => upd("proveedor_razon", e.target.value)} /></div>
            <div className="form-field"><label>Nro. comprobante</label><input value={form.numero_comprobante} onChange={e => upd("numero_comprobante", e.target.value)} /></div>
          </div>
        )}
        <div className="form-field" style={{ marginTop: 8 }}><label>Notas</label><textarea value={form.notas} onChange={e => upd("notas", e.target.value)} rows={2} /></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Guardar"}</button></div>
      </Modal>}
    </div>
  );
}
