// Tailwind class merging helper (clsx + tailwind-merge) shared by every component.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Blurs the focused text field so its save-on-blur runs (e.g. before a sheet closes).
export function blurFocusedInput() {
  const focused = document.activeElement
  if (
    focused instanceof HTMLInputElement ||
    focused instanceof HTMLTextAreaElement
  ) {
    focused.blur()
  }
}
