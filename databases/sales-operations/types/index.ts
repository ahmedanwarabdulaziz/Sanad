/**
 * Sales Operations - Firestore types
 */

export type UserRole = "super_admin" | "admin" | "user";

export type PagePermission = "view" | "edit" | "none";

export interface PageAccess {
  pageId: string;
  permission: PagePermission;
}

export interface SalesUser {
  id: string;
  name: string;
  pin: string; // 4-digit PIN stored (consider hashing in production)
  role: UserRole;
  pageAccess: PageAccess[];
  department?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface PageDefinition {
  id: string;
  labelAr: string;
  labelEn?: string;
  path: string;
  order: number;
}

export type VaultType = "personal" | "bank";

export interface VaultCategory {
  id: string;
  nameAr: string;
  nameEn?: string;
  type: VaultType | "all";
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Vault {
  id: string;
  name: string;
  type: VaultType;
  assignedToUserId: string;
  bankName?: string;
  accountNumber?: string;
  branchName?: string;
  notes?: string;
  openingBalance?: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface VaultTransfer {
  id: string;
  fromVaultId: string;
  toVaultId: string;
  amount: number;
  notes?: string;
  createdAt: number;
  createdBy?: string;
}

// Store / Warehouse
export type ProductUnit = "sqm" | "linear_m";
export type MaterialType = "marble" | "granite";

export interface Product {
  id: string;
  nameAr: string;
  nameEn?: string;
  unit: ProductUnit;
  materialType?: MaterialType;
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface ExpenseType {
  id: string;
  nameAr: string;
  nameEn?: string;
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn?: string;
  contact?: string;
  notes?: string;
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export type CustomerStage = "lead" | "measures_taken" | "deposit_taken" | "done";

export interface Customer {
  id: string;
  nameAr: string;
  nameEn?: string;
  phone?: string;
  notes?: string;
  stage?: CustomerStage;
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export type PurchaseInvoiceStatus = "draft" | "completed";

export interface PurchaseInvoice {
  id: string;
  invoiceNumber?: string;
  supplierId?: string;
  supplierName: string;
  invoiceDate: number;
  notes?: string;
  status: PurchaseInvoiceStatus;
  totalProducts: number;
  totalExpenses: number;
  totalAmount: number;
  amountPaid?: number;
  paidFromVaultId?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  purchaseInvoiceId: string;
  productId: string;
  quantity: number;
  unit: ProductUnit;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

export interface PurchaseInvoiceExpense {
  id: string;
  purchaseInvoiceId: string;
  expenseTypeId: string;
  amount: number;
  notes?: string;
}

export type SalesInvoiceStatus = "draft" | "completed";

export interface SalesInvoice {
  id: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  invoiceDate: number;
  notes?: string;
  status: SalesInvoiceStatus;
  totalProducts: number;
  totalExpenses: number;
  totalAmount: number;
  amountPaid?: number;
  paidToVaultId?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface SalesInvoiceItem {
  id: string;
  salesInvoiceId: string;
  productId: string;
  quantity: number;
  unit: ProductUnit;
  unitPrice: number;
  unitCost?: number;
  lineTotal: number;
  notes?: string;
}

export interface SalesInvoiceExpense {
  id: string;
  salesInvoiceId: string;
  expenseTypeId: string;
  amount: number;
  notes?: string;
}

/** Standalone expense record: related to buy/sell, general or linked to an invoice */
export type ExpenseRelatedTo = "buy" | "sell";
export type ExpenseScope = "general" | "invoice";
export type ExpensePaymentStatus = "paid" | "partial" | "not_paid";

export interface ExpensePayment {
  vaultId: string;
  amount: number;
}

export interface Expense {
  id: string;
  expenseTypeId: string;
  amount: number;
  notes?: string;
  paymentStatus?: ExpensePaymentStatus;
  amountPaid?: number;
  paidFromVaultId?: string;
  /** Per-vault payments; when present, amountPaid = sum of amounts. Used for display and financial. */
  payments?: ExpensePayment[];
  relatedTo: ExpenseRelatedTo;
  scope: ExpenseScope;
  purchaseInvoiceId?: string;
  salesInvoiceId?: string;
  createdAt: number;
  createdBy?: string;
}

export type StockMovementType = "purchase" | "adjustment" | "sale";

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  unit: ProductUnit;
  unitCost?: number;
  totalCost?: number;
  purchaseInvoiceId?: string;
  salesInvoiceId?: string;
  notes?: string;
  createdAt: number;
  createdBy?: string;
}
