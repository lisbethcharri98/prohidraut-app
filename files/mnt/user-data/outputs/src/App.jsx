import { useState, useEffect, lazy, Suspense } from "react";
import { useAuthStore } from "./store/auth";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/Login";
import "./styles.css";

// Lazy load pages
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Cilindros = lazy(() => import("./pages/Cilindros"));
const Servicios = lazy(() => import("./pages/Servicios"));
const Ordenes = lazy(() => import("./pages/Ordenes"));
const Almacen = lazy(() => import("./pages/Almacen"));
const Trabajadores = lazy(() => import("./pages/Trabajadores"));
const HorasHombre = lazy(() => import("./pages/HorasHombre"));
const GastosFijos = lazy(() => import("./pages/GastosFijos"));
const Rentabilidad = lazy(() => import("./pages/Rentabilidad"));

function Placeholder({ titulo }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{titulo}</h2>
      <div className="empty-state" style={{ marginTop: 60 }}>
        <i className="ti ti-clock" style={{ fontSize: 36, opacity: .3 }} />
        <h3>{titulo}</h3>
        <p>Módulo en construcción — próximamente</p>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="empty-state" style={{ marginTop: 80 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ModuleRouter({ modulo, setModulo }) {
  const pages = {
    pipeline: <Pipeline setModulo={setModulo} />,
    clientes: <Clientes />,
    cilindros: <Cilindros />,
    servicios: <Servicios />,
    ordenes: <Ordenes />,
    cotizaciones: <Placeholder titulo="Cotizaciones" />,
    almacen: <Almacen />,
    sellos: <Almacen />,
    horas: <HorasHombre />,
    gastos_fijos: <GastosFijos />,
    trabajadores: <Trabajadores />,
    rentabilidad: <Rentabilidad />,
    deudas: <Placeholder titulo="Deudas" />,
    contador: <Placeholder titulo="Export contador" />,
  };
  return pages[modulo] || <Pipeline setModulo={setModulo} />;
}

export default function App() {
  const { session, loading, init } = useAuthStore();
  const [modulo, setModulo] = useState("pipeline");

  useEffect(() => { init(); }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)", color: "var(--text2)" }}>
      Cargando...
    </div>
  );

  if (!session) return <LoginPage />;

  return (
    <div className="app-layout">
      <Sidebar active={modulo} setActive={setModulo} />
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <ModuleRouter modulo={modulo} setModulo={setModulo} />
        </Suspense>
      </main>
    </div>
  );
}
