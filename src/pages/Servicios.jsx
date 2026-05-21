import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { clientesService } from "../services/clientes";
import { cilindrosService } from "../services/cilindros";
import { almacenService } from "../services/almacen";
import { Modal, EmptyState, SearchBar, Badge, Divider } from "../components/ui";

const FORM0 = { cliente_id: "", cilindro_id: "", fecha_servicio: "", descripcion: "", falla_reportada: "", diagnostico: "", trabajo_realizado: "", costo_estimado: "", costo_real: "", horas_estimadas: "", horas_reales: "", notas: "" };
const INS0 = { categoria_id: "", descripcion: "", medida: "", cantidad: 1, precio_unitario: "", igv: "", precio_total: "" };
const MO0 = { categoria_id: "", trabajador_id: "", descripcion: "", horas_estimadas: "", horas_reales: "", costo_estimado: "", costo_real: "" };

export default function ServiciosPage() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [catInsumos, setCatInsumos] = useState([]);
  const [catMO, setCatMO] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM0);
  const [insumos, setInsumos] = useState([]);
  const [manoObra, setManoObra] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [{ data: s }, cl, ci, { data: t }, cats, { data: cmo }] = await Promise.all([
      supabase.from("servicios_historicos").select("*, clientes(razon_social), cilindros(nombre, marca)").eq("activo", true).order("fecha_servicio", { ascending: false }),
      clientesService.getAll(),
      cilindrosService.getAll(),
      supabase.from("trabajadores").select("id, nombre").eq("activo", true).order("nombre"),
      almacenService.getCategorias(),
      supabase.from("categorias_mano_obra").select("*").order("nombre"),
    ]);
    setLista(s || []); setClientes(cl); setCilindros(ci); setTrabajadores(t || []); setCatInsumos(cats); setCatMO(cmo || []);
    setLoading(false);
  }

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  function updIns(i, k, v) {
    const r = [...insumos]; r[i][k] = v;
    if (k === "precio_unitario" || k === "cantidad") r[i].precio_total = (parseFloat(r[i].cantidad || 1) * parseFloat(r[i].precio_unitario || 0)).toFixed(2);
    setInsumos(r);
  }
  function updMO(i, k, v) { const r = [...manoObra]; r[i][k] = v; setManoObra(r); }

  function abrirNuevo() { setEditando(null); setForm(FORM0); setInsumos([]); setManoObra([]); setModal(true); }
  async function abrirEditar(s) {
    setEditando(s.id);
    setForm({ cliente_id: s.cliente_id || "", cilindro_id: s.cilindro_id || "", fecha_servicio: s.fecha_servicio || "", descripcion: s.descripcion || "", falla_reportada: s.falla_reportada || "", diagnostico: s.diagnostico || "", trabajo_realizado: s.trabajo_realizado || "", costo_estimado: s.costo_estimado || "", costo_real: s.costo_real || "", horas_estimadas: s.horas_estimadas || "", horas_reales: s.horas_reales || "", notas: s.notas || "" });
    const [{ data: ins }, { data: mo }] = await Promise.all([
      supabase.from("historico_insumos").select("*").eq("servicio_historico_id", s.id),
      supabase.from("historico_mano_obra").select("*").eq("servicio_historico_id", s.id),
    ]);
    setInsumos(ins || []); setManoObra(mo || []); setModal(true);
  }

  const totalIns = insumos.reduce((s, i) => s + parseFloat(i.precio_total || 0), 0);
  const totalMO = manoObra.reduce((s, m) => s + parseFloat(m.costo_real || m.costo_estimado || 0), 0);

  async function guardar() {
    if (!form.cliente_id || !form.fecha_servicio || !form.descripcion) return;
    setSaving(true);
    try {
      const payload = { ...form, costo_estimado: parseFloat(form.costo_estimado) || totalIns + totalMO, costo_real: parseFloat(form.costo_real) || totalIns + totalMO, horas_estimadas: parseFloat(form.horas_estimadas) || null, horas_reales: parseFloat(form.horas_reales) || null, cilindro_id: form.cilindro_id || null };
      let sid = editando;
      if (editando) {
        await supabase.from("servicios_historicos").update(payload).eq("id", editando);
        await supabase.from("historico_insumos").delete().eq("servicio_historico_id", editando);
        await supabase.from("historico_mano_obra").delete().eq("servicio_historico_id", editando);
      } else {
        const { data } = await supabase.from("servicios_historicos").insert([payload]).select().single();
        sid = data?.id;
      }
      if (sid) {
        if (insumos.length > 0) await supabase.from("historico_insumos").insert(insumos.map(i => ({ ...i, servicio_historico_id: sid, cantidad: parseFloat(i.cantidad) || 1, precio_unitario: parseFloat(i.precio_unitario) || null, igv: parseFloat(i.igv) || null, precio_total: parseFloat(i.precio_total) || null, categoria_id: i.categoria_id || null })));
        if (manoObra.length > 0) await supabase.from("historico_mano_obra").insert(manoObra.map(m => ({ ...m, servicio_historico_id: sid, horas_estimadas: parseFloat(m.horas_estimadas) || null, horas_reales: parseFloat(m.horas_reales) || null, costo_estimado: parseFloat(m.costo_estimado) || null, costo_real: parseFloat(m.costo_real) || null, trabajador_id: m.trabajador_id || null, categoria_id: m.categoria_id || null })));
      }
      setModal(false); cargar();
    } finally { setSaving(false); }
  }

  async function eliminar(s) {
    if (!confirm(`¿Eliminar este servicio?`)) return;
    await supabase.from("servicios_historicos").update({ activo: false }).eq("id", s.id);
    cargar();
  }

  const filtrados = lista.filter(s =>
    (!filtroCliente || s.cliente_id === filtroCliente) &&
    (s.descripcion || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Servicios históricos</h2>
          <p className="page-subtitle">{lista.length} servicios registrados</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Registrar servicio</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ width: 280 }}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
        </select>
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por descripción..." />
      </div>

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        filtrados.length === 0 ? <EmptyState icon="ti-history" title="Sin servicios registrados" subtitle="Rubén puede ir cargando el historial de trabajos anteriores" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Registrar servicio</button>} /> : (
          <table>
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Descripción</th><th>Falla</th><th>Costo real</th><th>Horas</th><th></th></tr></thead>
            <tbody>
              {filtrados.map(s => (
                <tr key={s.id}>
                  <td className="mono">{s.fecha_servicio}</td>
                  <td><strong>{s.clientes?.razon_social || "—"}</strong></td>
                  <td style={{ color: "var(--text2)" }}>{s.cilindros ? `${s.cilindros.nombre}${s.cilindros.marca ? ` (${s.cilindros.marca})` : ""}` : "—"}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text2)" }}>{s.descripcion}</td>
                  <td>{s.falla_reportada ? <Badge color="warn">{s.falla_reportada.substring(0, 25)}{s.falla_reportada.length > 25 ? "..." : ""}</Badge> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                  <td className="mono">{s.costo_real ? `S/ ${parseFloat(s.costo_real).toFixed(2)}` : s.costo_estimado ? `~S/ ${parseFloat(s.costo_estimado).toFixed(2)}` : "—"}</td>
                  <td style={{ color: "var(--text2)" }}>{s.horas_reales ? `${s.horas_reales}h` : s.horas_estimadas ? `~${s.horas_estimadas}h` : "—"}</td>
                  <td>
                    <div className="actions-col">
                      <button className="btn-icon" onClick={() => abrirEditar(s)} title="Editar"><i className="ti ti-pencil" /></button>
                      <button className="btn-icon" onClick={() => eliminar(s)} style={{ color: "var(--danger)" }} title="Eliminar"><i className="ti ti-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {modal && (
        <Modal title={editando ? "Editar servicio histórico" : "Registrar servicio histórico"} onClose={() => setModal(false)} wide>
          <Divider label="Datos del servicio" />
          <div className="form-row col2">
            <div className="form-field"><label>Cliente *</label><select value={form.cliente_id} onChange={e => upd("cliente_id", e.target.value)}><option value="">Seleccionar cliente...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select></div>
            <div className="form-field"><label>Equipo / Cilindro</label><select value={form.cilindro_id} onChange={e => upd("cilindro_id", e.target.value)}><option value="">Sin especificar</option>{cilindros.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.marca ? ` (${c.marca})` : ""}</option>)}</select></div>
          </div>
          <div className="form-row col2">
            <div className="form-field"><label>Fecha del servicio *</label><input type="date" value={form.fecha_servicio} onChange={e => upd("fecha_servicio", e.target.value)} /></div>
          </div>
          <div className="form-row col1">
            <div className="form-field"><label>Descripción del servicio *</label><textarea value={form.descripcion} onChange={e => upd("descripcion", e.target.value)} rows={2} placeholder="Ej. Cambio de sellos, pulida de vástago, pintura anticorrosiva..." /></div>
            <div className="form-field"><label>Falla reportada por cliente</label><input value={form.falla_reportada} onChange={e => upd("falla_reportada", e.target.value)} placeholder="Ej. Fuga de aceite en vástago" /></div>
            <div className="form-field"><label>Diagnóstico técnico</label><textarea value={form.diagnostico} onChange={e => upd("diagnostico", e.target.value)} rows={2} placeholder="Diagnóstico encontrado al desmontar..." /></div>
            <div className="form-field"><label>Trabajo realizado</label><textarea value={form.trabajo_realizado} onChange={e => upd("trabajo_realizado", e.target.value)} rows={2} placeholder="Descripción detallada del trabajo ejecutado..." /></div>
          </div>

          <Divider label="Insumos utilizados" />
          {insumos.map((ins, i) => (
            <div key={i} className="insumo-row">
              <div className="form-row col3" style={{ marginBottom: 8 }}>
                <div className="form-field"><label>Categoría</label><select value={ins.categoria_id} onChange={e => updIns(i, "categoria_id", e.target.value)}><option value="">Seleccionar...</option>{catInsumos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div className="form-field"><label>Descripción</label><input value={ins.descripcion} onChange={e => updIns(i, "descripcion", e.target.value)} placeholder="Ej. Sello hidráulico" /></div>
                <div className="form-field"><label>Medida</label><input value={ins.medida} onChange={e => updIns(i, "medida", e.target.value)} placeholder="60mm" /></div>
              </div>
              <div className="form-row col3" style={{ marginBottom: 0 }}>
                <div className="form-field"><label>Cantidad</label><input type="number" value={ins.cantidad} onChange={e => updIns(i, "cantidad", e.target.value)} min={1} /></div>
                <div className="form-field"><label>Precio unit. (S/)</label><input type="number" value={ins.precio_unitario} onChange={e => updIns(i, "precio_unitario", e.target.value)} className="mono" /></div>
                <div className="form-field"><label>IGV (S/)</label><input type="number" value={ins.igv} onChange={e => updIns(i, "igv", e.target.value)} className="mono" /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>Total: <strong style={{ color: "var(--success)" }}>S/ {ins.precio_total || "0.00"}</strong></span>
                <button className="btn-icon" onClick={() => setInsumos(insumos.filter((_, j) => j !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
              </div>
            </div>
          ))}
          <button className="btn-ghost btn-sm" onClick={() => setInsumos([...insumos, { ...INS0 }])} style={{ marginBottom: 8 }}><i className="ti ti-plus" /> Agregar insumo</button>

          <Divider label="Mano de obra" />
          {manoObra.map((mo, i) => (
            <div key={i} className="insumo-row">
              <div className="form-row col3" style={{ marginBottom: 8 }}>
                <div className="form-field"><label>Tipo</label><select value={mo.categoria_id} onChange={e => updMO(i, "categoria_id", e.target.value)}><option value="">Seleccionar...</option>{catMO.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div className="form-field"><label>Trabajador</label><select value={mo.trabajador_id} onChange={e => updMO(i, "trabajador_id", e.target.value)}><option value="">Seleccionar...</option>{trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                <div className="form-field"><label>Descripción</label><input value={mo.descripcion} onChange={e => updMO(i, "descripcion", e.target.value)} placeholder="Ej. Torneado vástago" /></div>
              </div>
              <div className="form-row col4" style={{ marginBottom: 0 }}>
                <div className="form-field"><label>Hrs estimadas</label><input type="number" value={mo.horas_estimadas} onChange={e => updMO(i, "horas_estimadas", e.target.value)} step={0.5} /></div>
                <div className="form-field"><label>Hrs reales</label><input type="number" value={mo.horas_reales} onChange={e => updMO(i, "horas_reales", e.target.value)} step={0.5} /></div>
                <div className="form-field"><label>Costo est. (S/)</label><input type="number" value={mo.costo_estimado} onChange={e => updMO(i, "costo_estimado", e.target.value)} className="mono" /></div>
                <div className="form-field"><label>Costo real (S/)</label><input type="number" value={mo.costo_real} onChange={e => updMO(i, "costo_real", e.target.value)} className="mono" /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn-icon" onClick={() => setManoObra(manoObra.filter((_, j) => j !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
              </div>
            </div>
          ))}
          <button className="btn-ghost btn-sm" onClick={() => setManoObra([...manoObra, { ...MO0 }])} style={{ marginBottom: 8 }}><i className="ti ti-plus" /> Agregar mano de obra</button>

          <Divider label="Totales" />
          <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>Insumos: <strong>S/ {totalIns.toFixed(2)}</strong> · MO: <strong>S/ {totalMO.toFixed(2)}</strong></div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--orange)" }}>Total: S/ {(totalIns + totalMO).toFixed(2)}</div>
          </div>

          <div className="form-row col2">
            <div className="form-field"><label>Costo estimado total (S/)</label><input type="number" value={form.costo_estimado} onChange={e => upd("costo_estimado", e.target.value)} className="mono" placeholder={`Calculado: ${(totalIns + totalMO).toFixed(2)}`} /></div>
            <div className="form-field"><label>Costo real total (S/)</label><input type="number" value={form.costo_real} onChange={e => upd("costo_real", e.target.value)} className="mono" /></div>
          </div>
          <div className="form-row col1"><div className="form-field"><label>Notas adicionales</label><textarea value={form.notas} onChange={e => upd("notas", e.target.value)} rows={2} /></div></div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Guardar servicio"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
