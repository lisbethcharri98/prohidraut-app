// Componentes compartidos reutilizables

export function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <polygon points="50,5 95,90 5,90" fill="none" stroke="#E8722A" strokeWidth="6" />
      <circle cx="50" cy="62" r="18" fill="none" stroke="#E8722A" strokeWidth="5" />
      <circle cx="50" cy="62" r="8" fill="#E8722A" />
      <line x1="50" y1="44" x2="50" y2="30" stroke="#E8722A" strokeWidth="4" />
    </svg>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-title">
          {title}
          <button className="btn-ghost btn-sm" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      <i className={`ti ${icon}`} />
      <h3>{title}</h3>
      {subtitle && <p style={{ fontSize: 13 }}>{subtitle}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function AlertBanner({ type = "warn", icon, children }) {
  return (
    <div className={`alert-banner ${type === "danger" ? "alert-danger" : ""}`}>
      <i className={`ti ${icon || "ti-alert-triangle"}`} style={{ fontSize: 18, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

export function Badge({ color, children }) {
  const cls = {
    green: "badge-green", orange: "badge-orange", blue: "badge-blue",
    red: "badge-red", gray: "badge-gray", warn: "badge-warn",
    purple: "badge-purple", teal: "badge-teal",
  };
  return <span className={`badge ${cls[color] || "badge-gray"}`}>{children}</span>;
}

export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 24, color: "var(--text3)", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
      <div style={{ flex: 1, borderTop: "1px solid var(--border2)" }} />
      {label && <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{label}</span>}
      <div style={{ flex: 1, borderTop: "1px solid var(--border2)" }} />
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="search-bar">
      <i className="ti ti-search" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Buscar..."} />
    </div>
  );
}

export function StatCard({ label, value, sub, color }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
