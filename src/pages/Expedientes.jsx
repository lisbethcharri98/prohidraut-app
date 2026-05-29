import { useState, useEffect, useCallback } from "react";
import { expedientesService } from "../services/expedientes";
import { clientesService } from "../services/clientes";
import { supabase } from "../services/supabase";
import { Modal, EmptyState, Badge, SearchBar, Divider, AlertBanner } from "../components/ui";

// ── CONSTANTES ─────────────────────────────────────────────
const TIPOS_SELLO = ["Sello de labio","Raspador","Anillo guía","O-ring","Junta tórica","Sello rotativo","Otro"];
const MARCAS_SELLO = ["SKF","Parker","Hallite","Nacional","Freudenberg","Simrit","Trelleborg","Otra"];
const CATEGORIAS_OTROS = ["Limpieza","Transporte","Pintura","Herramienta","Consumible","Administrativo","Otro"];
const ORIGENES_PAGO = ["yape","cuenta_prohidraut","caja_chica","efectivo","transferencia"];
const ESTADOS = [
  {id:"borrador",label:"Borrador",color:"#7F8C8D"},
  {id:"cotizado",label:"Cotizado",color:"#E8722A"},
  {id:"en_proceso",label:"En proceso",color:"#3498DB"},
  {id:"entregado",label:"Entregado",color:"#9B59B6"},
  {id:"facturado",label:"Facturado",color:"#1ABC9C"},
  {id:"pagado",label:"Pagado",color:"#27AE60"},
  {id:"garantia",label:"Garantía",color:"#E74C3C"},
  {id:"cancelado",label:"Cancelado",color:"#95A5A6"},
];

const estadoColor = id => ESTADOS.find(e => e.id === id)?.color || "#888";
const estadoLabel = id => ESTADOS.find(e => e.id === id)?.label || id;

// ── MODELOS VACÍOS ─────────────────────────────────────────
const CAB0 = {
  nro_cotizacion:"", nro_oc:"", nro_factura:"",
  cliente_id:"", categoria_id:"", subcategoria_id:"", modelo_id:"",
  marca_equipo:"", descripcion_equipo:"",
  fecha_cotizacion:"", fecha_inicio_obra:"", fecha_finalizacion:"",
  fecha_facturacion:"", fecha_pago:"",
  forma_pago:"15 DIAS UTILES", tiempo_entrega:"7 DIAS UTILES",
  moneda:"USD", tipo_cambio:"", atencion:"",
  estado:"borrador", es_historico:true, notas_internas:"",
  tuvo_reclamo:false, descripcion_reclamo:"",
};
const ITEM0 = { cantidad:1, unidad:"U", descripcion:"", sub_items:[""], precio_unitario:"", precio_total:"", costo_interno:"" };
const SELLO0 = { tipo_sello:"", marca:"", diametro_interno:"", diametro_externo:"", grosor:"", largo_vastago:"", cantidad:1, costo_unitario:"", tiene_factura:false, nro_factura:"", proveedor:"", notas:"" };
const TUBO0 = { tipo:"tubo_brunido", descripcion:"", diametro_interno:"", diametro_externo:"", largo:"", material:"", cantidad:1, costo_unitario:"", tiene_factura:false, nro_factura:"", proveedor:"" };
const OTRO0 = { categoria:"", descripcion:"", cantidad:1, unidad:"unidad", costo_unitario:"", origen_pago:"efectivo", tiene_factura:false, nro_factura:"", proveedor:"" };
const MO0 = { trabajador_id:"", nombre_manual:"", semanas:"", horas_semana:48, costo_hora:"", descripcion:"" };
const RECLAMO0 = { descripcion:"", tipo:"insumo", monto:"", origen_pago:"efectivo", tiene_factura:false, nro_factura:"", fecha:new Date().toISOString().split("T")[0] };

