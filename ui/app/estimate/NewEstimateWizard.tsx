import { useEffect, useMemo, useState } from 'react';
import { DocumentPreview } from './DocumentPreview';
import { EstimatePreview } from './EstimatePreview';
import { ScheduleDraftPreview } from './ScheduleDraftPreview';
import {
  createEstimateDraft,
  defaultEstimateInput,
  saveEstimateDraft,
  updateEstimateDraft,
  type EstimateDraft,
  type EstimateInput,
  type LoadedEstimateDraft,
  type PreventionItem
} from '../../services/estimate-service/estimateDraftService';

type Props = {
  loadedDraft?: LoadedEstimateDraft | null;
};

const fieldConfig: Array<{ key: keyof EstimateInput; labelKo: string; type: 'input' | 'textarea' | 'select'; options?: string[] }> = [
  { key: 'projectType', labelKo: '프로젝트 유형', type: 'select', options: ['bathroom_remodeling', 'kitchen_remodeling', 'apartment_full_remodeling', 'partial_repair'] },
  { key: 'buildingType', labelKo: '건물 유형', type: 'input' },
  { key: 'areaPyeong', labelKo: '면적(평)', type: 'input' },
  { key: 'bathroomPackage', labelKo: '욕실 패키지', type: 'select', options: ['BASIC', 'STANDARD', 'PREMIUM'] },
  { key: 'kitchenPackage', labelKo: '주방 패키지', type: 'select', options: ['BASIC', 'STANDARD', 'PREMIUM'] },
  { key: 'customerOfferPrice', labelKo: '고객 제안가', type: 'input' },
  { key: 'spaceComposition', labelKo: '공간 구성', type: 'textarea' },
  { key: 'constructionScope', labelKo: '공사 범위', type: 'select', options: ['욕실 단독 리모델링', '주방 단독 리모델링', '전체 리모델링', '부분 리모델링', '부분 보수'] },
  { key: 'finishGrade', labelKo: '마감 등급', type: 'select', options: ['기본', '중급', '중급~중상급', '고급'] },
  { key: 'budgetLevel', labelKo: '예산 수준', type: 'input' },
  { key: 'siteConstraints', labelKo: '현장 제약 조건', type: 'textarea' },
  { key: 'clientPriority', labelKo: '고객 우선순위', type: 'textarea' }
];

function preventionTone(item: PreventionItem) {
  if (item.enforcementLevel === 'AUTO_LOCKED') return 'red';
  if (item.enforcementLevel === 'MANDATORY') return 'yellow';
  return 'green';
}

