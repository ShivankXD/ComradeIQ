"use client";

import Link from "next/link";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "Research",
    description: "Web-enabled Researcher specialist scours the internet and synthesizes authoritative answers.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Write",
    description: "Narrative Writer crafts structured artifacts (reports, READMEs, and documents) from a single brief.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Present",
    description: "Formatter and Assembler transform raw content into polished PPTX presentations, ready to deliver.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Coordinate",
    description: "Multi-agent architecture: Commander orchestrates Researcher, Writer, Critic, Formatter, and Assembler simultaneously.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Monitor",
    description: "Real-time mission timeline shows every step (planning, dispatching, execution, and synthesis) as it happens.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    title: "Export",
    description: "Download results as Markdown or PPTX. Web sources cited. Mission history persists locally across sessions.",
  },
];

const steps = [
  { num: "01", label: "Give a mission", detail: "Type any objective into the command bar: a question, a document brief, or a presentation topic." },
  { num: "02", label: "Commander plans",  detail: "The Commander reviews your mission and selects the right specialists for the job." },
  { num: "03", label: "Team executes",    detail: "Active specialists work in parallel, researching, writing, critiquing, and assembling." },
  { num: "04", label: "Result delivered", detail: "A complete artifact is delivered: readable inline, downloadable as Markdown or PPTX." },
];

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08090a",
        color: "#eef2f0",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Background gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 20% 20%, rgba(0,229,160,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 35% at 80% 75%, rgba(61,158,255,0.05) 0%, transparent 55%),
            linear-gradient(rgba(0,229,160,0.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,229,160,0.028) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 36px 36px, 36px 36px",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(8,9,10,0.8)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 14,
                color: "#060f0a",
                boxShadow: "0 0 18px rgba(0,229,160,0.3)",
              }}
            >
              C
            </div>
            <span
              style={{
                fontFamily: "'Syne', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.02em",
                color: "#eef2f0",
              }}
            >
              ComradeIQ
            </span>
          </div>

          <Link
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
              color: "#060f0a",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "-0.01em",
              padding: "9px 20px",
              borderRadius: 10,
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(0,229,160,0.28)",
              transition: "box-shadow 0.18s ease",
            }}
          >
            Launch App
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </nav>

        {/* Hero */}
        <section
          style={{
            textAlign: "center",
            padding: "96px 24px 80px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {/* Tag */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,229,160,0.07)",
              border: "1px solid rgba(0,229,160,0.22)",
              borderRadius: 999,
              padding: "5px 14px",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00e5a0",
                boxShadow: "0 0 6px rgba(0,229,160,0.9)",
                display: "inline-block",
                animation: "pulse-dot 1.4s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: "#00e5a0",
              }}
            >
              MULTI-AGENT AI MISSION CONTROL
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Syne', system-ui, sans-serif",
              fontSize: "clamp(40px, 7vw, 76px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.06,
              color: "#f0f5f2",
              marginBottom: 24,
            }}
          >
            Give the Commander<br />
            <span
              style={{
                background: "linear-gradient(135deg, #00e5a0 0%, #3d9eff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              a mission.
            </span>
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "#a8b4ae",
              maxWidth: 560,
              margin: "0 auto 40px",
            }}
          >
            ComradeIQ is a multi-agent AI command center. One prompt coordinates
            a team of specialists (Researcher, Writer, Critic, Formatter, and Assembler)
            to deliver results beyond any single model.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                color: "#060f0a",
                fontWeight: 700,
                fontSize: 15,
                padding: "13px 28px",
                borderRadius: 12,
                textDecoration: "none",
                boxShadow: "0 0 30px rgba(0,229,160,0.3)",
              }}
            >
              Start a mission
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/app?demo=1"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,229,160,0.06)",
                border: "1px solid rgba(0,229,160,0.28)",
                color: "#00e5a0",
                fontWeight: 700,
                fontSize: 15,
                padding: "13px 28px",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch live demo
            </Link>
            <a
              href="https://github.com/ShivankXD/ComradeIQ"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#c8d5ce",
                fontWeight: 600,
                fontSize: 15,
                padding: "13px 28px",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </section>

        {/* Features grid */}
        <section
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px 96px",
          }}
        >
          <p
            style={{
              textAlign: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "rgba(0,229,160,0.7)",
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            Capabilities
          </p>
          <h2
            style={{
              textAlign: "center",
              fontFamily: "'Syne', system-ui, sans-serif",
              fontSize: "clamp(24px, 3.5vw, 38px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#eef2f0",
              marginBottom: 48,
            }}
          >
            Everything your team needs
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: "24px 24px",
                  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,160,0.22)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 30px rgba(0,229,160,0.07)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(0,229,160,0.1)",
                    border: "1px solid rgba(0,229,160,0.2)",
                    display: "grid",
                    placeItems: "center",
                    color: "#00e5a0",
                    marginBottom: 16,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                    color: "#eef2f0",
                    marginBottom: 8,
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "#7a8a84" }}>{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 24px 96px",
          }}
        >
          <p
            style={{
              textAlign: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "rgba(0,229,160,0.7)",
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            How it works
          </p>
          <h2
            style={{
              textAlign: "center",
              fontFamily: "'Syne', system-ui, sans-serif",
              fontSize: "clamp(24px, 3.5vw, 38px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#eef2f0",
              marginBottom: 56,
            }}
          >
            From prompt to artifact in four steps
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {steps.map((step, i) => (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  gap: 24,
                  alignItems: "flex-start",
                  paddingBottom: i < steps.length - 1 ? 36 : 0,
                  position: "relative",
                }}
              >
                {/* Left: number + line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(0,229,160,0.08)",
                      border: "1px solid rgba(0,229,160,0.25)",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#00e5a0",
                      flexShrink: 0,
                    }}
                  >
                    {step.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        flexGrow: 1,
                        minHeight: 28,
                        background: "linear-gradient(to bottom, rgba(0,229,160,0.3), rgba(0,229,160,0.05))",
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>

                {/* Right: content */}
                <div style={{ paddingTop: 10 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      letterSpacing: "-0.02em",
                      color: "#eef2f0",
                      marginBottom: 6,
                    }}
                  >
                    {step.label}
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "#7a8a84" }}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "0 24px 96px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "rgba(0,229,160,0.04)",
              border: "1px solid rgba(0,229,160,0.15)",
              borderRadius: 24,
              padding: "56px 32px",
              boxShadow: "0 0 60px rgba(0,229,160,0.06)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "linear-gradient(135deg, #00e5a0, #00c487)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 24px",
                fontWeight: 700,
                fontSize: 20,
                color: "#060f0a",
                boxShadow: "0 0 30px rgba(0,229,160,0.4)",
              }}
            >
              C
            </div>
            <h2
              style={{
                fontFamily: "'Syne', system-ui, sans-serif",
                fontSize: "clamp(22px, 4vw, 36px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#eef2f0",
                marginBottom: 14,
              }}
            >
              Ready for your first mission?
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#8a9a94", marginBottom: 32 }}>
              No sign-up required. Just configure your API key and give the Commander an objective.
            </p>
            <Link
              href="/app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)",
                color: "#060f0a",
                fontWeight: 700,
                fontSize: 15,
                padding: "13px 32px",
                borderRadius: 12,
                textDecoration: "none",
                boxShadow: "0 0 30px rgba(0,229,160,0.35)",
              }}
            >
              Launch ComradeIQ
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "linear-gradient(135deg, #00e5a0, #00c487)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 11,
                color: "#060f0a",
              }}
            >
              C
            </div>
            <span style={{ fontSize: 13, color: "#5a6660", fontWeight: 500 }}>
              ComradeIQ · Built for DevPost Hackathon 2026
            </span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/app" style={{ fontSize: 13, color: "#5a6660", textDecoration: "none" }}>App</Link>
            <a href="https://github.com/ShivankXD/ComradeIQ" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#5a6660", textDecoration: "none" }}>GitHub</a>
          </div>
        </footer>
      </div>

      {/* Inline styles for animations that CSS-in-JS can't do in Server Components */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
