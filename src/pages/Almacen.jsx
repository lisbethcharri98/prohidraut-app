import { useState, useEffect } from "react";
import { almacenService } from "../services/almacen";
import { Modal, EmptyState, SearchBar, Badge, AlertBanner, Divider } from "../components/ui";

const FORM0 = { categoria_id: "", tipo_sello_id: "", nombre: "", medida: "", unidad: "unidad", unidad_custom: "", stock_actual: 0, stock_minimo: 1, precio_costo_promedio: "", precio_venta_ref: "", ubicacion_almacen: "" };
const SELLO0 = { codigo: "", diametro_interno: "", diametro_externo: "", grosor: "", material: "", tipo: "", marca: "", descripcion: "", observaciones: "" };
const UNIDADES = ["unidad", "metro", "juego", "litro", "kg", "pieza", "rollo", "juego de sellos", "Otro (especificar)"];
const MATERIALES_SELLO = ["NBR (Nitrilo)", "PU (Poliuretano)", "PTFE (Teflón)", "FKM (Viton)", "HNBR", "Poliamida", "Otro"];
const TIPOS_SELLO = ["Sello de labio", "O-ring", "Anillo raspador", "Anillo guía", "Anillo de desgaste", "Junta tórica", "Sello rotativo", "Otro"];

