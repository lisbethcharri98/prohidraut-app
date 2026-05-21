import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { ocService, ESTADOS_OC, ESTADO_FECHA_MAP } from "../services/oc";
import { clientesService } from "../services/clientes";
import { cilindrosService } from "../services/cilindros";
import { almacenService } from "../services/almacen";
import { Modal, EmptyState, Badge, SearchBar, Divider, AlertBanner } from "../components/ui";

const ORIGENES = ["yape", "cuenta_prohidraut", "caja_chica", "efectivo", "transferencia"];
const TIPOS_GASTO = ["compra_externa", "salida_almacen", "gasto_operativo"];

function estadoColor(estado) {
  return ESTADOS_OC.find(e => e.id === estado)?.color || "#888";
}
function estadoLabel(estado) {
  return ESTADOS_OC.find(e => e.id === estado)?.label || estado;
}

export default function OrdenesPage() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [modalNueva, setModalNueva] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [modalGasto, setModalGasto] = useState(false);

  const FORM_OC0 = { cliente_id: "", cilindro_id: "", falla_reportada: "", ingreso_cotizado: "", costo_estimado: "", tecnico_responsable_id: "", notas: "" };
  const FORM_GASTO0 = { tipo: "compra_externa", descripcion: "", monto: "", origen_pago: "yape", tiene_comprobante: "sin_comprobante", proveedor_ruc: "", proveedor_razon: "", numero_comprobante: "", base_imponible: "", igv_monto: "", producto_almacen_id: "", cantidad_almacen: "", fecha: new Date().toISOString().split("T")[0], notas: "" };

  const [formOC, setFormOC] = useState(FORM_OC0);
  const [formGasto, setFormGasto] = useState(FORM_GASTO0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [ocs, cl, ci, { data: t }, p] = await Promise.all([
      ocService.getAll(),
      clientesService.getAll(),
      cilindrosService.getAll(),
      supabase.from("trabajadores").select("id, nombre").eq("activo", true).order("nombre"),
      almacenService.getProductos(),
    ]);
    setLista(ocs); setClientes(cl); setCilindros(ci); setTrabajadores(t || []); setProductos(p);
    setLoading(false);
  }

  async function abrirDetalle(oc) {
    setModalDetalle(oc);
    const g = await ocService.getGastos(oc.id);
    setGastos(g);
  }

  async function crearOC() {
    if (!formOC.cliente_id) return;
    setSaving(true);
    try {
      const { data: seq } = await supabase.rpc("siguiente_numero");
      const año = new Date().getFullYear();
      const num = String(seq).padStart(3, "0");
      await supabase.from("ordenes_compra").insert([{
        numero: `OC-${año}-${num}`,
        numero_raiz: seq,
        cliente_id: formOC.cliente_id,
        cilindro_id: formOC.cilindro_id || null,
        falla_reportada: formOC.falla_reportada,
        ingreso_cotizado: parseFloat(formOC.ingreso_cotizado) || null,
        costo_estimado: parseFloat(formOC.costo_estimado) || null,
        tecnico_responsable_id: formOC.tecnico_responsable_id || null,
        notas: formOC.notas,
        estado: "recibido",
      }]);
      setModalNueva(false); setFormOC(FORM_OC0); cargar();
    } finally { setSaving(false); }
  }

  async function cambiarEstado(oc, nuevoEstado) {
    const fechaCampo = ESTADO_FECHA_MAP[nuevoEstado];
    await ocService.updateEstado(oc.id, nuevoEstado, fechaCampo);
    cargar();
    if (modalDetalle?.id === oc.id) setModalDetalle({ ...modalDetalle, estado: nuevoEstado });
  }

  async function guardarGasto() {
    if (!formGasto.descripcion || !formGasto.monto) return;
    setSaving(true);
    try {
      await supabase.from("gastos_oc").insert([{
        oc_id: modalDetalle.id,
        tipo: formGasto.tipo,
        descripcion: formGasto.descripcion,
        monto: parseFloat(formGasto.monto),
        origen_pago: formGasto.origen_pago,
        tiene_comprobante: formGasto.tiene_comprobante,
        proveedor_ruc: formGasto.proveedor_ruc || null,
        proveedor_razon: formGasto.proveedor_razon || null,
        numero_comprobante: formGasto.numero_comprobante || null,
        base_imponible: parseFloat(formGasto.base_imponible) || null,
        igv_monto: parseFloat(formGasto.igv_monto) || null,
        producto_almacen_id: formGasto.producto_almacen_id || null,
        cantidad_almacen: parseFloat(formGasto.cantidad_almacen) || null,
        fecha: formGasto.fecha,
        notas: formGasto.notas || null,
      }]);
      // Si es salida de almacén, descontar stock
      if (formGasto.tipo === "salida_almacen" && formGasto.producto_almacen_id && formGasto.cantidad_almacen) {
        const { almacenService } = await import("../services/almacen");
        await almacenService.registrarSalida(formGasto.producto_almacen_id, parseFloat(formGasto.cantidad_almacen), modalDetalle.id, `Asignado a ${modalDetalle.numero}`);
      }
      setModalGasto(false); setFormGasto(FORM_GASTO0);
      const g = await ocService.getGastos(modalDetalle.id);
      setGastos(g);
    } finally { setSaving(false); }
  }

  const updG = (k, v) => setFormGasto(prev => ({ ...prev, [k]: v }));
  const totalGastos = gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);

  const filtrados = lista.filter(oc =>
    (!filtroEstado || oc.estado === filtroEstado) &&
    ((oc.numero || "").toLowerCase().includes(busqueda.toLowerCase()) ||
     (oc.clientes?.razon_social || "").toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Órdenes de compra</h2>
          <p className="page-subtitle">{lista.length} órdenes · {lista.filter(o => !["pagado", "facturado", "cancelado"].includes(o.estado)).length} activas</p>
        </div>
        <button className="btn-primary" onClick={() => setModalNueva(true)}><i className="ti ti-plus" /> Nueva OC</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          {ESTADOS_OC.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por número o cliente..." />
      </div>

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        filtrados.length === 0 ? <EmptyState icon="ti-clipboard-list" title="Sin órdenes de compra" subtitle="Crea la primera OC para comenzar a registrar servicios" action={<button className="btn-primary" onClick={() => setModalNueva(true)}><i className="ti ti-plus" /> Nueva OC</button>} /> : (
          <table>
            <thead><tr><th>Número</th><th>Cliente</th><th>Equipo</th><th>Estado</th><th>Ingreso cotizado</th><th>Gastos</th><th>Recepción</th><th></th></tr></thead>
            <tbody>
              {filtrados.map(oc => (
                <tr key={oc.id}>
                  <td className="mono"><strong>{oc.numero}</strong></td>
                  <td>{oc.clientes?.razon_social || "—"}</td>
                  <td style={{ color: "var(--text2)" }}>{oc.cilindros?.nombre || "—"}</td>
                  <td><span className="badge" style={{ background: `${estadoColor(oc.estado)}22`, color: estadoColor(oc.estado) }}>{estadoLabel(oc.estado)}</span></td>
                  <td className="mono">{oc.ingreso_cotizado ? `S/ ${parseFloat(oc.ingreso_cotizado).toFixed(2)}` : "—"}</td>
                  <td className="mono" style={{ color: "var(--text2)" }}>—</td>
                  <td style={{ color: "var(--text2)" }}>{oc.fecha_recepcion}</td>
                  <td><button className="btn-icon" onClick={() => abrirDetalle(oc)} title="Ver detalle"><i className="ti ti-eye" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {/* Modal nueva OC */}
      {modalNueva && <Modal title="Nueva orden de compra" onClose={() => setModalNueva(false)}>
        <div className="form-row col2">
          <div className="form-field"><label>Cliente *</label><select value={formOC.cliente_id} onChange={e => setFormOC(p => ({ ...p, cliente_id: e.target.value }))}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select></div>
          <div className="form-field"><label>Equipo / Cilindro</label><select value={formOC.cilindro_id} onChange={e => setFormOC(p => ({ ...p, cilindro_id: e.target.value }))}><option value="">Sin especificar</option>{cilindros.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.marca ? ` (${c.marca})` : ""}</option>)}</select></div>
        </div>
        <div className="form-row col1"><div className="form-field"><label>Falla reportada por cliente</label><textarea value={formOC.falla_reportada} onChange={e => setFormOC(p => ({ ...p, falla_reportada: e.target.value }))} rows={2} placeholder="¿Qué problema reporta el cliente?" /></div></div>
        <div className="form-row col2">
          <div className="form-field"><label>Ingreso cotizado (S/)</label><input type="number" value={formOC.ingreso_cotizado} onChange={e => setFormOC(p => ({ ...p, ingreso_cotizado: e.target.value }))} className="mono" /></div>
          <div className="form-field"><label>Costo estimado (S/)</label><input type="number" value={formOC.costo_estimado} onChange={e => setFormOC(p => ({ ...p, costo_estimado: e.target.value }))} className="mono" /></div>
        </div>
        <div className="form-row col2"><div className="form-field"><label>Técnico responsable</label><select value={formOC.tecnico_responsable_id} onChange={e => setFormOC(p => ({ ...p, tecnico_responsable_id: e.target.value }))}><option value="">Sin asignar</option>{trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div></div>
        <div className="form-row col1"><div className="form-field"><label>Notas</label><textarea value={formOC.notas} onChange={e => setFormOC(p => ({ ...p, notas: e.target.value }))} rows={2} /></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalNueva(false)}>Cancelar</button><button className="btn-primary" onClick={crearOC} disabled={saving}>{saving ? "Creando..." : "Crear OC"}</button></div>
      </Modal>}

      {/* Modal detalle OC */}
      {modalDetalle && <Modal title={`Detalle — ${modalDetalle.numero}`} onClose={() => setModalDetalle(null)} wide>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div className="card"><div style={{ fontSize: 11, color: "var(--text2)" }}>Estado</div><div style={{ marginTop: 4 }}><span className="badge" style={{ background: `${estadoColor(modalDetalle.estado)}22`, color: estadoColor(modalDetalle.estado) }}>{estadoLabel(modalDetalle.estado)}</span></div></div>
          <div className="card"><div style={{ fontSize: 11, color: "var(--text2)" }}>Ingreso cotizado</div><div className="mono" style={{ marginTop: 4, fontSize: 16, fontWeight: 600 }}>{modalDetalle.ingreso_cotizado ? `S/ ${parseFloat(modalDetalle.ingreso_cotizado).toFixed(2)}` : "—"}</div></div>
          <div className="card"><div style={{ fontSize: 11, color: "var(--text2)" }}>Total gastos</div><div className="mono" style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "var(--danger)" }}>S/ {totalGastos.toFixed(2)}</div></div>
        </div>

        {modalDetalle.falla_reportada && <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, marginBottom: 16 }}><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>FALLA REPORTADA</div><div style={{ fontSize: 13 }}>{modalDetalle.falla_reportada}</div></div>}

        <Divider label="Cambiar estado operativo" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {ESTADOS_OC.map(e => (
            <button key={e.id} onClick={() => cambiarEstado(modalDetalle, e.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px solid ${e.color}44`, background: modalDetalle.estado === e.id ? `${e.color}22` : "transparent", color: modalDetalle.estado === e.id ? e.color : "var(--text3)", cursor: "pointer", fontWeight: modalDetalle.estado === e.id ? 600 : 400 }}>
              {e.label}
            </button>
          ))}
        </div>

        <Divider label="Gastos registrados" />
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn-primary btn-sm" onClick={() => setModalGasto(true)}><i className="ti ti-plus" /> Agregar gasto</button>
        </div>
        {gastos.length === 0 ? <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 16 }}>Sin gastos registrados</div> : (
          <table>
            <thead><tr><th>Descripción</th><th>Tipo</th><th>Origen</th><th>Comprobante</th><th>Monto</th></tr></thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id}>
                  <td>{g.descripcion}</td>
                  <td><Badge color="gray">{g.tipo.replace("_", " ")}</Badge></td>
                  <td style={{ color: "var(--text2)" }}>{(g.origen_pago || "—").replace("_", " ")}</td>
                  <td><Badge color={g.tiene_comprobante === "factura" ? "blue" : g.tiene_comprobante === "boleta" ? "green" : "gray"}>{g.tiene_comprobante.replace("_", " ")}</Badge></td>
                  <td className="mono">S/ {parseFloat(g.monto).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>Ingreso: <strong className="mono">S/ {parseFloat(modalDetalle.ingreso_cotizado || 0).toFixed(2)}</strong></span>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>Gastos: <strong className="mono" style={{ color: "var(--danger)" }}>S/ {totalGastos.toFixed(2)}</strong></span>
          <span style={{ fontSize: 14, fontWeight: 600, color: parseFloat(modalDetalle.ingreso_cotizado || 0) - totalGastos >= 0 ? "var(--success)" : "var(--danger)" }}>
            Margen: S/ {(parseFloat(modalDetalle.ingreso_cotizado || 0) - totalGastos).toFixed(2)}
          </span>
        </div>

        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalDetalle(null)}>Cerrar</button></div>
      </Modal>}

      {/* Modal agregar gasto */}
      {modalGasto && <Modal title="Registrar gasto" onClose={() => setModalGasto(false)}>
        <div className="form-row col2">
          <div className="form-field"><label>Tipo de gasto</label><select value={formGasto.tipo} onChange={e => updG("tipo", e.target.value)}><option value="compra_externa">Compra externa</option><option value="salida_almacen">Salida de almacén</option><option value="gasto_operativo">Gasto operativo</option></select></div>
          <div className="form-field"><label>Fecha</label><input type="date" value={formGasto.fecha} onChange={e => updG("fecha", e.target.value)} /></div>
        </div>
        <div className="form-row col2">
          <div className="form-field"><label>Descripción *</label><input value={formGasto.descripcion} onChange={e => updG("descripcion", e.target.value)} placeholder="Ej. Sello hidráulico 60mm" /></div>
          <div className="form-field"><label>Monto total (S/) *</label><input type="number" value={formGasto.monto} onChange={e => updG("monto", e.target.value)} className="mono" /></div>
        </div>
        {formGasto.tipo === "salida_almacen" && (
          <div className="form-row col2">
            <div className="form-field"><label>Producto del almacén</label><select value={formGasto.producto_almacen_id} onChange={e => updG("producto_almacen_id", e.target.value)}><option value="">Seleccionar...</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.medida} (Stock: {p.stock_actual})</option>)}</select></div>
            <div className="form-field"><label>Cantidad a descontar</label><input type="number" value={formGasto.cantidad_almacen} onChange={e => updG("cantidad_almacen", e.target.value)} /></div>
          </div>
        )}
        <div className="form-row col2">
          <div className="form-field"><label>Origen del pago</label><select value={formGasto.origen_pago} onChange={e => updG("origen_pago", e.target.value)}>{ORIGENES.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}</select></div>
          <div className="form-field"><label>Comprobante</label><select value={formGasto.tiene_comprobante} onChange={e => updG("tiene_comprobante", e.target.value)}><option value="sin_comprobante">Sin comprobante</option><option value="boleta">Boleta</option><option value="factura">Factura</option></select></div>
        </div>
        {formGasto.tiene_comprobante !== "sin_comprobante" && (
          <div className="form-row col3">
            <div className="form-field"><label>RUC proveedor</label><input value={formGasto.proveedor_ruc} onChange={e => updG("proveedor_ruc", e.target.value)} className="mono" /></div>
            <div className="form-field"><label>Razón social</label><input value={formGasto.proveedor_razon} onChange={e => updG("proveedor_razon", e.target.value)} /></div>
            <div className="form-field"><label>Nro. comprobante</label><input value={formGasto.numero_comprobante} onChange={e => updG("numero_comprobante", e.target.value)} /></div>
          </div>
        )}
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalGasto(false)}>Cancelar</button><button className="btn-primary" onClick={guardarGasto} disabled={saving}>{saving ? "Guardando..." : "Registrar gasto"}</button></div>
      </Modal>}
    </div>
  );
}
