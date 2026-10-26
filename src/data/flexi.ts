import { db } from "./db";
import type { FlexiOperator, FlexiPaymentMode, FlexiRecharge, FlexiSale } from "./types";

const now = () => Date.now();

// Default operators seeded on first use
export const DEFAULT_OPERATORS: Omit<FlexiOperator, "id">[] = [
  { name: "Mobilis", color: "#16a34a", balance: 0, lowBalanceAlert: 500, marginPct: 2 },
  { name: "Djezzy", color: "#dc2626", balance: 0, lowBalanceAlert: 500, marginPct: 2 },
  { name: "Ooredoo", color: "#7c3aed", balance: 0, lowBalanceAlert: 500, marginPct: 2 },
];

export const flexiRepo = {
  // ── Operators ──
  async listOperators(): Promise<FlexiOperator[]> {
    const list = await db.flexiOperators.toArray();
    if (list.length === 0) {
      // Fire-and-forget seeding on next tick outside of liveQuery's read transaction
      setTimeout(() => {
        flexiRepo.initDefaultOperators().catch((err) =>
          console.error("Failed to seed default flexi operators:", err)
        );
      }, 0);
    }
    return list;
  },

  async initDefaultOperators(): Promise<void> {
    const count = await db.flexiOperators.count();
    if (count === 0) {
      await db.flexiOperators.bulkAdd(DEFAULT_OPERATORS);
    }
  },
  getOperator: (id: number) => db.flexiOperators.get(id),
  saveOperator: (o: FlexiOperator) => (o.id ? db.flexiOperators.put(o) : db.flexiOperators.add(o)),
  removeOperator: (id: number) => db.flexiOperators.delete(id),

  // ── Recharges (loading credit from supplier) ──
  async addRecharge(operatorId: number, loaded: number, cost: number, note: string): Promise<void> {
    await db.transaction("rw", [db.flexiOperators, db.flexiRecharges], async () => {
      const op = await db.flexiOperators.get(operatorId);
      if (!op) return;
      await db.flexiOperators.update(operatorId, { balance: op.balance + loaded });
      await db.flexiRecharges.add({ operatorId, date: now(), loaded, cost, note });
    });
  },
  listRecharges: (from?: number, to?: number) =>
    from !== undefined && to !== undefined
      ? db.flexiRecharges.where("date").between(from, to, true, true).reverse().sortBy("date")
      : db.flexiRecharges.orderBy("date").reverse().toArray(),

  // ── Sales ──
  async sell(
    operatorId: number,
    phoneNumber: string,
    amount: number,
    salePrice: number,
    mode: FlexiPaymentMode,
    paidAmount: number,
    customerId?: number,
    customerName?: string,
  ): Promise<FlexiSale> {
    let sale!: FlexiSale;
    await db.transaction("rw", [db.flexiOperators, db.flexiSales, db.customers], async () => {
      const op = await db.flexiOperators.get(operatorId);
      if (!op) throw new Error("Operator not found");
      const paid = mode === "paid" ? salePrice : mode === "credit" ? 0 : Math.min(Math.max(0, paidAmount), salePrice);
      const remaining = salePrice - paid;
      if (remaining > 0 && !customerId) throw new Error("customer required");
      if (customerId && remaining > 0) {
        const c = await db.customers.get(customerId);
        if (c) await db.customers.update(customerId, { balance: c.balance + remaining });
      }
      await db.flexiOperators.update(operatorId, { balance: Math.max(0, op.balance - amount) });
      sale = {
        operatorId, operatorName: op.name, date: now(), phoneNumber, amount,
        salePrice, profit: salePrice - amount, paymentMode: mode,
        paidAmount: paid, remaining, customerId, customerName,
      };
      sale.id = await db.flexiSales.add(sale);
    });
    return sale;
  },
  listSales: (from?: number, to?: number) =>
    from !== undefined && to !== undefined
      ? db.flexiSales.where("date").between(from, to, true, true).reverse().sortBy("date")
      : db.flexiSales.orderBy("date").reverse().toArray(),

  async summary(from: number, to: number) {
    const sales = await db.flexiSales.where("date").between(from, to, true, true).toArray();
    const recharges = await db.flexiRecharges.where("date").between(from, to, true, true).toArray();
    const revenue = sales.reduce((s, x) => s + x.salePrice, 0);
    const profit = sales.reduce((s, x) => s + x.profit, 0);
    const rechargeCost = recharges.reduce((s, x) => s + x.cost, 0);
    return { sales, recharges, revenue, profit, rechargeCost, count: sales.length };
  },

  async todaySummary() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return flexiRepo.summary(start.getTime(), Date.now());
  },
};
