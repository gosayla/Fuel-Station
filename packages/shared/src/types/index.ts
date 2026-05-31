// ─── Auth & Users ──────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'manager' | 'accountant' | 'employee';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  stationId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface PinLoginDto {
  employeeId: string;
  pin: string;
}

// ─── Station ───────────────────────────────────────────────────────────────

export interface Station {
  id: string;
  name: string;
  address: string;
  phone?: string;
  isActive: boolean;
}

// ─── Fuel Tanks ────────────────────────────────────────────────────────────

export type FuelType = 'petrol_91' | 'petrol_95' | 'diesel' | 'premium';

export interface Tank {
  id: string;
  stationId: string;
  name: string;
  fuelType: FuelType;
  capacityLiters: number;
  currentLevelLiters: number;
  lowLevelThreshold: number;
  isActive: boolean;
  updatedAt: string;
}

// ─── Purchases ─────────────────────────────────────────────────────────────

export interface Purchase {
  id: string;
  tankId: string;
  stationId: string;
  supplierName: string;
  invoiceNumber?: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  deliveredAt: string;
  createdBy: string;
  createdAt: string;
}

// ─── Sales ─────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'credit';

export interface Sale {
  id: string;
  shiftId: string;
  tankId: string;
  employeeId: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

// ─── Shifts ────────────────────────────────────────────────────────────────

export type ShiftStatus = 'open' | 'closed' | 'reconciled';

export interface Shift {
  id: string;
  stationId: string;
  employeeId: string;
  startedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash?: number;
  actualCash?: number;
  discrepancy?: number;
  totalLitersSold?: number;
  totalRevenue?: number;
  status: ShiftStatus;
}

// ─── Accounts & Treasury ───────────────────────────────────────────────────

export type AccountType = 'safe' | 'bank';

export interface Account {
  id: string;
  stationId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CashCollection {
  id: string;
  shiftId: string;
  accountantId: string;
  toAccountId: string;
  amountExpected: number;
  amountReceived: number;
  discrepancy: number;
  notes?: string;
  collectedAt: string;
}

// ─── Expenses ──────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'salary'
  | 'utilities'
  | 'maintenance'
  | 'fuel_purchase'
  | 'other';

export interface Expense {
  id: string;
  stationId: string;
  accountId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paidAt: string;
  createdBy: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────

export interface DashboardKpis {
  totalSalesToday: number;
  totalLitersSoldToday: number;
  totalPurchasesToday: number;
  totalExpensesToday: number;
  // v1: totalSalesToday - totalExpensesToday
  // v2: totalSalesToday - totalExpensesToday - totalPurchasesToday
  netProfitToday: number;
  safeBalance: number;
  bankBalance: number;
  openShiftsCount: number;
  lowTanksCount: number;
}

export interface SalesReport {
  period: { from: string; to: string };
  totalRevenue: number;
  totalLiters: number;
  byFuelType: Record<FuelType, { liters: number; revenue: number }>;
  byEmployee: Array<{ employeeId: string; name: string; liters: number; revenue: number }>;
  byDay: Array<{ date: string; liters: number; revenue: number }>;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}
