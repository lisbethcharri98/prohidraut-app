import { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://apmrapjrrvdgtmrfzxqo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HWHTbTIR1D63hpAk3YErMw_rqSdq_2X";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const AppCtx = createContext(null);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
  :root{--navy:#0B1C2D;--navy2:#132336;--navy3:#1C3350;--orange:#E8722A;--orange2:#C45E1A;--steel:#4A90B8;--text:#E8EDF2;--text2:#9BAFC4;--text3:#5C7A96;--border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.04);--success:#2ECC71;--warning:#F4A736;--danger:#E74C3C;--info:#3498DB;--card:rgba(255,255,255,0.04);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'IBM Plex Sans',sans-serif;background:var(--navy);color:var(--text);}
  input,select,textarea,button{font-family:inherit;}
  input,select,textarea{background:var(--navy3);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:8px 12px;font-size:13px;width:100%;outline:none;transition:border .15s;}
  input:focus,select:focus,textarea:focus{border-color:var(--steel);}
  select option{background:var(--navy2);}
  label{font-size:12px;color:var(--text2);display:block;margin-bottom:4px;}
  button{cursor:pointer;border:none;border-radius:6px;font-size:13px;font-weight:500;transition:all .15s;}
  .btn-primary{background:var(--orange);color:white;padding:8px 16px;}
  .btn-primary:hover{background:var(--orange2);}
  .btn-secondary{background:var(--navy3);color:var(--text);padding:8px 16px;border:1px solid var(--border);}
  .btn-secondary:hover{background:var(--navy2);}
  .btn-ghost{background:transparent;color:var(--text2);padding:6px 12px;}
  .btn-ghost:hover{color:var(--text);background:var(--card);}
  .btn-icon{background:transparent;color:var(--text3);padding:4px 8px;font-size:14px;}
  .btn-icon:hover{color:var(--text);background:var(--card);}
  .form-row{display:grid;gap:12px;margin-bottom:12px;}
  .form-row.col2{grid-template-columns:1fr 1fr;}
  .form-row.col3{grid-template-columns:1fr 1fr 1fr;}
  .form-row.col1{grid-template-columns:1fr;}
  .card{background:var(--card);border:1px solid var(--border2);border-radius:10px;padding:16px;}
  .badge{font-size:11px;padding:2px 8px;border-radius:20px;font-weight:500;display:inline-block;}
  .badge-green{background:rgba(46,204,113,.15);color:var(--success);}
  .badge-orange{background:rgba(232,114,42,.15);color:var(--orange);}
  .badge-blue{background:rgba(52,152,219,.15);color:var(--info);}
  .badge-red{background:rgba(231,76,60,.15);color:var(--danger);}
  .badge-gray{background:rgba(255,255,255,.07);color:var(--text2);}
  .badge-warn{background:rgba(244,167,54,.15);color:var(--warning);}
  .mono{font-family:'IBM Plex Mono',monospace;}
  .err{color:var(--danger);font-size:12px;margin-top:4px;}
  .divider{border:none;border-top:1px solid var(--border2);margin:16px 0;}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
  .modal{background:var(--navy2);border:1px solid var(--border);border-radius:12px;padding:24px;width:100%;max-width:700px;max-height:90vh;overflow-y:auto;}
  .modal-title{font-size:16px;font-weight:600;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}
  .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{font-size:11px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.04em;padding:8px 12px;border-bottom:1px solid var(--border);text-align:left;}
  td{padding:10px 12px;border-bottom:1px solid var(--border2);color:var(--text);vertical-align:middle;}
  tr:hover td{background:var(--card);}
  .alert-banner{background:rgba(244,167,54,.1);border:1px solid rgba(244,167,54,.3);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px;font-size:13px;color:var(--warning);}
  .empty-state{text-align:center;padding:48px 20px;color:var(--text3);}
  .empty-state i{font-size:36px;display:block;margin-bottom:12px;}
  .tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 8px;border-radius:4px;background:var(--navy3);color:var(--text2);border:1px solid var(--border);margin:2px;}
  .actions-col{display:flex;gap:4px;justify-content:flex-end;}
  .section-sub{font-size:13px;color:var(--text2);margin-bottom:12px;}
  .insumo-row{background:var(--navy3);border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid var(--border2);}
`;

function GlobalStyles(){
  useEffect(()=>{
    const s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);
    return()=>document.head.removeChild(s);
  },[]);return null;
}

function Logo({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <polygon points="50,5 95,90 5,90" fill="none" stroke="#E8722A" strokeWidth="6"/>
      <circle cx="50" cy="62" r="18" fill="none" stroke="#E8722A" strokeWidth="5"/>
      <circle cx="50" cy="62" r="8" fill="#E8722A"/>
      <line x1="50" y1="44" x2="50" y2="30" stroke="#E8722A" strokeWidth="4"/>
    </svg>
  );
}

const NAV_ITEMS=[
  {group:"Operaciones",items:[
    {id:"pipeline",icon:"ti-layout-kanban",label:"Pipeline"},
    {id:"clientes",icon:"ti-building",label:"Clientes"},
    {id:"cilindros",icon:"ti-settings",label:"Equipos / Cilindros"},
    {id:"servicios",icon:"ti-history",label:"Servicios históricos"},
  ]},
  {group:"Costos",items:[
    {id:"almacen",icon:"ti-package",label:"Almacén"},
    {id:"horas",icon:"ti-clock",label:"Horas-hombre"},
    {id:"gastos_fijos",icon:"ti-home",label:"Gastos fijos"},
  ]},
  {group:"Empresa",items:[
    {id:"trabajadores",icon:"ti-users",label:"Trabajadores"},
    {id:"deudas",icon:"ti-credit-card",label:"Deudas"},
  ]},
];

function Sidebar({active,setActive,user}){
  return(
    <div style={{width:220,background:"var(--navy2)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",minHeight:"100vh",flexShrink:0}}>
      <div style={{padding:"16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
        <Logo size={36}/>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"var(--orange)"}}>PROHIDRAUT</div>
          <div style={{fontSize:10,color:"var(--text3)",marginTop:1}}>S.A. — Gestión interna</div>
        </div>
      </div>
      <nav style={{flex:1,padding:"8px 0",overflowY:"auto"}}>
        {NAV_ITEMS.map(g=>(
          <div key={g.group}>
            <div style={{fontSize:10,color:"var(--text3)",padding:"12px 16px 4px",textTransform:"uppercase",letterSpacing:".06em",fontWeight:600}}>{g.group}</div>
            {g.items.map(item=>(
              <button key={item.id} onClick={()=>setActive(item.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 16px",background:active===item.id?"rgba(232,114,42,0.1)":"transparent",color:active===item.id?"var(--orange)":"var(--text2)",borderLeft:active===item.id?"2px solid var(--orange)":"2px solid transparent",borderRadius:0,textAlign:"left",fontSize:13}}>
                <i className={`ti ${item.icon}`} style={{fontSize:15}}/>{item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)"}}>
        <div style={{fontSize:11,color:"var(--text3)",marginBottom:2}}>Sesión activa</div>
        <div style={{fontSize:12,color:"var(--text2)",marginBottom:6}}>{user?.email}</div>
        <button className="btn-ghost" style={{padding:"4px 0",fontSize:12,color:"var(--text3)"}} onClick={()=>supabase.auth.signOut()}><i className="ti ti-logout"/> Cerrar sesión</button>
      </div>
    </div>
  );
}

function LoginScreen(){
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const login=async()=>{setLoading(true);setErr("");const{error}=await supabase.auth.signInWithPassword({email,password:pass});if(error)setErr("Correo o contraseña incorrectos");setLoading(false);};
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--navy)"}}>
      <div style={{width:380,padding:32,background:"var(--navy2)",borderRadius:12,border:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}><Logo size={44}/><div><div style={{fontSize:20,fontWeight:700,color:"var(--orange)"}}>PROHIDRAUT S.A.</div><div style={{fontSize:12,color:"var(--text3)"}}>Proyectos Hidráulico y Automáticos</div></div></div>
        <div className="form-row col1">
          <div><label>Correo electrónico</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@prohidraut.com"/></div>
          <div><label>Contraseña</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/></div>
        </div>
        {err&&<div className="err">{err}</div>}
        <button className="btn-primary" style={{width:"100%",marginTop:16,padding:10}} onClick={login} disabled={loading}>{loading?"Ingresando...":"Ingresar"}</button>
      </div>
    </div>
  );
}

// ── MODAL GENÉRICO ────────────────────────────────────────
function Modal({title,onClose,children,wide}){
  return(
    <div className="modal-overlay">
      <div className="modal" style={wide?{maxWidth:860}:{}}>
        <div className="modal-title">{title}<button className="btn-ghost" onClick={onClose}><i className="ti ti-x"/></button></div>
        {children}
      </div>
    </div>
  );
}

// ── PIPELINE ──────────────────────────────────────────────
function Pipeline({setActive}){
  const COLS=[{id:"pendiente",label:"Cotización",color:"#E8722A"},{id:"en_proceso",label:"En proceso",color:"#3498DB"},{id:"conformidad_pendiente",label:"Conformidad",color:"#9B59B6"},{id:"facturado",label:"Facturado",color:"#1ABC9C"},{id:"pagado",label:"Pagado",color:"#7F8C8D"}];
  const [data,setData]=useState({pendiente:[],en_proceso:[],conformidad_pendiente:[],facturado:[],pagado:[]});
  useEffect(()=>{
    Promise.all([
      supabase.from("cotizaciones").select("*,clientes(razon_social),cilindros(nombre)").eq("estado","pendiente").limit(10),
      supabase.from("ordenes_compra").select("*,clientes(razon_social),cilindros(nombre)").in("estado",["en_proceso","conformidad_pendiente","facturado","pagado"]).limit(20),
    ]).then(([{data:c},{data:o}])=>{
      const d={pendiente:c||[],en_proceso:[],conformidad_pendiente:[],facturado:[],pagado:[]};
      (o||[]).forEach(x=>{if(d[x.estado])d[x.estado].push(x);});setData(d);
    });
  },[]);
  const total=Object.values(data).flat().length;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Pipeline de servicios</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{total} servicios activos</p></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {COLS.map(col=>(
          <div key={col.id} className="card" style={{minHeight:180}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:12,fontWeight:600,color:col.color}}>{col.label}</span>
              <span style={{fontSize:11,background:"rgba(255,255,255,.07)",borderRadius:10,padding:"1px 8px",color:"var(--text3)"}}>{data[col.id]?.length||0}</span>
            </div>
            {data[col.id]?.length===0&&<div style={{fontSize:12,color:"var(--text3)",textAlign:"center",padding:"16px 0"}}>Sin registros</div>}
            {(data[col.id]||[]).map(item=>(
              <div key={item.id} style={{background:"var(--navy2)",border:"1px solid var(--border)",borderRadius:8,padding:10,marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:500}}>{item.cilindros?.nombre||"Servicio"}</div>
                <div style={{fontSize:11,color:"var(--text2)"}}>{item.clientes?.razon_social||"—"}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:4,fontFamily:"monospace"}}>{item.numero}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CLIENTES ──────────────────────────────────────────────
function Clientes(){
  const [lista,setLista]=useState([]);const [modal,setModal]=useState(false);const [editando,setEditando]=useState(null);const [loading,setLoading]=useState(true);const [busqueda,setBusqueda]=useState("");
  const FORM0={razon_social:"",ruc:"",direccion:"",contacto_nombre:"",contacto_email:"",contacto_telefono:"",año_inicio:new Date().getFullYear(),notas:""};
  const [form,setForm]=useState(FORM0);
  useEffect(()=>{cargar();},[]);
  async function cargar(){setLoading(true);const{data}=await supabase.from("clientes").select("*").order("razon_social");setLista(data||[]);setLoading(false);}
  function abrirNuevo(){setEditando(null);setForm(FORM0);setModal(true);}
  function abrirEditar(c){setEditando(c.id);setForm({razon_social:c.razon_social||"",ruc:c.ruc||"",direccion:c.direccion||"",contacto_nombre:c.contacto_nombre||"",contacto_email:c.contacto_email||"",contacto_telefono:c.contacto_telefono||"",año_inicio:c.año_inicio||new Date().getFullYear(),notas:c.notas||""});setModal(true);}
  async function guardar(){
    if(!form.razon_social)return;
    if(editando)await supabase.from("clientes").update(form).eq("id",editando);
    else await supabase.from("clientes").insert([form]);
    setModal(false);cargar();
  }
  async function eliminar(id){if(!confirm("¿Eliminar este cliente?"))return;await supabase.from("clientes").delete().eq("id",id);cargar();}
  const filtrados=lista.filter(c=>c.razon_social.toLowerCase().includes(busqueda.toLowerCase())||(c.ruc||"").includes(busqueda));
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Clientes</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{lista.length} registrados</p></div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Nuevo cliente</button>
      </div>
      <input placeholder="Buscar por nombre o RUC..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{marginBottom:16}}/>
      {loading?<p style={{color:"var(--text2)"}}>Cargando...</p>:filtrados.length===0?<div className="empty-state"><i className="ti ti-building"/><div>Sin clientes</div></div>:(
        <table>
          <thead><tr><th>Razón social</th><th>RUC</th><th>Contacto</th><th>Desde</th><th>Teléfono</th><th></th></tr></thead>
          <tbody>{filtrados.map(c=>(
            <tr key={c.id}>
              <td><strong>{c.razon_social}</strong></td><td className="mono">{c.ruc||"—"}</td><td style={{color:"var(--text2)"}}>{c.contacto_nombre||"—"}</td><td>{c.año_inicio||"—"}</td><td style={{color:"var(--text2)"}}>{c.contacto_telefono||"—"}</td>
              <td><div className="actions-col"><button className="btn-icon" onClick={()=>abrirEditar(c)} title="Editar"><i className="ti ti-pencil"/></button><button className="btn-icon" onClick={()=>eliminar(c.id)} title="Eliminar" style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modal&&<Modal title={editando?"Editar cliente":"Nuevo cliente"} onClose={()=>setModal(false)}>
        <div className="form-row col2"><div><label>Razón social *</label><input value={form.razon_social} onChange={e=>setForm({...form,razon_social:e.target.value})}/></div><div><label>RUC</label><input value={form.ruc} onChange={e=>setForm({...form,ruc:e.target.value})} className="mono" maxLength={11}/></div></div>
        <div className="form-row col1"><div><label>Dirección</label><input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})}/></div></div>
        <div className="form-row col3"><div><label>Contacto</label><input value={form.contacto_nombre} onChange={e=>setForm({...form,contacto_nombre:e.target.value})}/></div><div><label>Email</label><input type="email" value={form.contacto_email} onChange={e=>setForm({...form,contacto_email:e.target.value})}/></div><div><label>Teléfono</label><input value={form.contacto_telefono} onChange={e=>setForm({...form,contacto_telefono:e.target.value})}/></div></div>
        <div className="form-row col2"><div><label>Cliente desde (año)</label><input type="number" value={form.año_inicio} onChange={e=>setForm({...form,año_inicio:parseInt(e.target.value)})}/></div></div>
        <div className="form-row col1"><div><label>Notas</label><textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} rows={2}/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>{editando?"Guardar cambios":"Crear cliente"}</button></div>
      </Modal>}
    </div>
  );
}

// ── TRABAJADORES ──────────────────────────────────────────
function Trabajadores(){
  const [lista,setLista]=useState([]);const [modal,setModal]=useState(false);const [editando,setEditando]=useState(null);const [loading,setLoading]=useState(true);const [msg,setMsg]=useState("");
  const PUESTOS=["Tornero","Soldador","Mecánico","Pintor","Administrativo","Gerente","Otro (especificar)"];
  const FORM0={nombre:"",dni:"",puesto:"",puesto_custom:"",fecha_inicio:"",sueldo_semanal:"",dias_vacaciones_disponibles:15};
  const [form,setForm]=useState(FORM0);
  const isSctr=new Date().getDate()<=5;
  useEffect(()=>{cargar();},[]);
  async function cargar(){setLoading(true);const{data}=await supabase.from("trabajadores").select("*").order("nombre");setLista(data||[]);setLoading(false);}
  function abrirNuevo(){setEditando(null);setForm(FORM0);setMsg("");setModal(true);}
  function abrirEditar(t){setEditando(t.id);setForm({nombre:t.nombre||"",dni:t.dni||"",puesto:PUESTOS.includes(t.puesto)?t.puesto:"Otro (especificar)",puesto_custom:PUESTOS.includes(t.puesto)?"":t.puesto,fecha_inicio:t.fecha_inicio||"",sueldo_semanal:t.sueldo_semanal||"",dias_vacaciones_disponibles:t.dias_vacaciones_disponibles||15});setMsg("");setModal(true);}
  async function guardar(){
    const puestoFinal=form.puesto==="Otro (especificar)"?form.puesto_custom:form.puesto;
    if(!form.nombre||!form.dni||!puestoFinal||!form.fecha_inicio||!form.sueldo_semanal){setMsg("Completa todos los campos");return;}
    const payload={nombre:form.nombre,dni:form.dni,puesto:puestoFinal,fecha_inicio:form.fecha_inicio,sueldo_semanal:parseFloat(form.sueldo_semanal),dias_vacaciones_disponibles:form.dias_vacaciones_disponibles};
    if(editando){const{error}=await supabase.from("trabajadores").update(payload).eq("id",editando);if(error){setMsg("Error: "+error.message);return;}}
    else{const{error}=await supabase.from("trabajadores").insert([payload]);if(error){setMsg("Error: "+error.message);return;}}
    setModal(false);cargar();
  }
  async function eliminar(id){if(!confirm("¿Eliminar este trabajador?"))return;await supabase.from("trabajadores").update({activo:false}).eq("id",id);cargar();}
  return(
    <div>
      {isSctr&&<div className="alert-banner"><i className="ti ti-alert-triangle" style={{fontSize:18}}/><span><strong>Recordatorio SCTR:</strong> Rubén debe enviar correo de renovación del seguro.</span></div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Trabajadores</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{lista.filter(t=>t.activo).length} activos</p></div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Nuevo trabajador</button>
      </div>
      {loading?<p style={{color:"var(--text2)"}}>Cargando...</p>:lista.length===0?<div className="empty-state"><i className="ti ti-users"/><div>Sin trabajadores</div></div>:(
        <table>
          <thead><tr><th>Nombre</th><th>DNI</th><th>Puesto</th><th>Inicio</th><th>Sueldo semanal</th><th>Vacaciones</th><th>Estado</th><th></th></tr></thead>
          <tbody>{lista.map(t=>(
            <tr key={t.id}>
              <td><strong>{t.nombre}</strong></td><td className="mono">{t.dni}</td><td>{t.puesto}</td><td>{t.fecha_inicio}</td><td className="mono">S/ {parseFloat(t.sueldo_semanal||0).toFixed(2)}</td>
              <td><span className={`badge ${t.dias_vacaciones_disponibles>5?"badge-green":"badge-warn"}`}>{t.dias_vacaciones_disponibles} días</span></td>
              <td><span className={`badge ${t.activo?"badge-green":"badge-gray"}`}>{t.activo?"Activo":"Inactivo"}</span></td>
              <td><div className="actions-col"><button className="btn-icon" onClick={()=>abrirEditar(t)}><i className="ti ti-pencil"/></button><button className="btn-icon" onClick={()=>eliminar(t.id)} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modal&&<Modal title={editando?"Editar trabajador":"Nuevo trabajador"} onClose={()=>setModal(false)}>
        <div className="form-row col2"><div><label>Nombre completo *</label><input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></div><div><label>DNI *</label><input value={form.dni} onChange={e=>setForm({...form,dni:e.target.value})} maxLength={8} className="mono"/></div></div>
        <div className="form-row col2">
          <div><label>Puesto *</label><select value={form.puesto} onChange={e=>setForm({...form,puesto:e.target.value})}><option value="">Seleccionar...</option>{PUESTOS.map(p=><option key={p}>{p}</option>)}</select></div>
          {form.puesto==="Otro (especificar)"&&<div><label>Especificar *</label><input value={form.puesto_custom} onChange={e=>setForm({...form,puesto_custom:e.target.value})} placeholder="Ej. Electromecánico"/></div>}
          <div><label>Fecha de inicio *</label><input type="date" value={form.fecha_inicio} onChange={e=>setForm({...form,fecha_inicio:e.target.value})}/></div>
        </div>
        <div className="form-row col2"><div><label>Sueldo semanal (S/) *</label><input type="number" value={form.sueldo_semanal} onChange={e=>setForm({...form,sueldo_semanal:e.target.value})} className="mono"/></div><div><label>Días vacaciones disponibles</label><input type="number" value={form.dias_vacaciones_disponibles} onChange={e=>setForm({...form,dias_vacaciones_disponibles:parseInt(e.target.value)})}/></div></div>
        {msg&&<div className="err">{msg}</div>}
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>{editando?"Guardar cambios":"Crear trabajador"}</button></div>
      </Modal>}
    </div>
  );
}

// ── ALMACÉN ───────────────────────────────────────────────
function Almacen(){
  const [productos,setProductos]=useState([]);const [categorias,setCategorias]=useState([]);const [modal,setModal]=useState(false);const [modalCat,setModalCat]=useState(false);const [modalEntrada,setModalEntrada]=useState(null);const [editando,setEditando]=useState(null);const [nuevaCat,setNuevaCat]=useState("");const [loading,setLoading]=useState(true);
  const FORM0={categoria_id:"",nombre:"",medida:"",unidad:"unidad",unidad_custom:"",stock_actual:0,stock_minimo:1,precio_costo_promedio:"",precio_venta_ref:""};
  const [form,setForm]=useState(FORM0);const [entrada,setEntrada]=useState({cantidad:"",precio_unitario:""});
  const UNIDADES=["unidad","metro","juego","litro","kg","pieza","rollo","juego de sellos","Otro (especificar)"];
  useEffect(()=>{cargar();},[]);
  async function cargar(){setLoading(true);const[{data:p},{data:c}]=await Promise.all([supabase.from("productos_almacen").select("*,categorias_insumo(nombre)").order("nombre"),supabase.from("categorias_insumo").select("*").order("nombre")]);setProductos(p||[]);setCategorias(c||[]);setLoading(false);}
  function abrirNuevo(){setEditando(null);setForm(FORM0);setModal(true);}
  function abrirEditar(p){setEditando(p.id);setForm({categoria_id:p.categoria_id||"",nombre:p.nombre||"",medida:p.medida||"",unidad:UNIDADES.includes(p.unidad)?p.unidad:"Otro (especificar)",unidad_custom:UNIDADES.includes(p.unidad)?"":p.unidad,stock_actual:p.stock_actual||0,stock_minimo:p.stock_minimo||1,precio_costo_promedio:p.precio_costo_promedio||"",precio_venta_ref:p.precio_venta_ref||""});setModal(true);}
  async function guardarCat(){if(!nuevaCat.trim())return;await supabase.from("categorias_insumo").insert([{nombre:nuevaCat.trim()}]);setNuevaCat("");setModalCat(false);cargar();}
  async function guardarProducto(){
    if(!form.nombre||!form.medida||!form.categoria_id)return;
    const unidadFinal=form.unidad==="Otro (especificar)"?form.unidad_custom:form.unidad;
    const payload={categoria_id:form.categoria_id,nombre:form.nombre,medida:form.medida,unidad:unidadFinal,stock_actual:parseFloat(form.stock_actual)||0,stock_minimo:parseFloat(form.stock_minimo)||1,precio_costo_promedio:parseFloat(form.precio_costo_promedio)||null,precio_venta_ref:parseFloat(form.precio_venta_ref)||null};
    if(editando){await supabase.from("productos_almacen").update(payload).eq("id",editando);}
    else{const{error}=await supabase.from("productos_almacen").insert([payload]);if(error){alert("Error: "+error.message);return;}}
    setModal(false);setForm(FORM0);cargar();
  }
  async function registrarEntrada(){
    if(!entrada.cantidad)return;
    const cant=parseFloat(entrada.cantidad);const precio=parseFloat(entrada.precio_unitario)||null;
    await supabase.from("productos_almacen").update({stock_actual:modalEntrada.stock_actual+cant,...(precio?{precio_costo_promedio:precio}:{})}).eq("id",modalEntrada.id);
    await supabase.from("movimientos_almacen").insert([{producto_id:modalEntrada.id,tipo:"entrada",cantidad:cant,precio_unitario:precio,motivo:"Ingreso manual"}]);
    setModalEntrada(null);setEntrada({cantidad:"",precio_unitario:""});cargar();
  }
  async function eliminar(id){if(!confirm("¿Eliminar este producto?"))return;await supabase.from("productos_almacen").delete().eq("id",id);cargar();}
  const bajoStock=productos.filter(p=>p.stock_actual<=p.stock_minimo);
  return(
    <div>
      {bajoStock.length>0&&<div className="alert-banner"><i className="ti ti-alert-triangle" style={{fontSize:18}}/><span><strong>Stock bajo mínimo:</strong> {bajoStock.map(p=>`${p.nombre} ${p.medida}`).join(", ")}</span></div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Almacén e inventario</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{productos.length} productos</p></div>
        <div style={{display:"flex",gap:8}}><button className="btn-secondary" onClick={()=>setModalCat(true)}><i className="ti ti-tag"/> Nueva categoría</button><button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Nuevo producto</button></div>
      </div>
      {loading?<p style={{color:"var(--text2)"}}>Cargando...</p>:productos.length===0?<div className="empty-state"><i className="ti ti-package"/><div>Sin productos</div><div style={{fontSize:13,marginTop:4}}>Crea una categoría primero, luego agrega productos</div></div>:(
        <table>
          <thead><tr><th>Categoría</th><th>Producto</th><th>Medida</th><th>Stock</th><th>Costo prom.</th><th>Precio ref.</th><th></th></tr></thead>
          <tbody>{productos.map(p=>(
            <tr key={p.id}>
              <td style={{color:"var(--text2)"}}>{p.categorias_insumo?.nombre||"—"}</td><td><strong>{p.nombre}</strong></td><td className="mono">{p.medida}</td>
              <td><span className={`badge ${p.stock_actual<=p.stock_minimo?"badge-red":p.stock_actual<=p.stock_minimo*2?"badge-warn":"badge-green"}`}>{p.stock_actual} {p.unidad}</span></td>
              <td className="mono">{p.precio_costo_promedio?`S/ ${parseFloat(p.precio_costo_promedio).toFixed(2)}`:"—"}</td>
              <td className="mono">{p.precio_venta_ref?`S/ ${parseFloat(p.precio_venta_ref).toFixed(2)}`:"—"}</td>
              <td><div className="actions-col"><button className="btn-icon" onClick={()=>setModalEntrada(p)} title="Entrada stock"><i className="ti ti-arrow-bar-to-down"/></button><button className="btn-icon" onClick={()=>abrirEditar(p)} title="Editar"><i className="ti ti-pencil"/></button><button className="btn-icon" onClick={()=>eliminar(p.id)} style={{color:"var(--danger)"}} title="Eliminar"><i className="ti ti-trash"/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modalCat&&<Modal title="Nueva categoría de insumo" onClose={()=>setModalCat(false)}>
        <div style={{marginBottom:8,fontSize:13,color:"var(--text2)"}}>Existentes: {categorias.map(c=><span key={c.id} className="tag">{c.nombre}</span>)}</div>
        <div className="form-row col1"><div><label>Nombre</label><input value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)} placeholder="Ej. Empaquetadura, Rodamiento..."/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModalCat(false)}>Cancelar</button><button className="btn-primary" onClick={guardarCat}>Crear categoría</button></div>
      </Modal>}
      {modal&&<Modal title={editando?"Editar producto":"Nuevo producto"} onClose={()=>setModal(false)}>
        {categorias.length===0&&<div className="alert-banner"><i className="ti ti-info-circle"/>Primero crea una categoría.</div>}
        <div className="form-row col2"><div><label>Categoría *</label><select value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})}><option value="">Seleccionar...</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div><label>Nombre *</label><input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej. Sello hidráulico"/></div></div>
        <div className="form-row col3">
          <div><label>Medida *</label><input value={form.medida} onChange={e=>setForm({...form,medida:e.target.value})} placeholder="Ej. 60mm"/></div>
          <div><label>Unidad</label><select value={form.unidad} onChange={e=>setForm({...form,unidad:e.target.value})}>{UNIDADES.map(u=><option key={u}>{u}</option>)}</select></div>
          {form.unidad==="Otro (especificar)"&&<div><label>Especificar</label><input value={form.unidad_custom} onChange={e=>setForm({...form,unidad_custom:e.target.value})}/></div>}
          <div><label>Stock mínimo</label><input type="number" value={form.stock_minimo} onChange={e=>setForm({...form,stock_minimo:parseFloat(e.target.value)})}/></div>
        </div>
        <div className="form-row col3"><div><label>Stock inicial</label><input type="number" value={form.stock_actual} onChange={e=>setForm({...form,stock_actual:parseFloat(e.target.value)})}/></div><div><label>Costo (S/)</label><input type="number" value={form.precio_costo_promedio} onChange={e=>setForm({...form,precio_costo_promedio:e.target.value})} className="mono"/></div><div><label>Precio venta ref. (S/)</label><input type="number" value={form.precio_venta_ref} onChange={e=>setForm({...form,precio_venta_ref:e.target.value})} className="mono"/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardarProducto}>{editando?"Guardar cambios":"Crear producto"}</button></div>
      </Modal>}
      {modalEntrada&&<Modal title={`Entrada de stock — ${modalEntrada.nombre} ${modalEntrada.medida}`} onClose={()=>setModalEntrada(null)}>
        <div style={{color:"var(--text2)",fontSize:13,marginBottom:16}}>Stock actual: <strong style={{color:"var(--text)"}}>{modalEntrada.stock_actual} {modalEntrada.unidad}</strong></div>
        <div className="form-row col2"><div><label>Cantidad *</label><input type="number" value={entrada.cantidad} onChange={e=>setEntrada({...entrada,cantidad:e.target.value})}/></div><div><label>Precio unitario (S/)</label><input type="number" value={entrada.precio_unitario} onChange={e=>setEntrada({...entrada,precio_unitario:e.target.value})} className="mono"/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModalEntrada(null)}>Cancelar</button><button className="btn-primary" onClick={registrarEntrada}>Registrar entrada</button></div>
      </Modal>}
    </div>
  );
}

// ── CILINDROS / EQUIPOS ───────────────────────────────────
function Cilindros(){
  const [lista,setLista]=useState([]);const [clientes,setClientes]=useState([]);const [modal,setModal]=useState(false);const [editando,setEditando]=useState(null);const [loading,setLoading]=useState(true);
  const FORM0={nombre:"",marca:"",modelo:"",diametro_vastago:"",diametro_tubo:"",longitud_carrera:"",tipo_sello:"",notas_tecnicas:""};
  const [form,setForm]=useState(FORM0);
  useEffect(()=>{cargar();},[]);
  async function cargar(){setLoading(true);const[{data:c},{data:cl}]=await Promise.all([supabase.from("cilindros").select("*").order("nombre"),supabase.from("clientes").select("id,razon_social").order("razon_social")]);setLista(c||[]);setClientes(cl||[]);setLoading(false);}
  function abrirNuevo(){setEditando(null);setForm(FORM0);setModal(true);}
  function abrirEditar(c){setEditando(c.id);setForm({nombre:c.nombre||"",marca:c.marca||"",modelo:c.modelo||"",diametro_vastago:c.diametro_vastago||"",diametro_tubo:c.diametro_tubo||"",longitud_carrera:c.longitud_carrera||"",tipo_sello:c.tipo_sello||"",notas_tecnicas:c.notas_tecnicas||""});setModal(true);}
  async function guardar(){
    if(!form.nombre)return;
    const payload={nombre:form.nombre,marca:form.marca||null,modelo:form.modelo||null,diametro_vastago:parseFloat(form.diametro_vastago)||null,diametro_tubo:parseFloat(form.diametro_tubo)||null,longitud_carrera:parseFloat(form.longitud_carrera)||null,tipo_sello:form.tipo_sello||null,notas_tecnicas:form.notas_tecnicas||null};
    if(editando)await supabase.from("cilindros").update(payload).eq("id",editando);
    else await supabase.from("cilindros").insert([payload]);
    setModal(false);cargar();
  }
  async function eliminar(id){if(!confirm("¿Eliminar?"))return;await supabase.from("cilindros").delete().eq("id",id);cargar();}
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Equipos / Cilindros</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>Base técnica de equipos reparados</p></div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Nuevo equipo</button>
      </div>
      {loading?<p style={{color:"var(--text2)"}}>Cargando...</p>:lista.length===0?<div className="empty-state"><i className="ti ti-settings"/><div>Sin equipos registrados</div><div style={{fontSize:13,marginTop:4}}>Rubén puede ir cargando los equipos recurrentes</div></div>:(
        <table>
          <thead><tr><th>Nombre</th><th>Marca</th><th>Modelo</th><th>Diám. vástago</th><th>Diám. tubo</th><th>Tipo sello</th><th></th></tr></thead>
          <tbody>{lista.map(c=>(
            <tr key={c.id}>
              <td><strong>{c.nombre}</strong></td><td style={{color:"var(--text2)"}}>{c.marca||"—"}</td><td style={{color:"var(--text2)"}}>{c.modelo||"—"}</td>
              <td className="mono">{c.diametro_vastago?`${c.diametro_vastago} mm`:"—"}</td><td className="mono">{c.diametro_tubo?`${c.diametro_tubo} mm`:"—"}</td><td style={{color:"var(--text2)"}}>{c.tipo_sello||"—"}</td>
              <td><div className="actions-col"><button className="btn-icon" onClick={()=>abrirEditar(c)}><i className="ti ti-pencil"/></button><button className="btn-icon" onClick={()=>eliminar(c.id)} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modal&&<Modal title={editando?"Editar equipo":"Nuevo equipo / cilindro"} onClose={()=>setModal(false)}>
        <div className="form-row col1"><div><label>Nombre del equipo *</label><input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej. Cilindro brazo CAT 320"/></div></div>
        <div className="form-row col2"><div><label>Marca</label><input value={form.marca} onChange={e=>setForm({...form,marca:e.target.value})} placeholder="Caterpillar, Komatsu..."/></div><div><label>Modelo</label><input value={form.modelo} onChange={e=>setForm({...form,modelo:e.target.value})}/></div></div>
        <div className="form-row col3">
          <div><label>Diám. vástago (mm)</label><input type="number" value={form.diametro_vastago} onChange={e=>setForm({...form,diametro_vastago:e.target.value})} className="mono"/></div>
          <div><label>Diám. tubo (mm)</label><input type="number" value={form.diametro_tubo} onChange={e=>setForm({...form,diametro_tubo:e.target.value})} className="mono"/></div>
          <div><label>Longitud carrera (mm)</label><input type="number" value={form.longitud_carrera} onChange={e=>setForm({...form,longitud_carrera:e.target.value})} className="mono"/></div>
        </div>
        <div className="form-row col2"><div><label>Tipo de sello</label><input value={form.tipo_sello} onChange={e=>setForm({...form,tipo_sello:e.target.value})} placeholder="Ej. Kit estándar CAT 60mm"/></div></div>
        <div className="form-row col1"><div><label>Notas técnicas</label><textarea value={form.notas_tecnicas} onChange={e=>setForm({...form,notas_tecnicas:e.target.value})} rows={3} placeholder="Observaciones, materiales especiales, advertencias..."/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>{editando?"Guardar cambios":"Crear equipo"}</button></div>
      </Modal>}
    </div>
  );
}

// ── SERVICIOS HISTÓRICOS ──────────────────────────────────
function Servicios(){
  const [lista,setLista]=useState([]);const [clientes,setClientes]=useState([]);const [cilindros,setCilindros]=useState([]);const [trabajadores,setTrabajadores]=useState([]);const [categorias,setCategorias]=useState([]);const [catMO,setCatMO]=useState([]);
  const [modal,setModal]=useState(false);const [editando,setEditando]=useState(null);const [loading,setLoading]=useState(true);const [filtroCliente,setFiltroCliente]=useState("");
  const FORM0={cliente_id:"",cilindro_id:"",fecha_servicio:"",descripcion:"",notas:""};
  const [form,setForm]=useState(FORM0);
  const [insumos,setInsumos]=useState([]);const [manoObra,setManoObra]=useState([]);
  const INSUMO0={categoria_id:"",descripcion:"",medida:"",cantidad:1,precio_unitario:"",igv:"",precio_total:""};
  const MO0={categoria_id:"",descripcion:"",trabajador_id:"",horas_estimadas:"",costo_estimado:""};

  useEffect(()=>{cargar();},[]);
  async function cargar(){
    setLoading(true);
    const[{data:s},{data:cl},{data:ci},{data:t},{data:cat},{data:mo}]=await Promise.all([
      supabase.from("servicios_historicos").select("*,clientes(razon_social),cilindros(nombre)").order("fecha_servicio",{ascending:false}),
      supabase.from("clientes").select("id,razon_social").order("razon_social"),
      supabase.from("cilindros").select("id,nombre,marca").order("nombre"),
      supabase.from("trabajadores").select("id,nombre").eq("activo",true).order("nombre"),
      supabase.from("categorias_insumo").select("*").order("nombre"),
      supabase.from("categorias_mano_obra").select("*").order("nombre"),
    ]);
    setLista(s||[]);setClientes(cl||[]);setCilindros(ci||[]);setTrabajadores(t||[]);setCategorias(cat||[]);setCatMO(mo||[]);setLoading(false);
  }

  function abrirNuevo(){setEditando(null);setForm(FORM0);setInsumos([]);setManoObra([]);setModal(true);}
  async function abrirEditar(s){
    setEditando(s.id);
    setForm({cliente_id:s.cliente_id||"",cilindro_id:s.cilindro_id||"",fecha_servicio:s.fecha_servicio||"",descripcion:s.descripcion||"",notas:s.notas||""});
    const[{data:ins},{data:mo}]=await Promise.all([
      supabase.from("historico_insumos").select("*").eq("servicio_historico_id",s.id),
      supabase.from("historico_mano_obra").select("*").eq("servicio_historico_id",s.id),
    ]);
    setInsumos(ins||[]);setManoObra(mo||[]);setModal(true);
  }

  const totalInsumos=insumos.reduce((s,i)=>s+parseFloat(i.precio_total||0),0);
  const totalMO=manoObra.reduce((s,m)=>s+parseFloat(m.costo_estimado||0),0);
  const totalServicio=totalInsumos+totalMO;

  async function guardar(){
    if(!form.cliente_id||!form.fecha_servicio||!form.descripcion)return;
    let sid=editando;
    if(editando){
      await supabase.from("servicios_historicos").update({...form,costo_total:totalServicio,horas_total:manoObra.reduce((s,m)=>s+parseFloat(m.horas_estimadas||0),0)}).eq("id",editando);
      await supabase.from("historico_insumos").delete().eq("servicio_historico_id",editando);
      await supabase.from("historico_mano_obra").delete().eq("servicio_historico_id",editando);
    } else {
      const{data:nuevo}=await supabase.from("servicios_historicos").insert([{...form,costo_total:totalServicio,horas_total:manoObra.reduce((s,m)=>s+parseFloat(m.horas_estimadas||0),0)}]).select().single();
      sid=nuevo?.id;
    }
    if(sid){
      if(insumos.length>0)await supabase.from("historico_insumos").insert(insumos.map(i=>({...i,servicio_historico_id:sid,cantidad:parseFloat(i.cantidad)||1,precio_unitario:parseFloat(i.precio_unitario)||null,igv:parseFloat(i.igv)||null,precio_total:parseFloat(i.precio_total)||null})));
      if(manoObra.length>0)await supabase.from("historico_mano_obra").insert(manoObra.map(m=>({...m,servicio_historico_id:sid,horas_estimadas:parseFloat(m.horas_estimadas)||null,costo_estimado:parseFloat(m.costo_estimado)||null,trabajador_id:m.trabajador_id||null})));
    }
    setModal(false);cargar();
  }

  async function eliminar(id){if(!confirm("¿Eliminar este servicio?"))return;await supabase.from("historico_insumos").delete().eq("servicio_historico_id",id);await supabase.from("historico_mano_obra").delete().eq("servicio_historico_id",id);await supabase.from("servicios_historicos").delete().eq("id",id);cargar();}

  function updInsumo(i,k,v){const r=[...insumos];r[i][k]=v;if(k==="precio_unitario"||k==="cantidad"){r[i].precio_total=(parseFloat(r[i].cantidad||1)*parseFloat(r[i].precio_unitario||0)).toFixed(2);}setInsumos(r);}
  function updMO(i,k,v){const r=[...manoObra];r[i][k]=v;setManoObra(r);}

  const filtrados=lista.filter(s=>!filtroCliente||s.cliente_id===filtroCliente);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Servicios históricos</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{lista.length} servicios registrados</p></div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Registrar servicio</button>
      </div>
      <div style={{marginBottom:16}}>
        <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} style={{width:280}}>
          <option value="">Todos los clientes</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}
        </select>
      </div>
      {loading?<p style={{color:"var(--text2)"}}>Cargando...</p>:filtrados.length===0?<div className="empty-state"><i className="ti ti-history"/><div>Sin servicios registrados</div><div style={{fontSize:13,marginTop:4}}>Rubén puede ir cargando el historial de trabajos anteriores</div></div>:(
        <table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Descripción</th><th>Costo total</th><th>Horas</th><th></th></tr></thead>
          <tbody>{filtrados.map(s=>(
            <tr key={s.id}>
              <td className="mono">{s.fecha_servicio}</td><td><strong>{s.clientes?.razon_social||"—"}</strong></td><td style={{color:"var(--text2)"}}>{s.cilindros?.nombre||"—"}</td>
              <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--text2)"}}>{s.descripcion}</td>
              <td className="mono">{s.costo_total?`S/ ${parseFloat(s.costo_total).toFixed(2)}`:"—"}</td>
              <td style={{color:"var(--text2)"}}>{s.horas_total?`${s.horas_total}h`:"—"}</td>
              <td><div className="actions-col"><button className="btn-icon" onClick={()=>abrirEditar(s)}><i className="ti ti-pencil"/></button><button className="btn-icon" onClick={()=>eliminar(s.id)} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      {modal&&<Modal title={editando?"Editar servicio histórico":"Registrar servicio histórico"} onClose={()=>setModal(false)} wide>
        <div className="form-row col2">
          <div><label>Cliente *</label><select value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}><option value="">Seleccionar cliente...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}</select></div>
          <div><label>Equipo / Cilindro</label><select value={form.cilindro_id} onChange={e=>setForm({...form,cilindro_id:e.target.value})}><option value="">Seleccionar equipo...</option>{cilindros.map(c=><option key={c.id} value={c.id}>{c.nombre} {c.marca?`(${c.marca})`:""}</option>)}</select></div>
        </div>
        <div className="form-row col2">
          <div><label>Fecha del servicio *</label><input type="date" value={form.fecha_servicio} onChange={e=>setForm({...form,fecha_servicio:e.target.value})}/></div>
        </div>
        <div className="form-row col1"><div><label>Descripción del servicio *</label><textarea value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} rows={2} placeholder="Ej. Cambio de sellos, pulida de vástago, pintura anticorrosiva..."/></div></div>

        <div className="divider"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:500}}>Insumos utilizados</span>
          <button className="btn-ghost" style={{fontSize:12}} onClick={()=>setInsumos([...insumos,{...INSUMO0}])}><i className="ti ti-plus"/> Agregar insumo</button>
        </div>
        {insumos.map((ins,i)=>(
          <div key={i} className="insumo-row">
            <div className="form-row col3" style={{marginBottom:8}}>
              <div><label>Categoría</label><select value={ins.categoria_id} onChange={e=>updInsumo(i,"categoria_id",e.target.value)}><option value="">Seleccionar...</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <div><label>Descripción</label><input value={ins.descripcion} onChange={e=>updInsumo(i,"descripcion",e.target.value)} placeholder="Ej. Sello hidráulico 60mm"/></div>
              <div><label>Medida</label><input value={ins.medida} onChange={e=>updInsumo(i,"medida",e.target.value)} placeholder="60mm"/></div>
            </div>
            <div className="form-row col3" style={{marginBottom:0}}>
              <div><label>Cantidad</label><input type="number" value={ins.cantidad} onChange={e=>updInsumo(i,"cantidad",e.target.value)} min={1}/></div>
              <div><label>Precio unit. (S/)</label><input type="number" value={ins.precio_unitario} onChange={e=>updInsumo(i,"precio_unitario",e.target.value)} className="mono"/></div>
              <div><label>IGV (S/)</label><input type="number" value={ins.igv} onChange={e=>updInsumo(i,"igv",e.target.value)} className="mono" placeholder="0.00"/></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
              <span style={{fontSize:12,color:"var(--text2)"}}>Total: <strong style={{color:"var(--success)"}}>S/ {ins.precio_total||"0.00"}</strong></span>
              <button className="btn-icon" onClick={()=>setInsumos(insumos.filter((_,j)=>j!==i))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
            </div>
          </div>
        ))}

        <div className="divider"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:500}}>Mano de obra</span>
          <button className="btn-ghost" style={{fontSize:12}} onClick={()=>setManoObra([...manoObra,{...MO0}])}><i className="ti ti-plus"/> Agregar</button>
        </div>
        {manoObra.map((mo,i)=>(
          <div key={i} className="insumo-row">
            <div className="form-row col3" style={{marginBottom:0}}>
              <div><label>Tipo</label><select value={mo.categoria_id} onChange={e=>updMO(i,"categoria_id",e.target.value)}><option value="">Seleccionar...</option>{catMO.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <div><label>Trabajador</label><select value={mo.trabajador_id} onChange={e=>updMO(i,"trabajador_id",e.target.value)}><option value="">Seleccionar...</option>{trabajadores.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              <div><label>Descripción</label><input value={mo.descripcion} onChange={e=>updMO(i,"descripcion",e.target.value)} placeholder="Ej. Torneado vástago"/></div>
            </div>
            <div className="form-row col2" style={{marginTop:8,marginBottom:0}}>
              <div><label>Horas estimadas</label><input type="number" value={mo.horas_estimadas} onChange={e=>updMO(i,"horas_estimadas",e.target.value)} step={0.5}/></div>
              <div><label>Costo estimado (S/)</label><input type="number" value={mo.costo_estimado} onChange={e=>updMO(i,"costo_estimado",e.target.value)} className="mono"/></div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button className="btn-icon" onClick={()=>setManoObra(manoObra.filter((_,j)=>j!==i))} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button>
            </div>
          </div>
        ))}

        <div className="divider"/>
        <div style={{background:"var(--navy3)",borderRadius:8,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,color:"var(--text2)"}}>Insumos: <strong style={{color:"var(--text)"}}>S/ {totalInsumos.toFixed(2)}</strong> &nbsp;|&nbsp; Mano de obra: <strong style={{color:"var(--text)"}}>S/ {totalMO.toFixed(2)}</strong></div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--orange)"}}>Total: S/ {totalServicio.toFixed(2)}</div>
        </div>

        <div className="form-row col1" style={{marginTop:12}}><div><label>Notas adicionales</label><textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} rows={2} placeholder="Observaciones, garantía aplicada, incidencias..."/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>{editando?"Guardar cambios":"Guardar servicio"}</button></div>
      </Modal>}
    </div>
  );
}

// ── HORAS-HOMBRE ──────────────────────────────────────────
function HorasHombre(){
  const [trabajadores,setTrabajadores]=useState([]);const [ordenes,setOrdenes]=useState([]);const [modal,setModal]=useState(false);const [semana,setSemana]=useState(getLunes());const [registros,setRegistros]=useState([]);
  const TIPOS=[{value:"oc",label:"OC / Servicio"},{value:"administrativo",label:"Administrativo"},{value:"mantenimiento",label:"Mantenimiento"},{value:"capacitacion",label:"Capacitación"},{value:"vacaciones",label:"Vacaciones"},{value:"feriado",label:"Feriado"}];
  function getLunes(){const h=new Date(),d=h.getDay(),diff=h.getDate()-d+(d===0?-6:1);return new Date(h.setDate(diff)).toISOString().split("T")[0];}
  useEffect(()=>{Promise.all([supabase.from("trabajadores").select("id,nombre").eq("activo",true).order("nombre"),supabase.from("ordenes_compra").select("id,numero").in("estado",["en_proceso","entregado"]).order("numero")]).then(([{data:t},{data:o}])=>{setTrabajadores(t||[]);setOrdenes(o||[]);});},[]);
  function updReg(i,k,v){const r=[...registros];r[i][k]=v;setRegistros(r);}
  async function guardar(){
    const fin=new Date(semana+"T00:00:00");fin.setDate(fin.getDate()+6);
    const{data:parte}=await supabase.from("partes_semanales").insert([{semana_inicio:semana,semana_fin:fin.toISOString().split("T")[0],cerrado:true}]).select().single();
    if(parte&&registros.length>0)await supabase.from("horas_semana_detalle").insert(registros.map(r=>({...r,parte_id:parte.id,horas:parseFloat(r.horas),oc_id:r.oc_id||null})));
    setModal(false);setRegistros([]);
  }
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Horas-hombre semanal</h2></div>
        <button className="btn-primary" onClick={()=>setModal(true)}><i className="ti ti-plus"/> Registrar semana</button>
      </div>
      <div className="card" style={{color:"var(--text2)",fontSize:13}}>Los partes registrados aparecerán aquí. Rubén carga las horas cada semana.</div>
      {modal&&<Modal title="Registrar horas semanales" onClose={()=>setModal(false)} wide>
        <div className="form-row col2" style={{marginBottom:16}}><div><label>Semana que inicia (lunes)</label><input type="date" value={semana} onChange={e=>setSemana(e.target.value)}/></div></div>
        <div className="divider"/>
        {registros.map((r,i)=>(
          <div key={i} className="insumo-row">
            <div className="form-row col3">
              <div><label>Trabajador</label><select value={r.trabajador_id||""} onChange={e=>updReg(i,"trabajador_id",e.target.value)}><option value="">Seleccionar...</option>{trabajadores.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              <div><label>Día</label><input type="date" value={r.dia} onChange={e=>updReg(i,"dia",e.target.value)}/></div>
              <div><label>Horas</label><input type="number" value={r.horas} onChange={e=>updReg(i,"horas",e.target.value)} max={12} min={0} step={0.5}/></div>
            </div>
            <div className="form-row col2" style={{marginBottom:0}}>
              <div><label>Tipo</label><select value={r.tipo_asignacion} onChange={e=>updReg(i,"tipo_asignacion",e.target.value)}>{TIPOS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              {r.tipo_asignacion==="oc"?<div><label>OC</label><select value={r.oc_id||""} onChange={e=>updReg(i,"oc_id",e.target.value)}><option value="">Seleccionar...</option>{ordenes.map(o=><option key={o.id} value={o.id}>{o.numero}</option>)}</select></div>:<div><label>Código / Nota</label><input value={r.codigo_admin||""} onChange={e=>updReg(i,"codigo_admin",e.target.value)} placeholder="ADM-001..."/></div>}
            </div>
          </div>
        ))}
        <button className="btn-ghost" onClick={()=>setRegistros([...registros,{trabajador_id:"",dia:semana,horas:8,tipo_asignacion:"administrativo",oc_id:"",codigo_admin:""}])} style={{marginBottom:16}}><i className="ti ti-plus"/> Agregar línea</button>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Guardar parte</button></div>
      </Modal>}
    </div>
  );
}

// ── GASTOS FIJOS ──────────────────────────────────────────
function GastosFijos(){
  const [gastos,setGastos]=useState([]);const [categorias,setCategorias]=useState([]);const [modal,setModal]=useState(false);const [modalCat,setModalCat]=useState(false);const [editando,setEditando]=useState(null);const [nuevaCat,setNuevaCat]=useState("");
  const [mes,setMes]=useState(new Date().getMonth()+1);const [año,setAño]=useState(new Date().getFullYear());
  const FORM0={categoria_id:"",monto:"",tiene_comprobante:"sin",proveedor_ruc:"",proveedor_razon:"",numero_comprobante:"",base_imponible:"",igv_monto:"",origen_pago:"cuenta_prohidraut",notas:""};
  const [form,setForm]=useState(FORM0);
  const MESES=["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Setiembre","Octubre","Noviembre","Diciembre"];
  useEffect(()=>{cargar();},[mes,año]);
  async function cargar(){const[{data:g},{data:c}]=await Promise.all([supabase.from("gastos_fijos_mensuales").select("*,categorias_gasto_fijo(nombre)").eq("mes",mes).eq("año",año),supabase.from("categorias_gasto_fijo").select("*").eq("activo",true).order("nombre")]);setGastos(g||[]);setCategorias(c||[]);}
  function abrirNuevo(){setEditando(null);setForm(FORM0);setModal(true);}
  function abrirEditar(g){setEditando(g.id);setForm({categoria_id:g.categoria_id||"",monto:g.monto||"",tiene_comprobante:g.tiene_comprobante||"sin",proveedor_ruc:g.proveedor_ruc||"",proveedor_razon:g.proveedor_razon||"",numero_comprobante:g.numero_comprobante||"",base_imponible:g.base_imponible||"",igv_monto:g.igv_monto||"",origen_pago:g.origen_pago||"cuenta_prohidraut",notas:g.notas||""});setModal(true);}
  async function guardar(){
    if(!form.categoria_id||!form.monto)return;
    const payload={...form,mes,año,monto:parseFloat(form.monto),base_imponible:parseFloat(form.base_imponible)||null,igv_monto:parseFloat(form.igv_monto)||null};
    if(editando)await supabase.from("gastos_fijos_mensuales").update(payload).eq("id",editando);
    else await supabase.from("gastos_fijos_mensuales").insert([payload]);
    setModal(false);cargar();
  }
  async function eliminar(id){if(!confirm("¿Eliminar?"))return;await supabase.from("gastos_fijos_mensuales").delete().eq("id",id);cargar();}
  async function guardarCat(){if(!nuevaCat.trim())return;await supabase.from("categorias_gasto_fijo").insert([{nombre:nuevaCat.trim()}]);setNuevaCat("");setModalCat(false);cargar();}
  const total=gastos.reduce((s,g)=>s+parseFloat(g.monto||0),0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><h2 style={{fontSize:18,fontWeight:600}}>Gastos fijos</h2><p style={{fontSize:13,color:"var(--text2)",marginTop:2}}>Total {MESES[mes]} {año}: <strong style={{color:"var(--orange)"}}>S/ {total.toFixed(2)}</strong></p></div>
        <div style={{display:"flex",gap:8}}>
          <select value={mes} onChange={e=>setMes(parseInt(e.target.value))} style={{width:120}}>{MESES.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
          <select value={año} onChange={e=>setAño(parseInt(e.target.value))} style={{width:90}}>{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select>
          <button className="btn-secondary" onClick={()=>setModalCat(true)}><i className="ti ti-tag"/></button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus"/> Agregar</button>
        </div>
      </div>
      <table>
        <thead><tr><th>Categoría</th><th>Monto</th><th>Comprobante</th><th>Proveedor</th><th>Origen</th><th></th></tr></thead>
        <tbody>
          {gastos.map(g=>(
            <tr key={g.id}>
              <td><strong>{g.categorias_gasto_fijo?.nombre}</strong></td><td className="mono">S/ {parseFloat(g.monto||0).toFixed(2)}</td>
              <td><span className={`badge ${g.tiene_comprobante==="factura"?"badge-blue":g.tiene_comprobante==="boleta"?"badge-green":"badge-gray"}`}>{g.tiene_comprobante}</span></td>
              <td style={{color:"var(--text2)"}}>{g.proveedor_razon||"—"}</td><td style={{color:"var(--text2)"}}>{(g.origen_pago||"—").replace("_"," ")}</td>
              <td><div className="actions-col"><button className="btn-icon" onClick={()=>abrirEditar(g)}><i className="ti ti-pencil"/></button><button className="btn-icon" onClick={()=>eliminar(g.id)} style={{color:"var(--danger)"}}><i className="ti ti-trash"/></button></div></td>
            </tr>
          ))}
          {gastos.length===0&&<tr><td colSpan={6} style={{color:"var(--text3)",textAlign:"center",padding:24}}>Sin gastos este mes</td></tr>}
        </tbody>
      </table>
      {modalCat&&<Modal title="Nueva categoría" onClose={()=>setModalCat(false)}>
        <div style={{marginBottom:8,fontSize:13,color:"var(--text2)"}}>Existentes: {categorias.map(c=><span key={c.id} className="tag">{c.nombre}</span>)}</div>
        <div className="form-row col1"><div><label>Nombre</label><input value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)} placeholder="Ej. Gas, telefonía..."/></div></div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModalCat(false)}>Cancelar</button><button className="btn-primary" onClick={guardarCat}>Crear</button></div>
      </Modal>}
      {modal&&<Modal title={editando?"Editar gasto":"Agregar gasto — "+MESES[mes]+" "+año} onClose={()=>setModal(false)}>
        <div className="form-row col2"><div><label>Categoría *</label><select value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})}><option value="">Seleccionar...</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div><label>Monto (S/) *</label><input type="number" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} className="mono"/></div></div>
        <div className="form-row col2"><div><label>Comprobante</label><select value={form.tiene_comprobante} onChange={e=>setForm({...form,tiene_comprobante:e.target.value})}><option value="sin">Sin comprobante</option><option value="boleta">Boleta</option><option value="factura">Factura</option></select></div><div><label>Origen del pago</label><select value={form.origen_pago} onChange={e=>setForm({...form,origen_pago:e.target.value})}><option value="cuenta_prohidraut">Cuenta PROHIDRAUT</option><option value="yape">Yape</option><option value="caja_chica">Caja chica</option><option value="efectivo">Efectivo</option></select></div></div>
        {form.tiene_comprobante!=="sin"&&<div className="form-row col3"><div><label>RUC proveedor</label><input value={form.proveedor_ruc} onChange={e=>setForm({...form,proveedor_ruc:e.target.value})} className="mono"/></div><div><label>Razón social</label><input value={form.proveedor_razon} onChange={e=>setForm({...form,proveedor_razon:e.target.value})}/></div><div><label>Nro. comprobante</label><input value={form.numero_comprobante} onChange={e=>setForm({...form,numero_comprobante:e.target.value})}/></div></div>}
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar}>{editando?"Guardar cambios":"Guardar"}</button></div>
      </Modal>}
    </div>
  );
}

function ModuleRouter({modulo,setActive}){
  const m={pipeline:<Pipeline setActive={setActive}/>,clientes:<Clientes/>,cilindros:<Cilindros/>,servicios:<Servicios/>,almacen:<Almacen/>,horas:<HorasHombre/>,gastos_fijos:<GastosFijos/>,trabajadores:<Trabajadores/>,deudas:<div><h2 style={{fontSize:18,fontWeight:600}}>Deudas</h2><div className="empty-state" style={{marginTop:40}}><i className="ti ti-credit-card"/><div>Próximamente</div></div></div>};
  return m[modulo]||<Pipeline setActive={setActive}/>;
}

export default function App(){
  const [session,setSession]=useState(null);const [modulo,setModulo]=useState("pipeline");const [loadingAuth,setLoadingAuth]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoadingAuth(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);
  if(loadingAuth)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text2)",background:"var(--navy)"}}>Cargando...</div>;
  if(!session)return<><GlobalStyles/><LoginScreen/></>;
  return(
    <AppCtx.Provider value={{session,supabase}}>
      <GlobalStyles/>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar active={modulo} setActive={setModulo} user={session.user}/>
        <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
          <ModuleRouter modulo={modulo} setActive={setModulo}/>
        </div>
      </div>
    </AppCtx.Provider>
  );
}
