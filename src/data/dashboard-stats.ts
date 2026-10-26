import { db } from "./db";
import { salesRepo, expensesRepo, saleProfit } from "./repositories";
import { repairsRepo } from "./repairs";
import { isLate, repairProfit } from "./repair-calc";
import { flexiRepo } from "./flexi";
import { returnsRepo } from "./returns";
import type { FlexiOperator, Product, Customer } from "./types";

export type PeriodType = "7d" | "30d" | "month";

export interface ActivityItem {
  id: string;
  type: "sale" | "payment" | "repair" | "flexi";
  title: string;
  subtitle: string;
  amount: number;
  date: number;
  link: string;
}

export interface AlertGroup {
  id: "low_stock" | "overdue_debt" | "late_repair" | "low_flexi" | "dormant_stock";
  titleKey: string;
  count: number;
  tone: "warning" | "danger" | "info";
  link: string;
  sampleItems: string[];
}

export interface DayCloseData {
  date: number;
  cashSales: number;
  cashDebtPayments: number;
  cashRepairs: number;
  cashFlexi: number;
  totalCashIn: number;
  expenses: number;
  refunds: number;
  netCashInDrawer: number;
  totalGrossProfit: number;
  netProfit: number;
  salesCount: number;
  repairsDeliveredCount: number;
  flexiCount: number;
  returnsCount: number;
}

function calcPctChange(cur: number, prev: number): number {
  if (prev > 0) return Math.round(((cur - prev) / prev) * 100);
  if (prev === 0 && cur > 0) return 100;
  return 0;
}

