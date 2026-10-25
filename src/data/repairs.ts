import { db } from "./db";
import { formatTicketNumber, repairDue, repairProfit } from "./repair-calc";
import type { RepairStatus, RepairTicket } from "./types";

const now = () => Date.now();

export type NewRepair = Pick<RepairTicket,
  "customerName" | "phone" | "device" | "imei" | "problem" | "condition" | "lockCode" | "price" | "laborCost" | "deposit" | "readyDate">;

export type DeliveryMode = "paid" | "partial" | "credit";

export const repairsRepo = {
  list: () => db.repairs.orderBy("createdAt").reverse().toArray(),
  get: (id: number) => db.repairs.get(id),
  async create(input: NewRepair): Promise<RepairTicket> {
    let ticket!: RepairTicket;
    await db.transaction("rw", db.repairs, async () => {
      const last = await db.repairs.orderBy("id").last();
      const t = now();
      ticket = {
        ...input, number: formatTicketNumber((last?.id ?? 0) + 1), createdAt: t, status: "received",
        history: [{ status: "received", date: t }], parts: [], paidOnDelivery: 0, remaining: repairDue(input),
      };
      ticket.id = await db.repairs.add(ticket);
    });
    return ticket;
  },
  async update(id: number, patch: Partial<NewRepair>) {
    const r = await db.repairs.get(id);
    if (!r) return;
    const next = { ...r, ...patch };
    await db.repairs.update(id, { ...patch, remaining: r.status === "delivered" ? r.remaining : repairDue(next) });
  },
  async setStatus(id: number, status: RepairStatus) {
    const r = await db.repairs.get(id);
    if (!r || r.status === status) return;
    await db.repairs.update(id, { status, history: [...r.history, { status, date: now() }] });
  },
  async addPart(id: number, productId: number, qty: number) {
    await db.transaction("rw", [db.repairs, db.products, db.movements], async () => {
      const r = await db.repairs.get(id); const p = await db.products.get(productId);
      if (!r || !p || qty <= 0) return;
      await db.products.update(productId, { stock: p.stock - qty });
      await db.movements.add({ date: now(), productId, productName: p.name, type: "repair", qty: -qty, note: r.number });
      await db.repairs.update(id, { parts: [...r.parts, { productId, name: p.name, qty, unitCost: p.purchasePrice }] });
    });
  },
  async removePart(id: number, index: number) {
    await db.transaction("rw", [db.repairs, db.products, db.movements], async () => {
      const r = await db.repairs.get(id);
      const part = r?.parts[index];
      if (!r || !part) return;
      const p = await db.products.get(part.productId);
      if (p) await db.products.update(part.productId, { stock: p.stock + part.qty });
      await db.movements.add({ date: now(), productId: part.productId, productName: part.name, type: "repair", qty: part.qty, note: `${r.number} ↩` });
      await db.repairs.update(id, { parts: r.parts.filter((_, i) => i !== index) });
    });
  },
  /** Deliver the device: records the final payment; unpaid remainder goes to the customer's debt. */
  async deliver(id: number, mode: DeliveryMode, amount: number, customerId?: number) {
    await db.transaction("rw", [db.repairs, db.customers], async () => {
      const r = await db.repairs.get(id);
      if (!r) return;
      const due = repairDue(r);
      const paid = mode === "paid" ? due : mode === "credit" ? 0 : Math.min(Math.max(0, amount), due);
      const remaining = due - paid;
      const customer = customerId ? await db.customers.get(customerId) : undefined;
      if (remaining > 0 && !customer) throw new Error("customer required");
      if (customer && remaining > 0) await db.customers.update(customer.id!, { balance: customer.balance + remaining });
      const t = now();
      await db.repairs.update(id, {
        status: "delivered", paidOnDelivery: paid, remaining, deliveredAt: t, customerId: customer?.id,
        history: [...r.history, { status: "delivered", date: t }],
      });
    });
  },
  async remove(id: number) { await db.repairs.delete(id); },
  /** Delivered repairs in a period: income = final price, profit = price − parts − labor. */
  async summary(from: number, to: number) {
    const list = await db.repairs.where("deliveredAt").between(from, to, true, true).toArray();
    return {
      list,
      income: list.reduce((s, r) => s + r.price, 0),
      profit: list.reduce((s, r) => s + repairProfit(r), 0),
    };
  },
  async openCount() {
    return db.repairs.where("status").anyOf("received", "in_repair", "ready").count();
  },
};
