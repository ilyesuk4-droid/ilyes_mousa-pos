import { describe, expect, it } from "vitest";
import { formatTicketNumber, isLate, repairDue, repairProfit, whatsappNumber } from "@/data/repair-calc";

describe("repair rules", () => {
  it("profit = final price − parts cost − labor cost", () => {
    expect(repairProfit({ price: 5000, laborCost: 500, parts: [{ productId: 1, name: "screen", qty: 1, unitCost: 2500 }] })).toBe(2000);
  });
  it("amount due at delivery subtracts the deposit", () => {
    expect(repairDue({ price: 5000, deposit: 1000 })).toBe(4000);
  });
  it("ticket numbers look like R-0001", () => {
    expect(formatTicketNumber(1)).toBe("R-0001");
  });
  it("a ticket in repair past its ready date is late, a delivered one is not", () => {
    expect(isLate({ readyDate: 1000, status: "in_repair" }, 2000)).toBe(true);
    expect(isLate({ readyDate: 1000, status: "delivered" }, 2000)).toBe(false);
  });
  it("Algerian local phone converts for WhatsApp", () => {
    expect(whatsappNumber("0555 12 34 56")).toBe("213555123456");
  });
});
