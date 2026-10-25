import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Trash2, ScanLine, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { customersRepo, productsRepo, salesRepo, settingsRepo, useData, type PaymentStatus, type PriceType, type Product } from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { Receipt } from "@/components/Receipt";
import { Button, Card, Input, Select, Modal, Field } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "البيع — نقطة البيع" },
      { name: "description", content: "Fast barcode checkout with cash, partial and credit payments." },
      { property: "og:title", content: "البيع — نقطة البيع" },
      { property: "og:description", content: "Fast barcode checkout with cash, partial and credit payments." },
    ],
  }),
  component: POS,
});

interface CartLine { product: Product; qty: number; priceType: PriceType; unitPrice: number }

function POS() {
  const { t, money, fmtDate } = useI18n();
  const print = usePrint();
  const products = useData(() => productsRepo.list(), []) ?? [];
  const customers = useData(() => customersRepo.list(), []) ?? [];
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [paid, setPaid] = useState(0);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [newCust, setNewCust] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.brand.toLowerCase().includes(q)).slice(0, 8);
  }, [query, products]);

  const focus = () => setTimeout(() => inputRef.current?.focus(), 0);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "F9") { e.preventDefault(); document.getElementById("checkout-btn")?.click(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function add(p: Product) {
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { product: p, qty: 1, priceType: "retail", unitPrice: p.retailPrice }];
    });
    if (p.stock <= 0) toast.warning(`${t("stockShort")}: ${p.name}`);
    setQuery(""); focus();
  }
  async function onEnter() {
    const q = query.trim();
    if (!q) return;
    const p = await productsRepo.getByBarcode(q);
    if (p) return add(p);
    if (suggestions.length === 1 || (suggestions[0] && suggestions[0].name.toLowerCase() === q.toLowerCase())) return add(suggestions[0]!);
    if (!suggestions.length) { toast.error(t("notFound")); setQuery(""); }
  }
  const update = (i: number, patch: Partial<CartLine>) => setCart((c) => c.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function checkout() {
    if (!cart.length) return;
    if (status !== "paid" && !customerId) { toast.error(t("needCustomer")); return; }
    const sale = await salesRepo.create({
      items: cart.map((l) => ({ productId: l.product.id!, name: l.product.name, qty: l.qty, unitPrice: l.unitPrice, purchasePrice: l.product.purchasePrice, priceType: l.priceType })),
      discount, paid, status, customerId: customerId || undefined,
    });
    const settings = await settingsRepo.get();
    toast.success(t("saleDone"));
    print(<Receipt sale={sale} settings={settings} money={money} fmtDate={fmtDate} t={t as never} />);
    setCart([]); setDiscount(0); setPaid(0); setStatus("paid"); setCustomerId(""); focus();
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] gap-6 xl:grid-cols-[1fr_400px]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="relative">
          <ScanLine className="pointer-events-none absolute start-4 top-1/2 h-6 w-6 -translate-y-1/2 text-primary" />
          <Input ref={inputRef} autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("scanHint")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onEnter(); } if (e.key === "Escape") setQuery(""); }}
            className="h-16 ps-14 text-xl" />
          {suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              {suggestions.map((p) => (
                <button key={p.id} onClick={() => add(p)} className="flex w-full items-center justify-between px-4 py-3 text-start hover:bg-muted">
                  <span className="font-medium">{p.name} <span className="text-sm text-muted-foreground">{p.brand}</span></span>
                  <span className="tabular-nums text-muted-foreground">{money(p.retailPrice)} · {p.stock}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Card className="min-h-0 flex-1 overflow-auto p-0">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center p-10 text-lg text-muted-foreground">{t("emptyCart")}</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-muted text-sm text-muted-foreground"><tr>
                <th className="p-3 text-start">{t("name")}</th><th className="p-3">{t("price")}</th><th className="p-3">{t("qty")}</th><th className="p-3 text-end">{t("total")}</th><th />
              </tr></thead>
              <tbody className="divide-y divide-border">
                {cart.map((l, i) => (
                  <tr key={l.product.id}>
                    <td className="p-3"><div className="font-semibold">{l.product.name}</div><div className="text-xs text-muted-foreground">{l.product.barcode} · {t("stock")}: {l.product.stock}</div></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Select className="h-10 w-24" value={l.priceType} onChange={(e) => { const pt = e.target.value as PriceType; update(i, { priceType: pt, unitPrice: pt === "retail" ? l.product.retailPrice : l.product.wholesalePrice }); }}>
                          <option value="retail">{t("retail")}</option><option value="wholesale">{t("wholesale")}</option>
                        </Select>
                        <Input type="number" className="h-10 w-28" value={l.unitPrice} onChange={(e) => update(i, { unitPrice: Number(e.target.value) })} />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="outline" onClick={() => update(i, { qty: Math.max(1, l.qty - 1) })}><Minus className="h-4 w-4" /></Button>
                        <Input type="number" min={1} className="h-9 w-16 text-center" value={l.qty} onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value)) })} />
                        <Button size="icon" variant="outline" onClick={() => update(i, { qty: l.qty + 1 })}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </td>
                    <td className="p-3 text-end font-bold tabular-nums">{money(l.qty * l.unitPrice)}</td>
                    <td className="p-3"><Button size="icon" variant="ghost" onClick={() => setCart((c) => c.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex justify-between text-muted-foreground"><span>{t("subtotal")}</span><span className="tabular-nums">{money(subtotal)}</span></div>
        <Field label={t("discount")}><Input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} /></Field>
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <div className="text-sm opacity-80">{t("total")}</div>
          <div className="font-display text-4xl font-extrabold tabular-nums">{money(total)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["paid", "partial", "credit"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("h-12 rounded-lg border font-semibold", status === s ? "border-primary bg-primary/10 text-primary" : "border-border")}>
              {t(s === "paid" ? "fullyPaid" : s)}
            </button>
          ))}
        </div>
        {status === "partial" && <Field label={t("paid")}><Input type="number" value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} /></Field>}
        {status !== "paid" && (
          <Field label={t("customer")}>
            <div className="flex gap-2">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">{t("selectCustomer")}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone && `(${c.phone})`}</option>)}
              </Select>
              <Button variant="outline" onClick={() => setNewCust(true)}><UserPlus className="h-5 w-5" /></Button>
            </div>
          </Field>
        )}
        {status === "partial" && <div className="flex justify-between font-semibold text-destructive"><span>{t("remaining")}</span><span>{money(Math.max(0, total - paid))}</span></div>}
        <div className="flex-1" />
        <Button id="checkout-btn" variant="success" size="lg" className="h-16 text-xl" disabled={!cart.length} onClick={checkout}>{t("checkout")}</Button>
      </Card>
      <NewCustomerModal open={newCust} onClose={() => setNewCust(false)} onCreated={(id) => setCustomerId(id)} />
    </div>
  );
}

function NewCustomerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={t("newCustomer")}>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); if (!name.trim()) return;
        const id = await customersRepo.save({ name: name.trim(), phone, balance: 0, createdAt: Date.now() });
        onCreated(id as number); setName(""); setPhone(""); onClose();
      }}>
        <Field label={t("name")}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t("phone")}><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Button type="submit" className="w-full">{t("save")}</Button>
      </form>
    </Modal>
  );
}
