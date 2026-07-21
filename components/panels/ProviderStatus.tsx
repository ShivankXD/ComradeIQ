"use client";

import { useEffect, useState } from "react";

type ProviderHealth = {
  provider?: string;
  model?: string;
  configuration?: {
    deploymentReady?: boolean;
    durableStorageConfigured?: boolean;
    storage?: { kind?: "vercel-blob-private" | "local-filesystem" | "memory"; durable?: boolean; note?: string };
  };
};

type HealthState = "loading" | "ready" | "local-storage" | "temporary-storage" | "needs-setup" | "unavailable";

/** Displays only deployment-safe configuration state; it never exposes credentials. */
export function ProviderStatus() {
  const [state, setState] = useState<HealthState>("loading");
  const [health, setHealth] = useState<ProviderHealth | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health/ai", { signal: controller.signal })
      .then(async (response) => ({ response, data: await response.json() as ProviderHealth }))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error("Health check unavailable");
        setHealth(data);
        const providerReady = data.provider === "openai";
        if (!providerReady) {
          setState("needs-setup");
        } else if (data.configuration?.storage?.kind === "local-filesystem") {
          setState("local-storage");
        } else if (!data.configuration?.deploymentReady || !data.configuration?.durableStorageConfigured) {
          setState("temporary-storage");
        } else {
          setState("ready");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("unavailable");
      });
    return () => controller.abort();
  }, []);

  const copy =
    state === "loading"
      ? "Checking AI setup…"
      : state === "ready"
        ? `AI ready${health?.model ? ` · ${health.model}` : ""}`
        : state === "local-storage"
          ? "AI ready · local storage"
          : state === "temporary-storage"
            ? "AI ready · temp storage"
            : state === "needs-setup"
              ? "AI setup required"
              : "AI unavailable";

  const dotStyle: Record<HealthState, { bg: string; glow: string }> = {
    loading:           { bg: "rgba(150,165,160,0.5)", glow: "none" },
    ready:             { bg: "#00e5a0", glow: "0 0 6px rgba(0,229,160,0.7)" },
    "local-storage":   { bg: "#00e5a0", glow: "0 0 6px rgba(0,229,160,0.7)" },
    "temporary-storage": { bg: "#ffbe5c", glow: "0 0 6px rgba(255,190,92,0.6)" },
    "needs-setup":     { bg: "#ffbe5c", glow: "0 0 6px rgba(255,190,92,0.6)" },
    unavailable:       { bg: "#ff7070", glow: "0 0 6px rgba(255,112,112,0.6)" },
  };

  const { bg, glow } = dotStyle[state];

  return (
    <p
      data-testid="provider-health"
      className="flex items-center gap-2 text-[11px]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: bg,
          boxShadow: glow,
          animation: state === "loading" ? "pulse-dot 1.4s ease-in-out infinite" : "none",
        }}
        aria-hidden="true"
      />
      <span className="truncate">{copy}</span>
    </p>
  );
}
