/** Shapes shared by the /api/platform routes and the console pages. */

/** One row of the clinics list. */
export interface ClinicSummary {
  tenantId: string;
  name: string;
  databaseId: string;
  bucket: string;
  status: string;
  isDemo: boolean;
  host: string;
  counts: { clients: number; staff: number; events: number };
  /** Phase 3 fills this in. Null means no licence document — unlimited. */
  licence: { plan: string; expiresAt: string | null } | null;
}

/** One clinic's detail page. */
export interface ClinicDetail extends ClinicSummary {
  /** Protocol ids switched OFF for this clinic; [] means everything enabled. */
  disabledEvaluations: string[];
  brandingLogoUrl: string | null;
  /** From system_settings/config — the clinic's own billing identity. */
  legalName: string | null;
  staff: Array<{ uid: string; name: string; role: string; email: string }>;
}

export interface BugReport {
  id: string;
  tenantId: string;
  host: string;
  page: string;
  title: string;
  description: string;
  status: string;
  reportedBy: { name?: string; role?: string; uid?: string } | null;
  userAgent: string;
  createdAt: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  clinic: string;
  consent: boolean;
  source: string;
  createdAt: string | null;
}

export interface ClinicSpend {
  tenantId: string;
  name: string;
  conversations: number;
  insightEvents: number;
  costUsd: number;
}

export interface ClinicHealth {
  tenantId: string;
  name: string;
  databaseReachable: boolean;
  bucketConfigured: boolean;
  anthropicKeyPresent: boolean;
  licencePresent: boolean;
  error: string | null;
}
