import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { productsRepo, settingsRepo, useData, type Product } from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { Button, Input, PageHeader, Table, Td } from "@/components/ui-kit";

export const Route = createFileRoute("/labels")({
  head: () => ({
    meta: [
      { title: "ملصقات الباركود — نقطة البيع" },
      { name: "description", content: "Generate and print Code128 barcode labels." },
      { property: "og:title", content: "ملصقات الباركود — نقطة البيع" },
      { property: "og:description", content: "Generate and print Code128 barcode labels." },
    ],
  }),
  component: Labels,
});

function BarcodeSvg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current && value) JsBarcode(ref.current, value, { format: "CODE128", height: 40, fontSize: 12, margin: 0, width: 1.6 }); }, [value]);
  return <svg ref={ref} />;
}

function Labels() {
  const { t, money } = useI18n();
  const print = usePrint();
  const products = useData(() => productsRepo.list(), []) ?? [];
  const [copies, setCopies] = useState<Record<number, number>>({});
  const missing = products.filter((p) => !p.barcode);

  async function generate() {
    for (const p of missing) {
      const code = "20" + String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      await productsRepo.setBarcode(p.id!, code);
      await new Promise((r) => setTimeout(r, 2));
    }
    toast.success(`${missing.length}`);
  }
  async function doPrint() {
    const s = await settingsRepo.get();
    const items: Product[] = [];
    for (const p of products) for (let i = 0; i < (copies[p.id!] || 0); i++) if (p.barcode) items.push(p);
    if (!items.length) return;
    print(<div className="labels">{items.map((p, i) => (
      <div key={i} className="label"><div style={{ fontWeight: 700 }}>{s.shopName}</div><div>{p.name}</div><BarcodeSvg value={p.barcode} /><div style={{ fontWeight: 800 }}>{money(p.retailPrice)}</div></div>
    ))}</div>, "a4");
  }
  return (
    <>
      <PageHeader title={t("labels")}>
        <Button variant="outline" disabled={!missing.length} onClick={generate}><Wand2 className="h-4 w-4" />{t("generateMissing")} ({missing.length})</Button>
        <Button variant="outline" onClick={() => setCopies(Object.fromEntries(products.filter((p) => p.barcode).map((p) => [p.id!, 1])))}>{t("selectAll")}</Button>
        <Button onClick={doPrint}><Printer className="h-4 w-4" />{t("print")}</Button>
      </PageHeader>
      <Table head={[t("name"), t("barcode"), t("retailPrice"), t("copies"), ""]}>
        {products.map((p) => (
          <tr key={p.id}>
            <Td className="font-semibold">{p.name}</Td><Td className="font-mono text-xs">{p.barcode || "—"}</Td><Td>{money(p.retailPrice)}</Td>
            <Td><Input type="number" min={0} className="h-10 w-20" disabled={!p.barcode} value={copies[p.id!] || ""} onChange={(e) => setCopies({ ...copies, [p.id!]: Number(e.target.value) })} /></Td>
            <Td className="w-48">{p.barcode && <div className="rounded bg-card p-1"><BarcodeSvg value={p.barcode} /></div>}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
