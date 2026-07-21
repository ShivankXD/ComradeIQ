"use client";

import { useEffect, useState } from "react";

type ConnectorId = "gmail" | "calendar" | "slack" | "jira";

interface Connector {
  id: ConnectorId;
  name: string;
  description: string;
  iconUrl: string;
  isConnected: boolean;
  isSimulating: boolean;
}

interface ConnectorsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectorsDialog({ isOpen, onClose }: ConnectorsDialogProps) {
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: "gmail",
      name: "Gmail",
      description: "Send emails, summary reports, and draft responses from Comrade briefs.",
      iconUrl: "✉️",
      isConnected: false,
      isSimulating: false,
    },
    {
      id: "calendar",
      name: "Google Calendar",
      description: "Schedule briefings, check availability, and book appointments automatically.",
      iconUrl: "📅",
      isConnected: false,
      isSimulating: false,
    },
    {
      id: "slack",
      name: "Slack Dispatch",
      description: "Notify channels and dispatch reports automatically upon mission completion.",
      iconUrl: "💬",
      isConnected: false,
      isSimulating: false,
    },
    {
      id: "jira",
      name: "Jira Integration",
      description: "Generate tasks, update boards, and file bug reports based on commander outputs.",
      iconUrl: "📋",
      isConnected: false,
      isSimulating: false,
    },
  ]);

  const [oauthWindow, setOauthWindow] = useState<{
    connectorId: ConnectorId;
    step: "init" | "loading" | "success";
  } | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("comradeiq-connectors");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<ConnectorId, boolean>;
        setConnectors((curr) =>
          curr.map((c) => ({
            ...c,
            isConnected: !!parsed[c.id],
          }))
        );
      } catch (e) {
        console.error("Failed to load connectors state", e);
      }
    }
  }, []);

  const saveState = (updated: Connector[]) => {
    const stateMap = updated.reduce((acc, c) => {
      acc[c.id] = c.isConnected;
      return acc;
    }, {} as Record<ConnectorId, boolean>);
    localStorage.setItem("comradeiq-connectors", JSON.stringify(stateMap));
  };

  const handleToggle = (id: ConnectorId) => {
    const conn = connectors.find((c) => c.id === id);
    if (!conn) return;

    if (conn.isConnected) {
      // Disconnect directly
      const next = connectors.map((c) =>
        c.id === id ? { ...c, isConnected: false } : c
      );
      setConnectors(next);
      saveState(next);
    } else {
      // Show simulated OAuth flow modal
      setOauthWindow({ connectorId: id, step: "init" });
    }
  };

  const startOAuthSimulation = (id: ConnectorId) => {
    setOauthWindow({ connectorId: id, step: "loading" });
    setTimeout(() => {
      setOauthWindow({ connectorId: id, step: "success" });
      setTimeout(() => {
        const next = connectors.map((c) =>
          c.id === id ? { ...c, isConnected: true } : c
        );
        setConnectors(next);
        saveState(next);
        setOauthWindow(null);
      }, 1200);
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Main dialog box */}
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{
          position: "relative",
          zIndex: 10,
          background: "rgba(6, 12, 8, 0.9)",
          border: "1px solid rgba(0,229,160,0.2)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0,229,160,0.05)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: 20,
                fontWeight: 700,
                color: "#eef2f0",
                letterSpacing: "-0.02em",
              }}
            >
              Comrade Connectors
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Link your workspace plugins to enable automated agent tasks.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }} className="space-y-4">
          {connectors.map((c) => (
            <div
              key={c.id}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${c.isConnected ? "rgba(0,229,160,0.18)" : "var(--border-dim)"}`,
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                transition: "border-color 0.25s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span
                  style={{
                    fontSize: 22,
                    background: c.isConnected ? "rgba(0,229,160,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${c.isConnected ? "rgba(0,229,160,0.2)" : "transparent"}`,
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {c.iconUrl}
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{c.name}</h4>
                    {c.isConnected && (
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "var(--font-code)",
                          background: "rgba(0,229,160,0.1)",
                          color: "var(--accent)",
                          border: "1px solid rgba(0,229,160,0.2)",
                          padding: "1px 6px",
                          borderRadius: 99,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {c.description}
                  </p>
                </div>
              </div>

              {/* Toggle switch button */}
              <button
                onClick={() => handleToggle(c.id)}
                style={{
                  background: c.isConnected
                    ? "rgba(255, 68, 68, 0.08)"
                    : "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                  border: c.isConnected ? "1px solid rgba(255, 68, 68, 0.2)" : "none",
                  color: c.isConnected ? "#ff8888" : "#060f0a",
                  fontWeight: 700,
                  fontSize: 11,
                  fontFamily: "var(--font-code)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "8px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                {c.isConnected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
        </div>

        {/* Simulated OAuth modal overlay */}
        {oauthWindow && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 60,
              background: "rgba(6, 10, 8, 0.96)",
              borderRadius: "1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            {oauthWindow.step === "init" && (
              <div className="space-y-4">
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
                <h4 style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>
                  Authorize ComradeIQ Access
                </h4>
                <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 300, margin: "8px auto 20px" }}>
                  ComradeIQ requests secure permission to interface with your {connectors.find((c) => c.id === oauthWindow.connectorId)?.name} workspace. No data is stored outside your browser.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => setOauthWindow(null)}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border-dim)",
                      color: "var(--text-secondary)",
                      padding: "8px 16px",
                      borderRadius: 10,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => startOAuthSimulation(oauthWindow.connectorId)}
                    style={{
                      background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                      color: "#000",
                      fontWeight: 700,
                      padding: "8px 20px",
                      borderRadius: 10,
                      cursor: "pointer",
                    }}
                  >
                    Allow Access
                  </button>
                </div>
              </div>
            )}

            {oauthWindow.step === "loading" && (
              <div className="space-y-4">
                {/* Loader animation */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: "3px solid rgba(0,229,160,0.15)",
                    borderTopColor: "var(--accent)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <h4 style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>
                  Requesting OAuth Token...
                </h4>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Connecting securely to the provider authentication server.
                </p>
              </div>
            )}

            {oauthWindow.step === "success" && (
              <div className="space-y-4">
                <div style={{ fontSize: 36, color: "var(--accent)", animation: "pulse-dot 1s ease infinite" }}>
                  ✓
                </div>
                <h4 style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)", marginTop: 12 }}>
                  Integration Securely Connected!
                </h4>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Returning control back to ComradeIQ.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
