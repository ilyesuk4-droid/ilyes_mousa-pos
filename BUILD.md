# دليل بناء تطبيق متجر الهواتف (Electron Desktop & Windows)
# Mobile Shop Manager — Windows Build & Packaging Guide

هذا المستند يوضح خطوات البناء والتشغيل والتجهيز لحزم ويندوز (Windows Installer NSIS & Portable) محلياً أو عبر GitHub Actions.

---

## 1. المتطلبات الأساسية (Prerequisites)

- **Node.js**: الإصدار 20 LTS أو أحدث (`node -v`)
- **npm**: الإصدار 10 أو أحدث (`npm -v`)
- **Windows**: نظام تشغيل Windows 10 أو 11 (64-bit)

---

## 2. تثبيت الحزم (Installation)

افتح موجه أوامر **PowerShell** في مجلد المشروع ونفّذ:

```powershell
npm install
```

أو لتثبيت نظيف متطابق مع `package-lock.json`:

```powershell
npm ci
```

---

## 3. تنزيل الخطوط للعمل دون إنترنت (Offline Fonts)

البرنامج يعمل بنسبة 100% بدون إنترنت. لتنزيل خطوط Google Fonts (Cairo و IBM Plex Sans Arabic) محلياً:

```powershell
node scripts/download-fonts.mjs
```

تُحفظ الخطوط في `public/fonts/` وملف `public/fonts/fonts.css`.

---

## 4. التشغيل في بيئة التطوير (Development)

### تشغيل كمتصفح ويب (Web Dev Server):
```powershell
npm run dev
```

### تشغيل كتطبيق سطح مكتب Electron:
```powershell
npm run electron:dev
```
يقوم هذا الأمر ببناء الواجهة وتوليد ملف `dist/client/index.html` ثم تشغيل نافذة Electron مباشرة.

---

## 5. بناء حزم التثبيت لنظام ويندوز (Build Windows Installers)

### أ. بناء مثبت ويندوز الكامل (NSIS Setup Installer):
ينشئ مثبت Windows بنقرة واحدة (One-click NSIS) مع إنشاء اختصار على سطح المكتب وقائمة ابدأ:

```powershell
npm run electron:build
```

### ب. بناء النسخة المحمولة (Portable EXE - بدون تثبيت):
ينشئ ملف تشغيلي محمول يمكن نقله وتشغيله مباشرة من أي فلاشة USB دون تثبيت:

```powershell
npm run electron:build:portable
```

### 📁 مكان الملفات الناتجة:
تجد المخرجات في مجلد:
```powershell
.\release\
```
- `MobileShopManager-Setup-1.0.0.exe` (مثبت رسمي صامت وسريع)
- `MobileShopManager-Portable-1.0.0.exe` (نسخة محمولة)

---

## 6. البناء التلقائي عبر GitHub Actions (CI/CD Cloud Build)

تم إعداد Workflow مخصص في المسار:
`.github/workflows/build-windows.yml`

### طريقة التشغيل عبر GitHub:
1. ادخل إلى مستودع المشروع على GitHub: `ilyesuk4-droid/ilyes_mousa-pos`
2. اضغط على تبويب **Actions**.
3. اختر **Build Windows Installer** من القائمة اليسرى.
4. اضغط على **Run workflow** ثم اختر فرع `main`.
5. عند اكتمال البناء (خلال 3 إلى 5 دقائق)، ستجد ملف التثبيت متاحاً للتحميل تحت قسم **Artifacts** باسم `windows-installer`.

---

## 7. بنية التطبيق والميزات المدمجة (Architecture & Features)

- **Electron Main Process**: `electron/main.cjs`
  - معالجة بروتوكول مخصص `app://shop/` لقراءة ملفات SPA مباشرة بدون الحاجة لخادم HTTP محلي.
  - قفل النسخة الواحدة (Single Instance Lock) لتفادي فتح البرنامج عدة مرات وتكرار البيانات.
  - معالجة أوامر الطباعة الصامتة (`printSilent`) واختيار الطابعة الحرارية وتخصيص هوامش الإيصالات.
  - النسخ الاحتياطي التلقائي الدوري وعند الإغلاق وحفظه في مجلد المستندات `Documents\MobileShopBackups`.
  - إدارة بدء التشغيل التلقائي مع ويندوز (`app.setLoginItemSettings`).
- **Electron Preload**: `electron/preload.cjs`
  - واجهة برمجة آمنة `window.electronAPI` توفر الوصول لعناصر التحكم من داخل تطبيق React.
- **تخزين البيانات**: Dexie.js (IndexedDB محلي بالكامل وآمن، بدون الحاجة لاتصال بالإنترنت أو قواعد بيانات سحابية خارجية).
