# Graph Filter Rules

## 1. 목적

3D 온톨로지 그래프는 복잡하기 때문에 필터를 통해 필요한 관계만 볼 수 있어야 한다.

## 2. 기본 필터

```ts
type GraphFilter = {
  searchText?: string;
  nodeTypes?: string[];
  relationTypes?: string[];
  processIds?: string[];
  spaceTypes?: string[];
  documentTypes?: string[];
  statuses?: string[];
  riskLevels?: string[];
  approvalStatus?: string[];
  priceConfidenceLevels?: string[];
  showOnlyMissingData?: boolean;
  showOnlyConflicts?: boolean;
  showOnlyDelayedOrders?: boolean;
  showOnlyPaymentMilestones?: boolean;
};
```

## 3. 필터 유형

### 노드 검색

```text
공정명
자재명
문서명
프로젝트명
공정 코드
```

### 공정별 필터

```text
철거
설비
방수
타일
전기
도기
마감
검수
```

### 공간별 필터

```text
욕실
주방
현관
발코니
다용도실
거실
방
```

### 문서별 필터

```text
고객용 견적서
내부 원가표
발주서
공정표
공사일보
검수 체크리스트
현금흐름표
하자관리표
```

### 리스크 필터

```text
하자 위험
발주 지연
결제 지연
공정 충돌
누락 데이터
낮은 단가 신뢰도
승인 대기
```

## 4. 필터 결과 동작

```text
선택된 노드와 1-depth 연결 노드 표시
필요 시 2-depth 확장
숨겨진 노드는 투명 처리 또는 제거
중요 경고 노드는 필터와 관계없이 badge 유지
```

## 5. 저장 가능한 뷰

```text
견적 검토 뷰
공정표 검토 뷰
발주 위험 뷰
수금/현금흐름 뷰
하자/리스크 뷰
Case 비교 뷰
승인 대기 뷰
```

## 6. Neo4j 질의 매핑

필터는 나중에 Cypher 조건으로 변환 가능해야 한다.

예:

```text
nodeTypes -> MATCH (n:Process)
relationTypes -> MATCH ()-[r:DEPENDS_ON]->()
spaceTypes -> WHERE n.spaceType IN [...]
approvalStatus -> WHERE n.status = 'needsApproval'
```