export const dashboardStatsRepo = {
  /** 1. Main 4 KPI cards with % change vs yesterday */
  async getKPIs() {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const yesterdayStartMs = todayStartMs - 86400000;
    const yesterdayEndMs = todayStartMs - 1;

    // Parallel fetch today vs yesterday
    const [todaySalesList, yesterdaySalesList, products, customers, todayRepairs, yesterdayRepairs, todayFlexi, yesterdayFlexi] =
      await Promise.all([
        db.sales.where("date").between(todayStartMs, now, true, true).toArray(),
        db.sales.where("date").between(yesterdayStartMs, yesterdayEndMs, true, true).toArray(),
        db.products.toArray(),
        db.customers.toArray(),
        db.repairs.where("deliveredAt").between(todayStartMs, now, true, true).toArray(),
        db.repairs.where("deliveredAt").between(yesterdayStartMs, yesterdayEndMs, true, true).toArray(),
        flexiRepo.summary(todayStartMs, now),
        flexiRepo.summary(yesterdayStartMs, yesterdayEndMs),
      ]);

    // 1. Sales & % change
    const todaySales = todaySalesList.reduce((s, x) => s + x.total, 0);
    const yesterdaySales = yesterdaySalesList.reduce((s, x) => s + x.total, 0);
    const salesChangePct = calcPctChange(todaySales, yesterdaySales);

    // 2. Profit & % change
    const todaySaleProf = todaySalesList.reduce((s, x) => s + saleProfit(x), 0);
    const yesterdaySaleProf = yesterdaySalesList.reduce((s, x) => s + saleProfit(x), 0);

    const todayRepairProf = todayRepairs.reduce((s, r) => s + repairProfit(r), 0);
    const yesterdayRepairProf = yesterdayRepairs.reduce((s, r) => s + repairProfit(r), 0);

    const todayProfit = todaySaleProf + todayRepairProf + todayFlexi.profit;
    const yesterdayProfit = yesterdaySaleProf + yesterdayRepairProf + yesterdayFlexi.profit;
    const profitChangePct = calcPctChange(todayProfit, yesterdayProfit);

    // 3. Customer Debts & % change
    const currentDebts = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
    // Debts created today
    const todayNewCredit = todaySalesList.reduce((s, x) => s + Math.max(0, x.remaining), 0);
    const todayPayments = await db.customerPayments.where("date").between(todayStartMs, now, true, true).toArray();
    const todayPaidDebt = todayPayments.reduce((s, p) => s + p.amount, 0);
    const yesterdayDebts = Math.max(0, currentDebts - (todayNewCredit - todayPaidDebt));
    const debtsChangePct = calcPctChange(currentDebts, yesterdayDebts);

    // 4. Stock Value & % change
    const stockValue = products.reduce((s, p) => s + p.purchasePrice * Math.max(0, p.stock), 0);
    const todayPurchases = await db.purchases.where("date").between(todayStartMs, now, true, true).toArray();
    const todayPurchasesValue = todayPurchases.reduce((s, p) => s + p.total, 0);
    const todayCostOfGoodsSold = todaySalesList.reduce(
      (s, x) => s + x.items.reduce((sum, item) => sum + item.purchasePrice * item.qty, 0),
      0
    );
    const yesterdayStockValue = Math.max(0, stockValue - todayPurchasesValue + todayCostOfGoodsSold);
    const stockChangePct = calcPctChange(stockValue, yesterdayStockValue);

    return {
      todaySales,
      salesChangePct,
      todayProfit,
      profitChangePct,
      debts: currentDebts,
      debtsChangePct,
      stockValue,
      stockChangePct,
    };
  },

  /** 2. Repairs service card metrics */
  async getRepairsMetrics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDelivered = await db.repairs.where("deliveredAt").between(todayStart.getTime(), Date.now(), true, true).toArray();
    const allRepairs = await db.repairs.toArray();

    const todayIncome = todayDelivered.reduce((s, r) => s + r.price, 0);
    const todayProfit = todayDelivered.reduce((s, r) => s + repairProfit(r), 0);
    const devicesInRepair = allRepairs.filter((r) => r.status === "received" || r.status === "in_repair").length;
    const lateDevices = allRepairs.filter((r) => isLate(r)).length;

    return { todayIncome, todayProfit, devicesInRepair, lateDevices };
  },

  /** 3. Flexi service card metrics */
  async getFlexiMetrics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todaySummary, operators] = await Promise.all([
      flexiRepo.todaySummary(),
      flexiRepo.listOperators(),
    ]);

    return {
      todaySales: todaySummary.revenue,
      todayProfit: todaySummary.profit,
      operators,
    };
  },

  /** 4. Time series data for main chart (7d / 30d / this month) */
  async getTimeSeriesChartData(period: PeriodType) {
    const now = Date.now();
    const startDate = new Date();

    if (period === "7d") {
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "30d") {
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    const startMs = startDate.getTime();

    // Fetch range data in parallel
    const [sales, repairs, flexiSales] = await Promise.all([
      db.sales.where("date").between(startMs, now, true, true).toArray(),
      db.repairs.where("deliveredAt").between(startMs, now, true, true).toArray(),
      db.flexiSales.where("date").between(startMs, now, true, true).toArray(),
    ]);

    // Build day map
    const dayMap = new Map<string, { date: string; label: string; sales: number; profit: number; repairs: number; flexi: number }>();

    const cursor = new Date(startMs);
    const endCursor = new Date(now);
    while (cursor <= endCursor) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const dayName = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(cursor);
      dayMap.set(key, { date: key, label: dayName, sales: 0, profit: 0, repairs: 0, flexi: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Aggregate sales
    for (const s of sales) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = dayMap.get(key);
      if (entry) {
        entry.sales += s.total;
        entry.profit += saleProfit(s);
      }
    }

    // Aggregate repairs
    for (const r of repairs) {
      if (!r.deliveredAt) continue;
      const d = new Date(r.deliveredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = dayMap.get(key);
      if (entry) {
        entry.repairs += r.price;
        entry.profit += repairProfit(r);
      }
    }

    // Aggregate flexi
    for (const fs of flexiSales) {
      const d = new Date(fs.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = dayMap.get(key);
      if (entry) {
        entry.flexi += fs.salePrice;
        entry.profit += fs.profit;
      }
    }

    return Array.from(dayMap.values());
  },

  /** 5. Donut chart profit split for period */
  async getProfitSplit(period: PeriodType) {
    const series = await dashboardStatsRepo.getTimeSeriesChartData(period);
    let productsProfit = 0;
    let repairsProfit = 0;
    let flexiProfit = 0;

    // To accurately separate products vs repairs vs flexi profits
    const now = Date.now();
    const startDate = new Date();
    if (period === "7d") startDate.setDate(startDate.getDate() - 6);
    else if (period === "30d") startDate.setDate(startDate.getDate() - 29);
    else startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [sales, repairs, flexiSummary] = await Promise.all([
      db.sales.where("date").between(startDate.getTime(), now, true, true).toArray(),
      db.repairs.where("deliveredAt").between(startDate.getTime(), now, true, true).toArray(),
      flexiRepo.summary(startDate.getTime(), now),
    ]);

    productsProfit = sales.reduce((s, x) => s + saleProfit(x), 0);
    repairsProfit = repairs.reduce((s, r) => s + repairProfit(r), 0);
    flexiProfit = flexiSummary.profit;

    return [
      { name: "products", value: Math.max(0, productsProfit), color: "#0d9488" }, // Teal
      { name: "repairs", value: Math.max(0, repairsProfit), color: "#0284c7" },  // Sky
      { name: "flexi", value: Math.max(0, flexiProfit), color: "#9333ea" },      // Purple
    ];
  },

  /** 6. Top 5 Categories & Top 5 Products */
  async getTopLists(limit = 5) {
    const since = Date.now() - 30 * 86400000;
    const [sales, categories, products] = await Promise.all([
      db.sales.where("date").above(since).toArray(),
      db.categories.toArray(),
      db.products.toArray(),
    ]);

    const catNameMap = new Map<number, string>(categories.map((c) => [c.id!, c.name]));
    const productCatMap = new Map<number, number | undefined>(products.map((p) => [p.id!, p.categoryId]));

    // Aggregate by product
    const productMap = new Map<number, { name: string; qty: number; revenue: number }>();
    const categoryMap = new Map<string, { name: string; revenue: number; qty: number }>();

    for (const s of sales) {
      for (const line of s.items) {
        // Product
        const pEntry = productMap.get(line.productId) ?? { name: line.name, qty: 0, revenue: 0 };
        pEntry.qty += line.qty;
        pEntry.revenue += line.qty * line.unitPrice;
        productMap.set(line.productId, pEntry);

        // Category
        const catId = productCatMap.get(line.productId);
        const catName = (catId && catNameMap.get(catId)) || "عام";
        const cEntry = categoryMap.get(catName) ?? { name: catName, revenue: 0, qty: 0 };
        cEntry.revenue += line.qty * line.unitPrice;
        cEntry.qty += line.qty;
        categoryMap.set(catName, cEntry);
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);

    const topCategories = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return { topProducts, topCategories };
  },

  /** 7. Alerts panel */
  async getAlerts(): Promise<AlertGroup[]> {
    const [products, customers, repairs, operators, recentSales] = await Promise.all([
      db.products.toArray(),
      db.customers.toArray(),
      db.repairs.toArray(),
      flexiRepo.listOperators(),
      db.sales.where("date").above(Date.now() - 60 * 86400000).toArray(),
    ]);

    const alerts: AlertGroup[] = [];

    // 1. Low stock
    const lowStock = products.filter((p) => p.stock <= p.minStock);
    if (lowStock.length > 0) {
      alerts.push({
        id: "low_stock",
        titleKey: "alertLowStock",
        count: lowStock.length,
        tone: lowStock.some((p) => p.stock <= 0) ? "danger" : "warning",
        link: "/products",
        sampleItems: lowStock.slice(0, 3).map((p) => `${p.name} (${p.stock}/${p.minStock})`),
      });
    }

    // 2. Overdue customer debts
    const debtCustomers = customers.filter((c) => c.balance > 0);
    if (debtCustomers.length > 0) {
      alerts.push({
        id: "overdue_debt",
        titleKey: "alertDebts",
        count: debtCustomers.length,
        tone: "danger",
        link: "/customers",
        sampleItems: debtCustomers.slice(0, 3).map((c) => `${c.name} (${c.balance} دج)`),
      });
    }

    // 3. Repairs past estimated date
    const lateRepairs = repairs.filter((r) => isLate(r));
    if (lateRepairs.length > 0) {
      alerts.push({
        id: "late_repair",
        titleKey: "alertLateRepairs",
        count: lateRepairs.length,
        tone: "danger",
        link: "/repairs",
        sampleItems: lateRepairs.slice(0, 3).map((r) => `${r.number} - ${r.device}`),
      });
    }

    // 4. Low flexi balance
    const lowFlexi = operators.filter((op) => op.balance <= op.lowBalanceAlert);
    if (lowFlexi.length > 0) {
      alerts.push({
        id: "low_flexi",
        titleKey: "alertLowFlexi",
        count: lowFlexi.length,
        tone: "warning",
        link: "/flexi",
        sampleItems: lowFlexi.map((op) => `${op.name} (${op.balance} دج)`),
      });
    }

    // 5. Products not sold in 60 days (dormant stock with quantity > 0)
    const soldProductIds = new Set<number>();
    for (const s of recentSales) {
      for (const line of s.items) soldProductIds.add(line.productId);
    }
    const dormantProducts = products.filter((p) => p.stock > 0 && p.id && !soldProductIds.has(p.id));
    if (dormantProducts.length > 0) {
      alerts.push({
        id: "dormant_stock",
        titleKey: "alertDormantStock",
        count: dormantProducts.length,
        tone: "info",
        link: "/products",
        sampleItems: dormantProducts.slice(0, 3).map((p) => `${p.name} (${p.stock})`),
      });
    }

    return alerts;
  },

  /** 8. Recent 8 operations */
  async getRecentActivity(limit = 8): Promise<ActivityItem[]> {
    const [sales, payments, repairs, flexiSales] = await Promise.all([
      db.sales.orderBy("date").reverse().limit(limit).toArray(),
      db.customerPayments.orderBy("date").reverse().limit(limit).toArray(),
      db.repairs.orderBy("createdAt").reverse().limit(limit).toArray(),
      db.flexiSales.orderBy("date").reverse().limit(limit).toArray(),
    ]);

    const items: ActivityItem[] = [];

    for (const s of sales) {
      items.push({
        id: `sale-${s.id}`,
        type: "sale",
        title: s.customerName ? `فاتورة بيع · ${s.customerName}` : "فاتورة بيع نقدي",
        subtitle: `${s.items.length} منتجات`,
        amount: s.total,
        date: s.date,
        link: "/pos",
      });
    }

    for (const p of payments) {
      const c = p.customerId ? await db.customers.get(p.customerId) : null;
      items.push({
        id: `payment-${p.id}`,
        type: "payment",
        title: "تسديد دفعة دين",
        subtitle: c ? c.name : "زبون",
        amount: p.amount,
        date: p.date,
        link: "/customers",
      });
    }

    for (const r of repairs) {
      items.push({
        id: `repair-${r.id}`,
        type: "repair",
        title: `صيانة ${r.number}`,
        subtitle: `${r.device} · ${r.customerName}`,
        amount: r.price,
        date: r.createdAt,
        link: `/repairs/${r.id}`,
      });
    }

    for (const fs of flexiSales) {
      items.push({
        id: `flexi-${fs.id}`,
        type: "flexi",
        title: `فليكسي ${fs.operatorName}`,
        subtitle: fs.phoneNumber || "شحن مباشر",
        amount: fs.salePrice,
        date: fs.date,
        link: "/flexi",
      });
    }

    // Sort by date desc and slice
    items.sort((a, b) => b.date - a.date);
    return items.slice(0, limit);
  },

  /** 9. Close of the day summary */
  async getDayCloseSummary(): Promise<DayCloseData> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startMs = todayStart.getTime();
    const now = Date.now();

    const [todaySales, todayPayments, todayRepairs, todayFlexi, todayExpenses, todayReturns] =
      await Promise.all([
        db.sales.where("date").between(startMs, now, true, true).toArray(),
        db.customerPayments.where("date").between(startMs, now, true, true).toArray(),
        db.repairs.where("deliveredAt").between(startMs, now, true, true).toArray(),
        flexiRepo.summary(startMs, now),
        db.expenses.where("date").between(startMs, now, true, true).toArray(),
        returnsRepo.summary(startMs, now),
      ]);

    const cashSales = todaySales.reduce((s, x) => s + x.paid, 0);
    const cashDebtPayments = todayPayments.reduce((s, p) => s + p.amount, 0);
    const cashRepairs = todayRepairs.reduce((s, r) => s + r.paidOnDelivery, 0);
    const cashFlexi = todayFlexi.sales.reduce((s, x) => s + x.paidAmount, 0);

    const totalCashIn = cashSales + cashDebtPayments + cashRepairs + cashFlexi;
    const expenses = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const refunds = todayReturns.totalRefund;
    const netCashInDrawer = totalCashIn - expenses - refunds;

    const saleProf = todaySales.reduce((s, x) => s + saleProfit(x), 0);
    const repairProf = todayRepairs.reduce((s, r) => s + repairProfit(r), 0);
    const flexiProf = todayFlexi.profit;
    const totalGrossProfit = saleProf + repairProf + flexiProf;
    const netProfit = totalGrossProfit - expenses;

    return {
      date: now,
      cashSales,
      cashDebtPayments,
      cashRepairs,
      cashFlexi,
      totalCashIn,
      expenses,
      refunds,
      netCashInDrawer,
      totalGrossProfit,
      netProfit,
      salesCount: todaySales.length,
      repairsDeliveredCount: todayRepairs.length,
      flexiCount: todayFlexi.count,
      returnsCount: todayReturns.count,
    };
  },
};
