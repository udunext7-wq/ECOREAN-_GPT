import type { TopBarKpi } from '../../src/types/dashboard';
import { MetricCard } from '../cards/MetricCard';

type Props = {
  kpis: TopBarKpi[];
  onAction: (action: string) => void;
};

export function TopBar({ kpis, onAction }: Props) {
  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="eyebrow">ECOREAN BOC</span>
        <h1>대표 운영 대시보드</h1>
      </div>
      <div className="metric-grid">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.id} kpi={kpi} onAction={onAction} />
        ))}
      </div>
    </header>
  );
}
