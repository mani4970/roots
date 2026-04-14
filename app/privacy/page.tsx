"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>개인정보처리방침</h1>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Privacy Policy / Datenschutzerklärung</p>
      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 28 }}>최종 수정일: 2026년 4월 14일</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>1. 수집하는 정보</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Roots 앱은 서비스 제공을 위해 다음 정보를 수집합니다:
        </p>
        <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
          <li>이메일 주소 (회원가입 시)</li>
          <li>닉네임 및 프로필 사진 (선택사항)</li>
          <li>큐티 기록 및 기도 제목 (사용자가 직접 입력)</li>
          <li>감정 체크인 데이터</li>
          <li>앱 사용 기록 (streak, 큐티 날짜 등)</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>2. 정보 사용 목적</h2>
        <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 20 }}>
          <li>서비스 제공 및 개인화 (맞춤 말씀, 결단 추천)</li>
          <li>커뮤니티 기능 (공유 시 다른 사용자에게 표시)</li>
          <li>서비스 개선 및 오류 수정</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>3. 제3자 서비스</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Roots는 다음 제3자 서비스를 사용합니다:
        </p>
        <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
          <li><strong>Supabase</strong> — 데이터베이스 및 인증 (미국/EU 서버)</li>
          <li><strong>Anthropic Claude API</strong> — AI 말씀 및 결단 생성</li>
          <li><strong>Google OAuth</strong> — 구글 계정 로그인 (선택사항)</li>
        </ul>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginTop: 8 }}>
          각 서비스의 개인정보처리방침을 함께 확인해 주세요.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>4. 데이터 보관 기간</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          사용자 데이터는 계정이 활성 상태인 동안 보관됩니다.
          계정 삭제 시 모든 개인 데이터는 즉시 삭제됩니다.
          커뮤니티에 공유된 내용은 삭제 요청 시 별도로 처리됩니다.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>5. GDPR 권리 (EU 거주자)</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 8 }}>
          EU 거주자는 다음 권리를 가집니다:
        </p>
        <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 20 }}>
          <li>열람권 — 보관 중인 내 데이터 확인</li>
          <li>정정권 — 부정확한 데이터 수정 요청</li>
          <li>삭제권 (잊혀질 권리) — 계정 및 데이터 삭제</li>
          <li>이동권 — 데이터 내보내기 요청</li>
          <li>처리 제한권 — 특정 데이터 처리 중단 요청</li>
        </ul>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginTop: 8 }}>
          권리 행사는 cookiko313@gmail.com 으로 문의해 주세요.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>6. 아동 보호</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Roots는 만 16세 이상을 대상으로 합니다. 만 16세 미만은 보호자의 동의 없이 서비스를 이용할 수 없습니다.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>7. 문의</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          개인정보 관련 문의:<br />
          Chungman Jeong<br />
          cookiko313@gmail.com<br />
          Hauptstraße 11, 65812 Bad Soden am Taunus, Deutschland
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>English Summary</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 8 }}>
          Roots collects your email, nickname, QT records, prayer requests, and usage data to provide
          personalized spiritual growth features. Your data is stored securely via Supabase and is never
          sold to third parties. EU residents have full GDPR rights including access, correction, deletion,
          and portability. Contact cookiko313@gmail.com for any privacy requests.
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          You may delete your account at any time from the Profile page, which will permanently remove all your data.
        </p>
      </div>
    </div>
  );
}
