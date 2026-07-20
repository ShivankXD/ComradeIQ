"use client";

import { useEffect } from "react";

type Shortcut = {
  key: string;
  meta?: boolean;   // Cmd on Mac, Ctrl on Windows
  ctrl?: boolean;   // always Ctrl (for Linux-only shortcuts)
  shift?: boolean;
  description: string;
  handler: (event: KeyboardEvent) => void;
};

/**
 * Registers global keyboard shortcuts and cleans up on unmount.
 * Uses metaKey (Cmd/Win) OR ctrlKey so it works cross-platform.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't fire when focus is in an input/textarea/select (except Cmd+K/Ctrl+K which we want globally)
      const target = event.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (event.metaKey || event.ctrlKey) : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (!metaMatch || !shiftMatch || !keyMatch) continue;

        // Allow Cmd/Ctrl+K from anywhere, block others from inside inputs
        const isGlobal = shortcut.key.toLowerCase() === "k";
        if (inInput && !isGlobal) continue;

        event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
