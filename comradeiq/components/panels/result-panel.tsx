"use client";

import { useCommanderStore } from "@/lib/store";

export function ResultPanel() {
  const result = useCommanderStore((state) => state.finalResult);
  const presentationUrl = useCommanderStore((state) => state.presentationUrl);

  if (!result && !presentationUrl) return null;

  return (
    <section className="mt-4 border border-blue-400/30 bg-[#0c1119] p-4 font-mono text-sm text-blue-100 shadow-[0_0_28px_rgba(59,130,246,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs tracking-[0.14em] text-blue-300">FINAL PRESENTATION PACKAGE</h2>
        {presentationUrl && <a href={presentationUrl} download className="border border-red-300/50 bg-red-300/10 px-3 py-2 text-xs tracking-[0.12em] text-red-100 transition hover:bg-red-300/20">DOWNLOAD .PPTX</a>}
      </div>
      {result && <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap border-t border-blue-300/10 pt-3 text-xs leading-5 text-blue-100/70">{result}</pre>}
    </section>
  );
}
