import type { RiskLevel, Severity } from '../../src/types/dashboard';

type Props = {
  level: Severity | RiskLevel | string;
  label?: string;
};

export function StatusPill({ level, label }: Props) {
  const normalized = String(level).toLowerCase();
  return <span className={`status-pill status-${normalized}`}>{label ?? level}</span>;
}
