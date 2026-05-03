import { useState } from 'react';
import { exportExcel, exportJson } from '../../services/backup-service/backupService';

export function ExportDataView() {
  const [scope, setScope] = useState('ALL');
  const [messageKo, setMessageKo] = useState('JSON은 재가져오기용, Excel은 보고용입니다.');

  async function runJsonExport() {
    const result = await exportJson(scope);
    setMessageKo(`JSON Export 완료: ${String(result?.exportPath ?? '-')}`);
  }

  async function runExcelExport() {
    const result = await exportExcel(scope);
    setMessageKo(`Excel Export 완료: ${String(result?.exportPath ?? '-')}`);
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">EXPORT DATA</span>
          <h4>JSON / Excel Export</h4>
        </div>
      </div>
      <p className="small-note">{messageKo}</p>
      <div className="estimate-save-bar">
        <div>
          <strong>Export Scope</strong>
          <span>개인정보 포함 가능 여부가 export log에 기록됩니다.</span>
        </div>
        <select value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="ALL">ALL</option>
          <option value="project">project.db</option>
          <option value="approval">approval.db</option>
          <option value="master">master.db</option>
          <option value="logs">logs.db</option>
        </select>
      </div>
      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>JSON Export</h5>
          <p className="small-note">테이블 row 구조를 유지하므로 재import 가능한 구조입니다.</p>
          <button onClick={runJsonExport}>JSON Export</button>
        </div>
        <div className="estimate-preview-card">
          <h5>Excel Export</h5>
          <p className="small-note">보고용 Spreadsheet XML 파일입니다. 재import 기준 파일로 사용하지 않습니다.</p>
          <button onClick={runExcelExport}>Excel Export</button>
        </div>
      </div>
    </section>
  );
}
