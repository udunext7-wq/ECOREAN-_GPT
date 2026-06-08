# RC-0.3.6 Price Calibration UX Report

## 개요

- Version: RC-0.3.6
- Branch: `rc-0.3.6-price-calibration-ux`
- Baseline: `v0.3.5-rc-packaged`
- 목적: READY / PARTIAL / NEEDS_UPDATE 단가 준비 영향 결과를 보정 우선순위와 실제 단가 보정 Queue로 연결

## 추가된 흐름

```text
price readiness impact
→ priority item
→ calibration task
→ price update queue
→ approval
→ backup
→ master data apply
```

## 우선순위 결과

| 견적 유형 | READY | PARTIAL | NEEDS_UPDATE |
| --- | --- | --- | --- |
| BATHROOM | LOW / 견적 진행 가능 | MEDIUM / 대표 검토 필요 | BLOCKING / 즉시 보정 필요 |
| KITCHEN | LOW / 견적 진행 가능 | HIGH / 견적 전 보정 권장 | BLOCKING / 즉시 보정 필요 |
| FULL_REMODELING | LOW / 견적 진행 가능 | HIGH / 견적 전 보정 권장 | BLOCKING / 즉시 보정 필요 |

## Master Data 보호

단가 보정 우선순위 센터는 `price_calibration_priority_tasks`에만 작업을 기록합니다.

Master Data 가격 변경은 기존 실제 단가 보정 센터의 승인 및 백업 후 반영 흐름에서만 수행됩니다.

## 고객 안전성

고객용 payload에는 다음 정보가 포함되지 않아야 합니다.

- 내부 단가
- margin
- PCE
- vendor / labor / purchase data
- variance
- calibration task
- approval queue
- risk score

## 최종 판정

RC-0.3.6 Price Calibration UX는 실제 단가 보정 우선순위를 운영자가 확인하고 Queue로 연결하기 위한 시작 흐름으로 사용 가능합니다.

## 안정화 판정

- Stabilization decision: `MERGE_READY`
- BATHROOM PARTIAL: `대표 검토 필요`
- KITCHEN PARTIAL: `견적 전 보정 권장`
- FULL_REMODELING PARTIAL: `견적 전 보정 권장`
- NEEDS_UPDATE: `즉시 보정 필요`
- Master Data 직접 변경 방지: PASSED
- Customer safety: PASSED
- Release smoke cwd/path verification: PASSED
