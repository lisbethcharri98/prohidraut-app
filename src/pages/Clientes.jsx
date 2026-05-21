import { useState, useEffect } from "react";
import { clientesService } from "../services/clientes";
import { Modal, EmptyState, SearchBar, Badge } from "../components/ui";

const FORM0 = { razon_social: "", ruc: "", direccion: "", contacto_nombre: "", contacto_email: "", contacto_telefono: "", año_inicio: new Date().getFullYear(), notas: "" };

export default function ClientesPage() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try { setLista(await clientesService.getAll()); }
    finally { setLoading(false); }
  }

  function abrirNuevo() { setEditando(null); setForm(FORM0); setErr(""); setModal(true); }
  function abrirEditar(c) {
    setEditando(c.id);
    setForm({ razon_social: c.razon_social || "", ruc: c.ruc || "", direccion: c.direccion || "", contacto_nombre: c.contacto_nombre || "", contacto_email: c.contacto_email || "", contacto_telefono: c.contacto_telefono || "", año_inicio: c.año_inicio || new Date().getFullYear(), notas: c.notas || "" });
    setErr(""); setModal(true);
  }

  async function guardar() {
    if (!form.razon_social.trim()) { setErr("La razón social es obligatoria"); return; }
    setSaving(true);
    try {
      if (editando) await clientesService.update(editando, form);
      else await clientesService.create(form);
      setModal(false); cargar();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar cliente "${c.razon_social}"?`)) return;
    await clientesService.softDelete(c.id);
    cargar();
  }

  const filtrados = lista.filter(c =>
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.ruc || "").includes(busqueda) ||
    (c.contacto_nombre || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const isSctr = new Date().getDate() <= 5;

  return (
    <div>
      {isSctr && (
        <div className="alert-banner">
          <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} />
          <span><strong>Recordatorio SCTR:</strong> Rubén debe enviar correo de renovación del seguro este mes.</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">Clientes</h2>
          <p className="page-subtitle">{lista.length} registrados</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>
          <i className="ti ti-plus" /> Nuevo cliente
        </button>
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, RUC o contacto..." />

      {loading ? (
        <div className="empty-state"><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /></div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="ti-building" title="Sin clientes" subtitle="Agrega tu primer cliente para comenzar" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo cliente</button>} />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Razón social</th><th>RUC</th><th>Contacto</th>
              <th>Email</th><th>Teléfono</th><th>Cliente desde</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id}>
                <td><strong>{c.razon_social}</strong></td>
                <td className="mono">{c.ruc || "—"}</td>
                <td>{c.contacto_nombre || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{c.contacto_email || "—"}</td>
                <td>{c.contacto_telefono || "—"}</td>
                <td>{c.año_inicio || "—"}</td>
                <td>
                  <div className="actions-col">
                    <button className="btn-icon" onClick={() => abrirEditar(c)} title="Editar"><i className="ti ti-pencil" /></button>
                    <button className="btn-icon" onClick={() => eliminar(c)} title="Eliminar" style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <Modal title={editando ? "Editar cliente" : "Nuevo cliente"} onClose={() => setModal(false)}>
          <div className="form-row col2">
            <div className="form-field"><label>Razón social *</label><input value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /></div>
            <div className="form-field"><label>RUC</label><input value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} className="mono" maxLength={11} /></div>
          </div>
          <div className="form-row col1">
            <div className="form-field"><label>Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
          </div>
          <div className="form-row col3">
            <div className="form-field"><label>Nombre contacto</label><input value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} /></div>
            <div className="form-field"><label>Email</label><input type="email" value={form.contacto_email} onChange={e => setForm({ ...form, contacto_email: e.target.value })} /></div>
            <div className="form-field"><label>Teléfono</label><input value={form.contacto_telefono} onChange={e => setForm({ ...form, contacto_telefono: e.target.value })} /></div>
          </div>
          <div className="form-row col2">
            <div className="form-field"><label>Cliente desde (año)</label><input type="number" value={form.año_inicio} onChange={e => setForm({ ...form, año_inicio: parseInt(e.target.value) })} /></div>
          </div>
          <div className="form-row col1">
            <div className="form-field"><label>Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} /></div>
          </div>
          {err && <div className="err">{err}</div>}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear cliente"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
