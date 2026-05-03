# ECOREAN Ontology Graph Schema

## 1. 목적

ECOREAN 자동견적 OS는 단순 견적 프로그램이 아니라 온톨로지 기반 지식 그래프를 중심으로 설계한다.

그래프의 목적은 다음 요소를 연결하는 것이다.

- 공간
- 공정
- 자재
- 부자재
- 인력
- 장비
- 옵션
- 현장 조건
- 단가
- 공정표
- 실제 사례
- 리스크
- 출력 문서

이 구조는 향후 Neo4j 같은 그래프 DB로 이전 가능해야 하며, AI가 공정 누락, 원가 위험, 일정 충돌, 실제 결과 오차를 판단할 수 있는 기반이 된다.

## 2. 설계 원칙

```text
1. 온톨로지는 공정/자재/인력/조건의 관계를 정의한다.
2. Master DB는 가격, 품수, 자재, 부자재, 옵션 가격을 관리한다.
3. Rule Engine은 반드시 지켜야 하는 견적 규칙을 강제한다.
4. Case Library는 실제 현장 결과를 저장한다.
5. ML Layer는 처음부터 견적을 생성하지 않고 예상값과 실제값의 오차를 보정한다.
6. 모든 공정은 공정 중심 + 공간 적용 조건 방식으로 관리한다.
7. 같은 공정이 여러 공간에 적용되면 인건비는 공정별로 통합 계산한다.
```

## 3. 노드 유형

```ts
type GraphNodeType =
  | 'Space'
  | 'Process'
  | 'Material'
  | 'AccessoryMaterial'
  | 'LaborRole'
  | 'Equipment'
  | 'Option'
  | 'Condition'
  | 'Price'
  | 'Schedule'
  | 'Case'
  | 'Risk'
  | 'OutputDocument';
```

## 4. 관계 유형

```ts
type GraphRelationType =
  | 'REQUIRES'
  | 'PRECEDES'
  | 'FOLLOWS'
  | 'DEPENDS_ON'
  | 'USES'
  | 'HAS_OPTION'
  | 'HAS_DEFAULT_SPEC'
  | 'AFFECTS_PRICE'
  | 'AFFECTS_LABOR'
  | 'AFFECTS_DURATION'
  | 'CONFLICTS_WITH'
  | 'APPLIES_TO_SPACE'
  | 'AGGREGATES_WITH'
  | 'HAS_MINIMUM_LABOR'
  | 'GENERATED_FROM'
  | 'COMPARED_WITH_ACTUAL'
  | 'NEEDS_APPROVAL';
```

## 5. 기본 노드 스키마

```ts
type GraphNode = {
  id: string;
  type: GraphNodeType;
  name: string;
  code?: string;
  sourceModule:
    | 'master-db'
    | 'estimate-engine'
    | 'schedule-engine'
    | 'outputs'
    | 'case-library'
    | 'rule-engine'
    | 'ml-layer';
  status: 'draft' | 'active' | 'deprecated' | 'needsReview';
  version?: string;
  metadata?: Record<string, unknown>;
};
```

## 6. 기본 관계 스키마

```ts
type GraphEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: GraphRelationType;
  required: boolean;
  weight?: number;
  conditionExpression?: string;
  sourceRuleId?: string;
  confidenceLevel?: 'low' | 'medium' | 'high' | 'verified';
  needsApproval?: boolean;
  metadata?: Record<string, unknown>;
};
```

## 7. Process 노드

기존 Master DB의 공정 구조와 연결된다.

```ts
type ProcessNode = GraphNode & {
  type: 'Process';
  processCode: string;
  majorCategory: string;
  middleCategory: string;
  minorCategory: string;
  detailCategory?: string;
  triggerType: 'AUTO' | 'SELECT' | 'QTY' | 'CONDITIONAL';
  quantityFormula: string;
  defaultDuration: number | 'NEEDS_RESEARCH';
  leadTimeDays: number | 'NEEDS_RESEARCH';
  customerVisible: boolean;
  internalOnly: boolean;
};
```

