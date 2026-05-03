# ECOREAN 공정 온톨로지 스키마

## 1. 목적

공정 온톨로지는 ECOREAN 자동견적 OS에서 공정, 공간, 자재, 인력, 장비, 조건, 일정, 리스크의 관계를 정의하는 구조다.

온톨로지의 목적은 다음과 같다.

- 자동 공정 추천
- 누락 공정 탐지
- 공정 순서 자동 생성
- 자재 발주표 자동 생성
- 인력 투입표 자동 생성
- 현장 리스크 탐지
- AI 판단 근거 제공

## 2. 기본 개념

공정은 독립적으로 존재하지 않는다.

공정은 항상 다음 요소와 연결된다.

```text
공간
자재
인력
장비
선행공정
후행공정
조건
리스크
출력물
```

## 3. 온톨로지 노드

### Process

시공 공정이다.

예:

```text
철거
방수
타일
목공
전기
설비
도장
도배
가구
창호
```

### Space

공정이 적용되는 공간이다.

예:

```text
거실
주방
욕실
방
현관
베란다
상가 홀
사무실
```

### Material

공정에 필요한 자재다.

예:

```text
타일
압착시멘트
석고보드
LGS
전선
배관
도기
마루
필름
도장재
```

### LaborRole

공정 수행에 필요한 인력 역할이다.

예:

```text
철거공
목공
전기공
설비공
타일공
도장공
필름공
가구공
현장관리자
조공
```

### Equipment

공정 수행에 필요한 장비다.

예:

```text
사다리차
양중장비
레이저레벨기
절단기
타일커터
콤프레셔
집진기
```

### Condition

공정 포함 여부나 난이도를 바꾸는 조건이다.

예:

```text
엘리베이터 없음
3층 초과
야간공사
주방 위치 변경
욕실 전체 철거
층고 높음
누수 이력
관리사무소 작업 제한
```

### Risk

공정에서 발생 가능한 리스크다.

예:

```text
누수
구배 불량
일정 지연
자재 파손
소음 민원
추가 철거
원가 초과
재시공
```

### Output

공정 정보가 반영되는 출력물이다.

예:

```text
고객용 견적서
내부 원가표
공정별 마진표
자재 발주표
공정표
인력 투입표
현장 체크리스트
```

## 4. 온톨로지 관계

### appliesToSpace

공정이 적용되는 공간이다.

```text
욕실 바닥 타일 -> 욕실
주방 싱크 배관 -> 주방
강마루 시공 -> 거실, 방
```

### requiresMaterial

공정에 필요한 자재다.

```text
욕실 타일 -> 타일, 압착시멘트, 줄눈재
석고보드 천장 -> 석고보드, LGS, 피스
```

### requiresLabor

공정에 필요한 인력이다.

```text
욕실 타일 -> 타일공, 조공
전기 배선 -> 전기공
가구 설치 -> 가구공
```

### requiresEquipment

공정에 필요한 장비다.

```text
고층 자재 반입 -> 사다리차
타일 절단 -> 타일커터
```

### requiresBefore

선행공정이다.

```text
타일 -> 방수
도장 -> 퍼티
도기 설치 -> 타일
```

### followedBy

후행공정이다.

```text
방수 -> 타일
타일 -> 줄눈
줄눈 -> 도기 설치
```

### triggeredByCondition

특정 조건에 의해 공정이 포함된다.

```text
엘리베이터 없음 + 3층 초과 -> 사다리차
주방 위치 변경 -> 급배수 이설
욕실 전체 철거 -> 폐기물 처리
```

### createsRisk

공정 또는 조건이 만드는 리스크다.

```text
방수 미흡 -> 누수
촉박한 일정 -> 품질 저하
고급 자재 -> 파손 리스크
```

### appearsInOutput

공정이 반영되는 출력물이다.

```text
타일 -> 고객용 견적서, 내부 원가표, 자재 발주표, 공정표
방수 -> 내부 원가표, 공정표, 현장 체크리스트
```

## 5. 온톨로지 관계 스키마

