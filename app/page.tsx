"use client";

import Link from "next/link";


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
            padding: "clamp(44px, 8vh, 104px) 24px clamp(36px, 6vh, 84px)",
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
