import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { saleProfit, statsRepo, useData } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Field, Input, PageHeader, Stat, Table, Td, Badge, dayEnd, dayStart, todayStr } from "@/components/ui-kit";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — نقطة البيع" },
      { name: "description", content: "Sales, profit and expenses by date range." },
      { property: "og:title", content: "التقارير — نقطة البيع" },
      { property: "og:description", content: "Sales, profit and expenses by date range." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { t, money, fmtDate } = useI18n();
  const first = todayStr().slice(0, 8) + "01";
  const [from, setFrom] = useState(first); const [to, setTo] = useState(todayStr());
  const r = useData(() => statsRepo.summary(dayStart(from), dayEnd(to)), [from, to]);
  return (
    <>
      <PageHeader title={t("reports")}>
        <Field label={t("from")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t("to")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </PageHeader>
      {r && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label={t("revenue")} value={money(r.revenue)} />
            <Stat label={t("collected")} value={money(r.collected)} />
            <Stat label={t("profit")} value={money(r.profit)} tone="success" />
            <Stat label={t("expenses")} value={money(r.expenseTotal)} tone="danger" />
            <Stat label={t("netProfit")} value={money(r.net)} tone={r.net >= 0 ? "success" : "danger"} />
          </div>
          <h2 className="mb-3 mt-8 font-display text-lg font-bold">{t("salesCount")}: {r.sales.length}</h2>
          <Table head={["#", t("date"), t("customer"), t("items"), t("total"), t("paid"), t("profit")]}>
            {r.sales.map((s) => (
              <tr key={s.id}>
                <Td>{s.id}</Td><Td>{fmtDate(s.date)}</Td><Td>{s.customerName ?? "—"}</Td>
                <Td className="text-xs">{s.items.map((l) => `${l.name} ×${l.qty}`).join("، ")}</Td>
                <Td className="font-semibold">{money(s.total)}</Td>
                <Td>{s.remaining > 0 ? <Badge tone="warning">{money(s.paid)}</Badge> : money(s.paid)}</Td>
                <Td className="text-success">{money(saleProfit(s))}</Td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
