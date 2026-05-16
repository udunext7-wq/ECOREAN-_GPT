# Claude Code 킥오프 — ECOREAN MiniCAD v5.8

> 이 문서는 Claude Code가 미니캐드 작업을 시작하기 위한 **단 하나의 인계 자료**.
> 헌법·DB·전체 시스템 비전은 메인 ecorean-os 참조 (이 문서엔 없음).

---

## 1. 미니캐드 책임 범위 (절대 확장 금지)

미니캐드는 **도구**다. 책임은 단 두 가지:

1. **다른 프로그램(메인 ecorean-os, T2I/T2V 모델, EstimateEngine)이 파싱하기 좋은 출력**
2. **견적 산출 효율성** (도면 → 자재량 → 견적 입력)

그 외 일체 — 시스템 헌법·로드맵·전체 비전·DB 관리·엔진 13개·승인 플로우 등 — 은 **메인 ecorean-os**가 관리. 미니캐드 안에서 다루지 말 것.

## 2. 파일 위치

- **코드**: `ecorean_minicad_v5_8.html` (단일 HTML, ~4,939줄, ~251KB)
- **메인 OS 참조**:
  - GitHub: `https://github.com/udunext7-wq/ecorean-os`
  - 로컬: `C:\Users\udune\ecorean-os`
  - 메인 OS의 헌법·테스트 표준·DB 스키마는 그쪽에 있음. 미니캐드 작업 시 충돌 없는지만 확인.

## 3. v5.6 → v5.7 → v5.8 변경 요약

코드 정독 전에 맥락만 파악:

### v5.7 (~+563줄)
- **버그 수정 3건**: loadJSON 데이터 손실(circles/arcs/hvac), 다중 선택 일괄 변환 미작동, 미러 시 라이브러리 shape 좌우반전 안 됨
- **2.5D 토글 신규**: 헤더 `◐ 2.5D` 버튼. 기본 OFF (시공 정확도 우선). 인쇄·JSON·AI번들 export 시 강제 OFF + 자동 복구
- **AI 생성 파이프라인 SSoT**: JSON 스키마 v5.3 → v5.7. `meta.aiPromptHints`(style/mood/lighting/palette/camera) + `meta.videoSequence` + 객체별 `semanticTag`/`promptKeyword`/`placement` + `relationships` 그래프 + `indices` 색인
- **`exportAIBundle()` 신규**: 평면 PNG + JSON + 이미지프롬프트.txt + 영상프롬프트.txt 4종 동시 다운로드
- `SEMANTIC_MAP` 핵심 41종 영문 키워드 등록 (75종 전체 매핑은 v5.9 작업)

### v5.8 (~+214줄)
- **공간 변 스냅** (`snapPointToSpaceEdges`): 공간 드래그 시 폴리곤 모든 점이 다른 공간 변에 자동 흡착 (200mm 이내)
- **라이브러리 객체 드래그 버그 수정**: mousedown 핸들러에서 group 자식 노드가 hit되면 부모 group 탐색 → `id` 정상 인식
- **벽 교차 자동 vertex 분할** (`splitWallsAtIntersections`): 새 벽 추가 시 모든 교차점에서 4개 작은 벽으로 분할. 끝점 50mm 이내는 무시 (이미 vertex). 안전장치 20회
- **견적 공정별 분류**: 기존 "공간별 면적 표"를 "공정별 합산 표"로 교체 (CAT_ORDER 기반)
- **자재 드롭다운**: `FLOOR_MATERIALS` 14종 + `WALL_MATERIALS` 15종 + `defaultMaterials(spaceType)` 공간 타입별 자동 적용. JSON에도 출력

## 4. 헌법 핵심 (메인 OS의 부분 참조)

미니캐드 작업 시 절대 어기지 말 것 — 메인 OS 헌법에서 추린 미니캐드 적용분:

- **mm 정수만 사용** (소수점 좌표 금지)
- **단가 추정 절대 금지** → `NEEDS_RESEARCH`
- **방수 = `CONDITIONAL`만 허용** (AUTO 금지)
- **`NEEDS_CONFIRMATION` 누락 금지** (모호 시 명시)
- **TDD 강제** — 테스트 통과 안 한 코드 커밋 금지
- **AI 파싱 친화 SSoT 원칙** — 모든 출력은 JSON 평면 모드 기본. 2.5D는 영업 토글만, 인쇄·JSON·AI번들 시 강제 OFF
- **저작권** — `promptKeyword`에 브랜드명 (Eames, Hermès 등) 금지. 일반명사만

