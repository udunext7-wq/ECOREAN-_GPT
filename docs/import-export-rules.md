# Import Export Rules

목적: JSON, Excel, CSV로 데이터를 가져오거나 내보낼 때 Master DB 안정성을 유지한다.

## Import 지원 형식

- JSON Import
- Excel Import
- CSV Import

## Export 지원 형식

- JSON Export
- Excel Export
- CSV Export

## Import 흐름

1. 파일 업로드
2. 스키마 검증
3. 필수 필드 누락 검사
4. 중복 itemId/vendorId/brandId 검사
5. 상태값 검사
6. Preview 생성
7. Change Request 묶음 생성
8. 대표 승인
9. rollback snapshot 생성
10. Master DB 반영

## Import 차단 기준

- 필수 ID 누락
- 상태값이 허용 enum 밖에 있음
- 가격 출처 없이 단가가 입력됨
- supplier/internal 가격이 source 없이 입력됨
- rollbackData 생성 불가
- 고객용 데이터와 내부용 데이터 혼합

## Export 원칙

Export는 읽기 작업이므로 승인 없이 가능하다.  
단, 내부 공급가와 internalPrice가 포함된 Export는 `대표 검토용` 또는 `내부용`으로 분류한다.

## 예비 견적 Export

단가가 `UNKNOWN` 또는 `NEEDS_RESEARCH`인 항목이 포함되면 파일 상단에 다음 상태를 표시한다.

`이 문서는 확정 견적이 아니라 예비 견적입니다. 실제 단가 입력 및 대표 승인 후 확정됩니다.`

