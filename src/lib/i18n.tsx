import { createContext, useContext, useEffect, type ReactNode } from "react";
import { settingsRepo, useData } from "@/data";

const ar = {
  appName: "نقطة البيع", dashboard: "لوحة التحكم", pos: "البيع", products: "المنتجات", categories: "الأصناف",
  customers: "الزبائن والكريدي", purchases: "المشتريات", movements: "حركة المخزون", reports: "التقارير",
  expenses: "المصاريف", labels: "ملصقات الباركود", settings: "الإعدادات", backup: "النسخ الاحتياطي",
  todaySales: "مبيعات اليوم", todayProfit: "ربح اليوم", stockValue: "قيمة المخزون", lowStock: "مخزون منخفض",
  totalDebts: "ديون الزبائن", bestSellers: "الأكثر مبيعاً (30 يوم)", none: "لا يوجد", qty: "الكمية",
  name: "الاسم", barcode: "الباركود", category: "الصنف", brand: "العلامة", purchasePrice: "سعر الشراء",
  retailPrice: "سعر التجزئة", wholesalePrice: "سعر الجملة", stock: "المخزون", minStock: "حد التنبيه",
  notes: "ملاحظات / IMEI", image: "الصورة", add: "إضافة", edit: "تعديل", delete: "حذف", save: "حفظ",
  cancel: "إلغاء", search: "بحث…", all: "الكل", import: "استيراد CSV/Excel", actions: "إجراءات",
  confirmDelete: "هل أنت متأكد من الحذف؟", adjust: "تعديل المخزون", newStock: "الكمية الجديدة",
  scanHint: "امسح الباركود أو اكتب اسم المنتج (F2)", cart: "السلة", emptyCart: "السلة فارغة",
  price: "السعر", retail: "تجزئة", wholesale: "جملة", subtotal: "المجموع الفرعي", discount: "تخفيض",
  total: "الإجمالي", paid: "المدفوع", remaining: "الباقي", fullyPaid: "مدفوع كلياً", partial: "دفع جزئي",
  credit: "كريدي", customer: "الزبون", selectCustomer: "اختر زبوناً", newCustomer: "زبون جديد",
  checkout: "تأكيد البيع (F9)", notFound: "المنتج غير موجود", needCustomer: "يجب اختيار زبون",
  saleDone: "تمت عملية البيع", phone: "الهاتف", balance: "الدين", recordPayment: "تسجيل دفعة",
  amount: "المبلغ", note: "ملاحظة", payments: "الدفعات", debts: "الديون", printStatement: "طباعة كشف الحساب",
  date: "التاريخ", items: "المواد", supplier: "المورد", suppliers: "الموردون", newPurchase: "شراء جديد",
  history: "السجل", addLine: "أضف منتجاً", savePurchase: "حفظ الشراء", type: "النوع", sale: "بيع",
  purchase: "شراء", from: "من", to: "إلى", revenue: "المبيعات", profit: "الربح", netProfit: "صافي الربح",
  collected: "المحصّل", salesCount: "عدد الفواتير", generateMissing: "توليد باركود للمنتجات بدونه",
  copies: "النسخ", print: "طباعة", shopName: "اسم المحل", logo: "الشعار", address: "العنوان",
  receiptFooter: "رسالة أسفل الوصل", paperWidth: "عرض الورق", language: "اللغة", saved: "تم الحفظ",
  exportData: "تصدير كل البيانات", importData: "استيراد نسخة", lastBackup: "آخر نسخة",
  never: "أبداً", backupReminder: "لم تقم بنسخ احتياطي منذ أكثر من أسبوع.", backupNow: "انسخ الآن",
  importWarn: "سيتم استبدال كل البيانات الحالية. متابعة؟", imported: "تم الاستيراد", receipt: "وصل",
  thanks: "", selectAll: "تحديد الكل", noProducts: "لا توجد منتجات", stockShort: "مخزون غير كافٍ",
  rent: "إيجار", electricity: "كهرباء", water: "ماء", salaries: "رواتب", internet: "إنترنت", other: "أخرى",
  productsCount: "عدد المنتجات", printReceipt: "طباعة الوصل", lowOnly: "المنخفض فقط", statement: "كشف حساب",
  backupHelp: "احفظ ملف النسخة على فلاشة أو في مكان آمن أسبوعياً.", importHelp: "الأعمدة: name, barcode, category, brand, purchase, retail, wholesale, stock, min",
};
type Dict = typeof ar;
const fr: Dict = {
  appName: "Caisse", dashboard: "Tableau de bord", pos: "Vente", products: "Produits", categories: "Catégories",
  customers: "Clients & crédit", purchases: "Achats", movements: "Mouvements de stock", reports: "Rapports",
  expenses: "Dépenses", labels: "Étiquettes code-barres", settings: "Paramètres", backup: "Sauvegarde",
  todaySales: "Ventes du jour", todayProfit: "Bénéfice du jour", stockValue: "Valeur du stock", lowStock: "Stock faible",
  totalDebts: "Dettes clients", bestSellers: "Meilleures ventes (30 j)", none: "Aucun", qty: "Qté",
  name: "Nom", barcode: "Code-barres", category: "Catégorie", brand: "Marque", purchasePrice: "Prix d'achat",
  retailPrice: "Prix détail", wholesalePrice: "Prix gros", stock: "Stock", minStock: "Seuil d'alerte",
  notes: "Notes / IMEI", image: "Image", add: "Ajouter", edit: "Modifier", delete: "Supprimer", save: "Enregistrer",
  cancel: "Annuler", search: "Rechercher…", all: "Tous", import: "Importer CSV/Excel", actions: "Actions",
  confirmDelete: "Confirmer la suppression ?", adjust: "Ajuster le stock", newStock: "Nouvelle quantité",
  scanHint: "Scannez le code-barres ou tapez le nom (F2)", cart: "Panier", emptyCart: "Panier vide",
  price: "Prix", retail: "Détail", wholesale: "Gros", subtotal: "Sous-total", discount: "Remise",
  total: "Total", paid: "Payé", remaining: "Reste", fullyPaid: "Payé", partial: "Partiel",
  credit: "Crédit", customer: "Client", selectCustomer: "Choisir un client", newCustomer: "Nouveau client",
  checkout: "Valider la vente (F9)", notFound: "Produit introuvable", needCustomer: "Choisissez un client",
  saleDone: "Vente enregistrée", phone: "Téléphone", balance: "Dette", recordPayment: "Enregistrer un paiement",
  amount: "Montant", note: "Note", payments: "Paiements", debts: "Dettes", printStatement: "Imprimer le relevé",
  date: "Date", items: "Articles", supplier: "Fournisseur", suppliers: "Fournisseurs", newPurchase: "Nouvel achat",
  history: "Historique", addLine: "Ajouter un produit", savePurchase: "Enregistrer l'achat", type: "Type", sale: "Vente",
  purchase: "Achat", from: "Du", to: "Au", revenue: "Chiffre d'affaires", profit: "Bénéfice", netProfit: "Bénéfice net",
  collected: "Encaissé", salesCount: "Nb de factures", generateMissing: "Générer les codes manquants",
  copies: "Copies", print: "Imprimer", shopName: "Nom du magasin", logo: "Logo", address: "Adresse",
  receiptFooter: "Message bas du ticket", paperWidth: "Largeur papier", language: "Langue", saved: "Enregistré",
  exportData: "Exporter toutes les données", importData: "Importer une sauvegarde", lastBackup: "Dernière sauvegarde",
  never: "Jamais", backupReminder: "Aucune sauvegarde depuis plus d'une semaine.", backupNow: "Sauvegarder",
  importWarn: "Toutes les données actuelles seront remplacées. Continuer ?", imported: "Importé", receipt: "Ticket",
  thanks: "", selectAll: "Tout sélectionner", noProducts: "Aucun produit", stockShort: "Stock insuffisant",
  rent: "Loyer", electricity: "Électricité", water: "Eau", salaries: "Salaires", internet: "Internet", other: "Autre",
  productsCount: "Nb de produits", printReceipt: "Imprimer le ticket", lowOnly: "Faible uniquement", statement: "Relevé de compte",
  backupHelp: "Conservez le fichier sur une clé USB chaque semaine.", importHelp: "Colonnes : name, barcode, category, brand, purchase, retail, wholesale, stock, min",
};
const dicts = { ar, fr };
export type TKey = keyof Dict;

interface I18n { lang: "ar" | "fr"; t: (k: TKey) => string; money: (n: number) => string; fmtDate: (d: number) => string; setLang: (l: "ar" | "fr") => void }
const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useData(() => settingsRepo.get(), []);
  const lang = settings?.language ?? "ar";
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const value: I18n = {
    lang,
    t: (k) => dicts[lang][k] ?? k,
    money: (n) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n || 0)} ${lang === "ar" ? "دج" : "DA"}`,
    fmtDate: (d) => new Date(d).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR", { dateStyle: "short", timeStyle: "short" }),
    setLang: (l) => void settingsRepo.save({ language: l }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("I18nProvider missing");
  return c;
}
