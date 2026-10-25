import Dexie, { type Table } from "dexie";
import type {
  Category, Customer, CustomerPayment, Expense, Movement, Product, Purchase, RepairTicket, Sale, Settings, Supplier,
} from "./types";

// Internal to the data layer. UI code must never import this file.
class PosDB extends Dexie {
  products!: Table<Product, number>;
  categories!: Table<Category, number>;
  customers!: Table<Customer, number>;
  customerPayments!: Table<CustomerPayment, number>;
  sales!: Table<Sale, number>;
  suppliers!: Table<Supplier, number>;
  purchases!: Table<Purchase, number>;
  movements!: Table<Movement, number>;
  expenses!: Table<Expense, number>;
  settings!: Table<Settings, string>;
  repairs!: Table<RepairTicket, number>;

  constructor() {
    super("phone-shop-pos");
    this.version(1).stores({
      products: "++id,name,barcode,categoryId,stock",
      categories: "++id,name",
      customers: "++id,name,phone",
      customerPayments: "++id,customerId,date",
      sales: "++id,date,customerId",
      suppliers: "++id,name",
      purchases: "++id,date,supplierId",
      movements: "++id,date,productId,type",
      expenses: "++id,date",
      settings: "key",
    });
    this.version(2).stores({ repairs: "++id,number,createdAt,status,phone,deliveredAt" });
  }
}

export const db = new PosDB();
export const ALL_TABLES = [
  "products", "categories", "customers", "customerPayments", "sales",
  "suppliers", "purchases", "movements", "expenses", "settings", "repairs",
] as const;
