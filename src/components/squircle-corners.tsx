// Emulates `corner-shape: superellipse(1.35)` for `.squircle-mask` surfaces on engines without
// CSS corner-shape (iOS Safari as of Safari 27). Each element gets a clip-path traced from its
// own size and computed corner radii, kept current by a ResizeObserver; a MutationObserver
// picks up surfaces as they mount (sheets, alerts, cards). A no-op where corner-shape works.
// Emulated surfaces draw square boxes clipped to the path, so outer box-shadows/rings are
// clipped away; masked surfaces should not rely on them.
"use client";

import { useEffect } from "react";

const SQUIRCLE_K = 1.35;
// CSS superellipse(K) draws |x|^n + |y|^n = 1 with n = 2^K (K=1 → circle, K=2 → squircle).
const EXPONENT = 2 ** SQUIRCLE_K;
const SELECTOR = ".squircle-mask";
const SEGMENTS = 24;
// Set while emulating; globals.css zeroes border-radius under it.
const EMULATED_ATTR = "data-squircle-emulated";

type Point = [number, number];

// Quarter superellipse inside one corner box. (cx, cy) is the corner box's inner center and
// sx/sy point outward; startOnX starts on the horizontal edge, otherwise on the vertical one.
// The four corners are walked clockwise, so the path needs no reversal.
function cornerPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sx: number,
  sy: number,
  startOnX: boolean,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = (i / SEGMENTS) * (Math.PI / 2);
    const angle = startOnX ? Math.PI / 2 - t : t;
    const x = cx + sx * rx * Math.pow(Math.cos(angle), 2 / EXPONENT);
    const y = cy + sy * ry * Math.pow(Math.sin(angle), 2 / EXPONENT);
    points.push([x, y]);
  }
  return points;
}

function squirclePath(
  w: number,
  h: number,
  [tl, tr, br, bl]: [number, number, number, number],
): string {
  // Same overlap rule as border-radius: scale all radii down if adjacent ones collide.
  const f = Math.min(
    1,
    w / Math.max(tl + tr, 1e-6),
    w / Math.max(bl + br, 1e-6),
    h / Math.max(tl + bl, 1e-6),
    h / Math.max(tr + br, 1e-6),
  );
  const [a, b, c, d] = [tl * f, tr * f, br * f, bl * f];
  const points: Point[] = [
    ...cornerPoints(w - b, b, b, b, 1, -1, true), // top-right: top edge → right edge
    ...cornerPoints(w - c, h - c, c, c, 1, 1, false), // bottom-right: right → bottom
    ...cornerPoints(d, h - d, d, d, -1, 1, true), // bottom-left: bottom edge → left edge
    ...cornerPoints(a, a, a, a, -1, -1, false), // top-left: left edge → top edge
  ];
  return (
    "M" +
    points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") +
    "Z"
  );
}

function applySquircle(element: HTMLElement) {
  const w = element.offsetWidth;
  const h = element.offsetHeight;
  if (w === 0 || h === 0) return;
  // A superellipse with K > 1 bulges *outside* the circular arc, so clipping a rounded box
  // can't add the missing area. Emulated surfaces drop their own radius (CSS below) and the
  // path alone draws the corners — read the intended radii with that override lifted.
  element.removeAttribute(EMULATED_ATTR);
  const style = getComputedStyle(element);
  const radii: [number, number, number, number] = [
    parseFloat(style.borderTopLeftRadius) || 0,
    parseFloat(style.borderTopRightRadius) || 0,
    parseFloat(style.borderBottomRightRadius) || 0,
    parseFloat(style.borderBottomLeftRadius) || 0,
  ];
  element.setAttribute(EMULATED_ATTR, "");
  const clip = `path("${squirclePath(w, h, radii)}")`;
  element.style.setProperty("clip-path", clip);
  element.style.setProperty("-webkit-clip-path", clip);
}

export function SquircleCorners() {
  useEffect(() => {
    if (
      typeof CSS !== "undefined" &&
      CSS.supports("corner-shape", `superellipse(${SQUIRCLE_K})`)
    ) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) applySquircle(entry.target as HTMLElement);
    });
    const forEachMatch = (node: Node, visit: (element: Element) => void) => {
      if (!(node instanceof Element)) return;
      if (node.matches(SELECTOR)) visit(node);
      node.querySelectorAll(SELECTOR).forEach(visit);
    };

    document.querySelectorAll(SELECTOR).forEach((element) =>
      resizeObserver.observe(element),
    );
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) =>
          forEachMatch(node, (element) => resizeObserver.observe(element)),
        );
        mutation.removedNodes.forEach((node) =>
          forEachMatch(node, (element) => resizeObserver.unobserve(element)),
        );
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return null;
}
