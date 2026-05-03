import { BackupRestoreView } from './BackupRestoreView';
import { ExportDataView } from './ExportDataView';
import { UserPermissionView } from './UserPermissionView';

export function SettingsView() {
  return (
    <section className="settings-stack">
      <UserPermissionView />
      <BackupRestoreView />
      <ExportDataView />
    </section>
  );
}
