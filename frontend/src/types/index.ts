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
  // Manually-corrected due date (ISO string), e.g. a 2-3 day extension, or a
  // shift into a different month/year entirely. Undefined/null = no manual
  // correction — fall back to calculating the date from
  // Contract.firstRenewalDate + (year, month) as before.
  actualDueDate?: string | null;
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

export interface ContractEdit {
  id: string;
  contractId: string;
  editedAt: string;
  editedBy: string;
  changes: Partial<{
    product: string;
    dealValue: number;
    accountManager: string;
    contractTermMonths: number;
    profiles: number;
    gstStatus: "Y" | "N";
  }>;
  previousValues: Partial<{
    product: string;
    dealValue: number;
    accountManager: string;
    contractTermMonths: number;
    profiles: number;
    gstStatus: "Y" | "N";
  }>;
}