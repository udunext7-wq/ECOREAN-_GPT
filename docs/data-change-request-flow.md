# Data Change Request Flow

목적: 데이터 입력, 수정, 삭제를 모두 변경 요청 기반으로 처리하여 Living Master DB의 신뢰성을 유지한다.

## 생성 흐름

1. 사용자가 Admin 화면에서 항목을 선택한다.
2. 직접 수정 대신 `변경 요청 생성`을 누른다.
3. 변경 전 값과 변경 후 값을 비교한다.
4. 변경 이유, 출처, 증빙, 영향 분석을 입력한다.
5. Approval Required Queue에 등록한다.
6. 대표 승인 후 Master DB에 반영한다.
7. 반영 직전 rollback snapshot을 저장한다.
8. Approval Log와 Change History에 기록한다.

## 삭제 흐름

삭제는 실제 삭제하지 않고 `ARCHIVED` 상태로 전환한다.

- 공정 삭제 시 연결 견적, 공정표, 발주표, 현금흐름 영향을 표시한다.
- 단가 삭제 시 해당 단가를 사용한 견적과 Case Library 링크를 표시한다.
- 거래처 삭제 시 blacklist 또는 rejected 여부를 남긴다.

## 필수 Change Request 필드

- requestId
- targetDb
- targetItemId
- changeType: CREATE / UPDATE / ARCHIVE / IMPORT / DELETE_REQUEST
- currentValue
- proposedValue
- changeReason
- sourceType
- sourceName
- sourceDate
- evidence
- impactAnalysis
- rollbackRequired
- rollbackData
- approvalStatus
- requestedBy
- approvedBy
- appliedAt

