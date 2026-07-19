"use client";

import { useEffect, useState } from "react";

type ProviderHealth = {
  provider?: string;
  model?: string;
  configuration?: {
    deploymentReady?: boolean;
    durableStorageConfigured?: boolean;
    storage?: { durable?: boolean; note?: string };
  };
};

type HealthState = "loading" | "ready" | "temporary-storage" | "needs-setup" | "unavailable";

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

  const copy = state === "loading"
    ? "Checking AI setup"
    : state === "ready"
      ? `AI configured${health?.model ? ` · ${health.model}` : ""}`
      : state === "temporary-storage"
        ? "AI configured · artifact storage is temporary"
      : state === "needs-setup"
        ? "AI setup required"
        : "AI configuration unavailable";
  const tone = state === "ready" ? "bg-[#78e0c1]" : state === "temporary-storage" || state === "needs-setup" ? "bg-amber-300" : state === "unavailable" ? "bg-rose-300" : "bg-[#929b96]";

  return (
    <p data-testid="provider-health" className="flex items-center gap-2 text-xs text-[#aeb8b3]" role="status" aria-live="polite" aria-atomic="true">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden="true" />
      <span className="truncate">{copy}</span>
    </p>
  );
}
