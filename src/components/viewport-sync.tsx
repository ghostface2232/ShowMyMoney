// Mirrors the iOS visual viewport into CSS so fixed UI can dodge the on-screen keyboard.
// Sets --keyboard-inset / --visual-viewport-height on <html>, toggles data-keyboard-open,
// and snaps the (never-scrolling) document back to the top once the keyboard closes.
"use client";

import { useEffect } from "react";

// Smaller gaps are browser chrome (e.g. Safari's toolbar settling), not a keyboard.
const KEYBOARD_MIN_HEIGHT = 120;

export function ViewportSync() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    let keyboardOpen = false;

    const sync = () => {
      frame = 0;
      // Distance from the bottom of the layout viewport to the bottom of the visible area.
      // Holds whether or not iOS has panned the visual viewport to reveal a focused input.
      // A pinch-zoomed viewport also shrinks; only an unzoomed one means a keyboard.
      const zoomed = Math.abs(viewport.scale - 1) > 0.01;
      const inset = zoomed
        ? 0
        : Math.max(
            0,
            Math.round(root.clientHeight - viewport.height - viewport.offsetTop),
          );
      const open = inset >= KEYBOARD_MIN_HEIGHT;

      root.style.setProperty("--keyboard-inset", `${open ? inset : 0}px`);
      root.style.setProperty(
        "--visual-viewport-height",
        `${Math.round(zoomed ? root.clientHeight : viewport.height)}px`,
      );

      if (open !== keyboardOpen) {
        keyboardOpen = open;
        root.toggleAttribute("data-keyboard-open", open);
        // iOS scrolls the document itself to reveal focused inputs, even with body
        // overflow hidden, and sometimes leaves it offset after the keyboard closes.
        // The app shell never scrolls the document, so any offset is stale.
        if (!open && (window.scrollY !== 0 || window.scrollX !== 0)) {
          window.scrollTo(0, 0);
        }
      }
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(sync);
    };

    sync();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
    };
  }, []);

  return null;
}
