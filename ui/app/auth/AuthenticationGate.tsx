import { type ReactNode, useEffect, useState } from 'react';
import { AuthenticationAccessPanel } from '../settings/AuthenticationAccessPanel';
import { getAuthenticationStatus, type AuthenticationStatus } from '../../services/identity-service/authenticationService';

export function AuthenticationGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthenticationStatus | null>(null);

  async function refresh() {
    setStatus(await getAuthenticationStatus());
  }

  useEffect(() => {
    refresh().catch(() => setStatus(null));
    window.addEventListener('ecorean:auth-changed', refresh);
    return () => window.removeEventListener('ecorean:auth-changed', refresh);
  }, []);

  if (status?.authMode === 'LOCAL' || status?.businessAccess === 'ALLOWED_BY_RBAC') return <>{children}</>;

  return (
    <main className="dashboard-shell">
      <section className="estimate-panel role-permission-center">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">ECOREAN BOC SECURE ACCESS</span>
            <h4>ECOREAN BOC CEO Dashboard</h4>
          </div>
        </div>
        <AuthenticationAccessPanel />
      </section>
    </main>
  );
}
