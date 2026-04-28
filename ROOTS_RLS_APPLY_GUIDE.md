# Roots RLS / Supabase Security 적용 가이드

이번 패치는 앱 화면 플로우를 건드리지 않고, Supabase 보안 점검과 RLS 적용을 위한 SQL 파일만 추가합니다.

## 포함 파일

```text
supabase/00_security_preflight.sql
supabase/01_rpc_increment_prayer_count.sql
supabase/02_rls_baseline_policies.sql
ROOTS_RLS_APPLY_GUIDE.md
```

## 권장 순서

### 1. 먼저 preflight만 실행

Supabase Dashboard → SQL Editor에서 아래 파일 내용을 실행합니다.

```text
supabase/00_security_preflight.sql
```

이 파일은 아무것도 수정하지 않습니다. 현재 RLS 활성화 여부, 기존 정책, 테이블 컬럼, avatars storage 정책, RPC 존재 여부만 보여줍니다.

### 2. RPC 먼저 적용

다음 파일을 실행합니다.

```text
supabase/01_rpc_increment_prayer_count.sql
```

이 파일은 현재 코드의 기존 호출을 그대로 지원합니다.

```ts
supabase.rpc("increment_prayer_count", { prayer_id: id })
```

중요한 점은 이 RPC가 단순히 `+1` 하지 않고, `user_prayer_logs` 실제 개수 기준으로 `prayer_count`를 동기화한다는 점입니다. 그래서 같은 RPC가 반복 호출되어도 숫자가 부풀려지지 않습니다.

### 3. RLS baseline은 Preview / 백업에서 먼저 테스트

마지막으로 아래 파일은 실제 RLS 정책을 추가합니다.

```text
supabase/02_rls_baseline_policies.sql
```

이 파일은 앱이 쓰는 핵심 테이블에 RLS를 켜고, 기본 정책을 추가합니다. 단, 기존 Supabase 프로젝트에 이미 정책이 있으면 policy name 충돌이 날 수 있습니다. 그 경우에는 기존 정책명을 확인하고 조정해야 합니다.

## 테스트 체크리스트

RLS 적용 후 아래 흐름을 테스트하세요.

```text
1. 로그인
2. 홈 화면 로딩
3. 체크인 저장
4. QT 작성 / 임시저장 / 완료
5. QT 공개 공유
6. 커뮤니티에서 공개 QT 조회
7. QT 반응 추가/변경/삭제
8. 개인 기도 제목 작성
9. 중보기도 요청으로 공개 전환
10. 커뮤니티에서 함께 기도하기
11. 응답된 기도 좋아요
12. 그룹 생성
13. 그룹 초대 링크로 참여
14. 그룹에 공유한 QT 조회
15. 프로필 사진 업로드
16. 프로필 이름 수정
17. 피드백 전송
18. 계정 삭제
```

## 주의

이 패치는 SQL 파일만 추가합니다. 앱 코드 흐름은 변경하지 않았습니다.

만약 RLS 적용 후 특정 화면이 비어 보인다면, 대부분은 해당 SELECT 정책이 앱의 실제 조회 방식과 맞지 않는 경우입니다. 이때는 앱 코드를 바꾸기보다 먼저 Supabase 정책을 조정하는 편이 안전합니다.
