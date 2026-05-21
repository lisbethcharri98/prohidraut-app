// ── HORAS-HOMBRE ──────────────────────────────────────────
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Modal, EmptyState, Badge, Divider } from "../components/ui";

const TIPOS_ASIGNACION = [
  { value: "oc", label: "OC / Servicio" },
  { value: "administrativo", label: "Administrativo" },
  { value: "mantenimiento", label: "Mantenimiento taller" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "feriado", label: "Feriado" },
];

function getLunes() {
  const h = new Date(), d = h.getDay(), diff = h.getDate() - d + (d === 0 ? -6 : 1);
  return new Date(h.setDate(diff)).toISOString().split("T")[0];
}

export function HorasHombrePage() {
  const [partes, setPartes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [modal, setModal] = useState(false);
  const [semana, setSemana] = useState(getLunes());
  const [registros, setRegistros] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("trabajadores").select("id, nombre, puesto, sueldo_semanal").eq("activo", true).order("nombre"),
      supabase.from("ordenes_compra").select("id, numero, clientes(razon_social)").in("estado", ["recibido", "desmontaje", "diagnostico", "en_reparacion", "pruebas", "pintura", "listo_entrega"]).order("numero"),
      supabase.from("partes_semanales").select("*, horas_semana_detalle(*, trabajadores(nombre))").order("semana_inicio", { ascending: false }).limit(10),
    ]).then(([{ data: t }, { data: o }, { data: p }]) => {
      setTrabajadores(t || []);
      setOrdenes(o || []);
      setPartes(p || []);
    });
  }, []);

  function addReg() {
    setRegistros([...registros, { trabajador_id: "", dia: semana, horas: 8, tipo_asignacion: "oc", oc_id: "", codigo_admin: "" }]);
  }
  function updReg(i, k, v) { const r = [...registros]; r[i][k] = v; setRegistros(r); }

  async function guardar() {
    if (registros.length === 0) return;
    setSaving(true);
    try {
      const fin = new Date(semana + "T00:00:00"); fin.setDate(fin.getDate() + 6);
      const { data: parte, error } = await supabase.from("partes_semanales").insert([{ semana_inicio: semana, semana_fin: fin.toISOString().split("T")[0], cerrado: true }]).select().single();
      if (error) throw error;
      await supabase.from("horas_semana_detalle").insert(registros.filter(r => r.trabajador_id).map(r => ({ ...r, parte_id: parte.id, horas: parseFloat(r.horas), oc_id: r.oc_id || null })));
      setModal(false); setRegistros([]);
      const { data: p } = await supabase.from("partes_semanales").select("*, horas_semana_detalle(*, trabajadores(nombre))").order("semana_inicio", { ascending: false }).limit(10);
      setPartes(p || []);
    } finally { setSaving(false); }
  }

  const costoTrab = id => {
    const t = trabajadores.find(t => t.id === id);
    return t ? (parseFloat(t.sueldo_semanal) / 48).toFixed(2) : "0.00";
  };

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Horas-hombre semanal</h2><p className="page-subtitle">Rubén registra al final de cada semana</p></div>
        <button className="btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Registrar semana</button>
      </div>

      {partes.length === 0 ? (
        <EmptyState icon="ti-clock" title="Sin partes registrados" subtitle="Registra las horas trabajadas cada semana para calcular costos reales por OC" action={<button className="btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Registrar semana</button>} />
      ) : partes.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <strong>Semana {p.semana_inicio}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text3)" }}>al {p.semana_fin}</span>
            </div>
            <Badge color={p.cerrado ? "green" : "warn"}>{p.cerrado ? "Cerrado" : "Abierto"}</Badge>
          </div>
          <table>
            <thead><tr><th>Trabajador</th><th>Día</th><th>Horas</th><th>Asignación</th><th>Costo est.</th></tr></thead>
            <tbody>
              {(p.horas_semana_detalle || []).map(h => (
                <tr key={h.id}>
                  <td>{h.trabajadores?.nombre || "—"}</td>
                  <td className="mono">{h.dia}</td>
                  <td className="mono">{h.horas}h</td>
                  <td><Badge color={h.tipo_asignacion === "oc" ? "blue" : h.tipo_asignacion === "vacaciones" ? "warn" : "gray"}>{TIPOS_ASIGNACION.find(t => t.value === h.tipo_asignacion)?.label || h.tipo_asignacion}</Badge>{h.oc_id && <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 4 }}>OC</span>}</td>
                  <td className="mono">{h.costo_calculado ? `S/ ${parseFloat(h.costo_calculado).toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {modal && <Modal title="Registrar horas — semana" onClose={() => setModal(false)} wide>
        <div className="form-row col2" style={{ marginBottom: 16 }}>
          <div className="form-field"><label>Semana que inicia (lunes)</label><input type="date" value={semana} onChange={e => setSemana(e.target.value)} /></div>
        </div>
        <Divider />
        {registros.map((r, i) => (
          <div key={i} className="insumo-row">
            <div className="form-row col3" style={{ marginBottom: 8 }}>
              <div className="form-field"><label>Trabajador</label>
                <select value={r.trabajador_id} onChange={e => updReg(i, "trabajador_id", e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre} (S/{costoTrab(t.id)}/h)</option>)}
                </select>
              </div>
              <div className="form-field"><label>Día</label><input type="date" value={r.dia} onChange={e => updReg(i, "dia", e.target.value)} /></div>
              <div className="form-field"><label>Horas</label><input type="number" value={r.horas} onChange={e => updReg(i, "horas", e.target.value)} max={12} min={0} step={0.5} /></div>
            </div>
            <div className="form-row col2" style={{ marginBottom: 0 }}>
              <div className="form-field"><label>Tipo de asignación</label>
                <select value={r.tipo_asignacion} onChange={e => updReg(i, "tipo_asignacion", e.target.value)}>
                  {TIPOS_ASIGNACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {r.tipo_asignacion === "oc"
                ? <div className="form-field"><label>Orden de compra</label>
                  <select value={r.oc_id} onChange={e => updReg(i, "oc_id", e.target.value)}>
                    <option value="">Seleccionar OC...</option>
                    {ordenes.map(o => <option key={o.id} value={o.id}>{o.numero} — {o.clientes?.razon_social}</option>)}
                  </select>
                </div>
                : <div className="form-field"><label>Código / Nota</label><input value={r.codigo_admin} onChange={e => updReg(i, "codigo_admin", e.target.value)} placeholder="ADM-001, MNT-001..." /></div>
              }
            </div>
          </div>
        ))}
        <button className="btn-ghost btn-sm" onClick={addReg} style={{ marginBottom: 16 }}><i className="ti ti-plus" /> Agregar línea</button>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Guardar parte semanal"}</button>
        </div>
      </Modal>}
    </div>
  );
}

export default HorasHombrePage;
