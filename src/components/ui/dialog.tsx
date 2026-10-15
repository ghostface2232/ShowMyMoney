"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// Matches the `sm` breakpoint below which DialogContent presents as a bottom sheet.
const SHEET_MEDIA_QUERY = "(max-width: 639px)"
// iOS drawer curve, shared by the sheet's presentation, keyboard avoidance and snap-back.
const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)"

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // Mobile dims only: a full-screen backdrop blur re-rasterizes the whole page on
        // every frame of the sheet animation, which is what makes it stutter on iPhone.
        "fixed inset-0 isolate z-50 bg-black/30 animation-duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-closed:animation-duration-[280ms]",
        "sm:animation-duration-100 sm:ease-out sm:supports-backdrop-filter:backdrop-blur-sm sm:data-closed:animation-duration-100",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const [sheet, setSheet] = React.useState<HTMLDivElement | null>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  useSheetDragToDismiss(sheet, overlayRef, closeRef)

  return (
    <DialogPortal>
      <DialogOverlay ref={overlayRef} />
      <DialogPrimitive.Content
        ref={setSheet}
        data-slot="dialog-content"
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event)
          if (event.defaultPrevented) return
          // On touch devices, focusing the first field would throw the keyboard up over
          // a sheet the user may only want to read. Fields that should summon it opt in
          // with autoFocus; otherwise focus the sheet itself for screen readers.
          if (window.matchMedia("(pointer: coarse)").matches) {
            event.preventDefault()
            sheet?.focus({ preventScroll: true })
          }
        }}
        className={cn(
          // Mobile-first: an iOS-style bottom sheet. Slides in fully with the drawer curve,
          // rides on top of the on-screen keyboard (--keyboard-inset from ViewportSync) and
          // caps its height to the visible viewport so nothing hides behind the keyboard.
          "fixed inset-x-0 bottom-[var(--keyboard-inset,0px)] z-50 grid max-h-[calc(var(--visual-viewport-height,100dvh)-3rem)] w-full gap-6 overflow-y-auto overscroll-contain rounded-t-4xl bg-popover p-6 pb-[max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),1.5rem)] text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none",
          "transition-[bottom,max-height] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] animation-duration-[420ms] data-open:animate-in data-open:slide-in-from-bottom-full data-closed:animate-out data-closed:slide-out-to-bottom-full data-closed:animation-duration-[280ms]",
          // Desktop (sm+): centered modal with the original zoom presentation.
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100dvh-3rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl sm:pb-6 sm:transition-none sm:animation-duration-100 sm:ease-out sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:animation-duration-100",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-2.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden"
        />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-4 right-4 bg-secondary"
              size="icon-sm"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
        {/* Programmatic close target for the drag-to-dismiss gesture. */}
        <DialogPrimitive.Close
          ref={closeRef}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

// Drag-to-dismiss for the mobile bottom sheet, like a native iOS sheet: a downward pull
// that starts where nothing is mid-scroll follows the finger 1:1 (dimming the backdrop
// with it), and a long or fast enough pull closes the dialog. Releasing early springs it
// back. Styles are written straight to the DOM so the drag never re-renders React.
function useSheetDragToDismiss(
  sheet: HTMLDivElement | null,
  overlayRef: React.RefObject<HTMLDivElement | null>,
  closeRef: React.RefObject<HTMLButtonElement | null>
) {
  React.useEffect(() => {
    if (!sheet) return
    const media = window.matchMedia(SHEET_MEDIA_QUERY)

    let tracking = false
    let dragging = false
    let startX = 0
    let startY = 0
    let offset = 0
    let lastY = 0
    let lastTime = 0
    let velocity = 0 // px per ms, positive = downward

    function setOverlayStyle(opacity: string, transition: string) {
      const overlay = overlayRef.current
      if (!overlay) return
      overlay.style.transition = transition
      overlay.style.opacity = opacity
    }

    function onTouchStart(event: TouchEvent) {
      tracking =
        media.matches &&
        event.touches.length === 1 &&
        sheet!.dataset.state === "open" &&
        startsAtScrollTop(event.target, sheet!)
      if (!tracking) return
      const touch = event.touches[0]
      dragging = false
      startX = touch.clientX
      startY = touch.clientY
      lastY = touch.clientY
      lastTime = event.timeStamp
      offset = 0
      velocity = 0
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking) return
      const touch = event.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (!dragging) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        // Upward or sideways movement belongs to native scrolling.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          tracking = false
          return
        }
        dragging = true
        sheet!.style.transition = "none"
        // Pulling the sheet away dismisses the keyboard first, as on iOS.
        const focused = document.activeElement
        if (focused instanceof HTMLElement && sheet!.contains(focused)) {
          focused.blur()
        }
      }

      event.preventDefault()
      offset = Math.max(0, dy)
      const elapsed = event.timeStamp - lastTime
      if (elapsed > 0) velocity = (touch.clientY - lastY) / elapsed
      lastY = touch.clientY
      lastTime = event.timeStamp

      sheet!.style.transform = `translate3d(0, ${offset}px, 0)`
      const progress = Math.min(1, offset / Math.max(1, sheet!.offsetHeight))
      setOverlayStyle(String(1 - progress), "none")
    }

    function onTouchEnd() {
      if (!tracking) return
      tracking = false
      if (!dragging) return
      dragging = false

      const threshold = Math.min(sheet!.offsetHeight * 0.35, 160)
      if (offset > threshold || (velocity > 0.5 && offset > 24)) {
        // The exit keyframes only define their end state, so the slide-out continues
        // from the inline transform/opacity left here — no jump back to the top.
        sheet!.style.transition = ""
        closeRef.current?.click()
        return
      }

      const snapBack = `transform 0.4s ${SHEET_EASE}`
      sheet!.style.transition = snapBack
      sheet!.style.transform = ""
      setOverlayStyle("", `opacity 0.4s ${SHEET_EASE}`)
      sheet!.addEventListener(
        "transitionend",
        () => {
          if (sheet!.style.transition === snapBack) sheet!.style.transition = ""
          setOverlayStyle("", "")
        },
        { once: true }
      )
    }

    sheet.addEventListener("touchstart", onTouchStart, { passive: true })
    sheet.addEventListener("touchmove", onTouchMove, { passive: false })
    sheet.addEventListener("touchend", onTouchEnd)
    sheet.addEventListener("touchcancel", onTouchEnd)
    return () => {
      sheet.removeEventListener("touchstart", onTouchStart)
      sheet.removeEventListener("touchmove", onTouchMove)
      sheet.removeEventListener("touchend", onTouchEnd)
      sheet.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [sheet, overlayRef, closeRef])
}

// A pull may drag the sheet only if every scrollable box under the finger is already at
// its top; otherwise the gesture is the user scrolling content back up.
function startsAtScrollTop(target: EventTarget | null, sheet: HTMLElement) {
  let node = target instanceof Element ? target : null
  while (node) {
    if (node instanceof HTMLElement) {
      if (node.dataset.sheetNoDrag !== undefined) return false
      if (node.scrollTop > 0) return false
    }
    if (node === sheet) return true
    node = node.parentElement
  }
  return false
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
