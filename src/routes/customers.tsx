import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Printer, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { customersRepo, settingsRepo, useData, type Customer } from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { Badge, Button, Card, Field, Input, Modal, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "الزبائن والكريدي — نقطة البيع" },
      { name: "description", content: "Customer debts, payments and printable statements." },
      { property: "og:title", content: "الزبائن والكريدي — نقطة البيع" },
      { property: "og:description", content: "Customer debts, payments and printable statements." },
    ],
  }),
  component: Customers,
});

function Customers() {
  const { t, money } = useI18n();
  const customers = useData(() => customersRepo.list(), []) ?? [];
  const [q, setQ] = useState(""); const [sel, setSel] = useState<number | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const list = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  return (
    <>
      <PageHeader title={t("customers")}>
        <Button onClick={() => setEditing({ name: "", phone: "", balance: 0, createdAt: 0 })}><Plus className="h-4 w-4" />{t("newCustomer")}</Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-3">
          <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
          <ul className="max-h-[70vh] space-y-1 overflow-auto">
            {list.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSel(c.id!)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start hover:bg-muted", sel === c.id && "bg-primary/10")}>
                  <span><span className="font-semibold">{c.name}</span><span className="block text-xs text-muted-foreground">{c.phone}</span></span>
                  <Badge tone={c.balance > 0 ? "danger" : "success"}>{money(c.balance)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        {sel ? <CustomerDetail id={sel} onEdit={setEditing} onDeleted={() => setSel(null)} /> : <Card className="grid place-items-center text-muted-foreground">{t("selectCustomer")}</Card>}
      </div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t("edit") : t("newCustomer")}>
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (!editing.name.trim()) return; await customersRepo.save(editing); setEditing(null); }}>
            <Field label={t("name")}><Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label={t("phone")}><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Button type="submit" className="w-full">{t("save")}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function CustomerDetail({ id, onEdit, onDeleted }: { id: number; onEdit: (c: Customer) => void; onDeleted: () => void }) {
  const { t, money, fmtDate } = useI18n();
  const print = usePrint();
  const c = useData(() => customersRepo.get(id), [id]);
  const sales = useData(() => customersRepo.sales(id), [id]) ?? [];
  const payments = useData(() => customersRepo.payments(id), [id]) ?? [];
  const [amount, setAmount] = useState(0); const [note, setNote] = useState("");
  if (!c) return null;
  const debts = sales.filter((s) => s.remaining > 0);

  async function printStatement() {
    const s = await settingsRepo.get();
    const rows = [
      ...sales.filter((x) => x.remaining > 0).map((x) => ({ date: x.date, label: `${t("sale")} #${x.id}`, debit: x.remaining, credit: 0 })),
      ...payments.map((p) => ({ date: p.date, label: p.note || t("recordPayment"), debit: 0, credit: p.amount })),
    ].sort((a, b) => a.date - b.date);
    print(
      <div className="stmt">
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{s.shopName}</h2>
        <div>{s.address} {s.phone}</div>
        <h3 style={{ margin: "12px 0", fontSize: 16, fontWeight: 700 }}>{t("statement")} — {c!.name} {c!.phone}</h3>
        <table><thead><tr><th>{t("date")}</th><th>{t("note")}</th><th>{t("debts")}</th><th>{t("payments")}</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{fmtDate(r.date)}</td><td>{r.label}</td><td>{r.debit ? money(r.debit) : ""}</td><td>{r.credit ? money(r.credit) : ""}</td></tr>)}</tbody>
        </table>
        <h3 style={{ marginTop: 12, fontSize: 16, fontWeight: 800 }}>{t("balance")}: {money(c!.balance)}</h3>
      </div>, "a4");
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-display text-2xl font-bold">{c.name}</h2><div className="text-muted-foreground">{c.phone}</div></div>
        <div className="text-end"><div className="text-sm text-muted-foreground">{t("balance")}</div><div className={cn("font-display text-3xl font-extrabold tabular-nums", c.balance > 0 ? "text-destructive" : "text-success")}>{money(c.balance)}</div></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printStatement}><Printer className="h-4 w-4" />{t("printStatement")}</Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={async () => { if (confirm(t("confirmDelete"))) { await customersRepo.remove(id); onDeleted(); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 font-display text-lg font-bold">{t("recordPayment")}</h3>
        <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (amount <= 0) return; await customersRepo.addPayment(id, amount, note); setAmount(0); setNote(""); toast.success(t("saved")); }}>
          <Input type="number" className="max-w-40" placeholder={t("amount")} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          <Input className="max-w-xs" placeholder={t("note")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" variant="success">{t("save")}</Button>
        </form>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-display text-lg font-bold">{t("debts")}</h3>
          <ul className="divide-y divide-border text-sm">{debts.map((s) => (
            <li key={s.id} className="py-2"><div className="flex justify-between"><span>#{s.id} · {fmtDate(s.date)}</span><span className="font-semibold text-destructive">{money(s.remaining)}</span></div>
              <div className="text-xs text-muted-foreground">{s.items.map((l) => `${l.name} ×${l.qty}`).join("، ")} — {t("total")} {money(s.total)}</div></li>
          ))}{debts.length === 0 && <li className="text-muted-foreground">{t("none")}</li>}</ul>
        </Card>
        <Card>
          <h3 className="mb-3 font-display text-lg font-bold">{t("payments")}</h3>
          <ul className="divide-y divide-border text-sm">{payments.map((p) => (
            <li key={p.id} className="flex justify-between py-2"><span>{fmtDate(p.date)} {p.note && `· ${p.note}`}</span><span className="font-semibold text-success">{money(p.amount)}</span></li>
          ))}{payments.length === 0 && <li className="text-muted-foreground">{t("none")}</li>}</ul>
        </Card>
      </div>
    </div>
  );
}
