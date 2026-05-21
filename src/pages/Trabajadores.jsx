import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Modal, EmptyState, Badge, AlertBanner } from "../components/ui";

const PUESTOS = ["Tornero", "Soldador", "Mecánico", "Pintor", "Administrativo", "Gerente", "Otro (especificar)"];
const FORM0 = { nombre: "", dni: "", puesto: "", puesto_custom: "", fecha_inicio: "", sueldo_semanal: "", dias_vacaciones_disponibles: 15 };

export default function TrabajadoresPage() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const isSctr = new Date().getDate() <= 5;

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase.from("trabajadores").select("*").order("nombre");
    setLista(data || []);
    setLoading(false);
  }

  function abrirNuevo() { setEditando(null); setForm(FORM0); setErr(""); setModal(true); }
  function abrirEditar(t) {
    setEditando(t.id);
    setForm({ nombre: t.nombre || "", dni: t.dni || "", puesto: PUESTOS.includes(t.puesto) ? t.puesto : "Otro (especificar)", puesto_custom: PUESTOS.includes(t.puesto) ? "" : t.puesto, fecha_inicio: t.fecha_inicio || "", sueldo_semanal: t.sueldo_semanal || "", dias_vacaciones_disponibles: t.dias_vacaciones_disponibles || 15 });
    setErr(""); setModal(true);
  }

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function guardar() {
    const puestoFinal = form.puesto === "Otro (especificar)" ? form.puesto_custom : form.puesto;
    if (!form.nombre || !form.dni || !puestoFinal || !form.fecha_inicio || !form.sueldo_semanal) { setErr("Completa todos los campos obligatorios"); return; }
    setSaving(true);
    try {
      const payload = { nombre: form.nombre, dni: form.dni, puesto: puestoFinal, fecha_inicio: form.fecha_inicio, sueldo_semanal: parseFloat(form.sueldo_semanal), dias_vacaciones_disponibles: parseInt(form.dias_vacaciones_disponibles) };
      if (editando) await supabase.from("trabajadores").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editando);
      else await supabase.from("trabajadores").insert([payload]);
      setModal(false); cargar();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function toggleActivo(t) {
    await supabase.from("trabajadores").update({ activo: !t.activo }).eq("id", t.id);
    cargar();
  }

  return (
    <div>
      {isSctr && <AlertBanner><strong>Recordatorio SCTR:</strong> Rubén debe enviar correo de renovación del seguro complementario de trabajo de riesgo este mes.</AlertBanner>}

      <div className="page-header">
        <div>
          <h2 className="page-title">Trabajadores</h2>
          <p className="page-subtitle">{lista.filter(t => t.activo).length} activos · {lista.filter(t => !t.activo).length} inactivos</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo trabajador</button>
      </div>

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        lista.length === 0 ? <EmptyState icon="ti-users" title="Sin trabajadores" subtitle="Agrega al equipo para poder cargar horas" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo trabajador</button>} /> : (
          <table>
            <thead><tr><th>Nombre</th><th>DNI</th><th>Puesto</th><th>Inicio</th><th>Sueldo semanal</th><th>Costo/hora</th><th>Vacaciones</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.nombre}</strong></td>
                  <td className="mono">{t.dni}</td>
                  <td>{t.puesto}</td>
                  <td style={{ color: "var(--text2)" }}>{t.fecha_inicio}</td>
                  <td className="mono">S/ {parseFloat(t.sueldo_semanal || 0).toFixed(2)}</td>
                  <td className="mono" style={{ color: "var(--text3)" }}>S/ {(parseFloat(t.sueldo_semanal || 0) / 48).toFixed(2)}/h</td>
                  <td><Badge color={t.dias_vacaciones_disponibles > 5 ? "green" : "warn"}>{t.dias_vacaciones_disponibles} días</Badge></td>
                  <td><Badge color={t.activo ? "green" : "gray"}>{t.activo ? "Activo" : "Inactivo"}</Badge></td>
                  <td>
                    <div className="actions-col">
                      <button className="btn-icon" onClick={() => abrirEditar(t)} title="Editar"><i className="ti ti-pencil" /></button>
                      <button className="btn-icon" onClick={() => toggleActivo(t)} title={t.activo ? "Desactivar" : "Activar"} style={{ color: t.activo ? "var(--warning)" : "var(--success)" }}><i className={`ti ${t.activo ? "ti-user-off" : "ti-user-check"}`} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {modal && <Modal title={editando ? "Editar trabajador" : "Nuevo trabajador"} onClose={() => setModal(false)}>
        <div className="form-row col2">
          <div className="form-field"><label>Nombre completo *</label><input value={form.nombre} onChange={e => upd("nombre", e.target.value)} /></div>
          <div className="form-field"><label>DNI *</label><input value={form.dni} onChange={e => upd("dni", e.target.value)} maxLength={8} className="mono" /></div>
        </div>
        <div className="form-row col2">
          <div className="form-field"><label>Puesto *</label><select value={form.puesto} onChange={e => upd("puesto", e.target.value)}><option value="">Seleccionar...</option>{PUESTOS.map(p => <option key={p}>{p}</option>)}</select></div>
          {form.puesto === "Otro (especificar)" ? <div className="form-field"><label>Especificar puesto *</label><input value={form.puesto_custom} onChange={e => upd("puesto_custom", e.target.value)} placeholder="Ej. Electromecánico" /></div> : <div className="form-field"><label>Fecha de inicio *</label><input type="date" value={form.fecha_inicio} onChange={e => upd("fecha_inicio", e.target.value)} /></div>}
        </div>
        {form.puesto === "Otro (especificar)" && <div className="form-row col1"><div className="form-field"><label>Fecha de inicio *</label><input type="date" value={form.fecha_inicio} onChange={e => upd("fecha_inicio", e.target.value)} /></div></div>}
        <div className="form-row col2">
          <div className="form-field"><label>Sueldo semanal (S/) *</label><input type="number" value={form.sueldo_semanal} onChange={e => upd("sueldo_semanal", e.target.value)} className="mono" /></div>
          <div className="form-field"><label>Días de vacaciones disponibles</label><input type="number" value={form.dias_vacaciones_disponibles} onChange={e => upd("dias_vacaciones_disponibles", e.target.value)} /></div>
        </div>
        {form.sueldo_semanal && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>Costo por hora estimado: <strong style={{ color: "var(--text2)" }}>S/ {(parseFloat(form.sueldo_semanal) / 48).toFixed(2)}/h</strong> (48h semanales)</div>}
        {err && <div className="err">{err}</div>}
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear trabajador"}</button></div>
      </Modal>}
    </div>
  );
}
