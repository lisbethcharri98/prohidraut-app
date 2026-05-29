import { useState, useEffect } from "react";
import { expedientesService } from "../services/expedientes";
import { clientesService } from "../services/clientes";
import { supabase } from "../services/supabase";
import { Modal, EmptyState, Badge, SearchBar, Divider, AlertBanner } from "../components/ui";
import CategoriasModal from "../components/CategoriasModal";

// ── CONSTANTES ─────────────────────────────────────────────
const TIPOS_SELLO = ["Sello de labio","Raspador","Anillo guía","O-ring","Junta tórica","Sello rotativo","Otro"];
const MARCAS_SELLO = ["SKF","Parker","Hallite","Nacional","Freudenberg","Simrit","Trelleborg","Otra"];
const CATEGORIAS_OTROS = ["Limpieza","Transporte","Pintura","Herramienta","Consumible","Administrativo","Otro"];
const ORIGENES_PAGO = ["yape","cuenta_prohidraut","caja_chica","efectivo","transferencia"];
const FORMAS_PAGO = ["Contado","15 días útiles","30 días","45 días","60 días","90 días","Otro"];
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
  fecha_cotizacion:"", fecha_inicio_obra:"", fecha_finalizacion:"",
  fecha_facturacion:"", fecha_pago:"",
  forma_pago:"15 días útiles", forma_pago_custom:"",
  moneda:"USD", tipo_cambio:"", atencion:"",
  estado:"borrador", es_historico:true, notas_internas:"",
  tuvo_reclamo:false, descripcion_reclamo:"",
};

// Item = un cilindro con sus propios insumos y MO
const ITEM0 = {
  cantidad:1, unidad:"U",
  descripcion:"",           // nombre del cilindro/trabajo
  descripcion_equipo:"",    // marca/modelo del equipo
  sub_items:[""],           // desglose que ve el cliente
  precio_unitario:"", precio_total:"",
  costo_interno:"",         // calculado automáticamente
  // Insumos de este ítem
  sellos:[], tubos:[], otros_insumos:[],
  // MO de este ítem
  mano_obra:[],
};

const SELLO0 = { tipo_sello:"", marca:"", diametro_interno:"", diametro_externo:"", grosor:"", largo_vastago:"", cantidad:1, costo_unitario:"", tiene_factura:false, nro_factura:"", proveedor:"", notas:"" };
const TUBO0 = { tipo:"tubo_brunido", descripcion:"", diametro_interno:"", diametro_externo:"", largo:"", material:"", cantidad:1, costo_unitario:"", tiene_factura:false, nro_factura:"", proveedor:"" };
const OTRO0 = { categoria:"", descripcion:"", cantidad:1, unidad:"unidad", costo_unitario:"", origen_pago:"efectivo", tiene_factura:false, nro_factura:"", proveedor:"" };
const MO0 = { trabajador_id:"", nombre_manual:"", semanas:"", horas_semana:48, costo_hora:"", descripcion:"" };
const RECLAMO0 = { descripcion:"", tipo:"insumo", monto:"", origen_pago:"efectivo", tiene_factura:false, nro_factura:"", fecha:new Date().toISOString().split("T")[0] };

// ── HELPERS ────────────────────────────────────────────────
function calcCostoItem(item) {
  const sellos = (item.sellos||[]).reduce((s,x) => s + parseFloat(x.cantidad||1)*parseFloat(x.costo_unitario||0), 0);
  const tubos = (item.tubos||[]).reduce((s,x) => s + parseFloat(x.cantidad||1)*parseFloat(x.costo_unitario||0), 0);
  const otros = (item.otros_insumos||[]).reduce((s,x) => s + parseFloat(x.cantidad||1)*parseFloat(x.costo_unitario||0), 0);
  const mo = (item.mano_obra||[]).reduce((s,x) => s + parseFloat(x.semanas||0)*parseFloat(x.horas_semana||48)*parseFloat(x.costo_hora||0), 0);
  return sellos + tubos + otros + mo;
}

function diasHabiles(inicio, fin) {
  if (!inicio || !fin) return null;
  let d = new Date(inicio), f = new Date(fin), dias = 0;
  while (d <= f) { if (d.getDay() !== 0 && d.getDay() !== 6) dias++; d.setDate(d.getDate()+1); }
  return dias;
}

