import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Coins, Boxes, AlertTriangle, Users } from "lucide-react";
import { statsRepo, useData } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Card, PageHeader, Stat, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — نقطة البيع" },
      { name: "description", content: "Today's sales, profit, stock value and debts at a glance." },
      { property: "og:title", content: "لوحة التحكم — نقطة البيع" },
      { property: "og:description", content: "Today's sales, profit, stock value and debts at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, money } = useI18n();
  const d = useData(() => statsRepo.dashboard(), []);
  if (!d) return null;
  return (
    <>
      <PageHeader title={t("dashboard")}>
        <Link to="/pos" className="inline-flex h-14 items-center rounded-lg bg-accent px-6 text-lg font-bold text-accent-foreground shadow-soft">{t("pos")}</Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label={t("todaySales")} value={money(d.today.revenue)} icon={<TrendingUp />} />
        <Stat label={t("todayProfit")} value={money(d.today.profit)} tone="success" icon={<Coins />} />
        <Stat label={t("stockValue")} value={money(d.stockValue)} icon={<Boxes />} />
        <Stat label={t("lowStock")} value={d.lowStock.length} tone="warning" icon={<AlertTriangle />} />
        <Stat label={t("totalDebts")} value={money(d.debts)} tone="danger" icon={<Users />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">{t("bestSellers")}</h2>
          {d.best.length === 0 ? <p className="text-muted-foreground">{t("none")}</p> : (
            <ul className="divide-y divide-border">{d.best.map((b, i) => (
              <li key={i} className="flex justify-between py-2"><span>{b.name}</span><span className="tabular-nums text-muted-foreground">{b.qty} · {money(b.revenue)}</span></li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">{t("lowStock")}</h2>
          {d.lowStock.length === 0 ? <p className="text-muted-foreground">{t("none")}</p> : (
            <ul className="divide-y divide-border">{d.lowStock.slice(0, 12).map((p) => (
              <li key={p.id} className="flex justify-between py-2"><span>{p.name}</span><Badge tone={p.stock <= 0 ? "danger" : "warning"}>{p.stock} / {p.minStock}</Badge></li>
            ))}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