```ts
type OntologyNodeType =
  | 'Process'
  | 'Space'
  | 'Material'
  | 'LaborRole'
  | 'Equipment'
  | 'Condition'
  | 'Risk'
  | 'Output';

type OntologyRelationType =
  | 'appliesToSpace'
  | 'requiresMaterial'
  | 'requiresLabor'
  | 'requiresEquipment'
  | 'requiresBefore'
  | 'followedBy'
  | 'triggeredByCondition'
  | 'createsRisk'
  | 'appearsInOutput';

type OntologyNode = {
  id: string;
  type: OntologyNodeType;
  name: string;
  description?: string;
  tags?: string[];
};

type OntologyEdge = {
  from: string;
  to: string;
  relation: OntologyRelationType;
  required: boolean;
  weight?: number;
  condition?: string;
  note?: string;
};

type ProcessOntology = {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
};
```

## 6. 공정별 온톨로지 연결 예시

```json
{
  "nodes": [
    {
      "id": "process.WET_TILE_BATH_FLOOR",
      "type": "Process",
      "name": "욕실 바닥 타일"
    },
    {
      "id": "space.bathroom",
      "type": "Space",
      "name": "욕실"
    },
    {
      "id": "material.porcelain_tile",
      "type": "Material",
      "name": "포세린 타일"
    },
    {
      "id": "labor.tile_worker",
      "type": "LaborRole",
      "name": "타일공"
    },
    {
      "id": "process.WET_WATERPROOF_BATH_FLOOR",
      "type": "Process",
      "name": "욕실 바닥 방수"
    },
    {
      "id": "risk.water_leak",
      "type": "Risk",
      "name": "누수"
    }
  ],
  "edges": [
    {
      "from": "process.WET_TILE_BATH_FLOOR",
      "to": "space.bathroom",
      "relation": "appliesToSpace",
      "required": true
    },
    {
      "from": "process.WET_TILE_BATH_FLOOR",
      "to": "material.porcelain_tile",
      "relation": "requiresMaterial",
      "required": true
    },
    {
      "from": "process.WET_TILE_BATH_FLOOR",
      "to": "labor.tile_worker",
      "relation": "requiresLabor",
      "required": true
    },
    {
      "from": "process.WET_TILE_BATH_FLOOR",
      "to": "process.WET_WATERPROOF_BATH_FLOOR",
      "relation": "requiresBefore",
      "required": true
    },
    {
      "from": "process.WET_TILE_BATH_FLOOR",
      "to": "risk.water_leak",
      "relation": "createsRisk",
      "required": false,
      "condition": "방수 불량 또는 구배 불량"
    }
  ]
}
```

## 7. 온톨로지 기반 자동견적 흐름

```text
사용자 입력
-> 공간과 조건 분석
-> 관련 공정 후보 탐색
-> triggerType 적용
-> 선행/후행 공정 자동 보강
-> 자재/인력/장비 연결
-> 수량 산출
-> 옵션 보정
-> 가격 계산
-> 공정표 생성
-> 고객용/내부용 출력 분리
```

## 8. AI 판단에 사용하는 방식

AI는 온톨로지를 통해 다음 질문에 답해야 한다.

```text
이 공간에는 어떤 공정이 필요한가?
이 공정을 하려면 어떤 선행공정이 필요한가?
이 옵션을 선택하면 어떤 자재와 인력이 바뀌는가?
이 조건이면 어떤 추가 공정이 발생하는가?
이 견적에서 누락 가능성이 높은 공정은 무엇인가?
이 공정은 고객 견적서에 보여야 하는가, 내부표에만 보여야 하는가?
이 공정의 리스크는 무엇이고 누가 관리해야 하는가?
```

## 9. 운영 원칙

온톨로지는 한 번 만들고 끝나는 자료가 아니다.

현장 결과와 피드백에 따라 계속 업데이트되어야 한다.

업데이트 기준:

- 누락 공정이 반복 발생한 경우
- 실제 원가가 기준 원가와 반복적으로 차이 나는 경우
- 특정 조건에서 일정 지연이 반복되는 경우
- 자재 발주 누락이 발생한 경우
- 클레임 또는 재시공 원인이 반복되는 경우

## 10. 결론

ECOREAN 자동견적 OS에서 공정 온톨로지는 AI 판단의 기반이다.

Master DB가 가격과 기준값을 관리한다면, 온톨로지는 의미와 관계를 관리한다.

둘이 결합될 때 자동견적 OS는 단순 견적 프로그램이 아니라 BOC의 판단 엔진이 된다.

