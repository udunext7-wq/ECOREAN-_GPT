# 3D Ontology Visualization Spec

## 1. 목적

ECOREAN 자동견적 OS의 온톨로지는 2D 목록이나 표만으로 관리하지 않는다.

공정, 자재, 부자재, 인력, 발주, 결제, 검수, 하자, 현금흐름, Case Library의 관계를 3D 그래프 시각화로 확인하고 관리할 수 있어야 한다.

목표는 복잡한 인테리어 공정 관계를 시각적으로 이해하고 다음 문제를 빠르게 발견하는 것이다.

```text
누락 공정
선후행 오류
발주 누락
결제 조건 누락
하자 리스크
실제 원가 오차
승인 누락
```

## 2. 초기 구현 방향

초기 구현은 웹 기반 3D 그래프 시각화로 설계한다.

후보 기술:

```text
Three.js
React Three Fiber
3d-force-graph
Neo4j 연동 가능 구조
```

현재 단계에서는 코드를 구현하지 않는다.

## 3. 3D 그래프 데이터 구조

```ts
type Ontology3DGraph = {
  graphId: string;
  projectId?: string;
  nodes: Ontology3DNode[];
  links: Ontology3DLink[];
  diagnostics: GraphDiagnostic[];
};
```

```ts
type Ontology3DNode = {
  id: string;
  type:
    | 'Project'
    | 'Space'
    | 'Process'
    | 'Material'
    | 'AccessoryMaterial'
    | 'LaborCrew'
    | 'PurchaseOrder'
    | 'PaymentMilestone'
    | 'Inspection'
    | 'Defect'
    | 'Risk'
    | 'Cashflow'
    | 'Case';
  label: string;
  group: string;
  status: 'normal' | 'missingData' | 'risk' | 'blocked' | 'needsApproval' | 'completed';
  sourceId?: string;
  masterDbLinked: boolean;
  caseLibraryLinked: boolean;
  customerVisible?: boolean;
  internalOnly?: boolean;
  metrics?: {
    estimatedCost?: number | 'NEEDS_RESEARCH' | 'UNKNOWN';
    actualCost?: number | 'UNKNOWN';
    variance?: number | 'UNKNOWN';
    estimatedDuration?: number | 'NEEDS_RESEARCH' | 'UNKNOWN';
    actualDuration?: number | 'UNKNOWN';
  };
};
```

```ts
type Ontology3DLink = {
  id: string;
  source: string;
  target: string;
  relation:
    | 'PRECEDES'
    | 'DEPENDS_ON'
    | 'USES_MATERIAL'
    | 'USES_ACCESSORY'
    | 'REQUIRES_LABOR'
    | 'REQUIRES_PURCHASE_ORDER'
    | 'TRIGGERS_PAYMENT'
    | 'NEEDS_INSPECTION'
    | 'HAS_RISK'
    | 'AFFECTS_CASHFLOW'
    | 'COMPARED_WITH_ACTUAL';
  required: boolean;
  status: 'normal' | 'warning' | 'blocked' | 'missing' | 'delayed' | 'needsApproval';
  weight?: number;
  label?: string;
};
```

## 4. 필수 기능

```text
확대/축소
회전
노드 검색
공정별 필터
공간별 필터
문서별 필터
리스크 노드 강조
누락 데이터 강조
선후행 충돌 강조
발주 지연 위험 강조
결제 마일스톤 강조
```

## 5. 노드 클릭 시 표시 정보

노드를 클릭하면 오른쪽 패널 또는 하단 패널에 다음 정보를 표시한다.

```text
기본 정보
연결 공정
연결 자재
연결 부자재
연결 인력
연결 문서
예상 비용
실제 비용
차이 원인
승인 여부
Master DB 반영 여부
Case Library 반영 여부
```

## 6. 대표 뷰

### Project View

프로젝트 전체 운영 흐름을 본다.

```text
견적
공정
발주
수금
현금흐름
검수
하자
Case
```

### Process View

공정 중심으로 본다.

```text
선행공정
후행공정
자재
부자재
인력
발주
검수
리스크
```

### Risk View

문제 노드만 강조한다.

```text
누락 데이터
발주 지연
선후행 충돌
결제 조건 누락
하자 위험
승인 대기
```

### Case View

예상과 실제의 차이를 본다.

```text
예상 비용
실제 비용
오차
원인
보정 후보
승인 상태
```

## 7. Neo4j 연동 고려

Neo4j 연동 시:

```text
Node Label -> node.type
Relationship Type -> link.relation
Properties -> node/link metadata
Cypher Query -> 필터 및 탐색 조건
```

초기에는 JSON 그래프 데이터로 시작하고, 이후 Neo4j 쿼리 결과를 같은 3D 그래프 포맷으로 변환한다.

