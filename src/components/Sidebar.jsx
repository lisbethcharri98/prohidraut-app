import { Logo } from "./ui";
import { useAuthStore } from "../store/auth";

const NAV = [
  { group: "Operaciones", items: [
    { id: "pipeline", icon: "ti-layout-kanban", label: "Pipeline" },
    { id: "clientes", icon: "ti-building", label: "Clientes" },
    { id: "cilindros", icon: "ti-settings", label: "Equipos / Cilindros" },
    { id: "servicios", icon: "ti-history", label: "Servicios históricos" },
  ]},
  { group: "Taller", items: [
    { id: "ordenes", icon: "ti-clipboard-list", label: "Órdenes de compra" },
    { id: "cotizaciones", icon: "ti-file-text", label: "Cotizaciones" },
  ]},
  { group: "Inventario", items: [
    { id: "almacen", icon: "ti-package", label: "Almacén" },
    { id: "sellos", icon: "ti-circles", label: "Tipos de sello" },
  ]},
  { group: "Costos", items: [
    { id: "horas", icon: "ti-clock", label: "Horas-hombre" },
    { id: "gastos_fijos", icon: "ti-home", label: "Gastos fijos" },
    { id: "deudas", icon: "ti-credit-card", label: "Deudas" },
  ]},
  { group: "Empresa", items: [
    { id: "trabajadores", icon: "ti-users", label: "Trabajadores" },
    { id: "rentabilidad", icon: "ti-chart-bar", label: "Rentabilidad" },
    { id: "contador", icon: "ti-file-export", label: "Export contador" },
  ]},
];

export default function Sidebar({ active, setActive }) {
  const { user, signOut } = useAuthStore();

  return (
    <div style={{
      width: 220, background: "var(--navy2)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      minHeight: "100vh", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={36} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--orange)" }}>PROHIDRAUT</div>
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>S.A. — Gestión interna</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {NAV.map(g => (
          <div key={g.group}>
            <div style={{ fontSize: 10, color: "var(--text3)", padding: "12px 16px 4px", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
              {g.group}
            </div>
            {g.items.map(item => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 16px",
                  background: active === item.id ? "rgba(232,114,42,0.1)" : "transparent",
                  color: active === item.id ? "var(--orange)" : "var(--text2)",
                  borderLeft: active === item.id ? "2px solid var(--orange)" : "2px solid transparent",
                  borderRadius: 0, textAlign: "left", fontSize: 13,
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 15 }} />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>Sesión activa</div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>{user?.email}</div>
        <button className="btn-ghost" style={{ padding: "4px 0", fontSize: 12, color: "var(--text3)" }} onClick={signOut}>
          <i className="ti ti-logout" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