// ── SUBCOMPONENTE: INSUMOS DE UN ÍTEM ─────────────────────
function InsumosItem({ item, itemIdx, updItem }) {
  const [tabI, setTabI] = useState("sellos");

  const updSello = (j,k,v) => { const s=[...(item.sellos||[])]; s[j]={...s[j],[k]:v}; updItem(itemIdx,"sellos",s); };
  const updTubo = (j,k,v) => { const t=[...(item.tubos||[])]; t[j]={...t[j],[k]:v}; updItem(itemIdx,"tubos",t); };
  const updOtro = (j,k,v) => { const o=[...(item.otros_insumos||[])]; o[j]={...o[j],[k]:v}; updItem(itemIdx,"otros_insumos",o); };
  const updMO = (j,k,v) => {
    const m=[...(item.mano_obra||[])]; m[j]={...m[j],[k]:v};
    updItem(itemIdx,"mano_obra",m);
  };

  const costoItem = calcCostoItem(item);

  return (
    <div style={{background:"var(--navy)",borderRadius:8,padding:12,marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div className="pill-tabs" style={{marginBottom:0}}>
          {[
            {id:"sellos",label:`🔵 Sellos (${(item.sellos||[]).length})`},
            {id:"tubos",label:`⬜ Tubos/Barras (${(item.tubos||[]).length})`},
            {id:"otros",label:`📦 Otros (${(item.otros_insumos||[]).length})`},
            {id:"mo",label:`👷 MO (${(item.mano_obra||[]).length})`},
          ].map(t=>(
            <button key={t.id} className={`pill-tab ${tabI===t.id?"active":""}`} onClick={()=>setTabI(t.id)} style={{fontSize:11}}>{t.label}</button>
          ))}
        </div>
        <span style={{fontSize:12,color:"var(--text3)"}}>Costo interno ítem: <strong style={{color:costoItem>0?"var(--orange)":"var(--text2)"}}>S/ {costoItem.toFixed(2)}</strong></span>
      </div>

      {/* SELLOS */}
      {tabI==="sellos" && (
        <div>
          {(item.sellos||[]).map((s,j)=>(
            <div key={j} style={{background:"var(--navy2)",borderRadius:6,padding:10,marginBottom:8}}>
              <div className="form-row col3" style={{marginBottom:6}}>
                <div className="form-field"><label>Tipo</label><select value={s.tipo_sello} onChange={e=>updSello(j,"tipo_sello",e.target.value)}><option value="">Seleccionar...</option>{TIPOS_SELLO.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className="form-field"><label>Marca</label><select value={s.marca} onChange={e=>updSello(j,"marca",e.target.value)}><option value="">Seleccionar...</option>{MARCAS_SELLO.map(m=><option key={m}>{m}</option>)}</select></div>
                <div className="form-field"><label>Proveedor</label><input value={s.proveedor} onChange={e=>updSello(j,"proveedor",e.target.value)} placeholder="Hidroseal..."/></div>
              </div>
              <div className="form-row col4" style={{marginBottom:6}}>
                <div className="form-field"><label>Ø interno (mm)</label><input type="number" value={s.diametro_interno} onChange={e=>updSello(j,"diametro_interno",e.target.value)} className="mono"/></div>
                <div className="form-field"><label>Ø externo (mm)</label><input type="number" value={s.diametro_externo} onChange={e=>updSello(j,"diametro_externo",e.target.value)} className="mono"/></div>
                <div className="form-field"><label>Grosor (mm)</label><input type="number" value={s.grosor} onChange={e=>updSello(j,"grosor",e.target.value)} className="mono"/></div>
                <div className="form-field"><label>L. vástago (mm)</label><input type="number" value={s.largo_vastago} onChange={e=>updSello(j,"largo_vastago",e.target.value)} className="mono"/></div>
              </div>
              <div style={{display:"flex",gap:12,alignItems:"flex-end",justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:10}}>
                  <div className="form-field" style={{width:100}}><label>Cantidad</label><input type="number" value={s.cantidad} onChange={e=>updSello(j,"cantidad",e.target.value)}/></div>
                  <div className="form-field" style={{width:140}}><label>Costo unit. (S/)</label><input type="number" value={s.costo_unitario} onChange={e=>updSello(j,"costo_unitario",e.target.value)} className="mono"/></div>
                  <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:12,color:"var(--text2)",marginBottom:4}}><input type="checkbox" checked={s.tiene_factura} onChange={e=>updSello(j,"tiene_factura",e.target.checked)}/>Factura</label>
                  {s.tiene_factura && <div className="form-field" style={{width:140}}><label>Nro. factura</label><input value={s.nro_factura} onChange={e=>updSello(j,"nro_factura",e.target.value)} className="mono"/></div>}
                  <span style={{fontSize:12,color:"var(--text2)",marginBottom:4,alignSelf:"flex-end"}}>= S/ {(parseFloat(s.cantidad||1)*parseFloat(s.costo_unitario||0)).toFixed(2)}</span>
                </div>
                <button className="btn-icon" onClick={()=>updItem(itemIdx,"sellos",(item.sellos||[]).filter((_,x)=>x!==j))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
              </div>
            </div>
          ))}
          <button className="btn-ghost btn-sm" onClick={()=>updItem(itemIdx,"sellos",[...(item.sellos||[]),{...SELLO0}])}><i className="ti ti-plus"/> Agregar sello</button>
        </div>
      )}

      {/* TUBOS */}
      {tabI==="tubos" && (
        <div>
          {(item.tubos||[]).map((t,j)=>(
            <div key={j} style={{background:"var(--navy2)",borderRadius:6,padding:10,marginBottom:8}}>
              <div className="form-row col3" style={{marginBottom:6}}>
                <div className="form-field"><label>Tipo</label><select value={t.tipo} onChange={e=>updTubo(j,"tipo",e.target.value)}><option value="tubo_brunido">Tubo bruñido</option><option value="barra_cromada">Barra cromada</option><option value="otro">Otro</option></select></div>
                <div className="form-field"><label>Material</label><input value={t.material} onChange={e=>updTubo(j,"material",e.target.value)} placeholder="Acero, inox..."/></div>
                <div className="form-field"><label>Proveedor</label><input value={t.proveedor} onChange={e=>updTubo(j,"proveedor",e.target.value)}/></div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"flex-end",justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:10}}>
                  <div className="form-field" style={{width:110}}><label>Ø int. (mm)</label><input type="number" value={t.diametro_interno} onChange={e=>updTubo(j,"diametro_interno",e.target.value)} className="mono"/></div>
                  <div className="form-field" style={{width:110}}><label>Ø ext. (mm)</label><input type="number" value={t.diametro_externo} onChange={e=>updTubo(j,"diametro_externo",e.target.value)} className="mono"/></div>
                  <div className="form-field" style={{width:110}}><label>Largo (mm)</label><input type="number" value={t.largo} onChange={e=>updTubo(j,"largo",e.target.value)} className="mono"/></div>
                  <div className="form-field" style={{width:100}}><label>Cantidad</label><input type="number" value={t.cantidad} onChange={e=>updTubo(j,"cantidad",e.target.value)}/></div>
                  <div className="form-field" style={{width:140}}><label>Costo unit. (S/)</label><input type="number" value={t.costo_unitario} onChange={e=>updTubo(j,"costo_unitario",e.target.value)} className="mono"/></div>
                  <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:12,color:"var(--text2)",marginBottom:4}}><input type="checkbox" checked={t.tiene_factura} onChange={e=>updTubo(j,"tiene_factura",e.target.checked)}/>Factura</label>
                </div>
                <button className="btn-icon" onClick={()=>updItem(itemIdx,"tubos",(item.tubos||[]).filter((_,x)=>x!==j))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
              </div>
            </div>
          ))}
          <button className="btn-ghost btn-sm" onClick={()=>updItem(itemIdx,"tubos",[...(item.tubos||[]),{...TUBO0}])}><i className="ti ti-plus"/> Agregar tubo/barra</button>
        </div>
      )}

      {/* OTROS */}
      {tabI==="otros" && (
        <div>
          {(item.otros_insumos||[]).map((o,j)=>(
            <div key={j} style={{background:"var(--navy2)",borderRadius:6,padding:10,marginBottom:8}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-end",justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <div className="form-field" style={{width:140}}><label>Categoría</label><select value={o.categoria} onChange={e=>updOtro(j,"categoria",e.target.value)}><option value="">Seleccionar...</option>{CATEGORIAS_OTROS.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div className="form-field" style={{width:200}}><label>Descripción *</label><input value={o.descripcion} onChange={e=>updOtro(j,"descripcion",e.target.value)} placeholder="Trapo, gasolina, pasaje..."/></div>
                  <div className="form-field" style={{width:90}}><label>Cantidad</label><input type="number" value={o.cantidad} onChange={e=>updOtro(j,"cantidad",e.target.value)}/></div>
                  <div className="form-field" style={{width:130}}><label>Costo unit. (S/)</label><input type="number" value={o.costo_unitario} onChange={e=>updOtro(j,"costo_unitario",e.target.value)} className="mono"/></div>
                  <div className="form-field" style={{width:140}}><label>Origen pago</label><select value={o.origen_pago} onChange={e=>updOtro(j,"origen_pago",e.target.value)}>{ORIGENES_PAGO.map(op=><option key={op} value={op}>{op.replace("_"," ")}</option>)}</select></div>
                  <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:12,color:"var(--text2)",marginBottom:4}}><input type="checkbox" checked={o.tiene_factura} onChange={e=>updOtro(j,"tiene_factura",e.target.checked)}/>Factura</label>
                  {o.tiene_factura && <div className="form-field" style={{width:140}}><label>Nro. factura</label><input value={o.nro_factura} onChange={e=>updOtro(j,"nro_factura",e.target.value)} className="mono"/></div>}
                </div>
                <button className="btn-icon" onClick={()=>updItem(itemIdx,"otros_insumos",(item.otros_insumos||[]).filter((_,x)=>x!==j))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
              </div>
            </div>
          ))}
          <button className="btn-ghost btn-sm" onClick={()=>updItem(itemIdx,"otros_insumos",[...(item.otros_insumos||[]),{...OTRO0}])}><i className="ti ti-plus"/> Agregar gasto</button>
        </div>
      )}

      {/* MO */}
      {tabI==="mo" && (
        <div>
          {(item.mano_obra||[]).map((m,j)=>(
            <div key={j} style={{background:"var(--navy2)",borderRadius:6,padding:10,marginBottom:8}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <div className="form-field" style={{width:180}}><label>Trabajador</label>
                    <select value={m.trabajador_id} onChange={e=>updMO(j,"trabajador_id",e.target.value)}>
                      <option value="">Seleccionar...</option>
                    </select>
                  </div>
                  <div className="form-field" style={{width:160}}><label>Nombre manual (histórico)</label><input value={m.nombre_manual} onChange={e=>updMO(j,"nombre_manual",e.target.value)} placeholder="Si no está en sistema"/></div>
                  <div className="form-field" style={{width:140}}><label>Descripción</label><input value={m.descripcion} onChange={e=>updMO(j,"descripcion",e.target.value)} placeholder="Tornero, ensamble..."/></div>
                  <div className="form-field" style={{width:100}}><label>Semanas</label><input type="number" value={m.semanas} onChange={e=>updMO(j,"semanas",e.target.value)} step={0.5}/></div>
                  <div className="form-field" style={{width:110}}><label>Hrs/semana</label><input type="number" value={m.horas_semana} onChange={e=>updMO(j,"horas_semana",e.target.value)}/></div>
                  <div className="form-field" style={{width:130}}><label>Costo/hora (S/)</label><input type="number" value={m.costo_hora} onChange={e=>updMO(j,"costo_hora",e.target.value)} className="mono"/></div>
                  <div style={{paddingBottom:4}}>
                    <div style={{fontSize:11,color:"var(--text3)"}}>Total</div>
                    <div className="mono" style={{fontWeight:600,color:"var(--orange)"}}>S/ {(parseFloat(m.semanas||0)*parseFloat(m.horas_semana||48)*parseFloat(m.costo_hora||0)).toFixed(2)}</div>
                  </div>
                </div>
                <button className="btn-icon" onClick={()=>updItem(itemIdx,"mano_obra",(item.mano_obra||[]).filter((_,x)=>x!==j))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
              </div>
            </div>
          ))}
          <button className="btn-ghost btn-sm" onClick={()=>updItem(itemIdx,"mano_obra",[...(item.mano_obra||[]),{...MO0}])}><i className="ti ti-plus"/> Agregar persona</button>
        </div>
      )}
    </div>
  );
}

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
  const [itemExpandido, setItemExpandido] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [sugerencia, setSugerencia] = useState(null);
  const [cab, setCab] = useState(CAB0);
  const [items, setItems] = useState([{...ITEM0, sub_items:[""]}]);
  const [gastosReclamo, setGastosReclamo] = useState([]);
  const [modalCat, setModalCat] = useState(false);
  const [nuevaCat, setNuevaCat] = useState({cat:"",subcat:"",modelo:"",catId:"",subcatId:""});

  useEffect(()=>{ cargar(); },[]);

  async function cargar() {
    setLoading(true);
    try {
      const [exp, cl, cats, {data:t}] = await Promise.all([
        expedientesService.getAll(),
        clientesService.getAll(),
        expedientesService.getCategorias(),
        supabase.from("trabajadores").select("id,nombre,sueldo_semanal,puesto").eq("activo",true).order("nombre"),
      ]);
      setLista(exp); setClientes(cl); setCategorias(cats); setTrabajadores(t||[]);
    } finally { setLoading(false); }
  }

  const subcats = categorias.find(c=>c.id===cab.categoria_id)?.subcategorias_servicio || [];
  const modelos = subcats.find(s=>s.id===cab.subcategoria_id)?.modelos_servicio || [];

  useEffect(()=>{
    if(cab.categoria_id && !editandoId) {
      expedientesService.getSugerenciasParaNuevo(cab.categoria_id, cab.subcategoria_id, cab.cliente_id)
        .then(s=>setSugerencia(s));
    }
  },[cab.categoria_id, cab.subcategoria_id]);

  function aplicarSugerencia() {
    if(!sugerencia) return;
    if(sugerencia.expediente_items_cotizacion?.length>0)
      setItems(sugerencia.expediente_items_cotizacion.map(i=>({...ITEM0,...i,precio_total:"",precio_unitario:"",costo_interno:"",sellos:[],tubos:[],otros_insumos:[],mano_obra:[],sub_items:i.sub_items||[""]})));
    setSugerencia(null);
  }

  async function abrirNuevo() {
    const sig = await expedientesService.getSiguienteNro();
    setEditandoId(null);
    setCab({...CAB0, nro_cotizacion:sig});
    setItems([{...ITEM0, sub_items:[""]}]);
    setGastosReclamo([]);
    setTab("comercial"); setItemExpandido(0); setErr(""); setSugerencia(null);
    setModal(true);
  }

  async function abrirEditar(id) {
    setEditandoId(id);
    const exp = await expedientesService.getById(id);
    setCab({
      nro_cotizacion:exp.nro_cotizacion||"", nro_oc:exp.nro_oc||"", nro_factura:exp.nro_factura||"",
      cliente_id:exp.cliente_id||"", categoria_id:exp.categoria_id||"",
      subcategoria_id:exp.subcategoria_id||"", modelo_id:exp.modelo_id||"",
      fecha_cotizacion:exp.fecha_cotizacion||"", fecha_inicio_obra:exp.fecha_inicio_obra||"",
      fecha_finalizacion:exp.fecha_finalizacion||"", fecha_facturacion:exp.fecha_facturacion||"",
      fecha_pago:exp.fecha_pago||"", forma_pago:exp.forma_pago||"15 días útiles",
      forma_pago_custom:"", moneda:exp.moneda||"USD", tipo_cambio:exp.tipo_cambio||"",
      atencion:exp.atencion||"", estado:exp.estado||"borrador",
      es_historico:exp.es_historico??true, notas_internas:exp.notas_internas||"",
      tuvo_reclamo:exp.tuvo_reclamo||false, descripcion_reclamo:exp.descripcion_reclamo||"",
    });
    // Reconstruir items con sus insumos
    const itemsBase = exp.expediente_items_cotizacion?.length>0
      ? exp.expediente_items_cotizacion.map(i=>({...ITEM0,...i,sellos:[],tubos:[],otros_insumos:[],mano_obra:[],sub_items:i.sub_items||[""]}))
      : [{...ITEM0,sub_items:[""]}];
    setItems(itemsBase);
    setGastosReclamo(exp.expediente_gastos_reclamo||[]);
    setTab("comercial"); setItemExpandido(0); setErr(""); setSugerencia(null);
    setModal(true);
  }

  const updItem = (i,k,v) => {
    const r=[...items]; r[i]={...r[i],[k]:v};
    if((k==="precio_unitario"||k==="cantidad")&&r[i].precio_unitario)
      r[i].precio_total=(parseFloat(r[i].cantidad||1)*parseFloat(r[i].precio_unitario||0)).toFixed(2);
    // Recalcular costo interno
    r[i].costo_interno = calcCostoItem(r[i]).toFixed(2);
    setItems(r);
  };

  const updItemSub = (i,j,v) => { const r=[...items]; r[i].sub_items[j]=v; setItems(r); };
  const addItemSub = (i) => { const r=[...items]; r[i].sub_items=[...(r[i].sub_items||[]),""]; setItems(r); };
  const removeItemSub = (i,j) => { const r=[...items]; r[i].sub_items=r[i].sub_items.filter((_,x)=>x!==j); setItems(r); };
  const updReclamo = (i,k,v) => { const r=[...gastosReclamo]; r[i]={...r[i],[k]:v}; setGastosReclamo(r); };

  const totalCotizacion = items.reduce((s,x)=>s+parseFloat(x.precio_total||0),0);
  const costoTotal = items.reduce((s,x)=>s+calcCostoItem(x),0);
  const costoReclamo = gastosReclamo.reduce((s,x)=>s+parseFloat(x.monto||0),0);
  const margen = totalCotizacion - costoTotal - costoReclamo;
  const margenPct = totalCotizacion>0?((margen/totalCotizacion)*100).toFixed(1):0;
  const diasObra = diasHabiles(cab.fecha_inicio_obra, cab.fecha_finalizacion);

  async function guardar() {
    if(!cab.cliente_id){setErr("Selecciona un cliente");setTab("comercial");return;}
    setSaving(true); setErr("");
    try {
      // Preparar payload con items que incluyen insumos internos
      const cabPayload = {
        ...cab,
        forma_pago: cab.forma_pago==="Otro"?cab.forma_pago_custom:cab.forma_pago,
        costo_insumos: costoTotal,
        costo_otros_gastos: costoReclamo,
        subtotal_cliente: totalCotizacion,
        igv_cliente: cab.moneda==="PEN"?totalCotizacion*0.18:0,
        total_cliente: cab.moneda==="PEN"?totalCotizacion*1.18:totalCotizacion,
      };
      let expId = editandoId;
      if(!editandoId) {
        const nuevo = await expedientesService.create(cabPayload);
        expId = nuevo.id;
      } else {
        await expedientesService.update(expId, cabPayload);
      }
      // Guardar items (sin insumos por ahora — estructura simplificada)
      await expedientesService.saveItemsCotizacion(expId, items.map((it,i)=>({...it, item_numero:i+1})));
      await expedientesService.saveGastosReclamo(expId, gastosReclamo);
      setModal(false); cargar();
    } catch(e){setErr(e.message);}
    finally{setSaving(false);}
  }

  async function eliminar(id) {
    if(!confirm("¿Eliminar este expediente?")) return;
    await expedientesService.softDelete(id); cargar();
  }

  async function guardarCat() {
    let catId = nuevaCat.catId;
    if(nuevaCat.cat && !catId) { const c=await expedientesService.createCategoria(nuevaCat.cat); catId=c.id; }
    let subcatId = nuevaCat.subcatId;
    if(nuevaCat.subcat && catId && !subcatId) { const s=await expedientesService.createSubcategoria(catId,nuevaCat.subcat); subcatId=s.id; }
    if(nuevaCat.modelo && subcatId) await expedientesService.createModelo(subcatId,nuevaCat.modelo);
    setModalCat(false); setNuevaCat({cat:"",subcat:"",modelo:"",catId:"",subcatId:""});
    const cats=await expedientesService.getCategorias(); setCategorias(cats);
  }

  const filtrados = lista.filter(e=>
    (!filtroCliente||e.cliente_id===filtroCliente)&&
    (!filtroEstado||e.estado===filtroEstado)&&
    ((e.nro_cotizacion||"").includes(busqueda)||
     (e.clientes?.razon_social||"").toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Expedientes de servicio</h2><p className="page-subtitle">{lista.length} expedientes · {lista.filter(e=>!e.es_historico).length} activos</p></div>
        <div className="page-actions">
          <button className="btn-secondary btn-sm" onClick={()=>setModalCat(true)}><i className="ti ti-category"/> Categorías</button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Nuevo expediente</button>
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} style={{width:220}}>
          <option value="">Todos los clientes</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}
        </select>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} style={{width:160}}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nro, cliente..."/>
      </div>

      {loading?<div className="empty-state"><i className="ti ti-loader-2"/></div>:
        filtrados.length===0?<EmptyState icon="ti-file-description" title="Sin expedientes" subtitle="Crea el primer expediente o carga servicios históricos" action={<button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Nuevo expediente</button>}/>:(
        <table>
          <thead><tr><th>Nro.</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Fecha cot.</th><th>Total</th><th>Costo</th><th>Margen</th><th></th></tr></thead>
          <tbody>
            {filtrados.map(e=>{
              const mg=parseFloat(e.total_cliente||0)-parseFloat(e.costo_total_interno||0);
              const mgP=parseFloat(e.total_cliente||0)>0?((mg/parseFloat(e.total_cliente))*100).toFixed(0):0;
              return(
                <tr key={e.id}>
                  <td><div className="mono" style={{fontWeight:600}}>{e.nro_cotizacion||"—"}</div>{e.nro_oc&&<div style={{fontSize:11,color:"var(--text3)"}}>{e.nro_oc}</div>}</td>
                  <td><strong>{e.clientes?.razon_social||"—"}</strong></td>
                  <td><div style={{fontSize:13}}>{e.categorias_servicio?.nombre||"—"}</div><div style={{fontSize:11,color:"var(--text3)"}}>{[e.subcategorias_servicio?.nombre,e.modelos_servicio?.nombre].filter(Boolean).join(" · ")}</div></td>
                  <td><span className="badge" style={{background:`${estadoColor(e.estado)}22`,color:estadoColor(e.estado)}}>{estadoLabel(e.estado)}</span></td>
                  <td className="mono" style={{color:"var(--text2)"}}>{e.fecha_cotizacion||"—"}</td>
                  <td className="mono">{e.total_cliente?`${e.moneda||"$"} ${parseFloat(e.total_cliente).toFixed(2)}`:"—"}</td>
                  <td className="mono" style={{color:"var(--text2)"}}>{e.costo_total_interno?`S/ ${parseFloat(e.costo_total_interno).toFixed(2)}`:"—"}</td>
                  <td>{e.total_cliente?<Badge color={mgP>=40?"green":mgP>=20?"warn":"red"}>{mgP}%</Badge>:<span style={{color:"var(--text3)"}}>—</span>}</td>
                  <td><div className="actions-col">
                    <button className="btn-icon" onClick={()=>abrirEditar(e.id)} title="Editar"><i className="ti ti-pencil"/></button>
                    <button className="btn-icon" onClick={()=>eliminar(e.id)} style={{color:"var(--danger)"}} title="Eliminar"><i className="ti ti-trash"/></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── MODAL EXPEDIENTE ── */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal modal-wide" style={{maxWidth:1020,maxHeight:"96vh"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:600}}>{editandoId?`Editando ${cab.nro_cotizacion||"expediente"}`:"Nuevo expediente"}</div>
                {totalCotizacion>0&&<div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>
                  Total: <strong style={{color:"var(--success)"}}>{cab.moneda} {totalCotizacion.toFixed(2)}</strong> · Costo: <strong style={{color:"var(--danger)"}}>S/ {costoTotal.toFixed(2)}</strong> · Margen: <strong style={{color:margen>=0?"var(--success)":"var(--danger)"}}>{margenPct}%</strong>
                </div>}
              </div>
              <button className="btn-ghost btn-sm" onClick={()=>setModal(false)}><i className="ti ti-x"/></button>
            </div>

            {sugerencia&&(
              <AlertBanner>
                Servicio similar anterior: Nro. {sugerencia.nro_cotizacion}
                <button className="btn-sm" style={{marginLeft:12,background:"var(--warning)",color:"white",border:"none"}} onClick={aplicarSugerencia}>Usar como base</button>
                <button className="btn-ghost btn-sm" onClick={()=>setSugerencia(null)}>Ignorar</button>
              </AlertBanner>
            )}

            <div className="pill-tabs" style={{marginBottom:16}}>
              {[
                {id:"comercial",label:"📋 Comercial"},
                {id:"items",label:`🔧 Ítems / Cilindros (${items.length})`},
                {id:"reclamo",label:cab.tuvo_reclamo?"⚠️ Reclamo":"✅ Sin reclamo"},
              ].map(t=>(
                <button key={t.id} className={`pill-tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
              ))}
            </div>

            <div style={{overflowY:"auto",maxHeight:"calc(96vh - 260px)",paddingRight:4}}>

              {/* ── TAB COMERCIAL ── */}
              {tab==="comercial"&&(
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,marginBottom:12}}>
                    <input type="checkbox" checked={cab.es_historico} onChange={e=>setCab(p=>({...p,es_historico:e.target.checked}))}/>
                    Servicio histórico (ya cerrado)
                  </label>

                  <Divider label="Numeración"/>
                  <div className="form-row col3">
                    <div className="form-field"><label>Nro. Cotización</label><input value={cab.nro_cotizacion} onChange={e=>setCab(p=>({...p,nro_cotizacion:e.target.value}))} className="mono" placeholder="9395"/></div>
                    <div className="form-field"><label>Nro. OC</label><input value={cab.nro_oc} onChange={e=>setCab(p=>({...p,nro_oc:e.target.value}))} className="mono" placeholder="OC-9395"/></div>
                    <div className="form-field"><label>Nro. Factura</label><input value={cab.nro_factura} onChange={e=>setCab(p=>({...p,nro_factura:e.target.value}))} className="mono" placeholder="F001-00234"/></div>
                  </div>

                  <Divider label="Cliente y servicio"/>
                  <div className="form-row col2">
                    <div className="form-field"><label>Cliente *</label>
                      <select value={cab.cliente_id} onChange={e=>setCab(p=>({...p,cliente_id:e.target.value}))}>
                        <option value="">Seleccionar cliente...</option>
                        {clientes.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Atención (contacto)</label><input value={cab.atencion} onChange={e=>setCab(p=>({...p,atencion:e.target.value}))} placeholder="ING. GUSTAVO ENCARNACION"/></div>
                  </div>
                  <div className="form-row col3">
                    <div className="form-field"><label>Categoría de servicio</label>
                      <select value={cab.categoria_id} onChange={e=>setCab(p=>({...p,categoria_id:e.target.value,subcategoria_id:"",modelo_id:""}))}>
                        <option value="">Seleccionar...</option>
                        {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Subcategoría</label>
                      <select value={cab.subcategoria_id} onChange={e=>setCab(p=>({...p,subcategoria_id:e.target.value,modelo_id:""}))} disabled={subcats.length===0}>
                        <option value="">Seleccionar...</option>
                        {subcats.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-field"><label>Modelo</label>
                      <select value={cab.modelo_id} onChange={e=>setCab(p=>({...p,modelo_id:e.target.value}))} disabled={modelos.length===0}>
                        <option value="">Seleccionar...</option>
                        {modelos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <Divider label="Fechas del ciclo"/>
                  <div className="form-row col3">
                    <div className="form-field"><label>Fecha cotización</label><input type="date" value={cab.fecha_cotizacion} onChange={e=>setCab(p=>({...p,fecha_cotizacion:e.target.value}))}/></div>
                    <div className="form-field"><label>Fecha inicio obra</label><input type="date" value={cab.fecha_inicio_obra} onChange={e=>setCab(p=>({...p,fecha_inicio_obra:e.target.value}))}/></div>
                    <div className="form-field"><label>Fecha finalización</label><input type="date" value={cab.fecha_finalizacion} onChange={e=>setCab(p=>({...p,fecha_finalizacion:e.target.value}))}/></div>
                  </div>
                  {diasObra&&<div style={{fontSize:12,color:"var(--steel)",marginBottom:8,marginTop:-4}}>⏱ Días hábiles trabajados: <strong>{diasObra} días</strong></div>}
                  <div className="form-row col2">
                    <div className="form-field"><label>Fecha facturación</label><input type="date" value={cab.fecha_facturacion} onChange={e=>setCab(p=>({...p,fecha_facturacion:e.target.value}))}/></div>
                    <div className="form-field"><label>Fecha pago</label><input type="date" value={cab.fecha_pago} onChange={e=>setCab(p=>({...p,fecha_pago:e.target.value}))}/></div>
                  </div>

                  <Divider label="Condiciones comerciales"/>
                  <div className="form-row col3">
                    <div className="form-field"><label>Forma de pago</label>
                      <select value={cab.forma_pago} onChange={e=>setCab(p=>({...p,forma_pago:e.target.value}))}>
                        {FORMAS_PAGO.map(f=><option key={f}>{f}</option>)}
                      </select>
                      {cab.forma_pago==="Otro"&&<input style={{marginTop:6}} value={cab.forma_pago_custom} onChange={e=>setCab(p=>({...p,forma_pago_custom:e.target.value}))} placeholder="Especificar..."/>}
                    </div>
                    <div className="form-field"><label>Moneda</label>
                      <select value={cab.moneda} onChange={e=>setCab(p=>({...p,moneda:e.target.value}))}>
                        <option value="USD">USD</option><option value="PEN">PEN (S/)</option>
                      </select>
                    </div>
                    <div className="form-field"><label>Tipo de cambio</label><input type="number" value={cab.tipo_cambio} onChange={e=>setCab(p=>({...p,tipo_cambio:e.target.value}))} className="mono" placeholder="3.75"/></div>
                  </div>

                  <Divider label="Estado"/>
                  <div className="form-row col2">
                    <div className="form-field"><label>Estado del expediente</label>
                      <select value={cab.estado} onChange={e=>setCab(p=>({...p,estado:e.target.value}))}>
                        {ESTADOS.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-field"><label>Notas internas (no aparecen en PDF)</label><textarea value={cab.notas_internas} onChange={e=>setCab(p=>({...p,notas_internas:e.target.value}))} rows={2}/></div>
                </div>
              )}

              {/* ── TAB ÍTEMS / CILINDROS ── */}
              {tab==="items"&&(
                <div>
                  <div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>
                    Cada ítem es un cilindro o trabajo específico. Los ítems aparecen en el PDF al cliente. Los insumos y MO son internos.
                  </div>

                  {items.map((item,i)=>(
                    <div key={i} style={{border:"1px solid var(--border)",borderRadius:10,marginBottom:12,overflow:"hidden"}}>
                      {/* Header del ítem */}
                      <div style={{background:"var(--navy2)",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setItemExpandido(itemExpandido===i?-1:i)}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:12,fontWeight:600,color:"var(--orange)"}}>ÍTEM {i+1}</span>
                          <span style={{fontSize:13,color:"var(--text)"}}>{item.descripcion||<span style={{color:"var(--text3)"}}>Sin descripción</span>}</span>
                          {item.descripcion_equipo&&<span style={{fontSize:11,color:"var(--text3)"}}>— {item.descripcion_equipo}</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          {parseFloat(item.precio_total||0)>0&&<span className="mono" style={{fontSize:13,color:"var(--success)"}}>{cab.moneda} {parseFloat(item.precio_total).toFixed(2)}</span>}
                          {calcCostoItem(item)>0&&<span className="mono" style={{fontSize:12,color:"var(--text3)"}}>Costo: S/ {calcCostoItem(item).toFixed(2)}</span>}
                          {parseFloat(item.precio_total||0)>0&&calcCostoItem(item)>0&&(()=>{
                            const mg=parseFloat(item.precio_total)-calcCostoItem(item);
                            const mgP=((mg/parseFloat(item.precio_total))*100).toFixed(0);
                            return <Badge color={mgP>=40?"green":mgP>=20?"warn":"red"}>{mgP}%</Badge>;
                          })()}
                          <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                            <button className="btn-icon" onClick={()=>setItems(items.filter((_,x)=>x!==i))} style={{color:"var(--danger)"}} title="Eliminar ítem"><i className="ti ti-trash"/></button>
                          </div>
                          <i className={`ti ${itemExpandido===i?"ti-chevron-up":"ti-chevron-down"}`} style={{color:"var(--text3)"}}/>
                        </div>
                      </div>

                      {itemExpandido===i&&(
                        <div style={{padding:14}}>
                          {/* Datos del ítem */}
                          <div className="form-row col2" style={{marginBottom:8}}>
                            <div className="form-field"><label>Descripción del ítem (aparece en PDF)</label><input value={item.descripcion} onChange={e=>updItem(i,"descripcion",e.target.value)} placeholder="MANTENIMIENTO CILINDRO BRAZO" style={{textTransform:"uppercase"}}/></div>
                            <div className="form-field"><label>Equipo/marca (referencia interna)</label><input value={item.descripcion_equipo} onChange={e=>updItem(i,"descripcion_equipo",e.target.value)} placeholder="CAT 320, Komatsu PC200..."/></div>
                          </div>
                          <div className="form-row col2" style={{marginBottom:8}}>
                            <div className="form-field"><label>Precio unitario ({cab.moneda})</label><input type="number" value={item.precio_unitario} onChange={e=>updItem(i,"precio_unitario",e.target.value)} className="mono"/></div>
                            <div className="form-field"><label>Precio total ({cab.moneda})</label><input type="number" value={item.precio_total} onChange={e=>updItem(i,"precio_total",e.target.value)} className="mono"/></div>
                          </div>

                          {/* Sub-ítems */}
                          <div style={{marginBottom:12}}>
                            <label style={{marginBottom:6,display:"block"}}>Desglose visible al cliente (COMPRENDE:)</label>
                            {(item.sub_items||[]).map((sub,j)=>(
                              <div key={j} style={{display:"flex",gap:6,marginBottom:4}}>
                                <input value={sub} onChange={e=>updItemSub(i,j,e.target.value)} placeholder="- Desmontaje y cambio de sellos..." style={{flex:1}}/>
                                <button className="btn-icon" onClick={()=>removeItemSub(i,j)} style={{color:"var(--danger)",flexShrink:0}}><i className="ti ti-x"/></button>
                              </div>
                            ))}
                            <button className="btn-ghost btn-sm" onClick={()=>addItemSub(i)}><i className="ti ti-plus"/> Sub-ítem</button>
                          </div>

                          {/* Insumos y MO del ítem */}
                          <InsumosItem item={item} itemIdx={i} updItem={updItem}/>

                          {/* Costo interno editable */}
                          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:12}}>
                            <div className="form-field" style={{width:220}}>
                              <label>Costo interno total del ítem (S/) — editable</label>
                              <input type="number" value={item.costo_interno||calcCostoItem(item).toFixed(2)} onChange={e=>updItem(i,"costo_interno",e.target.value)} className="mono" placeholder={calcCostoItem(item).toFixed(2)}/>
                            </div>
                            <div style={{fontSize:12,color:"var(--text3)",marginTop:16}}>
                              Calculado automáticamente: S/ {calcCostoItem(item).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button className="btn-ghost" onClick={()=>{setItems([...items,{...ITEM0,sub_items:[""]}]);setItemExpandido(items.length);}} style={{marginBottom:16}}><i className="ti ti-plus"/> Agregar ítem / cilindro</button>

                  {/* Resumen total */}
                  {totalCotizacion>0&&(
                    <div style={{background:"var(--navy3)",borderRadius:8,padding:12,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                      <span style={{fontSize:13,color:"var(--text2)"}}>Subtotal: <strong className="mono">{cab.moneda} {totalCotizacion.toFixed(2)}</strong></span>
                      {cab.moneda==="PEN"&&<span style={{fontSize:13,color:"var(--text2)"}}>IGV: <strong className="mono">S/ {(totalCotizacion*0.18).toFixed(2)}</strong></span>}
                      <span style={{fontSize:13,color:"var(--text2)"}}>Costo total: <strong className="mono" style={{color:"var(--danger)"}}>S/ {costoTotal.toFixed(2)}</strong></span>
                      <span style={{fontSize:15,fontWeight:600}}>Margen: <strong style={{color:margen>=0?"var(--success)":"var(--danger)"}}>{margenPct}%</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB RECLAMO ── */}
              {tab==="reclamo"&&(
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,marginBottom:16}}>
                    <input type="checkbox" checked={cab.tuvo_reclamo} onChange={e=>setCab(p=>({...p,tuvo_reclamo:e.target.checked}))}/>
                    <strong>Este servicio tuvo reclamo o devolución en garantía</strong>
                  </label>
                  {!cab.tuvo_reclamo&&(
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"20px",background:"rgba(46,204,113,.08)",borderRadius:8,border:"1px solid rgba(46,204,113,.2)"}}>
                      <i className="ti ti-circle-check" style={{fontSize:24,color:"var(--success)"}}/>
                      <span style={{fontSize:14,color:"var(--success)"}}>Sin reclamos registrados para este servicio</span>
                    </div>
                  )}
                  {cab.tuvo_reclamo&&(
                    <>
                      <div className="form-field" style={{marginBottom:16}}>
                        <label>Descripción del reclamo</label>
                        <textarea value={cab.descripcion_reclamo} onChange={e=>setCab(p=>({...p,descripcion_reclamo:e.target.value}))} rows={3} placeholder="¿Qué falló? ¿Qué reportó el cliente?"/>
                      </div>
                      <Divider label="Gastos adicionales del reclamo"/>
                      {gastosReclamo.map((g,i)=>(
                        <div key={i} className="insumo-row">
                          <div className="form-row col3" style={{marginBottom:8}}>
                            <div className="form-field"><label>Descripción *</label><input value={g.descripcion} onChange={e=>updReclamo(i,"descripcion",e.target.value)} placeholder="Sello reemplazado, visita..."/></div>
                            <div className="form-field"><label>Tipo</label><select value={g.tipo} onChange={e=>updReclamo(i,"tipo",e.target.value)}><option value="insumo">Insumo</option><option value="mano_obra">Mano de obra</option><option value="transporte">Transporte</option><option value="otro">Otro</option></select></div>
                            <div className="form-field"><label>Fecha</label><input type="date" value={g.fecha} onChange={e=>updReclamo(i,"fecha",e.target.value)}/></div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                            <div style={{display:"flex",gap:10}}>
                              <div className="form-field" style={{width:150}}><label>Monto (S/)</label><input type="number" value={g.monto} onChange={e=>updReclamo(i,"monto",e.target.value)} className="mono"/></div>
                              <div className="form-field" style={{width:160}}><label>Origen pago</label><select value={g.origen_pago} onChange={e=>updReclamo(i,"origen_pago",e.target.value)}>{ORIGENES_PAGO.map(op=><option key={op} value={op}>{op.replace("_"," ")}</option>)}</select></div>
                            </div>
                            <button className="btn-icon" onClick={()=>setGastosReclamo(gastosReclamo.filter((_,x)=>x!==i))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
                          </div>
                        </div>
                      ))}
                      <button className="btn-ghost btn-sm" onClick={()=>setGastosReclamo([...gastosReclamo,{...RECLAMO0}])}><i className="ti ti-plus"/> Agregar gasto de reclamo</button>
                      {costoReclamo>0&&<div style={{marginTop:12,fontSize:13,color:"var(--danger)"}}>Costo total del reclamo: <strong>S/ {costoReclamo.toFixed(2)}</strong></div>}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{borderTop:"1px solid var(--border2)",paddingTop:12,marginTop:12}}>
              {err&&<div className="err" style={{marginBottom:8}}>{err}</div>}
              <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                <button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={guardar} disabled={saving}>{saving?"Guardando...":editandoId?"Guardar cambios":"Crear expediente"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal categorías */}
      {modalCat && (
  <CategoriasModal
    categorias={categorias}
    onClose={() => setModalCat(false)}
    onActualizar={async () => {
      const cats = await expedientesService.getCategorias();
      setCategorias(cats);
    }}
  />
)}
    </div>
  );
}
