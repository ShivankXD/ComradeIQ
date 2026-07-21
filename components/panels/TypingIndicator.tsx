"use client";

/**
 * TypingIndicator - animated bouncing dots shown while Commander is working.
 * Three dots with staggered CSS animations give the classic "AI is thinking" feel.
 */
export function TypingIndicator({ label = "Commander is thinking" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2"
      role="status"
      aria-label={label}
    >
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot"
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "typingBounce 1.1s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
              boxShadow: "0 0 5px rgba(0,229,160,0.6)",
            }}
          />
        ))}
      </span>
      <span
        className="text-xs"
        style={{
          color: "var(--accent)",
          fontFamily: "var(--font-code)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
    </span>
  );
}
