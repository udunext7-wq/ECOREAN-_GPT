import type { NotificationLogItem } from '../../src/types/dashboard';
import { StatusPill } from '../alerts/StatusPill';

type Props = {
  logs: NotificationLogItem[];
};

export function NotificationLog({ logs }: Props) {
  return (
    <section className="notification-log">
      <div className="section-header">
        <div>
          <span className="eyebrow">REAL-TIME LOG</span>
          <h2>Notification Log</h2>
        </div>
      </div>
      <div className="log-list">
        {logs.map((log) => (
          <div key={log.logId} className="log-row">
            <time>{log.time}</time>
            <StatusPill level={log.level === 'RED' ? 'RED' : log.level === 'WARNING' ? 'YELLOW' : 'GREEN'} label={log.level === 'RED' ? 'RED' : log.level === 'WARNING' ? '주의' : '기록'} />
            <strong>{log.messageKo}</strong>
            <span>{log.relatedProjectId}</span>
            <em>{log.actionKo}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
