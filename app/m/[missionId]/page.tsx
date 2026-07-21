"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SafeMarkdown } from "@/components/panels/SafeMarkdown";

interface Slide {
  title: string;
  keyMessage: string;
  bullets: string[];
  layout?: string;
}

interface PublicSnapshot {
  id: string;
  status: string;
  finalResult?: string;
  finalJson?: { slides?: Slide[] } | unknown;
  sources?: { title: string; url: string }[];
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; mission: PublicSnapshot }
  | { phase: "error"; message: string };

function safeExternalUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export default function SharedMissionPage() {
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId;
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/mission/${encodeURIComponent(missionId)}/public`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { mission?: PublicSnapshot; error?: { message?: string } };
        if (cancelled) return;
        if (!response.ok || !payload.mission) {
          setState({ phase: "error", message: payload.error?.message ?? "This shared mission is unavailable." });
          return;
        }
        setState({ phase: "ready", mission: payload.mission });
      } catch {
        if (!cancelled) setState({ phase: "error", message: "Could not load this shared mission." });
      }
    })();
    return () => { cancelled = true; };
  }, [missionId]);

  const slides = useMemo(() => {
    if (state.phase !== "ready") return null;
    const json = state.mission.finalJson as { slides?: Slide[] } | undefined;
    return Array.isArray(json?.slides) ? json!.slides : null;
  }, [state]);

  const sources = state.phase === "ready" ? state.mission.sources ?? [] : [];

  return (
    <main style={{ minHeight: "100dvh", position: "relative", zIndex: 1 }}>
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
            <span
              className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-black"
              style={{ background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)", boxShadow: "0 0 20px rgba(0,229,160,0.35)" }}
            >
              C
            </span>
            <span>
              <span className="block text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-brand)" }}>ComradeIQ</span>
              <span className="block text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)", letterSpacing: "0.1em" }}>SHARED MISSION</span>
            </span>
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: "linear-gradient(135deg, #00e5a0 0%, #00c487 100%)", color: "#060f0a", textDecoration: "none", boxShadow: "0 0 16px rgba(0,229,160,0.3)" }}
          >
            Launch ComradeIQ →
          </Link>
        </header>

        {state.phase === "loading" && (
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>Loading shared mission…</p>
        )}

        {state.phase === "error" && (
          <section className="rounded-2xl p-6" style={{ border: "1px solid rgba(255,138,101,0.25)", background: "rgba(255,138,101,0.05)" }}>
            <p className="text-sm font-semibold" style={{ color: "#ffb39a" }}>Shared mission unavailable</p>
            <p className="mt-1 text-sm leading-6" style={{ color: "rgba(255,179,154,0.75)" }}>{state.message}</p>
            <Link href="/app" className="mt-4 inline-block text-sm font-semibold" style={{ color: "var(--accent)" }}>Start your own mission →</Link>
          </section>
        )}

        {state.phase === "ready" && (
          <section
            className="rounded-2xl p-4 sm:p-6"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-mid)", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2 pb-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px rgba(0,229,160,0.7)" }} aria-hidden="true" />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Mission result</p>
              <span className="ml-auto text-[11px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>read-only</span>
            </div>

            <div
              className="pt-4"
              style={{
                "--md-text": "var(--text-primary)",
                "--md-muted": "var(--text-secondary)",
                "--md-accent": "var(--accent)",
                "--md-border": "var(--border-dim)",
                "--md-code-bg": "var(--bg-overlay)",
              } as React.CSSProperties}
            >
              {slides ? (
                <div className="space-y-3">
                  {slides.map((slide, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid var(--border-dim)" }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--accent)", fontFamily: "var(--font-code)", letterSpacing: "0.1em" }}>Slide {i + 1}</p>
                      <h3 className="mt-1 text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-brand)" }}>{slide.title}</h3>
                      {slide.bullets?.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {slide.bullets.map((b, bi) => (
                            <li key={bi} className="text-sm" style={{ color: "var(--text-secondary)" }}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {slide.keyMessage && (
                        <p className="mt-3 rounded-lg p-2.5 text-xs" style={{ background: "rgba(0,229,160,0.06)", borderLeft: "3px solid var(--accent)", color: "var(--text-secondary)" }}>
                          {slide.keyMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : state.mission.finalResult ? (
                <SafeMarkdown content={state.mission.finalResult} />
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>This mission produced no shareable text output.</p>
              )}
            </div>

            {sources.length > 0 && (
              <section className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-dim)" }}>
                <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.18em", fontFamily: "var(--font-code)" }}>
                  Sources <span style={{ color: "var(--accent)" }}>· {sources.length}</span>
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {sources.map((source, index) => {
                    const url = safeExternalUrl(source.url);
                    return url ? (
                      <li key={`${source.url}-${index}`}>
                        <a href={url} target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2.5 text-sm" style={{ border: "1px solid var(--border-dim)", background: "rgba(255,255,255,0.025)", textDecoration: "none" }}>
                          <span className="block truncate font-medium" style={{ color: "var(--text-primary)" }}>{source.title}</span>
                          <span className="mt-1 block truncate text-[11px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>{source.url}</span>
                        </a>
                      </li>
                    ) : null;
                  })}
                </ul>
              </section>
            )}
          </section>
        )}

        <p className="mt-6 text-center text-[11px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
          Generated by ComradeIQ — multi-agent AI mission control
        </p>
      </div>
    </main>
  );
}
