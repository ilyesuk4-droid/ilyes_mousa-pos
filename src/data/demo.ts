import { db } from "./db";
import { formatTicketNumber } from "./repair-calc";

const DEMO_STORAGE_KEY = "pos_demo_record_ids";

interface DemoIds {
  categoryIds: number[];
  productIds: number[];
  customerIds: number[];
  supplierIds: number[];
  purchaseIds: number[];
  saleIds: number[];
  movementIds: number[];
  repairIds: number[];
  rechargeIds: number[];
}

export const demoRepo = {
  hasDemoData(): boolean {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return false;
    try {
      const data: DemoIds = JSON.parse(raw);
      return (data.productIds?.length ?? 0) > 0 || (data.customerIds?.length ?? 0) > 0;
    } catch {
      return false;
    }
  },

  async loadDemoData(): Promise<void> {
    if (typeof window === "undefined") return;

    // First clear any previous demo data if exists
    if (demoRepo.hasDemoData()) {
      await demoRepo.clearDemoData();
    }

    const now = Date.now();
    const demoIds: DemoIds = {
      categoryIds: [],
      productIds: [],
      customerIds: [],
      supplierIds: [],
      purchaseIds: [],
      saleIds: [],
      movementIds: [],
      repairIds: [],
      rechargeIds: [],
    };

    // 1. Categories
    const catPhonesId = (await db.categories.add({ name: "هواتف ذكية" })) as number;
    const catAccId = (await db.categories.add({ name: "إكسسوارات" })) as number;
    const catChgId = (await db.categories.add({ name: "شواحن وكوابل" })) as number;
    const catProtId = (await db.categories.add({ name: "شاشات وحماية" })) as number;
    demoIds.categoryIds.push(catPhonesId, catAccId, catChgId, catProtId);

    // 2. Products
    const productsData = [
      {
        name: "Samsung Galaxy A15 128GB",
        barcode: "8806091234567",
        categoryId: catPhonesId,
        brand: "Samsung",
        purchasePrice: 23000,
        retailPrice: 26500,
        wholesalePrice: 25000,
        stock: 6,
        minStock: 2,
        notes: "Dual SIM, 4GB RAM",
        createdAt: now - 86400000 * 5,
      },
      {
        name: "Xiaomi Redmi Note 13 8/256",
        barcode: "6941812754321",
        categoryId: catPhonesId,
        brand: "Xiaomi",
        purchasePrice: 28000,
        retailPrice: 32000,
        wholesalePrice: 30000,
        stock: 4,
        minStock: 2,
        notes: "AMOLED 120Hz",
        createdAt: now - 86400000 * 4,
      },
      {
        name: "iPhone 13 128GB Midnight",
        barcode: "1942526987654",
        categoryId: catPhonesId,
        brand: "Apple",
        purchasePrice: 85000,
        retailPrice: 94000,
        wholesalePrice: 90000,
        stock: 2,
        minStock: 1,
        notes: "Batterie 100%, Neuf sous blister",
        createdAt: now - 86400000 * 3,
      },
      {
        name: "Chargeur Type-C 25W Fast Original",
        barcode: "6932101234567",
        categoryId: catChgId,
        brand: "Samsung",
        purchasePrice: 1200,
        retailPrice: 2200,
        wholesalePrice: 1700,
        stock: 15,
        minStock: 5,
        notes: "Super Fast Charging",
        createdAt: now - 86400000 * 5,
      },
      {
        name: "Écouteurs Bluetooth Redmi Buds 4",
        barcode: "6934177712345",
        categoryId: catAccId,
        brand: "Xiaomi",
        purchasePrice: 2200,
        retailPrice: 3400,
        wholesalePrice: 2800,
        stock: 8,
        minStock: 3,
        notes: "Autonomie 30h",
        createdAt: now - 86400000 * 4,
      },
      {
        name: "Pochette Antichoc Silicone MagSafe",
        barcode: "6901443123456",
        categoryId: catAccId,
        brand: "Generic",
        purchasePrice: 350,
        retailPrice: 900,
        wholesalePrice: 600,
        stock: 25,
        minStock: 5,
        notes: "Pour iPhone 13 / 14 / 15",
        createdAt: now - 86400000 * 4,
      },
      {
        name: "Verre Trempé 9D Privacy",
        barcode: "6901443654321",
        categoryId: catProtId,
        brand: "Generic",
        purchasePrice: 180,
        retailPrice: 500,
        wholesalePrice: 300,
        stock: 30,
        minStock: 5,
        notes: "Anti-espion haute résistance",
        createdAt: now - 86400000 * 4,
      },
    ];

    for (const p of productsData) {
      const pid = (await db.products.add(p)) as number;
      demoIds.productIds.push(pid);
      const mid = (await db.movements.add({
        date: now - 86400000 * 3,
        productId: pid,
        productName: p.name,
        type: "purchase",
        qty: p.stock,
        note: "رصيد أولي تجريبي",
      })) as number;
      demoIds.movementIds.push(mid);
    }

    // 3. Customers
    const customersData = [
      { name: "أمين بن علي", phone: "0550112233", balance: 4500, createdAt: now - 86400000 * 10 },
      { name: "كريم مراد", phone: "0661445566", balance: 0, createdAt: now - 86400000 * 8 },
      { name: "سفيان الجزائري", phone: "0770889900", balance: 14000, createdAt: now - 86400000 * 6 },
    ];
    for (const c of customersData) {
      const cid = (await db.customers.add(c)) as number;
      demoIds.customerIds.push(cid);
    }

    // 4. Supplier
    const supId = (await db.suppliers.add({
      name: "مورّد الجزائر للتوزيع (Grossiste Alger)",
      phone: "0555001122",
    })) as number;
    demoIds.supplierIds.push(supId);

    // 5. Sample Sales
    const sale1 = {
      date: now - 86400000,
      items: [
        {
          productId: demoIds.productIds[3]!,
          name: "Chargeur Type-C 25W Fast Original",
          qty: 1,
          unitPrice: 2200,
          purchasePrice: 1200,
          priceType: "retail" as const,
        },
        {
          productId: demoIds.productIds[6]!,
          name: "Verre Trempé 9D Privacy",
          qty: 1,
          unitPrice: 500,
          purchasePrice: 180,
          priceType: "retail" as const,
        },
      ],
      subtotal: 2700,
      discount: 200,
      total: 2500,
      paid: 2500,
      remaining: 0,
      status: "paid" as const,
      customerId: demoIds.customerIds[1]!,
      customerName: "كريم مراد",
    };
    const s1Id = (await db.sales.add(sale1)) as number;
    demoIds.saleIds.push(s1Id);

    const sale2 = {
      date: now - 3600000 * 4,
      items: [
        {
          productId: demoIds.productIds[4]!,
          name: "Écouteurs Bluetooth Redmi Buds 4",
          qty: 1,
          unitPrice: 3400,
          purchasePrice: 2200,
          priceType: "retail" as const,
        },
      ],
      subtotal: 3400,
      discount: 0,
      total: 3400,
      paid: 2000,
      remaining: 1400,
      status: "partial" as const,
      customerId: demoIds.customerIds[0]!,
      customerName: "أمين بن علي",
    };
    const s2Id = (await db.sales.add(sale2)) as number;
    demoIds.saleIds.push(s2Id);

    // 6. Repair Tickets
    const lastRepair = await db.repairs.orderBy("id").last();
    const nextRNum1 = (lastRepair?.id ?? 0) + 1;
    const r1 = {
      number: formatTicketNumber(nextRNum1),
      createdAt: now - 86400000 * 2,
      customerName: "أمين بن علي",
      phone: "0550112233",
      device: "iPhone 11 64GB Black",
      imei: "354890123456789",
      problem: "شاشة مكسورة + لمس لا يستجيب",
      condition: "خدوش طفيفة على الهيكل، بدون شاحن",
      lockCode: "123456",
      price: 6500,
      laborCost: 1500,
      deposit: 2000,
      readyDate: now + 86400000,
      status: "in_repair" as const,
      history: [
        { status: "received" as const, date: now - 86400000 * 2 },
        { status: "in_repair" as const, date: now - 86400000 },
      ],
      parts: [
        {
          productId: demoIds.productIds[6]!,
          name: "Écran iPhone 11 Original",
          qty: 1,
          unitCost: 3500,
        },
      ],
      paidOnDelivery: 0,
      remaining: 4500,
      customerId: demoIds.customerIds[0]!,
    };
    const r1Id = (await db.repairs.add(r1)) as number;
    demoIds.repairIds.push(r1Id);

    const r2 = {
      number: formatTicketNumber(nextRNum1 + 1),
      createdAt: now - 86400000,
      customerName: "كريم مراد",
      phone: "0661445566",
      device: "Samsung Galaxy A52",
      imei: "356789012345678",
      problem: "مشكل في الشحن (Connecteur de charge)",
      condition: "حالة جيدة",
      lockCode: "نمط على شكل حرف Z",
      price: 2500,
      laborCost: 1000,
      deposit: 2500,
      readyDate: now + 3600000 * 2,
      status: "ready" as const,
      history: [
        { status: "received" as const, date: now - 86400000 },
        { status: "in_repair" as const, date: now - 3600000 * 5 },
        { status: "ready" as const, date: now - 3600000 },
      ],
      parts: [
        {
          productId: demoIds.productIds[3]!,
          name: "Nappe de charge A52",
          qty: 1,
          unitCost: 800,
        },
      ],
      paidOnDelivery: 0,
      remaining: 0,
      customerId: demoIds.customerIds[1]!,
    };
    const r2Id = (await db.repairs.add(r2)) as number;
    demoIds.repairIds.push(r2Id);

    // 7. Flexi Balances
    const operators = await db.flexiOperators.toArray();
    for (const op of operators) {
      if (op.name === "Mobilis") await db.flexiOperators.update(op.id!, { balance: 15000 });
      if (op.name === "Djezzy") await db.flexiOperators.update(op.id!, { balance: 12000 });
      if (op.name === "Ooredoo") await db.flexiOperators.update(op.id!, { balance: 8000 });
      const recId = (await db.flexiRecharges.add({
        operatorId: op.id!,
        date: now - 86400000,
        loaded: 10000,
        cost: 9800,
        note: "شحن رصيد تجريبي",
      })) as number;
      demoIds.rechargeIds.push(recId);
    }

    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoIds));
  },

  async clearDemoData(): Promise<void> {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return;

    try {
      const demoIds: DemoIds = JSON.parse(raw);

      await db.transaction(
        "rw",
        [
          db.products,
          db.categories,
          db.customers,
          db.suppliers,
          db.purchases,
          db.sales,
          db.movements,
          db.repairs,
          db.flexiRecharges,
        ],
        async () => {
          if (demoIds.productIds?.length) await db.products.bulkDelete(demoIds.productIds);
          if (demoIds.categoryIds?.length) await db.categories.bulkDelete(demoIds.categoryIds);
          if (demoIds.customerIds?.length) await db.customers.bulkDelete(demoIds.customerIds);
          if (demoIds.supplierIds?.length) await db.suppliers.bulkDelete(demoIds.supplierIds);
          if (demoIds.purchaseIds?.length) await db.purchases.bulkDelete(demoIds.purchaseIds);
          if (demoIds.saleIds?.length) await db.sales.bulkDelete(demoIds.saleIds);
          if (demoIds.movementIds?.length) await db.movements.bulkDelete(demoIds.movementIds);
          if (demoIds.repairIds?.length) await db.repairs.bulkDelete(demoIds.repairIds);
          if (demoIds.rechargeIds?.length) await db.flexiRecharges.bulkDelete(demoIds.rechargeIds);
        }
      );
    } finally {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
  },
};
