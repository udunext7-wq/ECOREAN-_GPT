# Graph Node Style Rules

## 1. 목적

3D 온톨로지 그래프에서 노드 유형과 상태를 시각적으로 구분하기 위한 스타일 규칙이다.

## 2. 노드 유형별 색상

| Node Type | Color | 의미 |
|---|---|---|
| Project | #C9A84C | 프로젝트 중심 |
| Space | #3B82F6 | 공간 |
| Process | #F59E0B | 공정 |
| Material | #22C55E | 주자재 |
| AccessoryMaterial | #84CC16 | 부자재/소모품 |
| LaborCrew | #A855F7 | 인력/팀 |
| PurchaseOrder | #06B6D4 | 발주 |
| PaymentMilestone | #EAB308 | 결제 마일스톤 |
| Inspection | #14B8A6 | 검수 |
| Defect | #EF4444 | 하자 |
| Risk | #DC2626 | 리스크 |
| Cashflow | #10B981 | 현금흐름 |
| Case | #F8FAFC | 실제 사례 |

## 3. 노드 상태별 표현

```text
normal: 기본 크기, 기본 색상
missingData: 점멸 또는 노란 테두리
risk: 빨간 테두리
blocked: 붉은 불투명 노드
needsApproval: 금색/빨강 이중 테두리
completed: 낮은 채도 또는 체크 표시
```

## 4. 노드 크기 규칙

```text
Project: 가장 큼
Process: 공정 금액 또는 연결 수 기준
Material: 자재 금액 기준
LaborCrew: 품수 기준
PaymentMilestone: 금액 기준
Risk/Defect: severity 기준
Case: 연결된 프로젝트 수 또는 오차 규모 기준
```

## 5. 관계 유형별 선 스타일

| Relation | Style | Color |
|---|---|---|
| PRECEDES | 방향 화살표 | #94A3B8 |
| DEPENDS_ON | 굵은 방향 화살표 | #F97316 |
| USES_MATERIAL | 실선 | #22C55E |
| USES_ACCESSORY | 점선 | #84CC16 |
| REQUIRES_LABOR | 실선 | #A855F7 |
| REQUIRES_PURCHASE_ORDER | 실선 | #06B6D4 |
| TRIGGERS_PAYMENT | 굵은 실선 | #EAB308 |
| NEEDS_INSPECTION | 실선 | #14B8A6 |
| HAS_RISK | 빨간 실선 | #EF4444 |
| AFFECTS_CASHFLOW | 굵은 초록 선 | #10B981 |
| COMPARED_WITH_ACTUAL | 대비 선 | #F8FAFC |

## 6. 강조 규칙

```text
리스크 노드: 항상 상위 레이어
승인 필요 노드: 테두리 강조
누락 데이터 노드: 노란색 점멸
선후행 충돌 링크: 빨간 점선
발주 지연 링크: 청록/빨강 교차 표시
결제 마일스톤: 금색 강조
```

## 7. 클릭 패널 표시 항목

노드 클릭 시 표시:

```text
id
type
label
status
연결 노드 수
연결 공정
연결 자재
연결 인력
연결 문서
예상 비용
실제 비용
차이 원인
승인 여부
Master DB 반영 여부
Case Library 반영 여부
```

