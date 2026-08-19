export type IdentityRecord = {
  identityId: string;
  identityType: 'USER' | 'EMPLOYEE' | 'PARTNER' | 'CLIENT' | 'SERVICE_ACCOUNT' | 'SYSTEM';
  displayNameKo: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'ARCHIVED';
  providerKey: string;
};

export type IdentitySummary = {
  identity: IdentityRecord | null;
  memberships: Array<{
    membershipId: string;
    organizationId: string;
    membershipType: string;
    status: string;
  }>;
  architectureVersion: string;
  externalAuthentication: 'DISABLED';
};

export type SessionSummary = {
  session: null | {
    sessionId: string;
    identityId: string;
    organizationId: string;
    providerKey: string;
    status: string;
    expiresAt: string;
  };
  validation: { valid: boolean; reasonCode: string; reasonKo?: string };
  externalAuthentication: 'DISABLED';
};

export type RoleAssignment = {
  assignmentId: string;
  identityId: string;
  roleId: string;
  scopeType: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT' | 'SITE';
  organizationId: string;
  projectId: string;
  siteId: string;
  status: string;
  expiresAt: string;
};

export async function loadIdentityAccessSummary() {
  const api = window.ecorean?.bocDb;
  const fallback: [IdentitySummary, SessionSummary, RoleAssignment[], Record<string, unknown>] = [
    { identity: null, memberships: [], architectureVersion: 'v0.6.0-identity-auth-readiness', externalAuthentication: 'DISABLED' },
    { session: null, validation: { valid: false, reasonCode: 'IPC_UNAVAILABLE' }, externalAuthentication: 'DISABLED' },
    [],
    { external: { status: 'DISABLED' }, local: { status: 'UNAVAILABLE' } }
  ];
  if (!api?.getIdentitySummary) return fallback;
  return Promise.all([
    api.getIdentitySummary() as Promise<IdentitySummary>,
    api.getIdentitySessionSummary() as Promise<SessionSummary>,
    api.getIdentityRoleAssignments() as Promise<RoleAssignment[]>,
    api.getAuthProviderStatus() as Promise<Record<string, unknown>>
  ]);
}
