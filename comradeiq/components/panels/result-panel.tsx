"use client";

import { useCommanderStore } from "@/lib/store";

export function ResultPanel() {
  const result = useCommanderStore((state) => state.finalResult);
  const presentationUrl = useCommanderStore((state) => state.presentationUrl);

  if (!result && !presentationUrl) return null;

  return (
    <section className="mt-4 border border-[#b6ed71]/30 bg-[#0a0e09] p-4 font-mono text-sm text-[#e6f3db] shadow-[0_0_28px_rgba(156,220,79,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs tracking-[0.14em] text-[#c8f28c]">FINAL COMMAND PACKAGE</h2>
        {presentationUrl && <a href={presentationUrl} download className="border border-[#c8f28c]/50 bg-[#c8f28c]/10 px-3 py-2 text-xs tracking-[0.12em] text-[#eaffcb] transition hover:bg-[#c8f28c]/20">DOWNLOAD .PPTX</a>}
      </div>
      {result && <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap border-t border-[#b6ed71]/15 pt-3 text-xs leading-5 text-[#d5ded0]">{result}</pre>}
    </section>
  );
}
