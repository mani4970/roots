# Christian Roots — 아가페 쉬운성경(ID 88) 구축·활성화 절차

## 확정 조건

- 쉬운성경의 기존 Roots translation ID **88을 그대로 유지**한다.
- Christian Roots가 운영하는 기존 비밀키 Bible API는 **일회성 원본 수집 경로**로만 사용한다.
- source/publisher가 두 canonical verse를 하나의 unit으로 제공하는 경우 임의로 분리하지 않고 `verse_start..verse_end` bridge로 보존한다.
- 전체 corpus는 `.cache/agape-easy-bible/` 아래에만 두고 GitHub·패치 ZIP·safe ZIP에 넣지 않는다.
- Supabase `agape_bible_verses`는 anon/authenticated 직접 접근을 금지하고 서버 secret만 사용한다.
- 계약 시작·종료일 자동 차단 로직은 넣지 않는다.
- 구버전 `supabase/103_easy_bible_translation_option_2_1.sql`은 재실행하지 않는다.

## 2026-08-28 전체 절 구조 검사 결과

private API 전체 1,189장을 검사한 결과 1,185장은 canonical 절 구조와 1:1로 일치했고, 예외는 아래 네 장뿐이었다. 네 곳 모두 본문 누락이 아니라 **쉬운성경의 verse bridge**로 확인되었다.

```text
JDG 20  : source 47 items / canonical 48 verses
1SA 30  : source 30 items / canonical 31 verses
2SA 4   : source 11 items / canonical 12 verses
1KI 8   : source 65 items / canonical 66 verses
```

확정 bridge:

```text
JDG 20  : source item 22 → canonical 22-23
1SA 30  : source item 30 → canonical 30-31
2SA 4   : source item 6  → canonical 6-7
1KI 8   : source item 41 → canonical 41-42
```

따라서 구매본 직접입력/manual override는 필요 없다. bridge 본문은 문장 경계를 추측해서 둘로 나누지 않는다. Roots의 licensed Bible API는 이미 `verse_start..verse_end`를 지원하므로 publisher/source unit 그대로 보존한다.

최종 정상 기준은 **31,098 physical rows / 31,102 canonical verse coverage / 66권 / 1,189장 / bridge 4개 / manual verse 0개**다.

## 작업 순서

### 1. 예외 장 probe

기존 `.cache`는 삭제하지 않고 `--force`도 사용하지 않는다.

```bash
npm run bible:fetch:easy -- --probe=7:20
npm run bible:fetch:easy -- --probe=9:30
npm run bible:fetch:easy -- --probe=10:4
npm run bible:fetch:easy -- --probe=11:8
```

정상 canonical coverage:

```text
JDG 20  → Rows 47 / coverage 48 / bridge 22-23
1SA 30  → Rows 30 / coverage 31 / bridge 30-31
2SA 4   → Rows 11 / coverage 12 / bridge 6-7
1KI 8   → Rows 65 / coverage 66 / bridge 41-42
```

### 2. 전체 corpus 수집

```bash
npm run bible:fetch:easy -- --concurrency=2 --delay-ms=200
```

정상 결과:

```text
Rows: 31098
Canonical verse coverage: 31102
Books: 66
Chapters: 1189
```

### 3. 로컬 전체 감사

```bash
npm run bible:audit:easy
```

검사 항목:

- 31,098 physical rows
- 31,102 canonical verse coverage
- 66권 / 1,189장
- bridge 정확히 4개
- manual verse 0개
- gap / overlap / duplicate 없음
- 빈 본문 / HTML / replacement character / zero-width 검사
- manifest / archive / content SHA-256

### 4. 서버 전용 Supabase 테이블

로컬 audit 통과 후에만 Supabase SQL Editor에서 다음을 실행한다.

```text
supabase/134_agape_easy_bible_corpus_2_2.sql
```

보안 정상 기준:

```text
rls_enabled = true
anon_can_select = false
authenticated_can_select = false
service_role_can_select = true
service_role_can_insert = true
service_role_can_update = true
service_role_can_delete = false
policy_count = 0
```

### 5. Import 사전 검증

```bash
npm run bible:import:easy
```

DB 변경 없이 corpus를 다시 검증한다.

### 6. 250행 이하 중복 안전 upsert

```bash
npm run bible:import:easy -- --confirm-import
```

- 기본 batch 250
- delete / truncate 없음
- 같은 `(translation_id, book_number, chapter, verse_start)`는 upsert
- 중간 종료 후 재실행 가능

### 7. 운영 DB 전체 hash 대조

```bash
npm run bible:audit:easy -- --live
```

정상 기준:

```text
Rows: 31098
Canonical verse coverage: 31102
Books: 66
Chapters: 1189
Verse bridges: 4
Purchased-text manual verses: 0
Content SHA-256: 로컬과 동일
```

이 검사가 끝나기 전 ID 88을 앱 선택 목록에 활성화하지 않는다.

### 8. 활성화

별도 활성화 패치는 **live 전체 hash 검증 후** 적용한다. 활성화 SQL은 31,098 rows / 31,102 canonical coverage / bridge 4개 / 66권 / 1,189장을 모두 검사한다.

### 9. 최종 QA

최소 본문 QA:

```text
사사기 20:21-24
사사기 20:48
사무엘상 30:30-31
사무엘하 4:6-8
열왕기상 8:41-43
열왕기상 8:66
창세기 1:1-5
시편 119:105
요한복음 3:16
과거 ID 88 묵상 수정·복원
```

bridge 안의 단일 절을 요청해도 publisher source unit 전체가 반환되는 것이 정상이다. 예: `JDG 20:23` 요청은 `22-23`, `1SA 30:31` 요청은 `30-31` unit을 반환한다.

## 저작권 문구

```text
『아가페 쉬운성경』의 저작권은 ㈜아가페출판사에 있으며, ㈜아가페출판사의 허락을 받아 사용하였습니다.
```

## 보안

- `.cache/agape-easy-bible/` 전체 Git 제외
- safe ZIP에서도 `.cache/*` 제외 유지
- `.env*`, `.npmrc`, keystore, certificate 등 고정 safe ZIP 제외 규칙 유지
- 전체 corpus를 public GitHub에 커밋하지 않음
- direct anon/authenticated table SELECT 금지
- 전체 corpus export endpoint 금지
