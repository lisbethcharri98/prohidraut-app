import { useState } from "react";
import { Logo } from "../components/ui";
import { supabase } from "../services/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr("Correo o contraseña incorrectos");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
      <div style={{ width: 380, padding: 32, background: "var(--navy2)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Logo size={44} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--orange)" }}>PROHIDRAUT S.A.</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Proyectos Hidráulico y Automáticos</div>
          </div>
        </div>
        <div className="form-row col1">
          <div className="form-field">
            <label>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@prohidraut.com" />
          </div>
          <div className="form-field">
            <label>Contraseña</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
          </div>
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn-primary" style={{ width: "100%", marginTop: 16, padding: 10, justifyContent: "center" }} onClick={login} disabled={loading}>
          {loading ? <><i className="ti ti-loader-2" /> Ingresando...</> : "Ingresar"}
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
          PROHIDRAUT ERP v2.0 — Sistema de gestión industrial
        </div>
      </div>
    </div>
  );
}
