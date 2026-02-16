/**
 * Admin panel page definitions - used for permissions
 */

import type { PageDefinition } from "../types";

export const ADMIN_PAGES: PageDefinition[] = [
  { id: "users", labelAr: "إدارة المستخدمين", labelEn: "Users", path: "/n-admin/users", order: 1 },
  { id: "dashboard", labelAr: "لوحة التحكم", labelEn: "Dashboard", path: "/n-admin/dashboard", order: 2 },
  { id: "financial", labelAr: "المالية والصناديق", labelEn: "Financial", path: "/n-admin/financial", order: 3 },
  { id: "products", labelAr: "أصناف المخزن", labelEn: "Products", path: "/n-admin/products", order: 4 },
  { id: "expense_types", labelAr: "أنواع المصروفات", labelEn: "Expense types", path: "/n-admin/expense-types", order: 5 },
  { id: "suppliers", labelAr: "الموردين", labelEn: "Suppliers", path: "/n-admin/suppliers", order: 6 },
  { id: "customers", labelAr: "العملاء", labelEn: "Customers", path: "/n-admin/customers", order: 7 },
  { id: "purchases", labelAr: "فواتير الشراء", labelEn: "Purchases", path: "/n-admin/purchases", order: 8 },
  { id: "sales", labelAr: "فواتير المبيعات", labelEn: "Sales", path: "/n-admin/sales", order: 9 },
  { id: "warehouse", labelAr: "المخزون", labelEn: "Warehouse", path: "/n-admin/warehouse", order: 10 },
  { id: "expenses", labelAr: "المصروفات", labelEn: "Expenses", path: "/n-admin/expenses", order: 11 },
  { id: "outstanding", labelAr: "المتبقي (دفع وتحصيل)", labelEn: "Outstanding", path: "/n-admin/outstanding", order: 12 },
];
