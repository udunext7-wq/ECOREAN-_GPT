# Preliminary Estimate Rules

## 예비 견적 조건

다음 중 하나라도 있으면 견적은 `예비 견적`으로 표시한다.

- 단가가 `UNKNOWN`
- 단가가 `NEEDS_RESEARCH`
- 인건비 DB가 `EMPTY`
- 거래처 공급가가 `VERIFIED` 전
- NEEDS_CONFIRMATION 항목이 남아 있음
- 발주 리드타임이 확정되지 않음

## 시스템 동작

- 견적 생성을 차단하지 않는다.
- 고객용 문서에는 확정 전 안내를 표시한다.
- 내부용 문서에는 누락 단가, 리스크, 확인 항목을 표시한다.
- Master DB에는 아무 값도 자동 반영하지 않는다.

