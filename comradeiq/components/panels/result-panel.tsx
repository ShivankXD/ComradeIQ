"use client";

import { useState } from "react";

import { useCommanderStore } from "@/lib/store";

function renderLine(line: string, index: number) {
  if (line.startsWith("### ")) return <h4 key={index} className="mt-5 text-sm font-semibold text-[#eeeeef]">{line.slice(4)}</h4>;
  if (line.startsWith("## ")) return <h3 key={index} className="mt-5 text-base font-semibold text-[#f4f4f5]">{line.slice(3)}</h3>;
  if (line.startsWith("# ")) return <h2 key={index} className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#f5f5f6]">{line.slice(2)}</h2>;
  if (line.startsWith("- ")) return <li key={index} className="ml-5 list-disc text-[15px] leading-7 text-[#d1d1d6]">{line.slice(2)}</li>;
  if (!line.trim()) return <div key={index} className="h-3" />;
  return <p key={index} className="text-[15px] leading-7 text-[#d1d1d6]">{line.replace(/\*\*/g, "")}</p>;
}

export function ResultPanel() {
  const result = useCommanderStore((state) => state.finalResult);
  const presentationUrl = useCommanderStore((state) => state.presentationUrl);
  const [copied, setCopied] = useState(false);
  if (!result && !presentationUrl) return null;

  async function copy() { if (!result) return; await navigator.clipboard.writeText(result); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  function downloadMarkdown() { if (!result) return; const url = URL.createObjectURL(new Blob([result], { type: "text/markdown" })); const link = document.createElement("a"); link.href = url; link.download = "README.md"; link.click(); URL.revokeObjectURL(url); }

  return <section className="mt-7 rounded-2xl border border-white/[0.1] bg-[#262626] p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#f2f2f3]">Result</p><div className="flex gap-2"><button type="button" onClick={() => void copy()} className="rounded-lg border border-white/[0.1] px-2.5 py-1 text-xs text-[#c9c9d0] transition hover:bg-white/[0.06]">{copied ? "Copied" : "Copy"}</button>{result?.trimStart().startsWith("#") && <button type="button" onClick={downloadMarkdown} className="rounded-lg border border-white/[0.1] px-2.5 py-1 text-xs text-[#c9c9d0] transition hover:bg-white/[0.06]">Download .md</button>}{presentationUrl && <a href={presentationUrl} download className="rounded-lg bg-[#10a37f] px-2.5 py-1 text-xs font-medium text-white">Download .pptx</a>}</div></div>
    {result && <div className="mt-4 border-t border-white/[0.08] pt-4">{result.split("\n").map(renderLine)}</div>}
  </section>;
}
