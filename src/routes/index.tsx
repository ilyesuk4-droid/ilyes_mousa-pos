import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  TrendingUp, Coins, Boxes, Users, Wrench, Zap, ShoppingCart, ArrowUpRight,
  ArrowDownRight, Eye, EyeOff, Moon, Sun, Clock, Calendar, CheckCircle2,
  AlertTriangle, PhoneCall, Plus, RotateCcw, AlertCircle, ShieldAlert,
  ChevronRight, Sparkles, Layers, BarChart2, PieChart as PieIcon, Flame
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  dashboardStatsRepo, settingsRepo, useData, type PeriodType,
  type AlertGroup, type ActivityItem, type DayCloseData,
} from "@/data";
import { useI18n } from "@/lib/i18n";
import { Card, Badge, Button } from "@/components/ui-kit";
import { DayCloseModal } from "@/components/DayCloseModal";

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
  const { t, money, lang, hideAmounts, toggleHideAmounts, darkMode, toggleDarkMode } = useI18n();

  // State for chart period filter
  const [period, setPeriod] = useState<PeriodType>("7d");
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // Settings
  const settings = useData(() => settingsRepo.get(), []);

  // Aggregated data layers
  const kpis = useData(() => dashboardStatsRepo.getKPIs(), []);
  const repairsMetrics = useData(() => dashboardStatsRepo.getRepairsMetrics(), []);
  const flexiMetrics = useData(() => dashboardStatsRepo.getFlexiMetrics(), []);
  const timeSeries = useData(() => dashboardStatsRepo.getTimeSeriesChartData(period), [period]);
  const profitSplit = useData(() => dashboardStatsRepo.getProfitSplit(period), [period]);
  const topLists = useData(() => dashboardStatsRepo.getTopLists(5), []);
  const alerts = useData(() => dashboardStatsRepo.getAlerts(), []);
  const recentActivity = useData(() => dashboardStatsRepo.getRecentActivity(8), []);
  const dayCloseSummary = useData(() => dashboardStatsRepo.getDayCloseSummary(), []);

  // Safe money formatter respecting hideAmounts
  const displayMoney = (val: number | undefined) => {
    if (val === undefined) return "—";
    if (hideAmounts) return lang === "ar" ? "•••••• دج" : "•••••• DA";
    return money(val);
  };

  // Header date formatting
  const todayFormatted = new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Total profit for Donut chart center label
  const totalPeriodProfit = useMemo(() => {
    if (!profitSplit) return 0;
    return profitSplit.reduce((s, x) => s + x.value, 0);
  }, [profitSplit]);

  // Loading Skeleton State
  if (!kpis) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-20 rounded-2xl bg-muted/60" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted/50" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-44 rounded-2xl bg-muted/50" />
          <div className="h-44 rounded-2xl bg-muted/50" />
        </div>
        <div className="h-80 rounded-2xl bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Toolbar: Shop info + Controls (Eye, Day Close, Dark Mode) ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            <span>{settings?.shopName || t("appName")}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground font-normal">{todayFormatted}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {t("dashboard")}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Eye Button to hide/show amounts */}
          <button
            type="button"
            onClick={toggleHideAmounts}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:bg-muted active:scale-95"
            title={hideAmounts ? t("showAmounts") : t("hideAmounts")}
          >
            {hideAmounts ? <EyeOff className="h-5 w-5 text-amber-500" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:bg-muted active:scale-95"
            title={darkMode ? t("lightMode") : t("darkMode")}
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
          </button>

          {/* Close the Day Button */}
          <button
            type="button"
            onClick={() => setCloseModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 font-bold text-primary shadow-sm transition hover:bg-primary/20 active:scale-95"
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm">{t("closeDay")}</span>
          </button>

          {/* Primary POS CTA */}
          <Link
            to="/pos"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-foreground shadow-soft transition hover:brightness-105 active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{t("pos")}</span>
            <kbd className="hidden rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-mono sm:inline-block">F2</kbd>
          </Link>
        </div>
      </div>

      {/* ── 1. Four KPI Cards: Single-line amount + % change vs yesterday ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today's Sales */}
        <Card className="flex flex-col justify-between border-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">{t("todaySales")}</span>
              <div className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight text-foreground whitespace-nowrap sm:text-3xl">
                {displayMoney(kpis.todaySales)}
              </div>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
            <span className="text-muted-foreground">{t("vsYesterday")}</span>
            <TrendBadge pct={kpis.salesChangePct} />
          </div>
        </Card>

        {/* Today's Profit */}
        <Card className="flex flex-col justify-between border-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-success/40 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">{t("todayProfit")}</span>
              <div className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight text-success whitespace-nowrap sm:text-3xl">
                {displayMoney(kpis.todayProfit)}
              </div>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
            <span className="text-muted-foreground">{t("vsYesterday")}</span>
            <TrendBadge pct={kpis.profitChangePct} />
          </div>
        </Card>

        {/* Customer Debts */}
        <Link to="/customers" className="block focus:outline-none">
          <Card className="flex flex-col justify-between border-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-md h-full">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">{t("totalDebts")}</span>
                <div className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight text-destructive whitespace-nowrap sm:text-3xl">
                  {displayMoney(kpis.debts)}
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
              <span className="text-muted-foreground">{t("vsYesterday")}</span>
              <TrendBadge pct={kpis.debtsChangePct} inverse />
            </div>
          </Card>
        </Link>

        {/* Stock Value */}
        <Link to="/products" className="block focus:outline-none">
          <Card className="flex flex-col justify-between border-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md h-full">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">{t("stockValue")}</span>
                <div className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight text-foreground whitespace-nowrap sm:text-3xl">
                  {displayMoney(kpis.stockValue)}
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                <Boxes className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
              <span className="text-muted-foreground">{t("vsYesterday")}</span>
              <TrendBadge pct={kpis.stockChangePct} />
            </div>
          </Card>
        </Link>
      </div>

      {/* ── 2. Two Service Cards: Repairs & Flexi ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Repairs Service Card */}
        <Card className="border-border/80">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
                <Wrench className="h-4 w-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">{t("repairsService")}</h2>
            </div>
            <Link to="/repairs" className="text-xs font-semibold text-primary hover:underline">
              {t("repairs")} →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            {/* Income */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <span className="text-muted-foreground">{t("todayRepairIncome")}</span>
              <div className="mt-1 font-display text-lg font-bold tabular-nums text-foreground whitespace-nowrap">
                {displayMoney(repairsMetrics?.todayIncome ?? 0)}
              </div>
            </div>

            {/* Profit */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <span className="text-muted-foreground">{t("todayRepairProfit")}</span>
              <div className="mt-1 font-display text-lg font-bold tabular-nums text-success whitespace-nowrap">
                {displayMoney(repairsMetrics?.todayProfit ?? 0)}
              </div>
            </div>

            {/* Devices in Repair */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <span className="text-muted-foreground">{t("devicesInRepair")}</span>
              <div className="mt-1 font-display text-lg font-bold tabular-nums text-sky-600">
                {repairsMetrics?.devicesInRepair ?? 0}
              </div>
            </div>

            {/* Late Devices */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <span className="text-muted-foreground">{t("lateDevices")}</span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`font-display text-lg font-bold tabular-nums ${(repairsMetrics?.lateDevices ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {repairsMetrics?.lateDevices ?? 0}
                </span>
                {(repairsMetrics?.lateDevices ?? 0) > 0 && (
                  <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                    {t("late")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Flexi Service Card */}
        <Card className="border-border/80">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <Zap className="h-4 w-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">{t("flexiService")}</h2>
            </div>
            <Link to="/flexi" className="text-xs font-semibold text-primary hover:underline">
              {t("flexiTopup")} →
            </Link>
          </div>

          <div className="space-y-3">
            {/* Sales & Profit summary */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <span className="text-muted-foreground">{t("todayFlexiRevenue")}</span>
                <div className="mt-1 font-display text-lg font-bold tabular-nums text-foreground whitespace-nowrap">
                  {displayMoney(flexiMetrics?.todaySales ?? 0)}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <span className="text-muted-foreground">{t("todayFlexiProfit")}</span>
                <div className="mt-1 font-display text-lg font-bold tabular-nums text-success whitespace-nowrap">
                  {displayMoney(flexiMetrics?.todayProfit ?? 0)}
                </div>
              </div>
            </div>

            {/* Balances per operator with distinct colors */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(flexiMetrics?.operators ?? []).map((op) => (
                <div key={op.id ?? op.name} className="rounded-lg border border-border/70 bg-card p-2 text-center">
                  <div className="flex items-center justify-center gap-1.5 font-bold">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: op.color }} />
                    <span className="text-foreground truncate">{op.name}</span>
                  </div>
                  <div className="mt-1 text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                    {displayMoney(op.balance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── 3 & 4. Main Chart (Area) & Donut Chart (Profit Split) ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Chart (8 cols) */}
        <Card className="lg:col-span-8 flex flex-col justify-between border-border/80">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold text-foreground">{t("salesAndProfit")}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t("period")}: {period === "7d" ? t("last7Days") : period === "30d" ? t("last30Days") : t("thisMonth")}</p>
              </div>

              {/* Period Toggle Buttons */}
              <div className="inline-flex rounded-xl border border-border bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPeriod("7d")}
                  className={`rounded-lg px-3 py-1.5 transition ${period === "7d" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t("last7Days")}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("30d")}
                  className={`rounded-lg px-3 py-1.5 transition ${period === "30d" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t("last30Days")}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("month")}
                  className={`rounded-lg px-3 py-1.5 transition ${period === "month" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t("thisMonth")}
                </button>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis
                    dataKey="label"
                    stroke="currentColor"
                    className="text-muted-foreground text-[11px]"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground text-[11px]"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (hideAmounts ? "••" : v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip content={<CustomChartTooltip money={displayMoney} t={t} />} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name={t("revenue")}
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name={t("profit")}
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#profitGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart footer legend */}
          <div className="mt-3 flex items-center justify-center gap-6 border-t border-border/50 pt-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#0d9488]" />
              <span className="text-muted-foreground">{t("revenue")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#16a34a]" />
              <span className="text-muted-foreground">{t("profit")}</span>
            </div>
          </div>
        </Card>

        {/* Donut Chart (Profit Split - 4 cols) */}
        <Card className="lg:col-span-4 flex flex-col justify-between border-border/80">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">{t("profitDistribution")}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("period")}: {period === "7d" ? t("last7Days") : period === "30d" ? t("last30Days") : t("thisMonth")}</p>

            {/* Recharts Pie/Donut Chart */}
            <div className="relative h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<DonutTooltip money={displayMoney} t={t} />} />
                  <Pie
                    data={profitSplit ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(profitSplit ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Profit */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("profit")}</span>
                <span className="font-display text-base font-extrabold text-foreground tabular-nums whitespace-nowrap">
                  {displayMoney(totalPeriodProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 border-t border-border/50 pt-3 text-xs">
            {(profitSplit ?? []).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">
                    {item.name === "products" ? t("productsProfit") : item.name === "repairs" ? t("repairsProfitShort") : t("flexiProfitShort")}
                  </span>
                </div>
                <span className="font-bold tabular-nums text-foreground">{displayMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 5. Horizontal Bar Charts: Top 5 Categories & Top 5 Best-Selling Products ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 Categories */}
        <Card className="border-border/80">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">{t("topCategories")}</h2>
            </div>
            <Link to="/categories" className="text-xs font-semibold text-primary hover:underline">
              {t("categories")} →
            </Link>
          </div>

          {(!topLists?.topCategories || topLists.topCategories.length === 0) ? (
            <p className="py-8 text-center text-xs text-muted-foreground">{t("none")}</p>
          ) : (
            <div className="space-y-3.5">
              {topLists.topCategories.map((c, i) => {
                const maxCat = topLists.topCategories[0]?.revenue || 1;
                const pct = Math.round((c.revenue / maxCat) * 100);
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{i + 1}. {c.name}</span>
                      <span className="font-bold tabular-nums text-foreground">{displayMoney(c.revenue)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-primary/80 transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top 5 Best-Selling Products */}
        <Card className="border-border/80">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                <Flame className="h-4 w-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">{t("topProducts")}</h2>
            </div>
            <Link to="/products" className="text-xs font-semibold text-primary hover:underline">
              {t("products")} →
            </Link>
          </div>

          {(!topLists?.topProducts || topLists.topProducts.length === 0) ? (
            <p className="py-8 text-center text-xs text-muted-foreground">{t("none")}</p>
          ) : (
            <div className="space-y-3.5">
              {topLists.topProducts.map((p, i) => {
                const maxProd = topLists.topProducts[0]?.qty || 1;
                const pct = Math.round((p.qty / maxProd) * 100);
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-foreground truncate">{i + 1}. {p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-end">
                        <span className="font-bold tabular-nums text-foreground">{p.qty} {t("qty")}</span>
                        <span className="text-muted-foreground text-[11px] tabular-nums">({displayMoney(p.revenue)})</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-amber-500/80 transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── 6 & 7. Alerts Panel & Recent Activity (8 Operations) ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Alerts Panel (6 cols) */}
        <Card className="lg:col-span-6 flex flex-col justify-between border-border/80">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">{t("alertsPanel")}</h2>
              </div>
              <Badge tone={(alerts && alerts.length > 0) ? "warning" : "success"}>
                {alerts?.length ?? 0} {t("actions")}
              </Badge>
            </div>

            {(!alerts || alerts.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-foreground">{t("allAlertsResolved")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((al) => (
                  <Link
                    key={al.id}
                    to={al.link as any}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 transition hover:bg-muted/40 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${al.tone === "danger" ? "bg-destructive" : al.tone === "warning" ? "bg-amber-500" : "bg-sky-500"}`} />
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition">
                          {t(al.titleKey as any)}
                        </span>
                        <Badge tone={al.tone}>{al.count}</Badge>
                      </div>
                      {al.sampleItems.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground truncate">
                          {al.sampleItems.join(" · ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity (6 cols) */}
        <Card className="lg:col-span-6 flex flex-col justify-between border-border/80">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">{t("recentActivity")}</h2>
              </div>
            </div>

            {(!recentActivity || recentActivity.length === 0) ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("noRecentActivity")}</p>
            ) : (
              <div className="divide-y divide-border/60">
                {recentActivity.map((act) => {
                  const typeIcon =
                    act.type === "sale" ? (
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    ) : act.type === "payment" ? (
                      <Coins className="h-4 w-4 text-emerald-600" />
                    ) : act.type === "repair" ? (
                      <Wrench className="h-4 w-4 text-sky-600" />
                    ) : (
                      <Zap className="h-4 w-4 text-purple-600" />
                    );

                  const dateFormatted = new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(act.date));

                  return (
                    <Link
                      key={act.id}
                      to={act.link as any}
                      className="flex items-center justify-between py-2.5 hover:bg-muted/30 px-2 rounded-lg transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                          {typeIcon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition">
                            {act.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{act.subtitle}</div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <div className="text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                          {displayMoney(act.amount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{dateFormatted}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Day Close Modal ── */}
      <DayCloseModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        data={dayCloseSummary ?? null}
        shopName={settings?.shopName || t("appName")}
      />
    </div>
  );
}

// ── Subcomponents ──

function TrendBadge({ pct, inverse }: { pct: number; inverse?: boolean }) {
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
        <span>—</span>
        <span>0%</span>
      </span>
    );
  }
  const isUp = pct > 0;
  // For debts, increasing debt is danger, decreasing debt is success
  const isPositive = inverse ? !isUp : isUp;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
        isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}
    >
      {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      <span>{isUp ? `+${pct}%` : `${pct}%`}</span>
    </span>
  );
}

function CustomChartTooltip({ active, payload, label, money, t }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 min-w-[140px]">
        <div className="font-bold text-foreground border-b border-border pb-1 mb-1">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5" style={{ color: entry.stroke }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-bold tabular-nums text-foreground">{money(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function DonutTooltip({ active, payload, money, t }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const label = item.name === "products" ? t("productsProfit") : item.name === "repairs" ? t("repairsProfitShort") : t("flexiProfitShort");
    return (
      <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs">
        <div className="flex items-center gap-2 font-bold" style={{ color: item.payload.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
          <span>{label}:</span>
          <span className="tabular-nums text-foreground">{money(item.value)}</span>
        </div>
      </div>
    );
  }
  return null;
}
