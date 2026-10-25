import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { isLate, repairDue, repairsRepo, useData, type NewRepair, type RepairStatus } from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { Button, Field, Input, Modal, PageHeader, Select, Table, Td } from "@/components/ui-kit";
import { STATUSES, StatusBadge, printRepair } from "@/components/repair-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/repairs")({
  head: () => ({
    meta: [
      { title: "الصيانة — نقطة البيع" },
      { name: "description", content: "Phone repair tickets, status tracking and pickup receipts." },
      { property: "og:title", content: "الصيانة — نقطة البيع" },
      { property: "og:description", content: "Phone repair tickets, status tracking and pickup receipts." },
    ],
  }),
  component: Repairs,
});

const empty: NewRepair = { customerName: "", phone: "", device: "", imei: "", problem: "", condition: "", lockCode: "", price: 0, laborCost: 0, deposit: 0, readyDate: undefined };

function Repairs() {
  const { t, money, fmtDate } = useI18n();
  const print = usePrint();
  const nav = useNavigate();
  const list = useData(() => repairsRepo.list(), []) ?? [];
  const [q, setQ] = useState(""); const [status, setStatus] = useState<RepairStatus | "" | "late">("");
  const [form, setForm] = useState<NewRepair | null>(null);
  const ql = q.trim().toLowerCase();
  const rows = list.filter((r) =>
    (!ql || [r.customerName, r.phone, r.imei, r.number].some((v) => v.toLowerCase().includes(ql))) &&
    (!status || (status === "late" ? isLate(r) : r.status === status)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !form.customerName.trim() || !form.device.trim()) return;
    const r = await repairsRepo.create(form);
    setForm(null); toast.success(`${t("repairSaved")} ${r.number}`);
    await printRepair(print, r, "intake", { t, money, fmtDate });
    void nav({ to: "/repairs/$id", params: { id: String(r.id) } });
  }
  const set = (k: keyof NewRepair, v: string | number | undefined) => setForm((f) => f && { ...f, [k]: v });

  return (
    <>
      <PageHeader title={t("repairs")}>
        <Button size="lg" onClick={() => setForm(empty)}><Plus className="h-5 w-5" />{t("newRepair")}</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input autoFocus className="max-w-md" placeholder={t("searchRepair")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as RepairStatus | "" | "late")}>
          <option value="">{t("all")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`st_${s}`)}</option>)}
          <option value="late">{t("lateOnly")}</option>
        </Select>
      </div>
      {rows.length === 0 ? <p className="py-10 text-center text-muted-foreground">{t("noRepairs")}</p> : (
        <Table head={[t("ticket"), t("date"), t("customer"), t("device"), t("problem"), t("readyDate"), t("due"), t("status")]}>
          {rows.map((r) => {
            const late = isLate(r);
            return (
              <tr key={r.id} className={cn("cursor-pointer hover:bg-muted/60", late && "bg-destructive/10 text-destructive")}
                onClick={() => void nav({ to: "/repairs/$id", params: { id: String(r.id) } })}>
                <Td className="font-bold"><Link to="/repairs/$id" params={{ id: String(r.id) }}>{r.number}</Link></Td>
                <Td>{fmtDate(r.createdAt)}</Td>
                <Td><span className="font-semibold">{r.customerName}</span><span className="block text-xs opacity-70">{r.phone}</span></Td>
                <Td>{r.device}</Td><Td className="max-w-xs truncate">{r.problem}</Td>
                <Td>{r.readyDate ? new Date(r.readyDate).toLocaleDateString() : "—"}{late && <span className="ms-2 font-bold">⚠ {t("late")}</span>}</Td>
                <Td>{money(r.status === "delivered" ? r.remaining : repairDue(r))}</Td>
                <Td><StatusBadge status={r.status} t={t} /></Td>
              </tr>
            );
          })}
        </Table>
      )}
      {form && (
        <Modal open wide onClose={() => setForm(null)} title={t("newRepair")}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <Field label={t("customer")}><Input autoFocus required value={form.customerName} onChange={(e) => set("customerName", e.target.value)} /></Field>
            <Field label={t("phone")}><Input required inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label={t("device")}><Input required value={form.device} onChange={(e) => set("device", e.target.value)} /></Field>
            <Field label={t("imei")}><Input value={form.imei} onChange={(e) => set("imei", e.target.value)} /></Field>
            <Field label={t("problem")} className="sm:col-span-2"><Input required value={form.problem} onChange={(e) => set("problem", e.target.value)} /></Field>
            <Field label={t("condition")}><Input value={form.condition} onChange={(e) => set("condition", e.target.value)} /></Field>
            <Field label={t("lockCode")}><Input value={form.lockCode} onChange={(e) => set("lockCode", e.target.value)} /></Field>
            <Field label={t("agreedPrice")}><Input type="number" min={0} value={form.price || ""} onChange={(e) => set("price", +e.target.value)} /></Field>
            <Field label={t("deposit")}><Input type="number" min={0} value={form.deposit || ""} onChange={(e) => set("deposit", +e.target.value)} /></Field>
            <Field label={t("readyDate")}><Input type="date" onChange={(e) => set("readyDate", e.target.value ? new Date(e.target.value + "T18:00:00").getTime() : undefined)} /></Field>
            <div className="flex items-end"><Button type="submit" size="lg" className="w-full">{t("save")} + {t("print")}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
