import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { repairProfit, saleProfit, statsRepo, flexiRepo, useData } from "@/data";
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
  const [flexiSummary, setFlexiSummary] = useState<Awaited<ReturnType<typeof flexiRepo.summary>> | null>(null);

  useEffect(() => {
    flexiRepo.summary(dayStart(from), dayEnd(to)).then(setFlexiSummary);
  }, [from, to]);

  const flexiProfit = flexiSummary?.profit ?? 0;
  const flexiRevenue = flexiSummary?.revenue ?? 0;

  return (
    <>
      <PageHeader title={t("reports")}>
        <Field label={t("from")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t("to")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </PageHeader>
      {r && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("revenue")} value={money(r.revenue)} />
            <Stat label={t("collected")} value={money(r.collected)} />
            <Stat label={t("profit")} value={money(r.profit)} tone="success" />
            <Stat label={t("repairIncome")} value={money(r.repairIncome)} />
            <Stat label={t("repairProfit")} value={money(r.repairProfit)} tone="success" />
            <Stat label={t("flexiRevenue")} value={money(flexiRevenue)} />
            <Stat label={t("flexiProfit")} value={money(flexiProfit)} tone="success" />
            <Stat label={t("expenses")} value={money(r.expenseTotal)} tone="danger" />
            <Stat label={t("netProfit")} value={money(r.net + flexiProfit)} tone={(r.net + flexiProfit) >= 0 ? "success" : "danger"} />
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
          <h2 className="mb-3 mt-8 font-display text-lg font-bold">{t("repairs")}: {r.repairs.length}</h2>
          <Table head={[t("ticket"), t("date"), t("customer"), t("device"), t("agreedPrice"), t("partsCost"), t("profit")]}>
            {r.repairs.map((x) => (
              <tr key={x.id}>
                <Td>{x.number}</Td><Td>{fmtDate(x.deliveredAt!)}</Td><Td>{x.customerName}</Td><Td>{x.device}</Td>
                <Td className="font-semibold">{money(x.price)}</Td>
                <Td>{money(x.price - repairProfit(x) - (x.laborCost || 0))}</Td>
                <Td className="text-success">{money(repairProfit(x))}</Td>
              </tr>
            ))}
          </Table>
          {(flexiSummary?.sales?.length ?? 0) > 0 && (
            <>
              <h2 className="mb-3 mt-8 font-display text-lg font-bold">{t("flexiHistory")}: {flexiSummary!.sales.length}</h2>
              <Table head={[t("date"), t("operator"), t("phone"), t("sendAmount"), t("salePrice"), t("profit"), t("status")]}>
                {flexiSummary!.sales.map((s) => (
                  <tr key={s.id}>
                    <Td>{fmtDate(s.date)}</Td>
                    <Td className="font-semibold">{s.operatorName}</Td>
                    <Td>{s.phoneNumber || "—"}</Td>
                    <Td className="tabular-nums">{money(s.amount)}</Td>
                    <Td className="font-semibold tabular-nums">{money(s.salePrice)}</Td>
                    <Td className="text-success tabular-nums">{money(s.profit)}</Td>
                    <Td>{s.remaining > 0 ? <Badge tone="warning">{money(s.remaining)}</Badge> : <Badge tone="success">{t("fullyPaid")}</Badge>}</Td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </>
      )}
    </>
  );
}