export default function AlmacenPage() {
  const [tab, setTab] = useState("productos");
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [sellos, setSellos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Modales productos
  const [modal, setModal] = useState(false);
  const [modalCat, setModalCat] = useState(false);
  const [modalEntrada, setModalEntrada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM0);
  const [nuevaCat, setNuevaCat] = useState("");
  const [entrada, setEntrada] = useState({ cantidad: "", precio_unitario: "" });

  // Modales sellos
  const [modalSello, setModalSello] = useState(false);
  const [editandoSello, setEditandoSello] = useState(null);
  const [formSello, setFormSello] = useState(SELLO0);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        almacenService.getProductos(),
        almacenService.getCategorias(),
        almacenService.getTiposSellos(),
      ]);
      setProductos(p); setCategorias(c); setSellos(s);
    } finally { setLoading(false); }
  }

  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const updS = (k, v) => setFormSello(prev => ({ ...prev, [k]: v }));

  // Productos
  function abrirNuevo() { setEditando(null); setForm(FORM0); setErr(""); setModal(true); }
  function abrirEditar(p) {
    setEditando(p.id);
    setForm({ categoria_id: p.categoria_id || "", tipo_sello_id: p.tipo_sello_id || "", nombre: p.nombre || "", medida: p.medida || "", unidad: UNIDADES.includes(p.unidad) ? p.unidad : "Otro (especificar)", unidad_custom: UNIDADES.includes(p.unidad) ? "" : p.unidad, stock_actual: p.stock_actual || 0, stock_minimo: p.stock_minimo || 1, precio_costo_promedio: p.precio_costo_promedio || "", precio_venta_ref: p.precio_venta_ref || "", ubicacion_almacen: p.ubicacion_almacen || "" });
    setErr(""); setModal(true);
  }

  async function guardarProducto() {
    if (!form.nombre || !form.medida || !form.categoria_id) { setErr("Nombre, medida y categoría son obligatorios"); return; }
    setSaving(true);
    try {
      const unidadFinal = form.unidad === "Otro (especificar)" ? form.unidad_custom : form.unidad;
      const payload = { categoria_id: form.categoria_id, tipo_sello_id: form.tipo_sello_id || null, nombre: form.nombre, medida: form.medida, unidad: unidadFinal, stock_actual: parseFloat(form.stock_actual) || 0, stock_minimo: parseFloat(form.stock_minimo) || 1, precio_costo_promedio: parseFloat(form.precio_costo_promedio) || null, precio_venta_ref: parseFloat(form.precio_venta_ref) || null, ubicacion_almacen: form.ubicacion_almacen || null };
      if (editando) await almacenService.updateProducto(editando, payload);
      else await almacenService.createProducto(payload);
      setModal(false); cargar();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function guardarEntrada() {
    if (!entrada.cantidad) return;
    await almacenService.registrarEntrada(modalEntrada.id, parseFloat(entrada.cantidad), parseFloat(entrada.precio_unitario) || null);
    setModalEntrada(null); setEntrada({ cantidad: "", precio_unitario: "" }); cargar();
  }

  async function guardarCategoria() {
    if (!nuevaCat.trim()) return;
    await almacenService.createCategoria(nuevaCat.trim());
    setNuevaCat(""); setModalCat(false); cargar();
  }

  // Sellos
  function abrirNuevoSello() { setEditandoSello(null); setFormSello(SELLO0); setErr(""); setModalSello(true); }
  function abrirEditarSello(s) {
    setEditandoSello(s.id);
    setFormSello({ codigo: s.codigo || "", diametro_interno: s.diametro_interno || "", diametro_externo: s.diametro_externo || "", grosor: s.grosor || "", material: s.material || "", tipo: s.tipo || "", marca: s.marca || "", descripcion: s.descripcion || "", observaciones: s.observaciones || "" });
    setErr(""); setModalSello(true);
  }

  async function guardarSello() {
    setSaving(true);
    try {
      const payload = { ...formSello, diametro_interno: parseFloat(formSello.diametro_interno) || null, diametro_externo: parseFloat(formSello.diametro_externo) || null, grosor: parseFloat(formSello.grosor) || null };
      if (editandoSello) await almacenService.updateProducto(editandoSello, payload); // reutilizamos update
      else await almacenService.createTipoSello(payload);
      setModalSello(false); cargar();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const bajoStock = productos.filter(p => p.stock_actual <= p.stock_minimo);
  const filtP = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.medida.toLowerCase().includes(busqueda.toLowerCase()) || (p.ubicacion_almacen || "").toLowerCase().includes(busqueda.toLowerCase()));
  const filtS = sellos.filter(s => (s.codigo || "").toLowerCase().includes(busqueda.toLowerCase()) || (s.tipo || "").toLowerCase().includes(busqueda.toLowerCase()) || (s.marca || "").toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      {bajoStock.length > 0 && (
        <AlertBanner>
          <strong>{bajoStock.length} producto(s) bajo stock mínimo:</strong>{" "}
          {bajoStock.map(p => `${p.nombre} ${p.medida}`).join(", ")}
        </AlertBanner>
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">Almacén e inventario</h2>
          <p className="page-subtitle">{productos.length} productos · {sellos.length} tipos de sello</p>
        </div>
        <div className="page-actions">
          {tab === "productos" ? (
            <>
              <button className="btn-secondary btn-sm" onClick={() => setModalCat(true)}><i className="ti ti-tag" /> Categoría</button>
              <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo producto</button>
            </>
          ) : (
            <button className="btn-primary" onClick={abrirNuevoSello}><i className="ti ti-plus" /> Nuevo tipo sello</button>
          )}
        </div>
      </div>

      <div className="pill-tabs">
        <button className={`pill-tab ${tab === "productos" ? "active" : ""}`} onClick={() => setTab("productos")}>Productos</button>
        <button className={`pill-tab ${tab === "sellos" ? "active" : ""}`} onClick={() => setTab("sellos")}>Tipos de sello</button>
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} placeholder={tab === "productos" ? "Buscar por nombre, medida o ubicación..." : "Buscar por código, tipo o marca..."} />

      {tab === "productos" && (
        loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        filtP.length === 0 ? <EmptyState icon="ti-package" title="Sin productos" subtitle="Crea una categoría primero, luego agrega productos" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo producto</button>} /> : (
          <table>
            <thead><tr><th>Categoría</th><th>Producto</th><th>Medida</th><th>Ubicación</th><th>Stock</th><th>Costo prom.</th><th>Precio ref.</th><th></th></tr></thead>
            <tbody>
              {filtP.map(p => (
                <tr key={p.id}>
                  <td style={{ color: "var(--text2)" }}>{p.categorias_insumo?.nombre || "—"}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td className="mono">{p.medida}</td>
                  <td>{p.ubicacion_almacen ? <Badge color="blue">{p.ubicacion_almacen}</Badge> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                  <td><Badge color={p.stock_actual <= p.stock_minimo ? "red" : p.stock_actual <= p.stock_minimo * 2 ? "warn" : "green"}>{p.stock_actual} {p.unidad}</Badge></td>
                  <td className="mono">{p.precio_costo_promedio ? `S/ ${parseFloat(p.precio_costo_promedio).toFixed(2)}` : "—"}</td>
                  <td className="mono">{p.precio_venta_ref ? `S/ ${parseFloat(p.precio_venta_ref).toFixed(2)}` : "—"}</td>
                  <td>
                    <div className="actions-col">
                      <button className="btn-icon" onClick={() => setModalEntrada(p)} title="Registrar entrada"><i className="ti ti-arrow-bar-to-down" /></button>
                      <button className="btn-icon" onClick={() => abrirEditar(p)} title="Editar"><i className="ti ti-pencil" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === "sellos" && (
        filtS.length === 0 ? <EmptyState icon="ti-circles" title="Sin tipos de sello" subtitle="Registra los sellos con sus medidas técnicas" action={<button className="btn-primary" onClick={abrirNuevoSello}><i className="ti ti-plus" /> Nuevo tipo sello</button>} /> : (
          <table>
            <thead><tr><th>Código</th><th>Tipo</th><th>D. interno</th><th>D. externo</th><th>Grosor</th><th>Material</th><th>Marca</th><th></th></tr></thead>
            <tbody>
              {filtS.map(s => (
                <tr key={s.id}>
                  <td className="mono"><strong>{s.codigo || "—"}</strong></td>
                  <td>{s.tipo || "—"}</td>
                  <td className="mono">{s.diametro_interno ? `${s.diametro_interno}mm` : "—"}</td>
                  <td className="mono">{s.diametro_externo ? `${s.diametro_externo}mm` : "—"}</td>
                  <td className="mono">{s.grosor ? `${s.grosor}mm` : "—"}</td>
                  <td style={{ color: "var(--text2)" }}>{s.material || "—"}</td>
                  <td style={{ color: "var(--text2)" }}>{s.marca || "—"}</td>
                  <td><div className="actions-col"><button className="btn-icon" onClick={() => abrirEditarSello(s)}><i className="ti ti-pencil" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Modal producto */}
      {modal && <Modal title={editando ? "Editar producto" : "Nuevo producto"} onClose={() => setModal(false)}>
        {categorias.length === 0 && <AlertBanner>Primero crea una categoría usando el botón "Categoría".</AlertBanner>}
        <div className="form-row col2">
          <div className="form-field"><label>Categoría *</label><select value={form.categoria_id} onChange={e => upd("categoria_id", e.target.value)}><option value="">Seleccionar...</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-field"><label>Nombre *</label><input value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Ej. Sello hidráulico" /></div>
        </div>
        <div className="form-row col3">
          <div className="form-field"><label>Medida *</label><input value={form.medida} onChange={e => upd("medida", e.target.value)} placeholder="Ej. 60mm" /></div>
          <div className="form-field"><label>Unidad</label><select value={form.unidad} onChange={e => upd("unidad", e.target.value)}>{UNIDADES.map(u => <option key={u}>{u}</option>)}</select></div>
          {form.unidad === "Otro (especificar)" && <div className="form-field"><label>Especificar</label><input value={form.unidad_custom} onChange={e => upd("unidad_custom", e.target.value)} /></div>}
        </div>
        <div className="form-row col2">
          <div className="form-field"><label>Ubicación en almacén</label><input value={form.ubicacion_almacen} onChange={e => upd("ubicacion_almacen", e.target.value)} placeholder="Ej. Caja 3, Estante A2" /></div>
          <div className="form-field"><label>Stock mínimo (alerta)</label><input type="number" value={form.stock_minimo} onChange={e => upd("stock_minimo", e.target.value)} /></div>
        </div>
        <div className="form-row col3">
          <div className="form-field"><label>Stock inicial</label><input type="number" value={form.stock_actual} onChange={e => upd("stock_actual", e.target.value)} /></div>
          <div className="form-field"><label>Precio de costo (S/)</label><input type="number" value={form.precio_costo_promedio} onChange={e => upd("precio_costo_promedio", e.target.value)} className="mono" /></div>
          <div className="form-field"><label>Precio venta ref. (S/)</label><input type="number" value={form.precio_venta_ref} onChange={e => upd("precio_venta_ref", e.target.value)} className="mono" /></div>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardarProducto} disabled={saving}>{saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}</button></div>
      </Modal>}

      {/* Modal categoría */}
      {modalCat && <Modal title="Nueva categoría de insumo" onClose={() => setModalCat(false)}>
        <div style={{ marginBottom: 8, fontSize: 13, color: "var(--text2)" }}>Existentes: {categorias.map(c => <span key={c.id} className="tag">{c.nombre}</span>)}</div>
        <div className="form-field"><label>Nombre de la categoría</label><input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} placeholder="Ej. Empaquetadura, Rodamiento..." /></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalCat(false)}>Cancelar</button><button className="btn-primary" onClick={guardarCategoria}>Crear</button></div>
      </Modal>}

      {/* Modal entrada stock */}
      {modalEntrada && <Modal title={`Entrada de stock — ${modalEntrada.nombre} ${modalEntrada.medida}`} onClose={() => setModalEntrada(null)}>
        <div style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>Stock actual: <strong style={{ color: "var(--text)" }}>{modalEntrada.stock_actual} {modalEntrada.unidad}</strong>{modalEntrada.ubicacion_almacen && <span style={{ marginLeft: 8 }}><Badge color="blue">{modalEntrada.ubicacion_almacen}</Badge></span>}</div>
        <div className="form-row col2">
          <div className="form-field"><label>Cantidad a ingresar *</label><input type="number" value={entrada.cantidad} onChange={e => setEntrada({ ...entrada, cantidad: e.target.value })} /></div>
          <div className="form-field"><label>Precio unitario (S/)</label><input type="number" value={entrada.precio_unitario} onChange={e => setEntrada({ ...entrada, precio_unitario: e.target.value })} className="mono" placeholder="Actualiza costo promedio" /></div>
        </div>
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalEntrada(null)}>Cancelar</button><button className="btn-primary" onClick={guardarEntrada}>Registrar entrada</button></div>
      </Modal>}

      {/* Modal tipo sello */}
      {modalSello && <Modal title={editandoSello ? "Editar tipo de sello" : "Nuevo tipo de sello"} onClose={() => setModalSello(false)}>
        <div className="form-row col2">
          <div className="form-field"><label>Código interno</label><input value={formSello.codigo} onChange={e => updS("codigo", e.target.value)} placeholder="Ej. SH-60-80-10" className="mono" /></div>
          <div className="form-field"><label>Marca</label><input value={formSello.marca} onChange={e => updS("marca", e.target.value)} placeholder="SKF, Parker, Hallite..." /></div>
        </div>
        <div className="form-row col2">
          <div className="form-field"><label>Tipo de sello</label><select value={formSello.tipo} onChange={e => updS("tipo", e.target.value)}><option value="">Seleccionar...</option>{TIPOS_SELLO.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-field"><label>Material</label><select value={formSello.material} onChange={e => updS("material", e.target.value)}><option value="">Seleccionar...</option>{MATERIALES_SELLO.map(m => <option key={m}>{m}</option>)}</select></div>
        </div>
        <Divider label="Medidas (mm)" />
        <div className="form-row col3">
          <div className="form-field"><label>Diámetro interno</label><input type="number" value={formSello.diametro_interno} onChange={e => updS("diametro_interno", e.target.value)} className="mono" placeholder="mm" /></div>
          <div className="form-field"><label>Diámetro externo</label><input type="number" value={formSello.diametro_externo} onChange={e => updS("diametro_externo", e.target.value)} className="mono" placeholder="mm" /></div>
          <div className="form-field"><label>Grosor / Altura</label><input type="number" value={formSello.grosor} onChange={e => updS("grosor", e.target.value)} className="mono" placeholder="mm" /></div>
        </div>
        <div className="form-row col1">
          <div className="form-field"><label>Descripción</label><input value={formSello.descripcion} onChange={e => updS("descripcion", e.target.value)} placeholder="Descripción adicional..." /></div>
          <div className="form-field"><label>Observaciones / equivalencias</label><textarea value={formSello.observaciones} onChange={e => updS("observaciones", e.target.value)} rows={2} placeholder="Códigos equivalentes, notas de uso..." /></div>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="modal-actions"><button className="btn-secondary" onClick={() => setModalSello(false)}>Cancelar</button><button className="btn-primary" onClick={guardarSello} disabled={saving}>{saving ? "Guardando..." : editandoSello ? "Guardar cambios" : "Crear tipo sello"}</button></div>
      </Modal>}
    </div>
  );
}
