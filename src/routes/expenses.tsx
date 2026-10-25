import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { expensesRepo, useData } from "@/data";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button, Card, Field, Input, PageHeader, Select, Table, Td, dayEnd, dayStart, todayStr } from "@/components/ui-kit";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "المصاريف — نقطة البيع" },
      { name: "description", content: "Track daily shop expenses like rent and electricity." },
      { property: "og:title", content: "المصاريف — نقطة البيع" },
      { property: "og:description", content: "Track daily shop expenses like rent and electricity." },
    ],
  }),
  component: Expenses,
});

const CATS: TKey[] = ["rent", "electricity", "water", "salaries", "internet", "other"];

function Expenses() {
  const { t, money, fmtDate } = useI18n();
  const [from, setFrom] = useState(todayStr().slice(0, 8) + "01"); const [to, setTo] = useState(todayStr());
  const list = useData(() => expensesRepo.list(dayStart(from), dayEnd(to)), [from, to]) ?? [];
  const [cat, setCat] = useState<string>("rent"); const [amount, setAmount] = useState(0); const [note, setNote] = useState(""); const [date, setDate] = useState(todayStr());
  const total = list.reduce((s, e) => s + e.amount, 0);
  const catLabel = (c: string) => (CATS.includes(c as TKey) ? t(c as TKey) : c);
  return (
    <>
      <PageHeader title={t("expenses")}>
        <Field label={t("from")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t("to")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </PageHeader>
      <Card className="mb-6">
        <form className="grid gap-3 md:grid-cols-5" onSubmit={async (e) => { e.preventDefault(); if (amount <= 0) return; await expensesRepo.save({ category: cat, amount, note, date: dayStart(date) + 12 * 3600000 }); setAmount(0); setNote(""); }}>
          <Field label={t("category")}><Select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{t(c)}</option>)}</Select></Field>
          <Field label={t("amount")}><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label={t("date")}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t("note")}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex items-end"><Button type="submit" className="w-full">{t("add")}</Button></div>
        </form>
      </Card>
      <div className="mb-3 font-display text-xl font-bold">{t("total")}: {money(total)}</div>
      <Table head={[t("date"), t("category"), t("amount"), t("note"), ""]}>
        {list.map((e) => (
          <tr key={e.id}><Td>{fmtDate(e.date)}</Td><Td>{catLabel(e.category)}</Td><Td className="font-semibold">{money(e.amount)}</Td><Td>{e.note}</Td>
            <Td><Button size="icon" variant="ghost" onClick={() => confirm(t("confirmDelete")) && expensesRepo.remove(e.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button></Td></tr>
        ))}
      </Table>
    </>
  );
}
