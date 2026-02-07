export interface ClientInfo {
  id?: string;
  name: string;
  birthDate?: string;
  primaryDiagnosis?: string;
  diagnosisLevel?: number;
  // Billing Info for SmartBill
  billingAddress?: string;
  billingCif?: string; // CUI / CIF
  billingRegNo?: string; // Nr. Reg. Com.
  [key: string]: any;
}
