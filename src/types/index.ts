export type Salesperson = "Aftab" | "Sarvesh" | "Firoz" | "Idris" | "Prajay" | "Vinay";

export type ProductType =
  | "DM Single"
  | "GMB Single"
  | "SMM Single"
  | "DM + GMB"
  | "DM + SMM"
  | "GMB + SMM"
  | "GMB + SEO"
  | "DM + GMB + SMM"
  | "GMB + SMM + SEO"
  | "DM + GMB + SMM + SEO"
  | string;

export type PaymentStatus = "pending" | "partial" | "collected" | "overdue" | "waived";
export type GSTStatus = "Y" | "N";

export type ContractStatus = "active" | "stopped";

export interface Contract {
  id: string;
  salesperson: Salesperson;
  contractStatus?: ContractStatus;
  clientName: string;
  product: ProductType;
  accountManager: string;
  contractId?: string;
  profiles: number;
  gstStatus: GSTStatus;
  dealValue: number;
  contractTermMonths: number;
  firstRenewalDate: string; // ISO date string
  renewalSchedule: RenewalMonth[]; // pre-computed from backend
  createdAt: string;
  updatedAt: string;
}

export interface RenewalMonth {
  contractId: string;
  year: number;
  month: number; // 1-12
  amount: number;
  status: PaymentStatus;
  payments: Payment[];
}

export interface Payment {
  id: string;
  contractId: string;
  renewalYear: number;
  renewalMonth: number;
  amount: number;
  paidOn: string; // ISO date
  notes?: string;
  recordedBy: string;
}

export interface SalesSummary {
  salesperson: Salesperson;
  totalAccounts: number;
  totalContractValue: number;
  renewals2026: number;
  renewals2027: number;
  renewals2028: number;
  totalPipeline: number;
}

export interface MonthlyTotal {
  year: number;
  month: number;
  monthLabel: string;
  expected: number;
  collected: number;
  pending: number;
}

export interface DashboardStats {
  totalAccounts: number;
  totalPipeline: number;
  thisMonthExpected: number;
  thisMonthCollected: number;
  thisMonthPending: number;
  overdueCount: number;
  overdueValue: number;
  salesSummary: SalesSummary[];
  monthlyTotals: MonthlyTotal[];
  upcomingRenewals: UpcomingRenewal[];
}

export interface UpcomingRenewal {
  contractId: string;
  clientName: string;
  salesperson: Salesperson;
  accountManager: string;
  product: ProductType;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
}

export interface NewContractForm {
  salesperson: Salesperson;
  clientName: string;
  product: ProductType;
  accountManager: string;
  contractId?: string;
  profiles: number;
  gstStatus: GSTStatus;
  dealValue: number;
  contractTermMonths: number;
  firstRenewalDate: string;
}

export interface ClientNote {
  id: string;
  clientName: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export type PaymentType = "onboarding" | "renewal";

export interface OnboardingPayment {
  contractId: string;
  clientName: string;
  salesperson: string;
  status: "collected" | "partial" | "not_collected";
  amountCollected: number;
  paidOn: string;
  notes?: string;
}