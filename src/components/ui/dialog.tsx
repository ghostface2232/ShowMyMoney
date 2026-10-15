"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

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

// Bar buttons are rendered by DialogHeader (every dialog has one) so they share a row with
// the title block and stay vertically centered on it, however tall the subtitle gets.
type DialogBar = {
  showCloseButton: boolean
  onConfirm?: () => void
  confirmDisabled: boolean
  confirmLabel: string
  requestClose: () => void
}
const DialogBarContext = React.createContext<DialogBar | null>(null)

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
  onConfirm,
  confirmDisabled = false,
  confirmLabel = "완료",
  discardGuard = false,
  onOpenAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  // Sheets with input get the iOS bar pair: Cancel (X) on the leading edge and a confirm
  // (✓) on the trailing edge. Without it, the sheet only shows a trailing X.
  onConfirm?: () => void
  // Disable ✓ whenever there is nothing (valid) to save: it then turns into neutral glass,
  // so the tint alone tells people whether ✓ will save something.
  confirmDisabled?: boolean
  confirmLabel?: string
  // Unsaved edits: closing by X, swipe, Escape or an outside tap asks before discarding.
  discardGuard?: boolean
}) {
  const [sheet, setSheet] = React.useState<HTMLDivElement | null>(null)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  // Every dismissal path funnels through here so the discard question is asked once,
  // the same way, whichever gesture started it.
  const requestClose = React.useCallback(() => {
    if (discardGuard) {
      setDiscardOpen(true)
      return
    }
    closeRef.current?.click()
  }, [discardGuard])
  const requestCloseRef = React.useRef(requestClose)
  React.useEffect(() => {
    requestCloseRef.current = requestClose
  }, [requestClose])

  useSheetDragToDismiss(sheet, overlayRef, requestCloseRef)

  return (
    <DialogPortal>
      <DialogOverlay ref={overlayRef} />
      <DialogPrimitive.Content
        ref={setSheet}
        data-slot="dialog-content"
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event)
          if (!event.defaultPrevented && discardGuard) {
            event.preventDefault()
            setDiscardOpen(true)
          }
        }}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event)
          if (!event.defaultPrevented && discardGuard) {
            event.preventDefault()
            setDiscardOpen(true)
          }
        }}
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
          "fixed inset-x-0 bottom-[var(--keyboard-inset,0px)] z-50 grid max-h-[calc(var(--visual-viewport-height,100dvh)-3rem)] w-full gap-6 overflow-y-auto overscroll-contain squircle-mask rounded-t-[var(--sheet-radius)] [--sheet-radius:2.375rem] bg-popover p-6 pb-[max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),1.5rem)] text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none",
          "transition-[bottom,max-height] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] animation-duration-[420ms] data-open:animate-in data-open:slide-in-from-bottom-full data-closed:animate-out data-closed:slide-out-to-bottom-full data-closed:animation-duration-[280ms]",
          // Reduce Motion: fade the sheet in place instead of sliding it (HIG).
          "motion-reduce:data-open:slide-in-from-bottom-0 motion-reduce:data-open:fade-in-0 motion-reduce:data-closed:slide-out-to-bottom-0 motion-reduce:data-closed:fade-out-0",
          // Desktop (sm+): centered modal with the original zoom presentation.
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100dvh-3rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--sheet-radius)] sm:pb-6 sm:transition-none sm:animation-duration-100 sm:ease-out sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:animation-duration-100",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-2.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden"
        />
        <DialogBarContext.Provider
          value={{
            showCloseButton,
            onConfirm,
            confirmDisabled,
            confirmLabel,
            requestClose,
          }}
        >
          {children}
        </DialogBarContext.Provider>
        {/* Programmatic close target used once a dismissal is allowed. */}
        <DialogPrimitive.Close
          ref={closeRef}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      </DialogPrimitive.Content>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>변경사항을 버릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              수정한 내용은 저장되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            {/* Destructive style: discarding is not what the person set out to do. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => closeRef.current?.click()}
            >
              버리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  dismissRef: React.RefObject<() => void>
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
        dismissRef.current()
        // The owner may refuse to close (e.g. to confirm discarding unsaved edits);
        // then the sheet springs back instead of staying where the finger left it.
        requestAnimationFrame(() => {
          if (sheet!.dataset.state === "open") snapBack()
        })
        return
      }

      snapBack()
    }

    function snapBack() {
      const transition = `transform 0.4s ${SHEET_EASE}`
      sheet!.style.transition = transition
      sheet!.style.transform = ""
      setOverlayStyle("", `opacity 0.4s ${SHEET_EASE}`)
      // Child transitions (a button's press scale, the glass fill) bubble up here and
      // end sooner; only the sheet's own transform marks the end of the snap-back.
      const onEnd = (event: TransitionEvent) => {
        if (event.target !== sheet || event.propertyName !== "transform") return
        sheet!.removeEventListener("transitionend", onEnd)
        if (sheet!.style.transition === transition) sheet!.style.transition = ""
        setOverlayStyle("", "")
      }
      sheet!.addEventListener("transitionend", onEnd)
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
  }, [sheet, overlayRef, dismissRef])
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

// iOS sheet bar: [X] [title, centered] [✓]. Buttons are 44pt circles on one centered row.
// A DialogDescription inside the header is kept for screen readers only — the bar carries
// just the title, as on iOS; put guidance users must see in the sheet body instead. With
// only a close button, a matching spacer on the leading side keeps the title centered.
function DialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const bar = React.useContext(DialogBarContext)
  // Liquid Glass bar buttons (iOS 26/27): X is always neutral glass; ✓ is tinted only
  // while there is something to save, and otherwise reads as the same neutral glass with a
  // faded glyph — the color itself answers "will this save or just close?".
  const closeButton = bar?.showCloseButton ? (
    <Button
      type="button"
      data-slot="dialog-close"
      variant="ghost"
      size="icon-lg"
      className="sheet-glass size-11 text-foreground"
      onClick={bar.requestClose}
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-[18px]" />
      <span className="sr-only">{bar.onConfirm ? "취소" : "닫기"}</span>
    </Button>
  ) : null
  const confirmButton = bar?.onConfirm ? (
    <Button
      type="button"
      data-slot="dialog-confirm"
      variant="ghost"
      size="icon-lg"
      data-tinted={bar.confirmDisabled ? undefined : ""}
      className="sheet-glass size-11 text-foreground disabled:opacity-100"
      disabled={bar.confirmDisabled}
      onClick={bar.onConfirm}
      aria-label={bar.confirmLabel}
    >
      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} className="size-5" />
    </Button>
  ) : null
  const spacer = <span aria-hidden className="size-11 shrink-0" />

  return (
    <div
      data-slot="dialog-header"
      // Concentric corners: the 44pt bar buttons (radius 22) sit 16px in from the top and
      // side edges, and the sheet's --sheet-radius is 22 + 16 = 38px, so each button's arc
      // shares its center with the sheet corner. -m pulls the bar from the 24px content
      // padding out to that 16px inset.
      className="-mx-2 -mt-2 flex min-h-11 items-center gap-3"
    >
      {confirmButton ? (closeButton ?? spacer) : spacer}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center text-center [&_[data-slot=dialog-description]]:sr-only",
          className
        )}
        {...props}
      >
        {children}
      </div>
      {confirmButton ?? closeButton ?? spacer}
    </div>
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
        "font-heading text-[17px] leading-snug font-semibold tracking-tight",
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
        "text-[13px] leading-snug text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
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
