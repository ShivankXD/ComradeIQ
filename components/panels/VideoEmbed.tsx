"use client";

/** Embedded, playable YouTube result rendered inline in a commander chat turn. */
export function VideoEmbed({ videoId, title, query }: { videoId: string; title?: string; query: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-mid)" }}>
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden="true">▶️</span>
        <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title || `Video: ${query}`}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg" style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
          title={title || query}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        />
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-[11px]"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-code)" }}
      >
        Open on YouTube ↗
      </a>
    </div>
  );
}
