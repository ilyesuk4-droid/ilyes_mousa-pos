import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { settingsRepo, useData } from "@/data";

type Mode = "receipt" | "a4";
const Ctx = createContext<(node: ReactNode, mode?: Mode) => void>(() => {});

export function PrintProvider({ children }: { children: ReactNode }) {
  const settings = useData(() => settingsRepo.get(), []);
  const [job, setJob] = useState<{ node: ReactNode; mode: Mode } | null>(null);
  const paper = settings?.paperWidth === 58 ? "58mm" : "80mm";
  const print = useCallback((node: ReactNode, mode: Mode = "receipt") => {
    setJob({ node, mode });
    setTimeout(() => window.print(), 350);
  }, []);
  const isReceipt = job?.mode !== "a4";
  return (
    <Ctx.Provider value={print}>
      {children}
      <div id="print-root" className={isReceipt ? "receipt" : "a4"} style={isReceipt ? { width: paper } : undefined}>{job?.node}</div>
      <style>{isReceipt ? `@media print { @page { size: ${paper} auto; margin: 0; } }` : `@media print { @page { size: A4; margin: 10mm; } }`}</style>
    </Ctx.Provider>
  );
}
export const usePrint = () => useContext(Ctx);
