"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };
type ToastContextValue = { showToast: (message: string, kind?: ToastKind) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, kind }].slice(-4));
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);
  return <ToastContext.Provider value={{ showToast }}>{children}<div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">{items.map((item) => { const Icon = { success: CheckCircle2, error: AlertCircle, warning: AlertCircle, info: Info }[item.kind]; const color = { success: "border-emerald-200 bg-emerald-50 text-emerald-800", error: "border-red-200 bg-red-50 text-red-800", warning: "border-amber-200 bg-amber-50 text-amber-800", info: "border-indigo-200 bg-indigo-50 text-indigo-800" }[item.kind]; return <div key={item.id} role="status" className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${color}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1 leading-relaxed">{item.message}</span><button type="button" onClick={() => setItems((current) => current.filter((toast) => toast.id !== item.id))} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>; })}</div></ToastContext.Provider>;
}

export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast must be used inside ToastProvider"); return context; }
