import { useEffect, useMemo, useState } from 'react';
import { calendarSiteSurveySyncService } from '../../services/calendar-service/calendarSiteSurveySyncService';

type Row = Record<string, unknown>;

const text = (value: unknown, fallback = '-') => String(value ?? fallback);

const defaultEvent = {
  eventType: 'SITE_SURVEY',
  title: 'v0.4.4 현장조사 일정',
  customerVisibleTitle: '현장 방문 일정',
  startAt: '2026-07-01T10:00:00+09:00',
  endAt: '2026-07-01T11:00:00+09:00',
  timezone: 'Asia/Seoul',
  ownerId: 'CEO',
  locationSummary: '서울 / 승인된 주소 요약',
  customerSafeLocationSummary: '서울 / 방문 위치 요약'
};

export function CalendarSiteSurveySyncCenterView() {
  const [events, setEvents] = useState<Row[]>([]);
  const [links, setLinks] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [surveySummary, setSurveySummary] = useState<Row>({});
  const [provider, setProvider] = useState<Row>({});
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [form, setForm] = useState<Row>(defaultEvent);
  const [message, setMessage] = useState('v0.4.4 일정 / 현장조사 Sync 준비 화면입니다.');
  const [busy, setBusy] = useState(false);

  const selectedEvent = useMemo(() => events.find((event) => text(event.event_id, '') === selectedEventId), [events, selectedEventId]);

  async function refresh(nextEventId = selectedEventId) {
    const [eventRows, linkRows, nextSummary, nextSurveySummary, providerStatus] = await Promise.all([
      calendarSiteSurveySyncService.listEvents(),
      calendarSiteSurveySyncService.listLinks(),
      calendarSiteSurveySyncService.summary(),
      calendarSiteSurveySyncService.surveySummary(),
      calendarSiteSurveySyncService.providerStatus()
    ]);
    setEvents(eventRows);
    setLinks(linkRows);
    setSummary(nextSummary);
    setSurveySummary(nextSurveySummary);
    setProvider(providerStatus);
    const target = nextEventId || text(eventRows[0]?.event_id, '');
    setSelectedEventId(target);
    setSelectedLinkId(text(linkRows[0]?.link_id, ''));
  }

  async function run(action: () => Promise<Row>, success: string) {
    setBusy(true);
    try {
      const result = await action();
      if (result?.ok === false) setMessage(text(result.error || result.errors, '작업을 확인하세요.'));
      else setMessage(success);
      const nestedEvent = (result.event && typeof result.event === 'object' ? result.event : {}) as Row;
      await refresh(text(result.event_id || nestedEvent.event_id || selectedEventId, ''));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '작업 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : '일정 정보를 불러오지 못했습니다.'));
  }, []);

  const eventPayload = () => ({ ...form });
  const selectedPayload = () => ({ eventId: selectedEventId });
  const selectedLinkPayload = () => ({ linkId: selectedLinkId });

  return (
    <section className="content-card full-width">
      <div className="section-header">
        <div>
          <span className="eyebrow">v0.4.4</span>
          <h2>캘린더 / 현장조사 일정 Sync 준비</h2>
          <p>내부 일정과 현장조사 연결 상태만 관리합니다. 외부 캘린더 연동, 초대 발송, OAuth는 비활성입니다.</p>
        </div>
        <div className="button-row">
          <button className="command" disabled={busy} onClick={() => run(() => calendarSiteSurveySyncService.createEvent(eventPayload()), '내부 일정이 생성되었습니다.')}>내부 일정 생성</button>
          <button disabled={busy} onClick={() => run(() => calendarSiteSurveySyncService.createSurveyEvent({ ...eventPayload(), siteSurveyId: `SURVEY-${Date.now()}` }), '현장조사 일정과 연결했습니다.')}>현장조사 일정 생성</button>
          <button disabled={busy} onClick={() => run(() => calendarSiteSurveySyncService.calendarReport({ finalDecision: 'IN_PROGRESS' }), '캘린더 감사 리포트가 생성되었습니다.')}>감사 리포트</button>
          <button disabled={busy} onClick={() => run(() => calendarSiteSurveySyncService.surveyReport({ finalDecision: 'IN_PROGRESS' }), '현장조사 Sync 리포트가 생성되었습니다.')}>Sync 리포트</button>
        </div>
      </div>

      <p className="small-note">{message}</p>

      <div className="kpi-grid">
        <div className="kpi-card"><span>오늘 일정</span><strong>{text(summary.todayCount, '0')}</strong><p>내부 일정 기준</p></div>
        <div className="kpi-card"><span>현장조사 일정</span><strong>{text(summary.siteSurveyCount, '0')}</strong><p>Site Survey 연결 대상</p></div>
        <div className="kpi-card"><span>충돌</span><strong>{text(summary.conflictCount, '0')}</strong><p>자동 해결 없음</p></div>
        <div className="kpi-card"><span>알림</span><strong>{text(summary.openReminderCount, '0')}</strong><p>내부 알림만 사용</p></div>
        <div className="kpi-card"><span>외부 캘린더</span><strong>{text(provider.status, 'DISABLED')}</strong><p>Google / Outlook 연동 비활성</p></div>
        <div className="kpi-card"><span>Sync 검토</span><strong>{text(surveySummary.reviewRequired, '0')}</strong><p>수동 확인 필요</p></div>
      </div>

      <div className="form-grid">
        <label className="field"><span>일정 유형</span><select value={text(form.eventType, 'SITE_SURVEY')} onChange={(event) => setForm({ ...form, eventType: event.target.value })}>
          <option value="SITE_SURVEY">현장조사</option>
          <option value="CONSULTATION">상담</option>
          <option value="ESTIMATE_REVIEW">견적 검토</option>
          <option value="CONTRACT">계약</option>
          <option value="CONSTRUCTION_START">착공</option>
          <option value="FOLLOW_UP">후속 연락</option>
        </select></label>
        <label className="field"><span>제목</span><input value={text(form.title, '')} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="field"><span>고객 표시 제목</span><input value={text(form.customerVisibleTitle, '')} onChange={(event) => setForm({ ...form, customerVisibleTitle: event.target.value })} /></label>
        <label className="field"><span>시작</span><input value={text(form.startAt, '')} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label>
        <label className="field"><span>종료</span><input value={text(form.endAt, '')} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
        <label className="field"><span>담당자</span><input value={text(form.ownerId, '')} onChange={(event) => setForm({ ...form, ownerId: event.target.value })} /></label>
        <label className="field"><span>내부 위치 요약</span><input value={text(form.locationSummary, '')} onChange={(event) => setForm({ ...form, locationSummary: event.target.value })} /></label>
        <label className="field"><span>고객용 위치 요약</span><input value={text(form.customerSafeLocationSummary, '')} onChange={(event) => setForm({ ...form, customerSafeLocationSummary: event.target.value })} /></label>
      </div>

      <div className="two-column-grid">
        <section className="content-card">
          <div className="section-header compact">
            <div>
              <span className="eyebrow">CALENDAR</span>
              <h3>내부 일정 목록</h3>
            </div>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.detectConflicts(selectedEvent || eventPayload()), '충돌 검토가 완료되었습니다.')}>충돌 확인</button>
          </div>
          {events.length === 0 ? <p className="small-note">등록된 내부 일정이 없습니다.</p> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>일정</th><th>유형</th><th>상태</th><th>시작</th><th>충돌</th></tr></thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={text(event.event_id)}>
                      <td><button onClick={() => setSelectedEventId(text(event.event_id, ''))}>{text(event.title)}</button></td>
                      <td>{text(event.event_type)}</td>
                      <td>{text(event.status)}</td>
                      <td>{text(event.start_at)}</td>
                      <td>{text(event.conflict_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="content-card">
          <div className="section-header compact">
            <div>
              <span className="eyebrow">SITE SURVEY</span>
              <h3>현장조사 연결 상태</h3>
            </div>
            <button disabled={!selectedLinkId || busy} onClick={() => run(() => calendarSiteSurveySyncService.detectMismatch(selectedLinkPayload()), '현장조사 일정 차이를 확인했습니다.')}>불일치 확인</button>
          </div>
          {links.length === 0 ? <p className="small-note">현장조사 일정 연결이 없습니다.</p> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Link</th><th>Survey</th><th>Event</th><th>Sync</th><th>불일치</th></tr></thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={text(link.link_id)}>
                      <td><button onClick={() => setSelectedLinkId(text(link.link_id, ''))}>{text(link.link_id)}</button></td>
                      <td>{text(link.site_survey_id)}</td>
                      <td>{text(link.event_id)}</td>
                      <td>{text(link.sync_status)}</td>
                      <td>{text(link.mismatch_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="content-card">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ACTIONS</span>
            <h3>선택 일정 작업</h3>
          </div>
          <div className="button-row">
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.rescheduleEvent({ ...selectedPayload(), startAt: form.startAt, endAt: form.endAt }), '일정을 변경했습니다.')}>일정 변경</button>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.completeEvent(selectedPayload()), '완료 처리했습니다.')}>완료</button>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.noShowEvent(selectedPayload()), 'No-show 처리했습니다.')}>No-show</button>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.cancelEvent(selectedPayload()), '취소 처리했습니다.')}>취소</button>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.restoreEvent(selectedPayload()), '복원했습니다.')}>복원</button>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.createReminder({ eventId: selectedEventId, reminderType: 'CRM_ACTION', dueAt: form.startAt, note: '현장조사 준비' }), '내부 알림을 생성했습니다.')}>내부 알림</button>
            <button disabled={!selectedEventId || busy} onClick={() => run(() => calendarSiteSurveySyncService.safePayload(selectedPayload()), '고객 안전 payload를 확인했습니다.')}>고객 안전성 검사</button>
          </div>
        </div>
        <p>선택 일정: <strong>{selectedEventId || '없음'}</strong> / 선택 링크: <strong>{selectedLinkId || '없음'}</strong></p>
        <p>외부 캘린더 Sync: <strong>DISABLED</strong> / 초대 발송: <strong>DISABLED</strong> / OAuth: <strong>DISABLED</strong></p>
        <p>고객 화면에는 내부 담당자, 충돌, 알림, provider, token, 상세주소, 원가/마진/PCE가 노출되지 않습니다.</p>
      </section>

      <section className="content-card">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">MISMATCH</span>
            <h3>불일치 수동 처리</h3>
          </div>
          <div className="button-row">
            <button disabled={!selectedLinkId || busy} onClick={() => run(() => calendarSiteSurveySyncService.resolveMismatch({ linkId: selectedLinkId, note: '대표 수동 확인' }), '불일치를 해결 처리했습니다.')}>수동 해결</button>
            <button disabled={!selectedLinkId || busy} onClick={() => run(() => calendarSiteSurveySyncService.deferMismatch({ linkId: selectedLinkId, reason: '추후 확인' }), '불일치를 보류했습니다.')}>보류</button>
          </div>
        </div>
        <p>Survey와 Calendar 값이 다르면 자동 덮어쓰기 없이 REVIEW_REQUIRED로 남기고 대표가 결정합니다.</p>
      </section>
    </section>
  );
}
