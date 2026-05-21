import { useState, useEffect } from "react";
import { cilindrosService } from "../services/cilindros";
import { clientesService } from "../services/clientes";
import { almacenService } from "../services/almacen";
import { Modal, EmptyState, SearchBar, Badge, Divider } from "../components/ui";

const FORM0 = {
  nombre: "", marca: "", modelo: "", numero_serie: "",
  diametro_vastago: "", diametro_tubo: "", longitud_carrera: "", longitud_total: "",
  presion_trabajo: "", presion_maxima: "",
  material_vastago: "", tipo_cromado: "", tipo_montaje: "",
  tipo_sello_principal: "",
  aplicacion: "", maquina: "", notas_tecnicas: "", problema_recurrente: "",
};

const MATERIALES_VASTAGO = ["Acero al carbono", "Acero inoxidable", "Acero cromado", "Otro"];
const TIPOS_CROMADO = ["Cromado duro", "Cromado decorativo", "Sin cromado", "Niquelado"];
const TIPOS_MONTAJE = ["Brida delantera", "Brida trasera", "Horquilla", "Espárrago", "Pivote", "Otro"];

export default function CilindrosPage() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [sellos, setSellos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM0);
  const [clienteVinculo, setClienteVinculo] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [c, cl, s] = await Promise.all([
        cilindrosService.getAll(),
        clientesService.getAll(),
        almacenService.getTiposSellos(),
      ]);
      setLista(c); setClientes(cl); setSellos(s);
    } finally { setLoading(false); }
  }

  function abrirNuevo() { setEditando(null); setForm(FORM0); setClienteVinculo(""); setErr(""); setModal(true); }
  function abrirEditar(c) {
    setEditando(c.id);
    setForm({
      nombre: c.nombre || "", marca: c.marca || "", modelo: c.modelo || "", numero_serie: c.numero_serie || "",
      diametro_vastago: c.diametro_vastago || "", diametro_tubo: c.diametro_tubo || "",
      longitud_carrera: c.longitud_carrera || "", longitud_total: c.longitud_total || "",
      presion_trabajo: c.presion_trabajo || "", presion_maxima: c.presion_maxima || "",
      material_vastago: c.material_vastago || "", tipo_cromado: c.tipo_cromado || "",
      tipo_montaje: c.tipo_montaje || "", tipo_sello_principal: c.tipo_sello_principal || "",
      aplicacion: c.aplicacion || "", maquina: c.maquina || "",
      notas_tecnicas: c.notas_tecnicas || "", problema_recurrente: c.problema_recurrente || "",
    });
    setErr(""); setModal(true);
  }

  async function verHistorial(c) {
    setModalHistorial(c);
    const data = await cilindrosService.getHistorial(c.id);
    setHistorial(data);
  }

  async function guardar() {
    if (!form.nombre.trim()) { setErr("El nombre del equipo es obligatorio"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        diametro_vastago: parseFloat(form.diametro_vastago) || null,
        diametro_tubo: parseFloat(form.diametro_tubo) || null,
        longitud_carrera: parseFloat(form.longitud_carrera) || null,
        longitud_total: parseFloat(form.longitud_total) || null,
        presion_trabajo: parseFloat(form.presion_trabajo) || null,
        presion_maxima: parseFloat(form.presion_maxima) || null,
        tipo_sello_principal: form.tipo_sello_principal || null,
      };
      let cil;
      if (editando) cil = await cilindrosService.update(editando, payload);
      else cil = await cilindrosService.create(payload);

      // Vincular cliente si se seleccionó
      if (!editando && clienteVinculo && cil?.id) {
        await cilindrosService.vincularCliente(clienteVinculo, cil.id);
      }
      setModal(false); cargar();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar equipo "${c.nombre}"?`)) return;
    await cilindrosService.softDelete(c.id);
    cargar();
  }

  const f = v => v => setForm(prev => ({ ...prev, ...v }));
  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const filtrados = lista.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.marca || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.modelo || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.maquina || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Equipos / Cilindros</h2>
          <p className="page-subtitle">Base técnica de equipos — {lista.length} registrados</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo equipo</button>
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, marca, modelo, máquina..." />

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        filtrados.length === 0 ? <EmptyState icon="ti-settings" title="Sin equipos registrados" subtitle="Registra los cilindros e equipos que repara PROHIDRAUT" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo equipo</button>} /> : (
          <table>
            <thead>
              <tr><th>Nombre</th><th>Marca / Modelo</th><th>Vástago</th><th>Tubo</th><th>Presión</th><th>Aplicación</th><th>Problema recurrente</th><th></th></tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.nombre}</strong>{c.numero_serie && <div style={{ fontSize: 11, color: "var(--text3)" }}>S/N: {c.numero_serie}</div>}</td>
                  <td style={{ color: "var(--text2)" }}>{[c.marca, c.modelo].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="mono">{c.diametro_vastago ? `${c.diametro_vastago}mm` : "—"}</td>
                  <td className="mono">{c.diametro_tubo ? `${c.diametro_tubo}mm` : "—"}</td>
                  <td className="mono">{c.presion_trabajo ? `${c.presion_trabajo} bar` : "—"}</td>
                  <td style={{ color: "var(--text2)" }}>{c.maquina || c.aplicacion || "—"}</td>
                  <td>{c.problema_recurrente ? <Badge color="warn">{c.problema_recurrente.substring(0, 30)}{c.problema_recurrente.length > 30 ? "..." : ""}</Badge> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                  <td>
                    <div className="actions-col">
                      <button className="btn-icon" onClick={() => verHistorial(c)} title="Ver historial"><i className="ti ti-history" /></button>
                      <button className="btn-icon" onClick={() => abrirEditar(c)} title="Editar"><i className="ti ti-pencil" /></button>
                      <button className="btn-icon" onClick={() => eliminar(c)} style={{ color: "var(--danger)" }} title="Eliminar"><i className="ti ti-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {/* Modal crear/editar */}
      {modal && (
        <Modal title={editando ? "Editar equipo / cilindro" : "Nuevo equipo / cilindro"} onClose={() => setModal(false)} wide>
          <Divider label="Identificación" />
          <div className="form-row col2">
            <div className="form-field"><label>Nombre del equipo *</label><input value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Ej. Cilindro brazo excavadora CAT 320" /></div>
            <div className="form-field"><label>Número de serie</label><input value={form.numero_serie} onChange={e => upd("numero_serie", e.target.value)} className="mono" /></div>
          </div>
          <div className="form-row col3">
            <div className="form-field"><label>Marca</label><input value={form.marca} onChange={e => upd("marca", e.target.value)} placeholder="Caterpillar, Komatsu, Volvo..." /></div>
            <div className="form-field"><label>Modelo</label><input value={form.modelo} onChange={e => upd("modelo", e.target.value)} /></div>
            <div className="form-field"><label>Máquina / Equipo</label><input value={form.maquina} onChange={e => upd("maquina", e.target.value)} placeholder="CAT 320, PC200, 730C..." /></div>
          </div>
          <div className="form-row col1">
            <div className="form-field"><label>Aplicación</label><input value={form.aplicacion} onChange={e => upd("aplicacion", e.target.value)} placeholder="Ej. Brazo principal, volteo, pluma grúa..." /></div>
          </div>

          {!editando && (
            <div className="form-row col2">
              <div className="form-field">
                <label>Vincular a cliente</label>
                <select value={clienteVinculo} onChange={e => setClienteVinculo(e.target.value)}>
                  <option value="">Sin vincular por ahora</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>
            </div>
          )}

          <Divider label="Medidas técnicas" />
          <div className="form-row col4">
            <div className="form-field"><label>Diám. vástago (mm)</label><input type="number" value={form.diametro_vastago} onChange={e => upd("diametro_vastago", e.target.value)} className="mono" /></div>
            <div className="form-field"><label>Diám. tubo (mm)</label><input type="number" value={form.diametro_tubo} onChange={e => upd("diametro_tubo", e.target.value)} className="mono" /></div>
            <div className="form-field"><label>Longitud carrera (mm)</label><input type="number" value={form.longitud_carrera} onChange={e => upd("longitud_carrera", e.target.value)} className="mono" /></div>
            <div className="form-field"><label>Longitud total (mm)</label><input type="number" value={form.longitud_total} onChange={e => upd("longitud_total", e.target.value)} className="mono" /></div>
          </div>
          <div className="form-row col2">
            <div className="form-field"><label>Presión de trabajo (bar)</label><input type="number" value={form.presion_trabajo} onChange={e => upd("presion_trabajo", e.target.value)} className="mono" /></div>
            <div className="form-field"><label>Presión máxima (bar)</label><input type="number" value={form.presion_maxima} onChange={e => upd("presion_maxima", e.target.value)} className="mono" /></div>
          </div>

          <Divider label="Especificaciones" />
          <div className="form-row col3">
            <div className="form-field"><label>Material vástago</label>
              <select value={form.material_vastago} onChange={e => upd("material_vastago", e.target.value)}>
                <option value="">Seleccionar...</option>
                {MATERIALES_VASTAGO.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Tipo de cromado</label>
              <select value={form.tipo_cromado} onChange={e => upd("tipo_cromado", e.target.value)}>
                <option value="">Seleccionar...</option>
                {TIPOS_CROMADO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Tipo de montaje</label>
              <select value={form.tipo_montaje} onChange={e => upd("tipo_montaje", e.target.value)}>
                <option value="">Seleccionar...</option>
                {TIPOS_MONTAJE.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row col1">
            <div className="form-field"><label>Tipo de sello principal</label>
              <select value={form.tipo_sello_principal} onChange={e => upd("tipo_sello_principal", e.target.value)}>
                <option value="">Sin especificar</option>
                {sellos.map(s => <option key={s.id} value={s.id}>{s.codigo ? `[${s.codigo}] ` : ""}{s.tipo} {s.diametro_interno}×{s.diametro_externo}×{s.grosor}mm {s.marca ? `— ${s.marca}` : ""}</option>)}
              </select>
            </div>
          </div>

          <Divider label="Observaciones técnicas" />
          <div className="form-row col1">
            <div className="form-field"><label>Notas técnicas</label><textarea value={form.notas_tecnicas} onChange={e => upd("notas_tecnicas", e.target.value)} rows={3} placeholder="Observaciones técnicas, cuidados especiales, materiales requeridos..." /></div>
            <div className="form-field"><label>Problema / falla recurrente</label><input value={form.problema_recurrente} onChange={e => upd("problema_recurrente", e.target.value)} placeholder="Ej. Desgaste acelerado de sello por presión excesiva" /></div>
          </div>

          {err && <div className="err">{err}</div>}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear equipo"}</button>
          </div>
        </Modal>
      )}

      {/* Modal historial */}
      {modalHistorial && (
        <Modal title={`Historial — ${modalHistorial.nombre}`} onClose={() => setModalHistorial(null)} wide>
          {historial.length === 0 ? (
            <EmptyState icon="ti-history" title="Sin historial registrado" subtitle="Los servicios realizados a este equipo aparecerán aquí" />
          ) : (
            <table>
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Descripción</th><th>Costo real</th><th>Horas</th></tr></thead>
              <tbody>
                {historial.map(s => (
                  <tr key={s.id}>
                    <td className="mono">{s.fecha_servicio}</td>
                    <td>{s.clientes?.razon_social || "—"}</td>
                    <td style={{ color: "var(--text2)" }}>{s.descripcion}</td>
                    <td className="mono">{s.costo_real ? `S/ ${parseFloat(s.costo_real).toFixed(2)}` : "—"}</td>
                    <td>{s.horas_reales ? `${s.horas_reales}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalHistorial(null)}>Cerrar</button></div>
        </Modal>
      )}
    </div>
  );
}