## 8. Space 노드

공간은 공정의 적용 조건이다.

```ts
type SpaceNode = GraphNode & {
  type: 'Space';
  spaceType: string;
  areaFormula?: string;
  wallAreaFormula?: string;
  floorAreaFormula?: string;
  ceilingAreaFormula?: string;
};
```

## 9. Price 노드

단가 출처와 연결된다.

```ts
type PriceNode = GraphNode & {
  type: 'Price';
  priceId: string;
  itemId: string;
  unit: string;
  basePrice: number | 'NEEDS_RESEARCH';
  laborCost: number | 'NEEDS_RESEARCH';
  materialCost: number | 'NEEDS_RESEARCH';
  equipmentCost: number | 'NEEDS_RESEARCH';
  accessoryCost: number | 'NEEDS_RESEARCH';
  wasteRate: number | 'NEEDS_RESEARCH';
  sourceType: 'official' | 'supplier' | 'market' | 'internal';
  sourceName: string;
  sourceDate: string;
  confidenceLevel: 'low' | 'medium' | 'high' | 'verified';
  priceStatus: 'draft' | 'active' | 'outdated' | 'deprecated' | 'needsReview';
  updateCycle: string;
};
```

## 10. Case 노드

실제 현장 사례를 저장한다.

```ts
type CaseNode = GraphNode & {
  type: 'Case';
  caseId: string;
  projectType: string;
  region: string;
  buildingType: string;
  totalArea?: number;
  estimateId: string;
  actualResultId?: string;
  finalMarginRate?: number;
  caseStatus: 'estimated' | 'contracted' | 'inProgress' | 'completed' | 'closed';
};
```

## 11. 핵심 관계 예시

```json
{
  "fromNodeId": "process.BATH_TILE",
  "toNodeId": "space.bathroom",
  "relationType": "APPLIES_TO_SPACE",
  "required": true,
  "conditionExpression": "bathroomWallTileArea + bathroomFloorTileArea > 0"
}
```

```json
{
  "fromNodeId": "process.BATH_TILE",
  "toNodeId": "material.tile",
  "relationType": "REQUIRES",
  "required": true
}
```

```json
{
  "fromNodeId": "process.BATH_TILE",
  "toNodeId": "labor.tile_crew_standard",
  "relationType": "REQUIRES",
  "required": true
}
```

```json
{
  "fromNodeId": "process.BATH_TILE",
  "toNodeId": "process.BATH_WATERPROOF",
  "relationType": "DEPENDS_ON",
  "required": true
}
```

```json
{
  "fromNodeId": "process.BATH_TILE",
  "toNodeId": "process.BATH_JOLLY_CUT",
  "relationType": "AGGREGATES_WITH",
  "required": false,
  "conditionExpression": "sameCrewType == TILE_CREW_STANDARD"
}
```

## 12. Neo4j 이전 고려

Neo4j 이전 시 매핑:

```text
GraphNode -> Node
GraphNode.type -> Label
GraphEdge -> Relationship
GraphEdge.relationType -> Relationship Type
metadata -> Properties
```

예:

```cypher
(:Process {processCode: 'BATH_TILE'})
-[:APPLIES_TO_SPACE {required: true}]->
(:Space {spaceType: '욕실'})
```

## 13. 그래프 질의 예시

```text
욕실에 적용되는 모든 공정은 무엇인가?
타일공정에 필요한 자재와 부자재는 무엇인가?
타일공정과 같은 팀으로 묶을 수 있는 공정은 무엇인가?
방수 없이 타일이 포함된 견적이 있는가?
실제 원가가 예상보다 많이 초과된 공정은 무엇인가?
confidenceLevel이 낮은 단가를 사용한 견적은 무엇인가?
승인 없이 변경된 단가 또는 마진이 있는가?
```

## 14. 그래프 JSON 스키마

```ts
type EcoreanGraphSchema = {
  schemaVersion: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
```

