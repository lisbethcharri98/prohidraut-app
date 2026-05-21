import { useState, useEffect } from "react";
import { ocService } from "../services/oc";
import { supabase } from "../services/supabase";
import { StatCard, Badge, EmptyState } from "../components/ui";

export default function RentabilidadPage() {
  const [data, setData] = useState([]);
  const [gastosFijos, setGastosFijos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [año, setAño] = useState(new Date().getFullYear());
  const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => { cargar(); }, [mes, año]);

  async function cargar() {
    setLoading(true);
    try {
      const [rent, { data: gf }] = await Promise.all([
        ocService.getRentabilidad(),
        supabase.from("gastos_fijos_mensuales").select("monto").eq("mes", mes).eq("año", año).eq("activo", true),
      ]);
      setData(rent || []);
      setGastosFijos((gf || []).reduce((s, g) => s + parseFloat(g.monto || 0), 0));
    } finally { setLoading(false); }
  }

  const totalIngreso = data.reduce((s, r) => s + parseFloat(r.ingreso_cotizado || 0), 0);
  const totalGastos = data.reduce((s, r) => s + parseFloat(r.total_gastos_directos || 0), 0);
  const totalHoras = data.reduce((s, r) => s + parseFloat(r.total_costo_horas || 0), 0);
  const margenBruto = totalIngreso - totalGastos - totalHoras;
  const margenNeto = margenBruto - gastosFijos;
  const margenPct = totalIngreso > 0 ? ((margenNeto / totalIngreso) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Rentabilidad</h2><p className="page-subtitle">Dashboard financiero por servicio</p></div>
        <div className="page-actions">
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ width: 120 }}>{MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select>
          <select value={año} onChange={e => setAño(parseInt(e.target.value))} style={{ width: 90 }}>{[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}</select>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard label="Ingresos totales" value={`S/ ${totalIngreso.toFixed(0)}`} sub="suma de OCs" color="var(--success)" />
        <StatCard label="Gastos directos" value={`S/ ${totalGastos.toFixed(0)}`} sub="insumos + gastos OC" color="var(--danger)" />
        <StatCard label="Costo horas" value={`S/ ${totalHoras.toFixed(0)}`} sub="mano de obra real" color="var(--warning)" />
        <StatCard label="Margen neto" value={`S/ ${margenNeto.toFixed(0)}`} sub={`${margenPct}% — después de gastos fijos`} color={margenNeto >= 0 ? "var(--success)" : "var(--danger)"} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>Gastos fijos {MESES[mes]}: <strong style={{ color: "var(--danger)" }}>S/ {gastosFijos.toFixed(2)}</strong></span>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>Margen bruto (sin gastos fijos): <strong style={{ color: margenBruto >= 0 ? "var(--success)" : "var(--danger)" }}>S/ {margenBruto.toFixed(2)}</strong></span>
          <span style={{ fontSize: 14, fontWeight: 600, color: margenNeto >= 0 ? "var(--success)" : "var(--danger)" }}>Margen neto: S/ {margenNeto.toFixed(2)} ({margenPct}%)</span>
        </div>
      </div>

      {loading ? <div className="empty-state"><i className="ti ti-loader-2" /></div> :
        data.length === 0 ? <EmptyState icon="ti-chart-bar" title="Sin datos de rentabilidad" subtitle="Los datos aparecen cuando hay órdenes de compra con gastos registrados" /> : (
          <table>
            <thead><tr><th>OC</th><th>Cliente</th><th>Equipo</th><th>Estado</th><th>Ingreso</th><th>Gastos</th><th>Horas</th><th>Margen</th><th>%</th><th>Días</th></tr></thead>
            <tbody>
              {data.map(r => {
                const margen = parseFloat(r.margen_bruto || 0);
                const pct = parseFloat(r.margen_pct || 0);
                return (
                  <tr key={r.id}>
                    <td className="mono"><strong>{r.numero}</strong></td>
                    <td>{r.cliente}</td>
                    <td style={{ color: "var(--text2)" }}>{r.cilindro || "—"}</td>
                    <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{r.estado}</span></td>
                    <td className="mono">{r.ingreso_cotizado ? `S/ ${parseFloat(r.ingreso_cotizado).toFixed(0)}` : "—"}</td>
                    <td className="mono" style={{ color: "var(--danger)" }}>S/ {parseFloat(r.total_gastos_directos || 0).toFixed(0)}</td>
                    <td className="mono" style={{ color: "var(--warning)" }}>S/ {parseFloat(r.total_costo_horas || 0).toFixed(0)}</td>
                    <td className="mono" style={{ color: margen >= 0 ? "var(--success)" : "var(--danger)" }}>S/ {margen.toFixed(0)}</td>
                    <td><Badge color={pct >= 40 ? "green" : pct >= 20 ? "warn" : "red"}>{pct.toFixed(1)}%</Badge></td>
                    <td style={{ color: "var(--text3)" }}>{r.dias_totales ? `${r.dias_totales}d` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
    </div>
  );
}
