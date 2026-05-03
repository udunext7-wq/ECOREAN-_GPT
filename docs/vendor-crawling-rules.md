# Vendor Crawling Rules

## Scope

This is not an automated crawler implementation.

This document defines legal and operational collection rules for Seoul and Gyeonggi vendor candidates.

## Target Categories

1. 타일 매장 / 타일 도매
2. 타일 부자재
3. 방수재 대리점
4. 욕실 도기 / 욕실 자재
5. 욕실장 / 샤워부스
6. 창호 업체
7. 유리 업체
8. 실란트 / 코킹 업체
9. 전기 자재
10. 조명 자재
11. 폐기물 처리
12. 목재 / 합판 / MDF
13. 도배 / 바닥재 / 필름 자재
14. 주방가구 / 싱크 / 상판

## Allowed Collection

- vendor name
- public business phone
- public business address
- official website
- source URL
- handled items
- handled brands
- service area
- business hours
- delivery/install/wholesale availability if publicly stated

## Prohibited

- personal mobile numbers
- personal email addresses
- private Kakao IDs
- prices scraped from websites for Master DB use
- bulk scraping against site rules
- collecting resident or financial information

## Robot and Terms Rule

Before automated collection:

1. Check robots.txt.
2. Check site terms.
3. Prefer official APIs or manual export.
4. Avoid login-only data.
5. Avoid high-frequency requests.

## Candidate Rule

Collected vendors enter Candidate DB first.

Vendor Master update is allowed only after manual verification.