## 5. 첫 작업 (필수)

### Task 0 — `HANDOVER_v5_8.md` 본인이 작성

이 킥오프 + v5.8 코드 정독 후, **다음 양식으로 `HANDOVER_v5_8.md`를 본인이 작성**할 것. 양식은 v5.9·v5.10·v6.0에도 재사용 → 표준화 목표.

**HANDOVER 양식 (제안 — Claude Code 판단으로 개선 가능):**

```markdown
# HANDOVER vX.Y — ECOREAN MiniCAD

## 현재 상태
- 줄수 / 크기 / 마지막 수정 시각
- v(이전) → v(현재) 변경 카운트

## 변경 사항
- 신규 함수 / 수정 함수 / 제거 함수 목록
- 각 변경의 위치 (줄 번호) + 의도

## 검증 결과
- JS 문법 체크 (node --check)
- 수동 테스트 결과 (UI 기능별)
- 알려진 미해결 이슈

## 다음 작업 큐
- 우선순위·예상 변경량·의존성

## 헌법 위반 자가 점검
- mm 정수 / 단가 추정 / 방수 / TDD / SSoT 항목별 체크
```

## 6. 다음 작업 큐 (Task 0 이후)

### 🔴 Task 1 — 라이브러리 영문 키워드 75종 완성
- 현재 `SEMANTIC_MAP`에 41종만 등록. 나머지 34종 (FURNITURE_LIB 잔여 + LIGHT_LIB 잔여 + ELECTRIC_LIB 잔여 + HVAC_FIRE_LIB 잔여) 영문 `kw` + `tag` 채울 것
- 출력 영향: `exportAIBundle`의 `image_prompts.txt`에 모든 객체가 영문으로 변환됨 (현재는 fallback으로 type 코드 그대로 노출)
- 저작권: 일반명사만, 브랜드명 금지

### 🔴 Task 2 — 자체 테스트 스위트 (TDD 헌법 준수)
- v5.7~v5.8에서 도입된 11개 신규/수정 함수에 대한 단위 테스트
- 함수: `darkenHex`, `semanticOf`, `findContainingSpace`, `pointInPolygon`, `placementOf`, `findNearestWallId`, `migrateLoadedState`, `exportAIBundle` (조립 부분), `snapPointToSpaceEdges`, `splitWallsAtIntersections`, `defaultMaterials`
- HTML 안에 `?test=1` 쿼리 시 테스트 러너 실행 → 결과 콘솔 출력 + UI 토스트
- 통과 못 한 함수가 있으면 커밋 금지 (헌법)

### 🟡 Task 3 — DXF import/export
- AutoCAD 표준 호환. 외주 인테리어 업체에 도면 인계 가능
- 라이브러리: `dxf-parser` (CDN) 또는 자체 파서

### 🟡 Task 4 — 영상 시퀀스 동선 드래그 편집 UI
- 현재 `meta.videoSequence.walkthrough`는 면적 큰 순 자동. 사용자가 순서 드래그 조정 가능하게
- JSON 패널 안에 작은 리스트 + 드래그 핸들

### 🟢 Task 5 — 마이그레이션 강화
- v5.0~v5.6 저장 파일 자동 마이그레이션 시 `floorMaterial`/`wallMaterial`/`flipped` 보충

## 7. 작업 시작 시 절차 (TDD 헌법)

1. 본 킥오프 정독
2. v5.8 HTML 코드 전체 1회 통독 (검색 가능 상태로)
3. 메인 ecorean-os의 헌법 문서 위치 확인 (충돌 검토용)
4. `HANDOVER_v5_8.md` 작성 (Task 0)
5. 작업 1개 선택 → **테스트 케이스 먼저 작성** → 코드 → 통과 확인 → 커밋
6. 매 커밋마다 `HANDOVER` 갱신
7. 버그 발견 시 즉시 수정 제안 (대표님께 보고). 버그 있는 코드 커밋 절대 금지

## 8. 의문 발생 시

대표님께 질문할 것. 추측·자체 결정·임의 단가 추정 금지.

특히:
- 단가 관련 어떤 결정도 → `NEEDS_RESEARCH`
- 방수 자동 결정 시도 → `CONDITIONAL` 강제
- 영문 키워드 모호 → `NEEDS_CONFIRMATION`

---

**대표님 호칭은 항상 "대표님". 사고 프레임워크는 First Principles. 답변 형식은 모드A(구조 설계) 또는 모드B(실무 직답) — 메인 OS의 시스템 프롬프트 표준 따를 것.**
