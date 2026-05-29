import { useState } from "react";
import { expedientesService } from "../services/expedientes";
import { Divider } from "../components/ui";

export default function CategoriasModal({ categorias, onClose, onActualizar }) {
  const [nuevaCat, setNuevaCat] = useState("");
  const [nuevaSubcat, setNuevaSub] = useState({ catId: "", nombre: "" });
  const [nuevoModelo, setNuevoModelo] = useState({ subcatId: "", nombre: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function crearCategoria() {
    if (!nuevaCat.trim()) return;
    setSaving(true);
    try {
      await expedientesService.createCategoria(nuevaCat.trim());
      setNuevaCat("");
      setMsg(`✅ Categoría "${nuevaCat}" creada`);
      await onActualizar();
    } catch (e) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  async function crearSubcategoria() {
    if (!nuevaSubcat.catId || !nuevaSubcat.nombre.trim()) return;
    setSaving(true);
    try {
      await expedientesService.createSubcategoria(nuevaSubcat.catId, nuevaSubcat.nombre.trim());
      setNuevaSub({ catId: nuevaSubcat.catId, nombre: "" });
      setMsg(`✅ Subcategoría "${nuevaSubcat.nombre}" creada`);
      await onActualizar();
    } catch (e) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  async function crearModelo() {
    if (!nuevoModelo.subcatId || !nuevoModelo.nombre.trim()) return;
    setSaving(true);
    try {
      await expedientesService.createModelo(nuevoModelo.subcatId, nuevoModelo.nombre.trim());
      setNuevoModelo({ subcatId: nuevoModelo.subcatId, nombre: "" });
      setMsg(`✅ Modelo "${nuevoModelo.nombre}" creado`);
      await onActualizar();
    } catch (e) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  const todasLasSubcats = categorias.flatMap(c =>
    (c.subcategorias_servicio || []).map(s => ({ ...s, cat_nombre: c.nombre }))
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-title">
          Gestionar categorías de servicio
          <button className="btn-ghost btn-sm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        {/* Árbol actual */}
        <div style={{ background: "var(--navy3)", borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Estructura actual</div>
          {categorias.length === 0
            ? <div style={{ color: "var(--text3)", fontSize: 13 }}>Sin categorías aún</div>
            : categorias.map(cat => (
              <div key={cat.id} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--orange)" }}>📁 {cat.nombre}</div>
                {(cat.subcategorias_servicio || []).map(sub => (
                  <div key={sub.id} style={{ paddingLeft: 16, fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
                    └ {sub.nombre}
                    {(sub.modelos_servicio || []).map(m => (
                      <span key={m.id} className="tag" style={{ marginLeft: 4, fontSize: 10 }}>{m.nombre}</span>
                    ))}
                  </div>
                ))}
              </div>
            ))
          }
        </div>

        {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? "var(--success)" : "var(--danger)", marginBottom: 12, padding: "6px 10px", background: "var(--navy3)", borderRadius: 6 }}>{msg}</div>}

        {/* Paso 1: Categoría */}
        <Divider label="Paso 1 — Nueva categoría" />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={nuevaCat}
            onChange={e => setNuevaCat(e.target.value)}
            placeholder='Ej. "Pistón hidráulico", "Bomba hidráulica"...'
            onKeyDown={e => e.key === "Enter" && crearCategoria()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary btn-sm" onClick={crearCategoria} disabled={saving || !nuevaCat.trim()}>
            <i className="ti ti-plus" /> Crear
          </button>
        </div>

        {/* Paso 2: Subcategoría */}
        <Divider label="Paso 2 — Nueva subcategoría" />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Primero selecciona la categoría padre:</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={nuevaSubcat.catId}
              onChange={e => setNuevaSub(p => ({ ...p, catId: e.target.value }))}
              style={{ width: 220 }}
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input
              value={nuevaSubcat.nombre}
              onChange={e => setNuevaSub(p => ({ ...p, nombre: e.target.value }))}
              placeholder='Ej. "Dirección", "Freno", "Delantera faja"...'
              onKeyDown={e => e.key === "Enter" && crearSubcategoria()}
              style={{ flex: 1 }}
              disabled={!nuevaSubcat.catId}
            />
            <button className="btn-primary btn-sm" onClick={crearSubcategoria} disabled={saving || !nuevaSubcat.catId || !nuevaSubcat.nombre.trim()}>
              <i className="ti ti-plus" /> Crear
            </button>
          </div>
        </div>

        {/* Paso 3: Modelo */}
        <Divider label="Paso 3 — Nuevo modelo" />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Primero selecciona la subcategoría padre:</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={nuevoModelo.subcatId}
              onChange={e => setNuevoModelo(p => ({ ...p, subcatId: e.target.value }))}
              style={{ width: 220 }}
            >
              <option value="">Seleccionar subcategoría...</option>
              {todasLasSubcats.map(s => (
                <option key={s.id} value={s.id}>{s.cat_nombre} → {s.nombre}</option>
              ))}
            </select>
            <input
              value={nuevoModelo.nombre}
              onChange={e => setNuevoModelo(p => ({ ...p, nombre: e.target.value }))}
              placeholder='Ej. "FT", "01", "ST", "Kompass"...'
              onKeyDown={e => e.key === "Enter" && crearModelo()}
              style={{ flex: 1 }}
              disabled={!nuevoModelo.subcatId}
            />
            <button className="btn-primary btn-sm" onClick={crearModelo} disabled={saving || !nuevoModelo.subcatId || !nuevoModelo.nombre.trim()}>
              <i className="ti ti-plus" /> Crear
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid var(--border2)" }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
