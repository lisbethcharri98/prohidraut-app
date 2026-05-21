import { useState, useEffect } from "react";
import { ocService, ESTADOS_OC } from "../services/oc";
import { StatCard } from "../components/ui";

export default function PipelinePage({ setModulo }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const ocs = await ocService.getAll();
      const agrupado = {};
      ESTADOS_OC.forEach(e => agrupado[e.id] = []);
      ocs.forEach(oc => { if (agrupado[oc.estado] !== undefined) agrupado[oc.estado].push(oc); });
      setData(agrupado);
    } finally { setLoading(false); }
  }

  const total = Object.values(data).flat().length;
  const activos = Object.entries(data).filter(([k]) => !["pagado", "facturado"].includes(k)).flatMap(([, v]) => v).length;
  const porFacturar = (data["entregado"] || []).length + (data["listo_entrega"] || []).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Pipeline operativo</h2>
          <p className="page-subtitle">{total} servicios en total · {activos} activos</p>
        </div>
        <button className="btn-primary" onClick={() => setModulo("ordenes")}><i className="ti ti-plus" /> Nueva OC</button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <StatCard label="En taller" value={activos} sub="órdenes activas" />
        <StatCard label="Listos para entregar" value={porFacturar} sub="esperando entrega/factura" color="var(--success)" />
        <StatCard label="Esperando aprobación" value={(data["esperando_aprobacion"] || []).length} sub="diagnóstico enviado" color="var(--warning)" />
      </div>

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, overflowX: "auto" }}>
          {ESTADOS_OC.slice(0, 10).map(estado => (
            <div key={estado.id} className="card" style={{ minHeight: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: estado.color }}>{estado.label}</span>
                <span style={{ fontSize: 11, background: "rgba(255,255,255,.07)", borderRadius: 10, padding: "1px 8px", color: "var(--text3)" }}>{(data[estado.id] || []).length}</span>
              </div>
              {(data[estado.id] || []).length === 0 && <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "16px 0" }}>—</div>}
              {(data[estado.id] || []).map(oc => (
                <div key={oc.id} style={{ background: "var(--navy2)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 8, cursor: "pointer" }} onClick={() => setModulo("ordenes")}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{oc.cilindros?.nombre || "Servicio"}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>{oc.clientes?.razon_social || "—"}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, fontFamily: "monospace" }}>{oc.numero}</div>
                  {oc.ingreso_cotizado && <div style={{ fontSize: 11, color: "var(--success)", marginTop: 2 }}>S/ {parseFloat(oc.ingreso_cotizado).toFixed(0)}</div>}
                  {oc.fecha_recepcion && <div style={{ fontSize: 10, color: "var(--text3)" }}>{oc.fecha_recepcion}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
