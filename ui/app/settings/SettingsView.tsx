import { BackupRestoreView } from './BackupRestoreView';
import { ExportDataView } from './ExportDataView';
import { UserRolePermissionCenterView } from './UserRolePermissionCenterView';

export function SettingsView() {
  return (
    <section className="settings-stack">
      <UserRolePermissionCenterView />
      <BackupRestoreView />
      <ExportDataView />
    </section>
  );
}
