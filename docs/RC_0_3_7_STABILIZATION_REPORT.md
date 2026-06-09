# RC-0.3.7 실제 단가 보정 UX 안정화 리포트

## 기준

- Branch: `rc-0.3.7-real-price-calibration-ux`
- Latest implementation commit: `5f21a6f`
- Base tag: `v0.3.6-rc-packaged`
- Main merge: not performed
- RC-0.3.7 tag: not created

## 구현 화면 / 서비스

- `RealPriceCalibrationWorkbenchView`
- `realPriceCalibrationWorkbenchService`
- Electron IPC / preload / UI type bridge
- CEO Dashboard, Drawer navigation, 실제 단가 보정, 단가 보정 우선순위, 단가표 가져오기, 기준 데이터 관리 진입점

## Queue 상태 흐름

`PENDING_REVIEW`에서 대표 검토 후 `APPROVED`, `REJECTED`, `DEFERRED` 중 하나로 전환한다. `APPROVED` 항목만 백업 성공 후 `APPLIED`로 전환한다.

## 안정화 결과

- Queue summary: PASSED
- Queue list/detail: PASSED
- 승인: PASSED
- 반려 및 사유 기록: PASSED
- 보류 및 사유 기록: PASSED
- PENDING_REVIEW 직접 반영 차단: PASSED
- 승인 전 Master Data 변경 방지: PASSED
- 승인 후 backup 전 Master Data 변경 방지: PASSED
- Backup 성공 후 반영: PASSED
- Old/new 가격 및 backup id history 기록: PASSED
- Linked priority task 상태 갱신: PASSED
- CEO Dashboard / Drawer / 관련 센터 진입점: PASSED
- Customer safety: PASSED
- Workbench report: PASSED

## 수정 이슈

- SQLite `CASE` 정렬식의 문자열 따옴표를 SQLite 호환 단일 따옴표로 수정했다.
- CEO Dashboard의 실제 단가 보정 워크벤치 진입점 누락을 보완했다.

## 발견 이슈

- 미해결 S1/S2 없음.

## Deferred

- 고급 bulk approval UX
- 증빙 파일 미리보기
- 복수 queue 비교 화면
- Vite bundle splitting

## Merge Readiness

`MERGE_READY`

승인, 백업, history 없이 Master Data가 변경되지 않으며 고객 payload에 queue와 내부 가격 정보가 노출되지 않는다.