export function NewEstimateWizard({ loadedDraft = null }: Props) {
  const isEditMode = Boolean(loadedDraft);
  const [input, setInput] = useState<EstimateInput>({ ...defaultEstimateInput, ...(loadedDraft?.minimumInput ?? {}) });
  const [confirmationItems, setConfirmationItems] = useState<EstimateDraft['needsConfirmation']>(
    loadedDraft?.draft.needsConfirmation ?? createEstimateDraft(loadedDraft?.minimumInput ?? defaultEstimateInput).needsConfirmation
  );
  const [documentDrafts, setDocumentDrafts] = useState<EstimateDraft['documents']>(
    loadedDraft?.draft.documents ?? createEstimateDraft(loadedDraft?.minimumInput ?? defaultEstimateInput).documents
  );
  const [saveStatusKo, setSaveStatusKo] = useState(isEditMode ? '저장된 예비 견적을 불러왔습니다.' : '아직 저장되지 않음');
  const [removeWarningKo, setRemoveWarningKo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (loadedDraft) {
      setInput({ ...defaultEstimateInput, ...loadedDraft.minimumInput });
      setConfirmationItems(loadedDraft.draft.needsConfirmation);
      setDocumentDrafts(loadedDraft.draft.documents);
      setSaveStatusKo(`편집 모드: ${loadedDraft.projectNameKo}`);
    }
  }, [loadedDraft?.estimateDraftId]);

  const draft = useMemo<EstimateDraft>(() => {
    const nextDraft = loadedDraft?.draft ?? createEstimateDraft(input);
    const regenerated = createEstimateDraft(input);
    return {
      ...regenerated,
      generatedProcesses: nextDraft.generatedProcesses?.length ? nextDraft.generatedProcesses : regenerated.generatedProcesses,
      conditionalProcesses: nextDraft.conditionalProcesses?.length ? nextDraft.conditionalProcesses : regenerated.conditionalProcesses,
      preventionItems: nextDraft.preventionItems?.length ? nextDraft.preventionItems : regenerated.preventionItems,
      needsConfirmation: confirmationItems,
      documents: documentDrafts.length ? documentDrafts : regenerated.documents,
      missingPriceWarnings: nextDraft.missingPriceWarnings?.length ? nextDraft.missingPriceWarnings : regenerated.missingPriceWarnings
    };
  }, [input, confirmationItems, documentDrafts, loadedDraft?.estimateDraftId]);

  function updateField(key: keyof EstimateInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateConfirmation(index: number, key: 'questionKo' | 'impactKo', value: string) {
    setConfirmationItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }

  function handleRemovePreventionItem(item: PreventionItem) {
    if (item.enforcementLevel === 'AUTO_LOCKED') {
      setRemoveWarningKo(`${item.itemNameKo}는 반복 원인 3건 이상 기준의 AUTO LOCKED 항목입니다. 삭제할 수 없습니다.`);
      return;
    }
    setRemoveWarningKo(`${item.itemNameKo} 삭제는 대표 승인 요청이 필요합니다. 승인 전에는 FINAL_ESTIMATE로 전환할 수 없습니다.`);
  }

  function regenerateDocuments() {
    const regenerated = createEstimateDraft(input);
    setDocumentDrafts(regenerated.documents);
    setSaveStatusKo('문서 초안이 현재 입력값 기준으로 재생성되었습니다.');
  }

  async function handleSaveDraft() {
    setIsSaving(true);
    setSaveStatusKo(isEditMode ? '수정 저장 중...' : '저장 중...');
    try {
      const payload = { minimumInput: input, draft };
      const result = isEditMode && loadedDraft
        ? await updateEstimateDraft({ estimateDraftId: loadedDraft.estimateDraftId, ...payload })
        : await saveEstimateDraft(payload);

      if (result?.savedDraft) {
        setSaveStatusKo(`${isEditMode ? '수정 저장 완료' : '저장 완료'}: ${result.savedDraft.projectNameKo}`);
      } else {
        setSaveStatusKo('Electron DB 연결 없음: 개발 Preview 상태');
      }
    } catch (error) {
      setSaveStatusKo(`저장 실패: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="estimate-wizard">
      <div className="estimate-hero">
        <div>
          <span className="eyebrow">{isEditMode ? 'EDIT ESTIMATE DRAFT' : 'NEW ESTIMATE WIZARD'}</span>
          <h3>{isEditMode ? '저장된 예비 견적 수정' : '최소 입력 기반 예비 견적 생성'}</h3>
          <p>욕실과 주방의 Pricing, Cost Capture, Root Cause Prevention 기준을 견적 단계에서 자동 적용합니다.</p>
        </div>
        <div className="estimate-mode-card">
          <strong>PRELIMINARY</strong>
          <span>실단가 미입력 / Master DB 변경 없음</span>
        </div>
      </div>

      <div className="estimate-save-bar">
        <div>
          <strong>{isEditMode ? '수정 저장' : '예비 견적 저장'}</strong>
          <span>{saveStatusKo}</span>
        </div>
        <button onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving ? '저장 중' : isEditMode ? '수정 저장' : '예비 견적 저장'}
        </button>
      </div>

      <section className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">MINIMUM INPUT</span>
            <h4>기본 입력값</h4>
          </div>
        </div>
        <div className="estimate-form-grid">
          {fieldConfig.map((field) => (
            <label key={field.key}>
              <span>{field.labelKo}</span>
              {field.type === 'select' ? (
                <select value={input[field.key]} onChange={(event) => updateField(field.key, event.target.value)}>
                  {field.options?.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea value={input[field.key]} onChange={(event) => updateField(field.key, event.target.value)} />
              ) : (
                <input value={input[field.key]} onChange={(event) => updateField(field.key, event.target.value)} />
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">ROOT CAUSE PREVENTION</span>
            <h4>자동 포함 항목 (과거 누수 방지)</h4>
          </div>
          <span className="preliminary-badge">{draft.preventionItems.length}개</span>
        </div>
        <div className="cost-leak-list">
          {draft.preventionItems.map((item) => (
            <article key={item.itemId} className={`cost-leak ${preventionTone(item)}`}>
              <strong>{item.itemNameKo}</strong>
              <p>{item.reasonKo}</p>
              <em>{item.enforcementLevel === 'AUTO_LOCKED' ? 'RED LOCK / 삭제 불가' : 'MANDATORY / 삭제 시 대표 승인 필요'}</em>
              <button onClick={() => handleRemovePreventionItem(item)}>
                {item.enforcementLevel === 'AUTO_LOCKED' ? '삭제 불가' : '삭제 요청'}
              </button>
            </article>
          ))}
        </div>
        {removeWarningKo ? <p className="save-message">{removeWarningKo}</p> : null}
      </section>

      <section className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">NEEDS CONFIRMATION</span>
            <h4>확인 필요 항목</h4>
          </div>
          <span className="preliminary-badge">{confirmationItems.length}개</span>
        </div>
        <div className="confirmation-edit-grid">
          {confirmationItems.map((item, index) => (
            <article key={item.itemId}>
              <input value={item.questionKo} onChange={(event) => updateConfirmation(index, 'questionKo', event.target.value)} />
              <textarea value={item.impactKo} onChange={(event) => updateConfirmation(index, 'impactKo', event.target.value)} />
            </article>
          ))}
        </div>
      </section>

      <section className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">DRAFT ACTION</span>
            <h4>문서 초안 재생성</h4>
          </div>
          <button onClick={regenerateDocuments}>문서 초안 재생성</button>
        </div>
        <p className="small-note">재생성은 Draft만 갱신하며, Master DB에는 반영하지 않습니다.</p>
      </section>

      <EstimatePreview draft={draft} />
      <ScheduleDraftPreview draft={draft} />
      <DocumentPreview draft={draft} />
    </div>
  );
}
