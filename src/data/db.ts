import Dexie, { type Table } from "dexie";
import type {
  Category, Customer, CustomerPayment, Expense, Movement, Product, Purchase, Sale, Settings, Supplier,
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
  }
}

export const db = new PosDB();
export const ALL_TABLES = [
  "products", "categories", "customers", "customerPayments", "sales",
  "suppliers", "purchases", "movements", "expenses", "settings",
] as const;
