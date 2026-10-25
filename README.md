# Mobile Shop Manager

مرحبا انا اريد ان اعمل : Build a local-first Point of Sale (POS) and inventory management web app for a phone & accessories shop.

CRITICAL TECHNICAL RULES:
- NO backend, NO Supabase, NO login. Everything runs 100% in the browser.
- Store all data in IndexedDB using Dexie.js.
- Put ALL database access inside a single data layer folder (src/data/) using a repository pattern, so I can later swap IndexedDB for a real server API without touching the UI.
- Use HashRouter and set Vite `base: './'` so the built app works when served from any folder.
- Full RTL support. UI languages: Arabic (default) and French, with a language switcher. Currency: DZD (دج).
- Desktop-first, large clear buttons, fast keyboard workflow.

FEATURES:
1. Products: name, barcode, category, brand, purchase price, retail price, wholesale price, stock quantity, minimum stock alert, optional IMEI/serial notes, optional image. Add/edit/delete, search, filter by category, low-stock filter. Import products from CSV/Excel.
2. Categories management.
3. POS screen: auto-focused barcode input (scanner types digits then Enter -> adds product to cart). Also search by name. Cart with editable quantity, per-item price choice (retail or wholesale), discount, total. Payment: fully paid, partially paid, or on credit (select/create customer). Stock decreases automatically on sale.
4. Receipt printing: after each sale, print a receipt using window.print() with a dedicated @media print stylesheet for 80mm thermal paper (setting to choose 58mm or 80mm). Receipt shows shop name, logo, date, items, total, paid, remaining, footer message.
5. Customers & Credit (كريدي): customers with name and phone, running debt balance, list of debts, ability to record payments, payment history, printable statement.
6. Purchases / stock in: record incoming stock (supplier, quantity, purchase price) which updates stock and purchase price. Suppliers list.
7. Stock movements log: every sale, purchase, and manual adjustment recorded.
8. Dashboard: today's sales, today's profit, total stock value, low-stock items, total customer debts, best sellers.
9. Reports: by date range — sales, profit (= sum of (sale price − purchase price at time of sale) × qty), expenses. Store purchase price on each sale line so past profit never changes.
10. Expenses: simple daily expenses tracker (rent, electricity, etc.), subtracted from net profit.
11. Barcode label generator: print barcode labels (Code128 via JsBarcode) for products without barcodes.
12. Settings: shop name, logo, phone, address, receipt footer, paper width, language.
13. Backup: export all data to a JSON file and import it back. Show a reminder to back up weekly.

Start with a clean, professional design. Build everything in a well-organized structure.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6c31c0d1-618b-4bc2-a1ea-f7858aad024d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
