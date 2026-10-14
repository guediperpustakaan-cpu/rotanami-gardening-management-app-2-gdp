"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

const ToastContext = createContext<{
  toast: (message: string, type?: Toast["type"]) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[70] flex w-[min(92vw,24rem)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={
              item.type === "error"
                ? "pointer-events-auto rounded-2xl bg-clay px-4 py-3 text-sm text-paper shadow-card"
                : item.type === "info"
                  ? "pointer-events-auto rounded-2xl bg-soil px-4 py-3 text-sm text-paper shadow-card"
                  : "pointer-events-auto rounded-2xl bg-leaf px-4 py-3 text-sm text-paper shadow-card"
            }
            role="status"
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}
