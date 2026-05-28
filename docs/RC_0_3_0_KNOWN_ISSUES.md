# RC-0.3.0 Known Issues

## 비차단 경고

- Vite bundle size warning
- electron-builder description/author metadata warning
- SQLite experimental warning
- Node deprecation warning이 환경에 따라 표시될 수 있음

이 경고들은 RC-0.3.0 운영 기준선 사용을 차단하지 않는다.

## 후속 개선

- XLSX direct import
- price import matching polish
- advanced fuzzy matching
- external DWG/DXF parsing
- full BIM object editor
- cloud backup
- installer/code signing
- auto update
- bundle splitting
- UI wording/spacing polish

## 운영 주의

- 초기 단가는 반드시 실제 단가로 보정해야 한다.
- 단가표 CSV는 가져오기 후 바로 반영되지 않으며 승인/백업/반영 절차를 거쳐야 한다.
- 고객용 출력 전 내부정보 노출 검사를 수행해야 한다.
- 실제 데이터 입력 전 전체 백업을 생성해야 한다.
- ComfyUI 사용 시 로컬 서버가 필요하다.
- 고객 포털 공개 링크는 아직 로컬/token placeholder 성격이다.
- GitHub에는 소스코드가 저장되고, 실제 운영 데이터는 userData SQLite DB와 export 폴더에 저장된다.

## 알려진 한계

- 외부 DWG/DXF 자동 파싱 없음
- full BIM editor 없음
- cloud sync 없음
- real-time multi-user collaboration 없음
- accounting/bank integration 없음
- XLSX direct parsing deferred; CSV is supported
