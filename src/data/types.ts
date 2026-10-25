export interface Product {
  id?: number | undefined;
  name: string;
  barcode: string;
  categoryId?: number | undefined;
  brand: string;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  notes: string;
  image?: string | undefined;
  createdAt: number;
}
export interface Category { id?: number | undefined; name: string }
export interface Customer { id?: number | undefined; name: string; phone: string; balance: number; createdAt: number }
export interface CustomerPayment { id?: number | undefined; customerId: number; amount: number; date: number; note: string }
export type PriceType = "retail" | "wholesale";
export interface SaleLine {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  purchasePrice: number;
  priceType: PriceType;
}
export type PaymentStatus = "paid" | "partial" | "credit";
export interface Sale {
  id?: number | undefined;
  date: number;
  items: SaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
  customerId?: number | undefined;
  customerName?: string | undefined;
}
export interface Supplier { id?: number | undefined; name: string; phone: string }
export interface PurchaseLine { productId: number; name: string; qty: number; purchasePrice: number }
export interface Purchase { id?: number | undefined; date: number; supplierId?: number | undefined; supplierName?: string | undefined; items: PurchaseLine[]; total: number }
export type MovementType = "sale" | "purchase" | "adjust";
export interface Movement { id?: number | undefined; date: number; productId: number; productName: string; type: MovementType; qty: number; note: string }
export interface Expense { id?: number | undefined; date: number; category: string; amount: number; note: string }
export interface Settings {
  key: "main";
  shopName: string;
  logo?: string | undefined;
  phone: string;
  address: string;
  receiptFooter: string;
  paperWidth: 58 | 80;
  language: "ar" | "fr";
  lastBackup?: number | undefined;
}
