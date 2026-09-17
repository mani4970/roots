# 최신 SAFE ZIP 기준 오류 진단 패치

## 기준 원본

- 파일: **roots_safe_current_20260917_2016.zip** (2026-09-17 20:16).
- 원본 ZIP SHA-256: `79bb9f208613e0090c279711aaff02ec1237f34fed33f1abceb64d71d388f698`.
- 원본 933개 파일을 새 작업 폴더에 추출한 뒤 진단 패치를 반영했습니다.
- 기존 검증 소스와 공통인 930개 파일은 바이트 단위로 모두 동일했습니다. 나머지 3개는 기존 관찰 패치의 안내·목록 파일이며 그대로 보존합니다.
- 원격 커밋 `479d6a2f8ab32d7b425b5645e4a85a362d7b1ddb`의 저장된 Git blob 목록과 코드·설정 212개 파일도 전부 일치했습니다.
- 패치 대상에 충돌이 없었습니다. ZIP은 기존 7개 파일 수정, 신규 5개 파일 추가로 총 12개 파일입니다.

## 목적과 범위

오류 종류, 화면, 인증 실패 단계, 내부 원인의 안전한 코드, 빌드된 JavaScript 파일명과 행·열을 기존 계측에 남깁니다. 오류 원문·전체 스택·전체 URL·묵상 본문·사진·수신자 정보는 보내지 않습니다.

손실되던 ErrorEvent 정보와 사진 오류의 내부 원인을 보완합니다. 요청 취소와 타임아웃을 구분하고, 실제 임시저장·사진 저장 타임아웃을 분류합니다. 일반 JavaScript 구문 오류와 명시적인 JSON 파싱 오류도 구분합니다.

앱 동작 코드 6개 파일, 검사 코드 3개 파일, SQL·안내 문서·파일 목록이 포함됩니다. 묵상 저장 절차, 인증 요청 순서와 대기 시간, 보상 규칙, 화면 동작은 기존대로 유지합니다. 환영 팝업 동작 변경은 포함하지 않았습니다. 기존 관찰 캠페인과 종료시각도 유지합니다.

**원인 파악을 위한 진단 보완입니다. 과거 iOS 오류 등의 실제 원인을 이미 해결했다는 뜻이 아닙니다.**

## 검증 결과

- 클라이언트·개인정보·오류 분류 검사: 26/26 통과.
- API 수집 경계 검사: 9/9 통과.
- 인증 fallback·기존 4초/6초 대기시간 검사: 5/5 통과.
- 합계 40개 검사 통과. 검사에서 운영 DB나 인증 API는 호출하지 않았습니다.
- Next.js 15.5.24 전체 빌드, 타입·린트 검사, 28개 정적 페이지 생성 통과.
- SAFE 원본의 기존 933개 파일 중 지정된 7개만 수정됐고, 나머지 926개는 바이트 단위로 동일하며 삭제된 파일은 없습니다.
- 이전 진단 패치 검토에서 확인한 사진 저장 타임아웃 분류 누락, 일반 구문 오류의 JSON 오분류, 사진 준비 오류 클래스명 누락을 보완하고 재검증했습니다.

## 현재 상태

운영 앱 코드와 DB에는 이번 진단 패치를 적용하지 않았습니다. 운영 DB 제약을 읽기 전용으로 확인했으며 새 진단 키는 아직 허용되지 않았습니다. 실제 iPhone·iPad·Mac 앱 조작 검사는 수행하지 않았습니다.

## 적용 순서

1. **ZIP의 `docs/observation-diagnostics-20260917.sql`을 Supabase 프로젝트 `rqaebddhbpftipjysohr`의 SQL Editor에서 먼저 실행합니다.** 관찰 테이블의 허용 키 CHECK와 해당 테이블 설명만 바꿉니다. 앱 코드만 먼저 배포하면 새 계측 이벤트가 DB 제약에 걸릴 수 있습니다. SQL 결과에 `diagnostic_version`, `error_kind`, `error_script` 등이 포함됐는지 확인합니다.
2. ZIP 파일을 `~/Projects/roots`에 같은 경로로 덮어씁니다. 위 20:16 SAFE ZIP을 만든 후 대상 파일을 추가로 수정했다면 먼저 변경분을 대조해야 합니다.
3. 다음 검사를 실행합니다.

```bash
cd ~/Projects/roots &&
node scripts/test-observation-client.cjs &&
node scripts/test-observation-ingestion.cjs &&
node scripts/test-observation-draft-auth.cjs &&
npm run build
```

4. 모두 통과한 뒤 현재 브랜치가 `main`이고 다른 변경이 staging되어 있지 않은 상태에서 이 패치만 staging합니다.

```bash
cd ~/Projects/roots &&
test "$(git branch --show-current)" = "main" &&
git diff --cached --quiet &&
git add --pathspec-from-file=DIAGNOSTIC_PATCH_FILES.txt &&
git diff --cached --stat
```

브랜치나 기존 staging 때문에 명령이 중단되면 임의로 강제 전환하거나 다른 변경을 지우지 마세요. 출력된 변경 목록이 이 패치의 12개 파일인지 확인한 뒤 커밋·푸시합니다.

```bash
git commit -m "fix: retain safe error diagnostics for Roots observation" &&
git push origin main
```

5. 푸시 후 운영 배포의 READY 상태와 커밋을 확인하고, 실제 새 오류 이벤트의 `details.diagnostic_version=2` 및 진단 필드를 확인합니다. 로컬 검사나 배포 성공만으로 실제 오류 원인까지 확인됐다고 판단하지 않습니다.

## 되돌림

패치의 코드 커밋만 되돌릴 수 있습니다. 새 SQL은 기존 키도 허용하므로 앱 코드를 되돌리기 위해 DB 제약까지 되돌릴 필요는 없습니다. 이미 v2 이벤트가 있으면 이전 키 목록으로의 제약 변경이 실패할 수 있으므로 기존 행을 삭제하지 마세요.
