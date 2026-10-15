// Bridges the persistent header to the asset page's optimistic state. The header lives in
// the (app) layout, outside the page tree, so month add/delete would otherwise wait for a
// server round trip; while the asset page is mounted it registers its handlers here.
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

export type AssetActionHandlers = {
  addSnapshot: (yearMonth: number) => void;
  deleteSnapshot: (snapshotId: string) => void;
};

const AssetActionsContext = createContext<RefObject<AssetActionHandlers | null> | null>(
  null,
);

export function AssetActionsProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<AssetActionHandlers | null>(null);
  return (
    <AssetActionsContext.Provider value={handlersRef}>
      {children}
    </AssetActionsContext.Provider>
  );
}

// Called by the asset page; registration lasts for as long as it stays mounted.
export function useRegisterAssetActions(handlers: AssetActionHandlers) {
  const handlersRef = useContext(AssetActionsContext);
  useEffect(() => {
    if (!handlersRef) return;
    handlersRef.current = handlers;
    return () => {
      if (handlersRef.current === handlers) handlersRef.current = null;
    };
  }, [handlersRef, handlers]);
}

// Read lazily (in event handlers): null when the asset page isn't mounted.
export function useAssetActions(): () => AssetActionHandlers | null {
  const handlersRef = useContext(AssetActionsContext);
  return () => handlersRef?.current ?? null;
}
