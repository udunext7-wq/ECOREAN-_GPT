import type { TopBarKpi } from '../../src/types/dashboard';
import { StatusPill } from '../alerts/StatusPill';

type Props = {
  kpi: TopBarKpi;
  onAction: (action: string) => void;
};

export function MetricCard({ kpi, onAction }: Props) {
  return (
    <button className={`metric-card metric-${kpi.severity.toLowerCase()}`} onClick={() => onAction(kpi.action)}>
      <span className="metric-label">{kpi.labelKo}</span>
      <strong>{kpi.value}</strong>
      <span className="metric-helper">{kpi.helperKo}</span>
      <StatusPill level={kpi.severity} label={kpi.severity === 'RED' ? '위험' : kpi.severity === 'YELLOW' ? '주의' : '정상'} />
    </button>
  );
}
