import type { RedAlert, ViewKey } from '../../src/types/dashboard';
import { getRiskButtonLabel } from '../../state/risk-store/useRiskStore';
import { StatusPill } from '../alerts/StatusPill';

type Props = {
  alerts: RedAlert[];
  onNavigate: (view: ViewKey) => void;
};

export function AlertList({ alerts, onNavigate }: Props) {
  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <div key={alert.alertId} className="alert-item red-alert">
          <div>
            <StatusPill level={alert.severity} label={alert.severity === 'BLOCKING' ? 'RED ALERT' : '위험'} />
            <h3>{alert.titleKo}</h3>
            <p>{alert.reasonKo}</p>
          </div>
          <button className="primary-danger" onClick={() => onNavigate(alert.drillDownTarget)}>
            {getRiskButtonLabel(alert)}
          </button>
        </div>
      ))}
    </div>
  );
}
