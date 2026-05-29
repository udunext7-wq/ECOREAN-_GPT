# RC-0.3.1 Next Roadmap

이 문서는 다음 버전 후보를 정리한다. RC-0.3.0에는 구현하지 않는다.

## RC-0.3.1

- XLSX direct import
- price import matching polish
- UI wording/spacing polish
- packaged app metadata cleanup
- bundle size optimization
- bugfix release
- release docs wording polish
- 첫 운영 데이터 입력 테스트 결과 반영:
  - 미매칭 단가표 행의 수동 매칭 UX는 RC-0.3.1에서 1차 개선 완료
  - Vite bundle size warning은 비차단 최적화 후보로 유지
  - S1/S2 차단 이슈는 현재 없음

### RC-0.3.1 완료

- Operational Data Onboarding Flow
- First Operational Data Onboarding Test
- Price Workbook Import 미매칭/다중매칭 행 수동 매칭 UX
- Master Data 후보 검색
- 수동 매칭 저장 / 매칭 해제 / 행 제외
- Queue 생성 가능 여부 요약
- 수동 매칭 로그 기록

## RC-0.3.1 안정화 판정

- Merge readiness: `MERGE_READY`
- S1/S2: 없음
- 고객 안전성: 통과
- RC-0.3.1 온보딩 / 단가표 수동 매칭 / LightBIM / PCE 흐름: 통과

## RC-0.3.1 유예 항목

- XLSX direct parsing
- advanced fuzzy matching
- unmatched row에서 신규 Master Data 자동 생성
- Vite bundle optimization
- packaged app metadata cleanup

## RC-0.4.0

- LightBIM object editing improvement
- better DXF import/export
- multi-project dashboard polish
- accounting pre-layer
- collaboration preparation
- customer portal deployment planning
- advanced backup verification workflow

## RC-1.0

- real company use hardening
- installer/signing
- auto-update strategy
- backup/restore fully verified
- customer portal deployment strategy
- production data migration policy
- operational monitoring and audit policy

## 운영 원칙

RC-0.3.0은 고정된 운영 기준선이다.

- 작은 수정은 RC-0.3.1
- 큰 기능은 RC-0.4.0
- 실제 회사 운영 하드닝은 RC-1.0
