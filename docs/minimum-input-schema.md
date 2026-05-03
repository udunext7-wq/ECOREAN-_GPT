# Minimum Input Schema

## Purpose

ECOREAN 자동견적 OS는 사용자가 모든 공정과 옵션을 직접 고르는 방식이 아니다.

사용자는 최소 입력값만 제공하고, 시스템은 입력값을 정규화한 뒤 프리셋, 규칙, 기본 사양, 견적, 일정, 문서 생성 엔진을 통과시킨다.

## Required Inputs

| Field | Meaning | Used By |
|---|---|---|
| projectType | 프로젝트 유형 | Preset Engine |
| buildingType | 건물 유형 | Rule Engine, Schedule Engine |
| areaM2 | 면적 제곱미터 | Estimate Engine |
| areaPyeong | 평수 | Estimate Engine |
| constructionScope | 공사 범위 | Preset Engine, Rule Engine |
| spaceComposition | 공간 구성 | Rule Engine, Estimate Engine |
| demolitionScope | 철거 범위 | Rule Engine, Waste/Logistics |
| finishGrade | 마감 등급 | Default Spec Engine |
| budgetLevel | 예산 등급 | Default Spec Engine, Margin |
| occupancyDeadline | 입주/오픈 마감일 | Schedule Engine |
| bathroomCount | 욕실 수 | Preset Engine, Rule Engine |
| kitchenType | 주방 유형 | Preset Engine |
| roomCount | 방 개수 | Estimate Engine |
| balconyCount | 발코니 개수 | Rule Engine |
| windowReplacementScope | 창호 교체 범위 | Rule Engine |
| plumbingModificationScope | 배관 수정 범위 | Rule Engine |
| electricalUpgradeScope | 전기 증설 범위 | Rule Engine |
| knownDefects | 알려진 하자 | Diagnostics, Risk DB |
| siteConstraints | 현장 제약 | Schedule Engine, Logistics |
| clientPriority | 고객 우선순위 | Default Spec, Output |

## Input Lifecycle

```text
Minimum Input
-> Input Normalizer
-> Preset Engine
-> Rule Engine
-> Default Spec Engine
-> Estimate Engine
-> Schedule Engine
-> Document Generator
-> Diagnostics
-> Case Library
```

## Input Status

Each input field may have:

- PROVIDED
- NORMALIZED
- MISSING
- AMBIGUOUS
- NEEDS_CONFIRMATION
- VERIFIED_ON_SITE

## Output From Normalizer

The Input Normalizer must create normalized values:

```json
{
  "normalizedProjectType": "bathroom-remodeling",
  "normalizedAreaM2": "NEEDS_RESEARCH",
  "normalizedAreaPyeong": "NEEDS_RESEARCH",
  "normalizedScopes": {
    "demolition": "NEEDS_RESEARCH",
    "plumbing": "NEEDS_RESEARCH",
    "electrical": "NEEDS_RESEARCH",
    "waterproof": "NEEDS_CONFIRMATION"
  }
}
```

## Rule

If a required input is missing or ambiguous, the system must not create high-risk processes automatically. It must mark related decisions as `NEEDS_CONFIRMATION`.

