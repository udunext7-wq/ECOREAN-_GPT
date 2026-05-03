# Estimate Creation Flow

목적: 최소 입력값에서 예비 견적, 공정표 초안, 발주 필요 항목, NEEDS_CONFIRMATION, 문서 초안을 생성한다.

## 흐름

1. New Estimate Wizard에서 최소 입력값을 받는다.
2. Input Normalizer가 시스템 키로 변환한다.
3. Preset Engine이 프로젝트 유형별 기본 공정 후보를 만든다.
4. Rule Engine이 AUTO / SELECT / QTY / CONDITIONAL을 판단한다.
5. 불확실한 항목은 자동 확정하지 않고 NEEDS_CONFIRMATION으로 분리한다.
6. Default Spec Engine이 마감 등급과 예산 수준에 맞는 기본 사양을 붙인다.
7. Estimate Preview가 예비 견적과 단가 누락 경고를 표시한다.
8. Schedule Draft Preview가 선후행, 발주 리드타임, 검수 포인트를 표시한다.
9. Document Preview가 고객용/내부용 문서 초안을 분리한다.

## 직접 Master DB 반영 금지

견적 생성 과정에서 Master DB는 변경하지 않는다.  
견적 중 발견된 누락 단가와 보정 후보는 Approval Required Queue로 이동한다.

