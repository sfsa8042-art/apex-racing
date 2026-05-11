import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error boundary — shows message instead of blank crash
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: "100vh", background: "#0c0c0e", color: "#a0a0a8",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px", fontFamily: "monospace", textAlign: "center", gap: "12px"
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "#a3e63520",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, marginBottom: 8
          }}>⚠</div>
          <p style={{ color: "#f0f0f2", fontWeight: 700, fontSize: 14 }}>
            Ошибка запуска
          </p>
          <p style={{ fontSize: 11, maxWidth: 300, lineHeight: 1.6 }}>
            {this.state.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: "8px 20px", borderRadius: 10,
              background: "#a3e635", color: "#09090b", border: "none",
              fontWeight: 700, cursor: "pointer", fontSize: 12
            }}>
            Перезапустить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
