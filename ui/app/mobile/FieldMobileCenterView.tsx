import { useEffect, useMemo, useState } from 'react';
import {
  createFieldChangeOrderRequest,
  createFieldDailyReport,
  createFieldDefectReport,
  createFieldMaterialReceiving,
  createFieldRiskReport,
  formatWon,
  getFieldMobileCenterData,
  saveFieldAttendanceCheckIn,
  saveFieldAttendanceCheckOut,
  saveFieldInspectionResult,
  saveFieldSignature,
  saveSiteMediaFile,
  type FieldMobileData
} from '../../services/mobile-service/fieldMobileService';

type Props = {
  projectId?: string;
};

function chip(value: unknown) {
  const text = String(value || 'NORMAL');
  return <span className={text === 'RED' || text === 'FAIL' ? 'preliminary-badge warning-row' : 'preliminary-badge'}>{text}</span>;
}

export function FieldMobileCenterView({ projectId }: Props) {
  const [data, setData] = useState<FieldMobileData | null>(null);
  const [roleMode, setRoleMode] = useState('팀장');
  const [messageKo, setMessageKo] = useState('');
  const activeProjectId = String(data?.todaySite?.projectId || projectId || 'FIELD-MOBILE-DEMO');

  async function refresh() {
    setData(await getFieldMobileCenterData({ projectId, roleMode }));
  }

  useEffect(() => {
    refresh();
  }, [projectId, roleMode]);

  const actionPayload = useMemo(() => ({
    projectId: activeProjectId,
    siteNameKo: String(data?.todaySite?.siteNameKo || '현장'),
    actor: roleMode
  }), [activeProjectId, data?.todaySite?.siteNameKo, roleMode]);

  async function run(labelKo: string, action: () => Promise<unknown>) {
    try {
      const result = (await action()) as { fieldMobileData?: FieldMobileData };
      setData(result.fieldMobileData ?? await getFieldMobileCenterData({ projectId: activeProjectId, roleMode }));
      setMessageKo(`${labelKo} 완료`);
    } catch (error) {
      setMessageKo(`${labelKo} 실패: ${error instanceof Error ? error.message : '데이터를 저장하지 못했습니다.'}`);
    }
  }

  if (!data) return <section className="drawer-block">현장 모바일 데이터를 불러오는 중입니다.</section>;

  return (
    <section className="estimate-panel field-mobile-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">FIELD MOBILE</span>
          <h4>현장 모바일 운영</h4>
          <p>현장 입력을 출역, 원가, 리스크, CEO Control Tower로 바로 연결합니다.</p>
        </div>
        <select value={roleMode} onChange={(event) => setRoleMode(event.target.value)}>
          {data.roleModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
        </select>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>오늘 현장</h5>
          <strong>{String(data.todaySite.siteNameKo || activeProjectId)}</strong>
          <p>{String(data.todaySite.plannedWorkKo || '오늘 배정된 현장이 없습니다.')}</p>
        </div>
        <div className="estimate-preview-card">
          <h5>오늘 공정</h5>
          <strong>{String(data.todaySite.todayProcessKo || '미등록')}</strong>
          <p>{String(data.todaySite.teamKo || '팀 미등록')}</p>
        </div>
        <div className="estimate-preview-card warning-row">
          <h5>현장 위험</h5>
          <strong>{String(data.summary.redRiskCount || 0)}</strong>
          <p>입고 부족 {String(data.summary.shortageCount || 0)} / 검수 FAIL {String(data.summary.failInspectionCount || 0)}</p>
        </div>
        <div className="estimate-preview-card">
          <h5>사진 / 서명</h5>
          <strong>{String(data.summary.mediaCount || 0)} / {String(data.signatures.length)}</strong>
          <p>모바일 증빙 기록</p>
        </div>
      </div>

      <div className="mobile-action-grid action-command-grid">
        <button className="command command-approve" onClick={() => run('출근 체크', () => saveFieldAttendanceCheckIn({ ...actionPayload, workerNameKo: roleMode, roleKo: roleMode, dailyWage: 220000, checkInTime: '08:00' }))}>출근 체크</button>
        <button className="command command-order" onClick={() => run('퇴근 체크', () => saveFieldAttendanceCheckOut({ ...actionPayload, workerNameKo: roleMode, checkOutTime: '17:00' }))}>퇴근 체크</button>
        <button className="command command-approve" onClick={() => run('공사일보', () => createFieldDailyReport({ ...actionPayload, workContentKo: '금일 공정 진행', crewCount: 2, usedMaterialsKo: '현장 사용 자재 기록', tomorrowProcessKo: '다음 공정 준비' }))}>공사일보</button>
        <button className="command command-order" onClick={() => run('사진 업로드', () => saveSiteMediaFile({ ...actionPayload, relatedEntityType: 'FieldMobile', relatedEntityId: activeProjectId, fileName: 'site-photo.jpg', filePath: 'storage/mobile/site-photo.jpg', caption: '현장 사진 placeholder' }))}>사진 업로드</button>
        <button className="command command-block" onClick={() => run('자재입고', () => createFieldMaterialReceiving({ ...actionPayload, purchaseOrderId: `PO-${activeProjectId}`, itemNameKo: '현장 자재', orderedQuantity: 10, receivedQuantity: 8, unit: 'EA', supplierNameKo: 'UNKNOWN', notesKo: '모바일 입고 확인' }))}>자재입고</button>
        <button className="command command-block" onClick={() => run('검수 체크', () => saveFieldInspectionResult({ ...actionPayload, processNameKo: '모바일 검수', resultStatus: 'FAIL', checkItemKo: '누수/안전 확인', actionRequiredKo: '즉시 보완 필요' }))}>검수 체크</button>
        <button className="command command-order" onClick={() => run('추가공사 요청', () => createFieldChangeOrderRequest({ ...actionPayload, titleKo: '모바일 추가공사', changeContentKo: '현장 추가 작업', changeReasonKo: '고객 요청', additionalAmount: 600000, additionalCost: 360000, scheduleImpactDays: 1 }))}>추가공사 요청</button>
        <button className="command command-block" onClick={() => run('하자 접수', () => createFieldDefectReport({ ...actionPayload, defectLocationKo: '현장', defectTypeKo: '누수 확인', severity: 'HIGH', rootCauseKo: '원인 확인 필요', estimatedCost: 120000 }))}>하자 접수</button>
        <button className="command command-approve" onClick={() => run('고객 서명', () => saveFieldSignature({ ...actionPayload, relatedEntityType: 'Handover', relatedEntityId: activeProjectId, signerName: '고객', signerRole: '고객', signatureText: '고객 확인' }))}>고객 서명</button>
        <button className="command command-block" onClick={() => run('위험 보고', () => createFieldRiskReport({ ...actionPayload, riskType: '누수', description: '현장 RED 위험 보고', severity: 'RED', immediateActionTaken: true }))}>위험 보고</button>
      </div>

      {messageKo ? <p className="form-message">{messageKo}</p> : null}

      <div className="drawer-block">
        <h3>최근 현장 기록</h3>
        <div className="today-action-list">
          {data.todayAttendance.slice(0, 4).map((row) => (
            <div key={String(row.attendance_log_id)} className="action-row">
              <span>출역</span>
              <div>
                <strong>{String(row.worker_name_ko)}</strong>
                <p>{String(row.check_in_time)} - {String(row.check_out_time || '퇴근 전')} / {formatWon(row.labor_cost)}</p>
              </div>
              <em>{String(row.role_ko)}</em>
            </div>
          ))}
          {data.riskReports.slice(0, 4).map((row) => (
            <div key={String(row.id)} className={String(row.severity) === 'RED' ? 'action-row warning-row' : 'action-row'}>
              {chip(row.severity)}
              <div>
                <strong>{String(row.risk_type)}</strong>
                <p>{String(row.description)}</p>
              </div>
              <em>{String(row.status)}</em>
            </div>
          ))}
        </div>
        {data.todayAttendance.length === 0 && data.riskReports.length === 0 ? <p>아직 현장 모바일 기록이 없습니다.</p> : null}
      </div>
    </section>
  );
}
