import { db } from "./db";
import type { SaleReturn } from "./types";

export const returnsRepo = {
  list: (from?: number, to?: number) =>
    from !== undefined && to !== undefined
      ? db.returns.where("date").between(from, to, true, true).reverse().sortBy("date")
      : db.returns.orderBy("date").reverse().toArray(),

  get: (id: number) => db.returns.get(id),

  async create(data: Omit<SaleReturn, "id">): Promise<SaleReturn> {
    let result!: SaleReturn;
    await db.transaction("rw", [db.returns, db.products, db.movements, db.customers], async () => {
      // 1. Process returned items: increase stock and log movement
      for (const item of data.items) {
        if (item.productId !== -1) {
          const p = await db.products.get(item.productId);
          if (p) {
            await db.products.update(item.productId, { stock: p.stock + item.qty });
            await db.movements.add({
              date: data.date,
              productId: item.productId,
              productName: item.name,
              type: "return",
              qty: item.qty,
              note: `إرجاع: ${item.reason}${data.saleId ? ` (فاتورة #${data.saleId})` : ""}`,
            });
          }
        }
      }

      // 2. Process exchange items: decrease stock and log movement
      if (data.action === "exchange" && data.exchangeItems?.length) {
        for (const ex of data.exchangeItems) {
          if (ex.productId !== -1) {
            const p = await db.products.get(ex.productId);
            if (p) {
              await db.products.update(ex.productId, { stock: p.stock - ex.qty });
              await db.movements.add({
                date: data.date,
                productId: ex.productId,
                productName: ex.name,
                type: "sale",
                qty: -ex.qty,
                note: `تبديل بمنتج مسترجع (${data.items.map((x) => x.name).join("، ")})`,
              });
            }
          }
        }
      }

      // 3. Process customer balance adjustments
      if (data.customerId) {
        const c = await db.customers.get(data.customerId);
        if (c) {
          if (data.action === "deduct_debt") {
            // Deduct the return value from customer's debt balance
            await db.customers.update(data.customerId, {
              balance: Math.max(0, c.balance - data.totalRefund),
            });
          } else if (data.action === "exchange" && data.netDiff && data.netDiff > 0) {
            // If new item costs more and customer owes on credit
            // Can be added to debt if opted
          }
        }
      }

      const id = (await db.returns.add(data)) as number;
      result = { ...data, id };
    });
    return result;
  },

  async summary(from: number, to: number) {
    const list = await db.returns.where("date").between(from, to, true, true).toArray();
    const totalRefund = list.reduce((s, r) => s + r.totalRefund, 0);
    const count = list.length;
    return { list, totalRefund, count };
  },

  async todaySummary() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return returnsRepo.summary(start.getTime(), Date.now());
  },
};
