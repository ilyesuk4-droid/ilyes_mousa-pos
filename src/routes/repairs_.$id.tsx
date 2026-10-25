import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MessageCircle, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  customersRepo, isLate, productsRepo, repairDue, repairPartsCost, repairProfit, repairsRepo, useData,
  type DeliveryMode, type NewRepair,
} from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Stat } from "@/components/ui-kit";
import { STATUSES, StatusBadge, printRepair, whatsappLink } from "@/components/repair-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/repairs_/$id")({
  head: () => ({
    meta: [
      { title: "تذكرة صيانة — نقطة البيع" },
      { name: "description", content: "Repair ticket details, parts, status and delivery." },
      { property: "og:title", content: "تذكرة صيانة — نقطة البيع" },
      { property: "og:description", content: "Repair ticket details, parts, status and delivery." },
    ],
  }),
  component: RepairDetail,
});

function RepairDetail() {
  const { id } = Route.useParams();
  const rid = Number(id);
  const { t, money, fmtDate } = useI18n();
  const print = usePrint(); const nav = useNavigate();
  const r = useData(() => repairsRepo.get(rid), [rid]);
  const products = useData(() => productsRepo.list(), []) ?? [];
  const [partId, setPartId] = useState(""); const [partQty, setPartQty] = useState(1);
  const [delivering, setDelivering] = useState(false);
  if (!r) return null;
  const i = { t, money, fmtDate };
  const closed = r.status === "delivered" || r.status === "cancelled";
  const upd = (patch: Partial<NewRepair>) => void repairsRepo.update(rid, patch);

  async function addPart() {
    const p = products.find((x) => x.id === Number(partId));
    if (!p || partQty <= 0) return;
    if (p.stock < partQty) toast.warning(t("stockShort"));
    await repairsRepo.addPart(rid, p.id!, partQty); setPartId(""); setPartQty(1);
  }

  return (
    <>
      <PageHeader title={`${t("ticket")} ${r.number}`}>
        <Link to="/repairs" className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 font-semibold"><ArrowRight className="h-4 w-4 ltr:rotate-180" />{t("back")}</Link>
        <Button variant="outline" onClick={() => void printRepair(print, r, "intake", i)}><Printer className="h-4 w-4" />{t("intakeReceipt")}</Button>
        {r.status === "delivered" && <Button variant="outline" onClick={() => void printRepair(print, r, "pickup", i)}><Printer className="h-4 w-4" />{t("pickupReceipt")}</Button>}
        <Button variant="success" onClick={async () => window.open(await whatsappLink(r, t, money), "_blank")}><MessageCircle className="h-4 w-4" />{t("whatsapp")}</Button>
      </PageHeader>

      <Card className="mb-6">
        <div className="mb-3 flex items-center gap-3"><span className="font-semibold text-muted-foreground">{t("status")}:</span><StatusBadge status={r.status} t={t} />{isLate(r) && <Badge tone="danger">{t("late")}</Badge>}</div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.filter((s) => s !== "delivered").map((s) => (
            <Button key={s} size="lg" variant={r.status === s ? "primary" : "outline"} disabled={r.status === "delivered"} onClick={() => void repairsRepo.setStatus(rid, s)}>{t(`st_${s}`)}</Button>
          ))}
          <Button size="lg" variant="accent" disabled={closed} onClick={() => setDelivering(true)}>{t("deliver")}</Button>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("agreedPrice")} value={money(r.price)} />
        <Stat label={t("partsCost")} value={money(repairPartsCost(r))} tone="warning" />
        <Stat label={t("profit")} value={money(repairProfit(r))} tone="success" />
        <Stat label={r.status === "delivered" ? t("remaining") : t("due")} value={money(r.status === "delivered" ? r.remaining : repairDue(r))} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label={t("customer")}><Input defaultValue={r.customerName} onBlur={(e) => upd({ customerName: e.target.value })} /></Field>
          <Field label={t("phone")}><Input defaultValue={r.phone} onBlur={(e) => upd({ phone: e.target.value })} /></Field>
          <Field label={t("device")}><Input defaultValue={r.device} onBlur={(e) => upd({ device: e.target.value })} /></Field>
          <Field label={t("imei")}><Input defaultValue={r.imei} onBlur={(e) => upd({ imei: e.target.value })} /></Field>
          <Field label={t("problem")} className="sm:col-span-2"><Input defaultValue={r.problem} onBlur={(e) => upd({ problem: e.target.value })} /></Field>
          <Field label={t("condition")}><Input defaultValue={r.condition} onBlur={(e) => upd({ condition: e.target.value })} /></Field>
          <Field label={t("lockCode")}><Input defaultValue={r.lockCode} onBlur={(e) => upd({ lockCode: e.target.value })} /></Field>
          <Field label={t("agreedPrice")}><Input type="number" min={0} disabled={r.status === "delivered"} defaultValue={r.price} onBlur={(e) => upd({ price: +e.target.value })} /></Field>
          <Field label={t("deposit")}><Input type="number" min={0} disabled={r.status === "delivered"} defaultValue={r.deposit} onBlur={(e) => upd({ deposit: +e.target.value })} /></Field>
          <Field label={t("laborCost")}><Input type="number" min={0} defaultValue={r.laborCost} onBlur={(e) => upd({ laborCost: +e.target.value })} /></Field>
          <Field label={t("readyDate")}><Input type="date" defaultValue={r.readyDate ? new Date(r.readyDate).toISOString().slice(0, 10) : ""} onBlur={(e) => upd({ readyDate: e.target.value ? new Date(e.target.value + "T18:00:00").getTime() : undefined })} /></Field>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">{t("partsUsed")}</h2>
            {!closed && (
              <div className="mb-3 flex gap-2">
                <Select value={partId} onChange={(e) => setPartId(e.target.value)}>
                  <option value="">{t("addPart")}…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}
                </Select>
                <Input type="number" min={1} className="w-20" value={partQty} onChange={(e) => setPartQty(+e.target.value)} />
                <Button onClick={() => void addPart()} disabled={!partId}>{t("add")}</Button>
              </div>
            )}
            {r.parts.length === 0 ? <p className="text-sm text-muted-foreground">{t("none")}</p> : (
              <ul className="divide-y divide-border">{r.parts.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name} ×{p.qty}</span>
                  <span className="flex items-center gap-2 tabular-nums">{money(p.unitCost * p.qty)}
                    {!closed && <Button variant="ghost" size="icon" onClick={() => void repairsRepo.removePart(rid, idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </span>
                </li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">{t("statusHistory")}</h2>
            <ul className="space-y-2 text-sm">{r.history.map((h, idx) => (
              <li key={idx} className="flex items-center justify-between"><StatusBadge status={h.status} t={t} /><span className="text-muted-foreground">{fmtDate(h.date)}</span></li>
            ))}</ul>
          </Card>
          {!closed || r.status === "cancelled" ? (
            <Button variant="danger" className="w-full" onClick={async () => { if (r.parts.length === 0 && confirm(t("confirmDelete"))) { await repairsRepo.remove(rid); void nav({ to: "/repairs" }); } }} disabled={r.parts.length > 0}>
              <Trash2 className="h-4 w-4" />{t("delete")}
            </Button>
          ) : null}
        </div>
      </div>
      {delivering && <DeliverModal id={rid} phone={r.phone} due={repairDue(r)} onClose={() => setDelivering(false)} onDone={async () => {
        setDelivering(false);
        const fresh = await repairsRepo.get(rid);
        if (fresh) await printRepair(print, fresh, "pickup", i);
      }} />}
    </>
  );
}

function DeliverModal({ id, phone, due, onClose, onDone }: { id: number; phone: string; due: number; onClose: () => void; onDone: () => void }) {
  const { t, money } = useI18n();
  const customers = useData(() => customersRepo.list(), []) ?? [];
  const match = customers.find((c) => c.phone && phone && c.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
  const [mode, setMode] = useState<DeliveryMode>("paid");
  const [amount, setAmount] = useState(0);
  const [customerId, setCustomerId] = useState<string>("");
  const cid = customerId || (match?.id ? String(match.id) : "");
  const needCustomer = mode !== "paid" && (mode === "credit" || amount < due);

  async function confirmDelivery() {
    if (needCustomer && !cid) { toast.error(t("needCustomer")); return; }
    await repairsRepo.deliver(id, mode, amount, cid ? Number(cid) : undefined);
    onDone();
  }
  return (
    <Modal open onClose={onClose} title={t("deliver")}>
      <div className="space-y-4">
        <div className="rounded-xl bg-primary p-4 text-primary-foreground"><div className="text-sm opacity-80">{t("due")}</div><div className="font-display text-3xl font-bold">{money(due)}</div></div>
        <div className="grid grid-cols-3 gap-2">
          {(["paid", "partial", "credit"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn("h-12 rounded-lg border font-semibold", mode === m ? "border-primary bg-primary/10 text-primary" : "border-border")}>
              {t(m === "paid" ? "fullyPaid" : m)}
            </button>
          ))}
        </div>
        {mode === "partial" && <Field label={t("paid")}><Input type="number" min={0} max={due} autoFocus value={amount || ""} onChange={(e) => setAmount(+e.target.value)} /></Field>}
        {mode !== "paid" && (
          <Field label={t("customer")}>
            <Select value={cid} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t("selectCustomer")}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone} ({money(c.balance)})</option>)}
            </Select>
          </Field>
        )}
        <Button size="lg" className="w-full" onClick={() => void confirmDelivery()}>{t("deliver")} + {t("print")}</Button>
      </div>
    </Modal>
  );
}