// ── COMPONENTE PRINCIPAL ───────────────────────────────────
export default function ExpedientesPage() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [tab, setTab] = useState("comercial");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [sugerencia, setSugerencia] = useState(null);

  // Estado del formulario
  const [cab, setCab] = useState(CAB0);
  const [items, setItems] = useState([{ ...ITEM0 }]);
  const [sellos, setSellos] = useState([]);
  const [tubos, setTubos] = useState([]);
  const [otrosInsumos, setOtrosInsumos] = useState([]);
  const [manoObra, setManoObra] = useState([]);
  const [gastosReclamo, setGastosReclamo] = useState([]);

  // Modal de categorías
  const [modalCat, setModalCat] = useState(false);
  const [nuevaCat, setNuevaCat] = useState({ cat:"", subcat:"", modelo:"", catId:"", subcatId:"" });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [exp, cl, cats, { data: t }] = await Promise.all([
        expedientesService.getAll(),
        clientesService.getAll(),
        expedientesService.getCategorias(),
        supabase.from("trabajadores").select("id,nombre,sueldo_semanal").eq("activo", true).order("nombre"),
      ]);
      setLista(exp); setClientes(cl); setCategorias(cats); setTrabajadores(t || []);
    } finally { setLoading(false); }
  }

  // Subcategorías del nivel seleccionado
  const subcats = categorias.find(c => c.id === cab.categoria_id)?.subcategorias_servicio || [];
  const modelos = subcats.find(s => s.id === cab.subcategoria_id)?.modelos_servicio || [];

  // Cuando cambia categoría+subcategoría, buscar sugerencias
  useEffect(() => {
    if (cab.categoria_id && !editandoId) {
      expedientesService.getSugerenciasParaNuevo(cab.categoria_id, cab.subcategoria_id, cab.cliente_id)
        .then(s => setSugerencia(s));
    }
  }, [cab.categoria_id, cab.subcategoria_id]);

  function aplicarSugerencia() {
    if (!sugerencia) return;
    if (sugerencia.expediente_items_cotizacion?.length > 0)
      setItems(sugerencia.expediente_items_cotizacion.map(i => ({ ...i, precio_total: "", precio_unitario: "", costo_interno: "" })));
    if (sugerencia.expediente_sellos?.length > 0)
      setSellos(sugerencia.expediente_sellos.map(s => ({ ...s, costo_unitario: "" })));
    if (sugerencia.expediente_tubos_barras?.length > 0)
      setTubos(sugerencia.expediente_tubos_barras.map(t => ({ ...t, costo_unitario: "" })));
    if (sugerencia.expediente_otros_insumos?.length > 0)
      setOtrosInsumos(sugerencia.expediente_otros_insumos.map(o => ({ ...o, costo_unitario: "" })));
    if (sugerencia.expediente_mano_obra?.length > 0)
      setManoObra(sugerencia.expediente_mano_obra.map(m => ({ ...m })));
    setSugerencia(null);
  }

  async function abrirNuevo() {
    const siguienteNro = await expedientesService.getSiguienteNro();
    setEditandoId(null);
    setCab({ ...CAB0, nro_cotizacion: siguienteNro });
    setItems([{ ...ITEM0 }]); setSellos([]); setTubos([]);
    setOtrosInsumos([]); setManoObra([]); setGastosReclamo([]);
    setTab("comercial"); setErr(""); setSugerencia(null);
    setModal(true);
  }

  async function abrirEditar(id) {
    setEditandoId(id);
    const exp = await expedientesService.getById(id);
    setCab({
      nro_cotizacion: exp.nro_cotizacion || "", nro_oc: exp.nro_oc || "", nro_factura: exp.nro_factura || "",
      cliente_id: exp.cliente_id || "", categoria_id: exp.categoria_id || "",
      subcategoria_id: exp.subcategoria_id || "", modelo_id: exp.modelo_id || "",
      marca_equipo: exp.marca_equipo || "", descripcion_equipo: exp.descripcion_equipo || "",
      fecha_cotizacion: exp.fecha_cotizacion || "", fecha_inicio_obra: exp.fecha_inicio_obra || "",
      fecha_finalizacion: exp.fecha_finalizacion || "", fecha_facturacion: exp.fecha_facturacion || "",
      fecha_pago: exp.fecha_pago || "", forma_pago: exp.forma_pago || "15 DIAS UTILES",
      tiempo_entrega: exp.tiempo_entrega || "7 DIAS UTILES", moneda: exp.moneda || "USD",
      tipo_cambio: exp.tipo_cambio || "", atencion: exp.atencion || "",
      estado: exp.estado || "borrador", es_historico: exp.es_historico ?? true,
      notas_internas: exp.notas_internas || "", tuvo_reclamo: exp.tuvo_reclamo || false,
      descripcion_reclamo: exp.descripcion_reclamo || "",
    });
    setItems(exp.expediente_items_cotizacion?.length > 0 ? exp.expediente_items_cotizacion : [{ ...ITEM0 }]);
    setSellos(exp.expediente_sellos || []);
    setTubos(exp.expediente_tubos_barras || []);
    setOtrosInsumos(exp.expediente_otros_insumos || []);
    setManoObra(exp.expediente_mano_obra || []);
    setGastosReclamo(exp.expediente_gastos_reclamo || []);
    setTab("comercial"); setErr(""); setSugerencia(null);
    setModal(true);
  }

  async function guardar() {
    if (!cab.cliente_id) { setErr("Selecciona un cliente"); setTab("comercial"); return; }
    setSaving(true); setErr("");
    try {
      let expId = editandoId;
      if (!editandoId) {
        const nuevo = await expedientesService.create(cab);
        expId = nuevo.id;
      }
      await expedientesService.saveCompleto(expId, { cabecera: cab, items, sellos, tubos, otrosInsumos, manoObra, gastosReclamo });
      setModal(false); cargar();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este expediente?")) return;
    await expedientesService.softDelete(id);
    cargar();
  }

  // Helpers de arrays
  const updItem = (i, k, v) => { const r = [...items]; r[i] = { ...r[i], [k]: v }; if ((k === "precio_unitario" || k === "cantidad") && r[i].precio_unitario) r[i].precio_total = (parseFloat(r[i].cantidad || 1) * parseFloat(r[i].precio_unitario || 0)).toFixed(2); setItems(r); };
  const updSello = (i, k, v) => { const r = [...sellos]; r[i] = { ...r[i], [k]: v }; setSellos(r); };
  const updTubo = (i, k, v) => { const r = [...tubos]; r[i] = { ...r[i], [k]: v }; setTubos(r); };
  const updOtro = (i, k, v) => { const r = [...otrosInsumos]; r[i] = { ...r[i], [k]: v }; setOtrosInsumos(r); };
  const updMO = (i, k, v) => { const r = [...manoObra]; r[i] = { ...r[i], [k]: v }; if (k === "trabajador_id") { const t = trabajadores.find(t => t.id === v); if (t) r[i].costo_hora = (parseFloat(t.sueldo_semanal) / 48).toFixed(2); } setManoObra(r); };
  const updReclamo = (i, k, v) => { const r = [...gastosReclamo]; r[i] = { ...r[i], [k]: v }; setGastosReclamo(r); };
  const updItemSub = (i, j, v) => { const r = [...items]; r[i].sub_items[j] = v; setItems(r); };
  const addItemSub = (i) => { const r = [...items]; r[i].sub_items = [...(r[i].sub_items || []), ""]; setItems(r); };
  const removeItemSub = (i, j) => { const r = [...items]; r[i].sub_items = r[i].sub_items.filter((_, x) => x !== j); setItems(r); };

  // Totales calculados
  const totalCotizacion = items.reduce((s, x) => s + parseFloat(x.precio_total || 0), 0);
  const costoSellos = sellos.reduce((s, x) => s + parseFloat(x.cantidad || 1) * parseFloat(x.costo_unitario || 0), 0);
  const costoTubos = tubos.reduce((s, x) => s + parseFloat(x.cantidad || 1) * parseFloat(x.costo_unitario || 0), 0);
  const costoOtros = otrosInsumos.reduce((s, x) => s + parseFloat(x.cantidad || 1) * parseFloat(x.costo_unitario || 0), 0);
  const costoMO = manoObra.reduce((s, x) => s + parseFloat(x.semanas || 0) * parseFloat(x.horas_semana || 48) * parseFloat(x.costo_hora || 0), 0);
  const costoReclamo = gastosReclamo.reduce((s, x) => s + parseFloat(x.monto || 0), 0);
  const costoTotal = costoSellos + costoTubos + costoOtros + costoMO + costoReclamo;
  const margen = totalCotizacion - costoTotal;
  const margenPct = totalCotizacion > 0 ? ((margen / totalCotizacion) * 100).toFixed(1) : 0;

  const filtrados = lista.filter(e =>
    (!filtroCliente || e.cliente_id === filtroCliente) &&
    (!filtroEstado || e.estado === filtroEstado) &&
    ((e.nro_cotizacion || "").includes(busqueda) ||
     (e.clientes?.razon_social || "").toLowerCase().includes(busqueda.toLowerCase()) ||
     (e.descripcion_equipo || "").toLowerCase().includes(busqueda.toLowerCase()))
  );

  // Guardar nueva categoría
  async function guardarCat() {
    if (nuevaCat.cat && !nuevaCat.catId) {
      const c = await expedientesService.createCategoria(nuevaCat.cat);
      setNuevaCat(p => ({ ...p, catId: c.id }));
    }
    if (nuevaCat.subcat && nuevaCat.catId && !nuevaCat.subcatId) {
      const s = await expedientesService.createSubcategoria(nuevaCat.catId, nuevaCat.subcat);
      setNuevaCat(p => ({ ...p, subcatId: s.id }));
    }
    if (nuevaCat.modelo && nuevaCat.subcatId) {
      await expedientesService.createModelo(nuevaCat.subcatId, nuevaCat.modelo);
    }
    setModalCat(false); setNuevaCat({ cat:"", subcat:"", modelo:"", catId:"", subcatId:"" });
    const cats = await expedientesService.getCategorias();
    setCategorias(cats);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Expedientes de servicio</h2>
          <p className="page-subtitle">{lista.length} expedientes · {lista.filter(e => !e.es_historico).length} activos</p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary btn-sm" onClick={() => setModalCat(true)}><i className="ti ti-category" /> Categorías</button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo expediente</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ width: 220 }}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 160 }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nro, cliente, equipo..." />
      </div>

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        filtrados.length === 0 ? (
          <EmptyState icon="ti-file-description" title="Sin expedientes" subtitle="Crea el primer expediente o carga servicios históricos" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo expediente</button>} />
        ) : (
          <table>
            <thead>
              <tr><th>Nro.</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Fecha cot.</th><th>Total cliente</th><th>Costo interno</th><th>Margen</th><th>Reclamo</th><th></th></tr>
            </thead>
            <tbody>
              {filtrados.map(e => {
                const margenE = parseFloat(e.total_cliente || 0) - parseFloat(e.costo_total_interno || 0);
                const margenPctE = parseFloat(e.total_cliente || 0) > 0 ? ((margenE / parseFloat(e.total_cliente)) * 100).toFixed(0) : 0;
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="mono" style={{ fontWeight: 600 }}>{e.nro_cotizacion || "—"}</div>
                      {e.nro_oc && <div style={{ fontSize: 11, color: "var(--text3)" }}>{e.nro_oc}</div>}
                    </td>
                    <td><strong>{e.clientes?.razon_social || "—"}</strong></td>
                    <td>
                      <div style={{ fontSize: 13 }}>{e.categorias_servicio?.nombre || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{[e.subcategorias_servicio?.nombre, e.modelos_servicio?.nombre].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td><span className="badge" style={{ background: `${estadoColor(e.estado)}22`, color: estadoColor(e.estado) }}>{estadoLabel(e.estado)}</span></td>
                    <td className="mono" style={{ color: "var(--text2)" }}>{e.fecha_cotizacion || "—"}</td>
                    <td className="mono">{e.total_cliente ? `$ ${parseFloat(e.total_cliente).toFixed(2)}` : "—"}</td>
                    <td className="mono" style={{ color: "var(--text2)" }}>{e.costo_total_interno ? `S/ ${parseFloat(e.costo_total_interno).toFixed(2)}` : "—"}</td>
                    <td>{e.total_cliente ? <Badge color={margenPctE >= 40 ? "green" : margenPctE >= 20 ? "warn" : "red"}>{margenPctE}%</Badge> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                    <td>{e.tuvo_reclamo ? <Badge color="red">Sí</Badge> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                    <td>
                      <div className="actions-col">
                        <button className="btn-icon" onClick={() => abrirEditar(e.id)} title="Editar"><i className="ti ti-pencil" /></button>
                        <button className="btn-icon" onClick={() => eliminar(e.id)} style={{ color: "var(--danger)" }} title="Eliminar"><i className="ti ti-trash" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      {/* ── MODAL EXPEDIENTE ────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal modal-wide" style={{ maxWidth: 1000, maxHeight: "95vh" }}>
            {/* Header del modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{editandoId ? `Editando expediente ${cab.nro_cotizacion || ""}` : "Nuevo expediente"}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  {totalCotizacion > 0 && <span>Cotizado: <strong style={{ color: "var(--success)" }}>${totalCotizacion.toFixed(2)}</strong> · Costo: <strong style={{ color: "var(--danger)" }}>S/{costoTotal.toFixed(2)}</strong> · Margen: <strong style={{ color: margen >= 0 ? "var(--success)" : "var(--danger)" }}>{margenPct}%</strong></span>}
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setModal(false)}><i className="ti ti-x" /></button>
            </div>

            {/* Sugerencia de servicio anterior */}
            {sugerencia && (
              <AlertBanner>
                Encontramos un servicio similar anterior (Nro. {sugerencia.nro_cotizacion}, ${parseFloat(sugerencia.total_cliente || 0).toFixed(2)}).
                <button className="btn-sm" style={{ marginLeft: 12, background: "var(--warning)", color: "white", border: "none" }} onClick={aplicarSugerencia}>
                  Usar como base
                </button>
                <button className="btn-ghost btn-sm" onClick={() => setSugerencia(null)} style={{ marginLeft: 4 }}>Ignorar</button>
              </AlertBanner>
            )}

            {/* Tabs */}
            <div className="pill-tabs" style={{ marginBottom: 16 }}>
              {[
                { id: "comercial", label: "📋 Comercial" },
                { id: "items", label: `📄 Ítems (${items.length})` },
                { id: "insumos", label: `🔧 Insumos (${sellos.length + tubos.length + otrosInsumos.length})` },
                { id: "mo", label: `👷 Mano de obra (${manoObra.length})` },
                { id: "reclamo", label: cab.tuvo_reclamo ? "⚠️ Reclamo" : "✅ Sin reclamo" },
              ].map(t => (
                <button key={t.id} className={`pill-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>

            <div style={{ overflowY: "auto", maxHeight: "calc(95vh - 280px)", paddingRight: 4 }}>

              {/* ── TAB COMERCIAL ── */}
              {tab === "comercial" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={cab.es_historico} onChange={e => setCab(p => ({ ...p, es_historico: e.target.checked }))} />
                      Servicio histórico (ya cerrado)
                    </label>
                  </div>

                  <Divider label="Numeración" />
                  <div className="form-row col3">
                    <div className="form-field"><label>Nro. Cotización</label><input value={cab.nro_cotizacion} onChange={e => setCab(p => ({ ...p, nro_cotizacion: e.target.value }))} className="mono" placeholder="9395" /></div>
                    <div className="form-field"><label>Nro. OC</label><input value={cab.nro_oc} onChange={e => setCab(p => ({ ...p, nro_oc: e.target.value }))} className="mono" placeholder="OC-9395" /></div>
                    <div className="form-field"><label>Nro. Factura</label><input value={cab.nro_factura} onChange={e => setCab(p => ({ ...p, nro_factura: e.target.value }))} className="mono" placeholder="F001-00234" /></div>
                  </div>

                  <Divider label="Cliente y servicio" />
                  <div className="form-row col2">
                    <div className="form-field"><label>Cliente *</label>
                      <select value={cab.cliente_id} onChange={e => setCab(p => ({ ...p, cliente_id: e.target.value }))}>
                        <option value="">Seleccionar cliente...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Atención (nombre contacto)</label><input value={cab.atencion} onChange={e => setCab(p => ({ ...p, atencion: e.target.value }))} placeholder="ING. GUSTAVO ENCARNACION" /></div>
                  </div>
                  <div className="form-row col3">
                    <div className="form-field"><label>Categoría de servicio</label>
                      <select value={cab.categoria_id} onChange={e => setCab(p => ({ ...p, categoria_id: e.target.value, subcategoria_id: "", modelo_id: "" }))}>
                        <option value="">Seleccionar...</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Subcategoría</label>
                      <select value={cab.subcategoria_id} onChange={e => setCab(p => ({ ...p, subcategoria_id: e.target.value, modelo_id: "" }))} disabled={!cab.categoria_id}>
                        <option value="">Seleccionar...</option>
                        {subcats.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Modelo</label>
                      <select value={cab.modelo_id} onChange={e => setCab(p => ({ ...p, modelo_id: e.target.value }))} disabled={!cab.subcategoria_id}>
                        <option value="">Seleccionar...</option>
                        {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row col2">
                    <div className="form-field"><label>Marca del equipo</label><input value={cab.marca_equipo} onChange={e => setCab(p => ({ ...p, marca_equipo: e.target.value }))} placeholder="Komatsu, CAT, Volvo..." /></div>
                    <div className="form-field"><label>Descripción del equipo</label><input value={cab.descripcion_equipo} onChange={e => setCab(p => ({ ...p, descripcion_equipo: e.target.value }))} placeholder="Pistón dirección PC200 serie 2024..." /></div>
                  </div>

                  <Divider label="Fechas del ciclo" />
                  <div className="form-row col3">
                    <div className="form-field"><label>Fecha cotización</label><input type="date" value={cab.fecha_cotizacion} onChange={e => setCab(p => ({ ...p, fecha_cotizacion: e.target.value }))} /></div>
                    <div className="form-field"><label>Fecha inicio obra</label><input type="date" value={cab.fecha_inicio_obra} onChange={e => setCab(p => ({ ...p, fecha_inicio_obra: e.target.value }))} /></div>
                    <div className="form-field"><label>Fecha finalización</label><input type="date" value={cab.fecha_finalizacion} onChange={e => setCab(p => ({ ...p, fecha_finalizacion: e.target.value }))} /></div>
                  </div>
                  <div className="form-row col2">
                    <div className="form-field"><label>Fecha facturación</label><input type="date" value={cab.fecha_facturacion} onChange={e => setCab(p => ({ ...p, fecha_facturacion: e.target.value }))} /></div>
                    <div className="form-field"><label>Fecha pago</label><input type="date" value={cab.fecha_pago} onChange={e => setCab(p => ({ ...p, fecha_pago: e.target.value }))} /></div>
                  </div>

                  <Divider label="Condiciones comerciales" />
                  <div className="form-row col4">
                    <div className="form-field"><label>Forma de pago</label><input value={cab.forma_pago} onChange={e => setCab(p => ({ ...p, forma_pago: e.target.value }))} /></div>
                    <div className="form-field"><label>Tiempo de entrega</label><input value={cab.tiempo_entrega} onChange={e => setCab(p => ({ ...p, tiempo_entrega: e.target.value }))} /></div>
                    <div className="form-field"><label>Moneda</label>
                      <select value={cab.moneda} onChange={e => setCab(p => ({ ...p, moneda: e.target.value }))}>
                        <option value="USD">USD</option><option value="PEN">PEN (S/)</option>
                      </select>
                    </div>
                    <div className="form-field"><label>Tipo de cambio</label><input type="number" value={cab.tipo_cambio} onChange={e => setCab(p => ({ ...p, tipo_cambio: e.target.value }))} className="mono" placeholder="3.75" /></div>
                  </div>

                  <Divider label="Estado y notas" />
                  <div className="form-row col2">
                    <div className="form-field"><label>Estado del expediente</label>
                      <select value={cab.estado} onChange={e => setCab(p => ({ ...p, estado: e.target.value }))}>
                        {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-field"><label>Notas internas (no aparecen en PDF)</label><textarea value={cab.notas_internas} onChange={e => setCab(p => ({ ...p, notas_internas: e.target.value }))} rows={2} /></div>
                </div>
              )}

              {/* ── TAB ÍTEMS COTIZACIÓN ── */}
              {tab === "items" && (
                <div>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>
                    Estos ítems aparecen en el PDF que se envía al cliente. El sub-desglose también aparece.
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="insumo-row" style={{ marginBottom: 12 }}>
                      <div className="form-row col3" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Descripción principal *</label><input value={item.descripcion} onChange={e => updItem(i, "descripcion", e.target.value)} placeholder="MANTENIMIENTO DE SISTEMA HIDRAULICO" style={{ textTransform: "uppercase" }} /></div>
                        <div className="form-field"><label>Precio unitario ({cab.moneda})</label><input type="number" value={item.precio_unitario} onChange={e => updItem(i, "precio_unitario", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Total ({cab.moneda})</label><input type="number" value={item.precio_total} onChange={e => updItem(i, "precio_total", e.target.value)} className="mono" /></div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ marginBottom: 6, display: "block" }}>Sub-ítems (COMPRENDE:)</label>
                        {(item.sub_items || []).map((sub, j) => (
                          <div key={j} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                            <input value={sub} onChange={e => updItemSub(i, j, e.target.value)} placeholder="- Desmontaje y cambio de sellos..." style={{ flex: 1 }} />
                            <button className="btn-icon" onClick={() => removeItemSub(i, j)} style={{ color: "var(--danger)", flexShrink: 0 }}><i className="ti ti-x" /></button>
                          </div>
                        ))}
                        <button className="btn-ghost btn-sm" onClick={() => addItemSub(i)}><i className="ti ti-plus" /> Sub-ítem</button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="form-field" style={{ width: 200 }}>
                          <label>Costo interno (no visible)</label>
                          <input type="number" value={item.costo_interno} onChange={e => updItem(i, "costo_interno", e.target.value)} className="mono" placeholder="Costo real de este ítem" />
                        </div>
                        <button className="btn-icon" onClick={() => setItems(items.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /> Eliminar ítem</button>
                      </div>
                    </div>
                  ))}
                  <button className="btn-ghost btn-sm" onClick={() => setItems([...items, { ...ITEM0, sub_items: [""] }])} style={{ marginBottom: 16 }}><i className="ti ti-plus" /> Agregar ítem</button>
                  <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "flex-end", gap: 24 }}>
                    <span style={{ fontSize: 13, color: "var(--text2)" }}>Subtotal: <strong className="mono">{cab.moneda} {totalCotizacion.toFixed(2)}</strong></span>
                    {cab.moneda === "PEN" && <span style={{ fontSize: 13, color: "var(--text2)" }}>IGV (18%): <strong className="mono">S/ {(totalCotizacion * 0.18).toFixed(2)}</strong></span>}
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Total: <strong className="mono" style={{ color: "var(--success)" }}>{cab.moneda} {cab.moneda === "PEN" ? (totalCotizacion * 1.18).toFixed(2) : totalCotizacion.toFixed(2)}</strong></span>
                  </div>
                </div>
              )}

              {/* ── TAB INSUMOS ── */}
              {tab === "insumos" && (
                <div>
                  {/* SELLOS */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Sellos hidráulicos</span>
                    <button className="btn-ghost btn-sm" onClick={() => setSellos([...sellos, { ...SELLO0 }])}><i className="ti ti-plus" /> Agregar sello</button>
                  </div>
                  {sellos.map((s, i) => (
                    <div key={i} className="insumo-row">
                      <div className="form-row col3" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Tipo de sello</label><select value={s.tipo_sello} onChange={e => updSello(i, "tipo_sello", e.target.value)}><option value="">Seleccionar...</option>{TIPOS_SELLO.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div className="form-field"><label>Marca</label><select value={s.marca} onChange={e => updSello(i, "marca", e.target.value)}><option value="">Seleccionar...</option>{MARCAS_SELLO.map(m => <option key={m}>{m}</option>)}</select></div>
                        <div className="form-field"><label>Proveedor</label><input value={s.proveedor} onChange={e => updSello(i, "proveedor", e.target.value)} placeholder="Hidroseal, Lima Sellos..." /></div>
                      </div>
                      <div className="form-row col4" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Ø interno (mm)</label><input type="number" value={s.diametro_interno} onChange={e => updSello(i, "diametro_interno", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Ø externo (mm)</label><input type="number" value={s.diametro_externo} onChange={e => updSello(i, "diametro_externo", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Grosor (mm)</label><input type="number" value={s.grosor} onChange={e => updSello(i, "grosor", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Largo vástago (mm)</label><input type="number" value={s.largo_vastago} onChange={e => updSello(i, "largo_vastago", e.target.value)} className="mono" /></div>
                      </div>
                      <div className="form-row col3" style={{ marginBottom: 0 }}>
                        <div className="form-field"><label>Cantidad</label><input type="number" value={s.cantidad} onChange={e => updSello(i, "cantidad", e.target.value)} /></div>
                        <div className="form-field"><label>Costo unitario (S/)</label><input type="number" value={s.costo_unitario} onChange={e => updSello(i, "costo_unitario", e.target.value)} className="mono" /></div>
                        <div className="form-field">
                          <label>Comprobante</label>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
                              <input type="checkbox" checked={s.tiene_factura} onChange={e => updSello(i, "tiene_factura", e.target.checked)} />
                              Tiene factura
                            </label>
                          </div>
                        </div>
                      </div>
                      {s.tiene_factura && <div className="form-row col2" style={{ marginTop: 8, marginBottom: 0 }}><div className="form-field"><label>Nro. factura</label><input value={s.nro_factura} onChange={e => updSello(i, "nro_factura", e.target.value)} className="mono" /></div></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--text2)" }}>Subtotal: <strong>S/ {(parseFloat(s.cantidad || 1) * parseFloat(s.costo_unitario || 0)).toFixed(2)}</strong></span>
                        <button className="btn-icon" onClick={() => setSellos(sellos.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                      </div>
                    </div>
                  ))}
                  {sellos.length === 0 && <div style={{ color: "var(--text3)", fontSize: 13, padding: "8px 0 16px" }}>Sin sellos registrados</div>}

                  {/* TUBOS Y BARRAS */}
                  <Divider label="Tubos y barras" />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <button className="btn-ghost btn-sm" onClick={() => setTubos([...tubos, { ...TUBO0 }])}><i className="ti ti-plus" /> Agregar tubo/barra</button>
                  </div>
                  {tubos.map((t, i) => (
                    <div key={i} className="insumo-row">
                      <div className="form-row col3" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Tipo</label><select value={t.tipo} onChange={e => updTubo(i, "tipo", e.target.value)}><option value="tubo_brunido">Tubo bruñido</option><option value="barra_cromada">Barra cromada</option><option value="otro">Otro</option></select></div>
                        <div className="form-field"><label>Material</label><input value={t.material} onChange={e => updTubo(i, "material", e.target.value)} placeholder="Acero, inox..." /></div>
                        <div className="form-field"><label>Proveedor</label><input value={t.proveedor} onChange={e => updTubo(i, "proveedor", e.target.value)} /></div>
                      </div>
                      <div className="form-row col4" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Ø interno (mm)</label><input type="number" value={t.diametro_interno} onChange={e => updTubo(i, "diametro_interno", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Ø externo (mm)</label><input type="number" value={t.diametro_externo} onChange={e => updTubo(i, "diametro_externo", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Largo (mm)</label><input type="number" value={t.largo} onChange={e => updTubo(i, "largo", e.target.value)} className="mono" /></div>
                        <div className="form-field"><label>Cantidad</label><input type="number" value={t.cantidad} onChange={e => updTubo(i, "cantidad", e.target.value)} /></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div className="form-field" style={{ width: 150 }}><label>Costo unit. (S/)</label><input type="number" value={t.costo_unitario} onChange={e => updTubo(i, "costo_unitario", e.target.value)} className="mono" /></div>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "var(--text2)", marginTop: 16 }}><input type="checkbox" checked={t.tiene_factura} onChange={e => updTubo(i, "tiene_factura", e.target.checked)} />Tiene factura</label>
                        </div>
                        <button className="btn-icon" onClick={() => setTubos(tubos.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                      </div>
                    </div>
                  ))}
                  {tubos.length === 0 && <div style={{ color: "var(--text3)", fontSize: 13, padding: "4px 0 16px" }}>Sin tubos/barras registrados</div>}

                  {/* OTROS INSUMOS */}
                  <Divider label="Otros insumos y gastos" />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <button className="btn-ghost btn-sm" onClick={() => setOtrosInsumos([...otrosInsumos, { ...OTRO0 }])}><i className="ti ti-plus" /> Agregar gasto</button>
                  </div>
                  {otrosInsumos.map((o, i) => (
                    <div key={i} className="insumo-row">
                      <div className="form-row col3" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Categoría</label><select value={o.categoria} onChange={e => updOtro(i, "categoria", e.target.value)}><option value="">Seleccionar...</option>{CATEGORIAS_OTROS.map(c => <option key={c}>{c}</option>)}</select></div>
                        <div className="form-field"><label>Descripción *</label><input value={o.descripcion} onChange={e => updOtro(i, "descripcion", e.target.value)} placeholder="Trapo industrial, gasolina, pasaje..." /></div>
                        <div className="form-field"><label>Origen pago</label><select value={o.origen_pago} onChange={e => updOtro(i, "origen_pago", e.target.value)}>{ORIGENES_PAGO.map(op => <option key={op} value={op}>{op.replace("_", " ")}</option>)}</select></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                          <div className="form-field" style={{ width: 100 }}><label>Cantidad</label><input type="number" value={o.cantidad} onChange={e => updOtro(i, "cantidad", e.target.value)} /></div>
                          <div className="form-field" style={{ width: 150 }}><label>Costo unit. (S/)</label><input type="number" value={o.costo_unitario} onChange={e => updOtro(i, "costo_unitario", e.target.value)} className="mono" /></div>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "var(--text2)", marginBottom: 4 }}><input type="checkbox" checked={o.tiene_factura} onChange={e => updOtro(i, "tiene_factura", e.target.checked)} />Tiene factura</label>
                          {o.tiene_factura && <div className="form-field" style={{ width: 150 }}><label>Nro. factura</label><input value={o.nro_factura} onChange={e => updOtro(i, "nro_factura", e.target.value)} className="mono" /></div>}
                        </div>
                        <button className="btn-icon" onClick={() => setOtrosInsumos(otrosInsumos.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                      </div>
                    </div>
                  ))}
                  {otrosInsumos.length === 0 && <div style={{ color: "var(--text3)", fontSize: 13, padding: "4px 0" }}>Sin otros gastos registrados</div>}

                  {/* Resumen costos */}
                  <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
                    {[["Sellos", costoSellos], ["Tubos/Barras", costoTubos], ["Otros", costoOtros], ["M. Obra", costoMO], ["Total insumos", costoSellos + costoTubos + costoOtros]].map(([l, v]) => (
                      <div key={l}><div style={{ fontSize: 11, color: "var(--text3)" }}>{l}</div><div className="mono" style={{ fontWeight: 600 }}>S/ {v.toFixed(2)}</div></div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB MANO DE OBRA ── */}
              {tab === "mo" && (
                <div>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>
                    Registra las semanas y horas dedicadas. El costo/hora se calcula automáticamente desde el sueldo semanal.
                  </div>
                  {manoObra.map((m, i) => (
                    <div key={i} className="insumo-row">
                      <div className="form-row col3" style={{ marginBottom: 8 }}>
                        <div className="form-field"><label>Trabajador</label>
                          <select value={m.trabajador_id} onChange={e => updMO(i, "trabajador_id", e.target.value)}>
                            <option value="">Seleccionar o escribir...</option>
                            {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                          </select>
                        </div>
                        <div className="form-field"><label>Nombre manual (histórico)</label><input value={m.nombre_manual} onChange={e => updMO(i, "nombre_manual", e.target.value)} placeholder="Si no está en el sistema" /></div>
                        <div className="form-field"><label>Descripción del trabajo</label><input value={m.descripcion} onChange={e => updMO(i, "descripcion", e.target.value)} placeholder="Tornero, ensamble, limpieza..." /></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div className="form-field" style={{ width: 120 }}><label>Semanas</label><input type="number" value={m.semanas} onChange={e => updMO(i, "semanas", e.target.value)} step={0.5} /></div>
                          <div className="form-field" style={{ width: 140 }}><label>Horas/semana</label><input type="number" value={m.horas_semana} onChange={e => updMO(i, "horas_semana", e.target.value)} /></div>
                          <div className="form-field" style={{ width: 150 }}><label>Costo/hora (S/)</label><input type="number" value={m.costo_hora} onChange={e => updMO(i, "costo_hora", e.target.value)} className="mono" /></div>
                          <div style={{ paddingBottom: 4 }}>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>Total horas</div>
                            <div className="mono" style={{ fontWeight: 600 }}>{((parseFloat(m.semanas || 0)) * (parseFloat(m.horas_semana || 48))).toFixed(0)}h</div>
                          </div>
                          <div style={{ paddingBottom: 4 }}>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>Costo total</div>
                            <div className="mono" style={{ fontWeight: 600, color: "var(--orange)" }}>S/ {(parseFloat(m.semanas || 0) * parseFloat(m.horas_semana || 48) * parseFloat(m.costo_hora || 0)).toFixed(2)}</div>
                          </div>
                        </div>
                        <button className="btn-icon" onClick={() => setManoObra(manoObra.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                      </div>
                    </div>
                  ))}
                  <button className="btn-ghost btn-sm" onClick={() => setManoObra([...manoObra, { ...MO0 }])} style={{ marginBottom: 16 }}><i className="ti ti-plus" /> Agregar persona</button>
                  <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--text2)" }}>Total horas: <strong>{manoObra.reduce((s, m) => s + parseFloat(m.semanas || 0) * parseFloat(m.horas_semana || 48), 0).toFixed(0)}h</strong></span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--orange)" }}>Costo total MO: S/ {costoMO.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* ── TAB RECLAMO ── */}
              {tab === "reclamo" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
                    <input type="checkbox" checked={cab.tuvo_reclamo} onChange={e => setCab(p => ({ ...p, tuvo_reclamo: e.target.checked }))} />
                    <strong>Este servicio tuvo reclamo o garantía</strong>
                  </label>
                  {cab.tuvo_reclamo && (
                    <>
                      <div className="form-field" style={{ marginBottom: 16 }}>
                        <label>Descripción del reclamo</label>
                        <textarea value={cab.descripcion_reclamo} onChange={e => setCab(p => ({ ...p, descripcion_reclamo: e.target.value }))} rows={3} placeholder="Describe el problema que reportó el cliente, qué falló y por qué..." />
                      </div>
                      <Divider label="Gastos adicionales del reclamo" />
                      {gastosReclamo.map((g, i) => (
                        <div key={i} className="insumo-row">
                          <div className="form-row col3" style={{ marginBottom: 8 }}>
                            <div className="form-field"><label>Descripción *</label><input value={g.descripcion} onChange={e => updReclamo(i, "descripcion", e.target.value)} placeholder="Sello reemplazado, visita técnica..." /></div>
                            <div className="form-field"><label>Tipo</label><select value={g.tipo} onChange={e => updReclamo(i, "tipo", e.target.value)}><option value="insumo">Insumo</option><option value="mano_obra">Mano de obra</option><option value="transporte">Transporte</option><option value="otro">Otro</option></select></div>
                            <div className="form-field"><label>Fecha</label><input type="date" value={g.fecha} onChange={e => updReclamo(i, "fecha", e.target.value)} /></div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                              <div className="form-field" style={{ width: 150 }}><label>Monto (S/)</label><input type="number" value={g.monto} onChange={e => updReclamo(i, "monto", e.target.value)} className="mono" /></div>
                              <div className="form-field" style={{ width: 160 }}><label>Origen pago</label><select value={g.origen_pago} onChange={e => updReclamo(i, "origen_pago", e.target.value)}>{ORIGENES_PAGO.map(op => <option key={op} value={op}>{op.replace("_", " ")}</option>)}</select></div>
                            </div>
                            <button className="btn-icon" onClick={() => setGastosReclamo(gastosReclamo.filter((_, x) => x !== i))} style={{ color: "var(--danger)" }}><i className="ti ti-trash" /></button>
                          </div>
                        </div>
                      ))}
                      <button className="btn-ghost btn-sm" onClick={() => setGastosReclamo([...gastosReclamo, { ...RECLAMO0 }])}><i className="ti ti-plus" /> Agregar gasto de reclamo</button>
                      {costoReclamo > 0 && <div style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>Costo total del reclamo: <strong>S/ {costoReclamo.toFixed(2)}</strong></div>}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer con resumen y acciones */}
            <div style={{ borderTop: "1px solid var(--border2)", paddingTop: 12, marginTop: 12 }}>
              {totalCotizacion > 0 && (
                <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 10, marginBottom: 12, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                  <span>Cotizado: <strong style={{ color: "var(--success)" }}>{cab.moneda} {totalCotizacion.toFixed(2)}</strong></span>
                  <span>Insumos: <strong style={{ color: "var(--text)" }}>S/ {(costoSellos + costoTubos + costoOtros).toFixed(2)}</strong></span>
                  <span>MO: <strong style={{ color: "var(--text)" }}>S/ {costoMO.toFixed(2)}</strong></span>
                  <span>Costo total: <strong style={{ color: "var(--danger)" }}>S/ {costoTotal.toFixed(2)}</strong></span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Margen: <strong style={{ color: margen >= 0 ? "var(--success)" : "var(--danger)" }}>{margenPct}%</strong></span>
                </div>
              )}
              {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={guardar} disabled={saving}>
                  {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear expediente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CATEGORÍAS ── */}
      {modalCat && (
        <Modal title="Gestionar categorías de servicio" onClose={() => setModalCat(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>Categorías actuales:</div>
            {categorias.map(cat => (
              <div key={cat.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{cat.nombre}</div>
                {cat.subcategorias_servicio?.map(sub => (
                  <div key={sub.id} style={{ paddingLeft: 16, fontSize: 12, color: "var(--text2)" }}>
                    └ {sub.nombre}
                    {sub.modelos_servicio?.map(m => (
                      <span key={m.id} className="tag" style={{ marginLeft: 6 }}>{m.nombre}</span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <Divider label="Agregar nueva" />
          <div className="form-row col1">
            <div className="form-field"><label>Nueva categoría (ej. "Pistón hidráulico")</label><input value={nuevaCat.cat} onChange={e => setNuevaCat(p => ({ ...p, cat: e.target.value }))} /></div>
            <div className="form-field">
              <label>Subcategoría (ej. "Dirección") — selecciona categoría padre:</label>
              <select value={nuevaCat.catId} onChange={e => setNuevaCat(p => ({ ...p, catId: e.target.value }))}>
                <option value="">Seleccionar categoría...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input style={{ marginTop: 6 }} value={nuevaCat.subcat} onChange={e => setNuevaCat(p => ({ ...p, subcat: e.target.value }))} placeholder="Nombre de la subcategoría" />
            </div>
            <div className="form-field">
              <label>Modelo (ej. "FT") — selecciona subcategoría padre:</label>
              <select value={nuevaCat.subcatId} onChange={e => setNuevaCat(p => ({ ...p, subcatId: e.target.value }))}>
                <option value="">Seleccionar subcategoría...</option>
                {categorias.flatMap(c => c.subcategorias_servicio || []).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <input style={{ marginTop: 6 }} value={nuevaCat.modelo} onChange={e => setNuevaCat(p => ({ ...p, modelo: e.target.value }))} placeholder="Nombre del modelo" />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setModalCat(false)}>Cerrar</button>
            <button className="btn-primary" onClick={guardarCat}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
