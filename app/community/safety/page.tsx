"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { getQtCommentSafetyText } from "@/lib/qtCommentSafetyText";
import { getQtCommentText } from "@/lib/qtCommentText";
import CommentSafetyHistory from "@/components/community/CommentSafetyHistory";
import styles from "@/components/community/CommentSafety.module.css";

export default function CommunitySafetyPage() {
  const lang = useLang();
  const router = useRouter();
  const text = getQtCommentSafetyText(lang);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void createClient().auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(true); else setUserId(data.user?.id ?? "");
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <main className={styles.page}>
    <div className={styles.header}>
      <button type="button" className={styles.close} onClick={() => router.back()} aria-label={text.close}><ArrowLeft size={20} aria-hidden="true" /></button>
      <h1 className={styles.title} style={{ flex: 1 }}>{text.title}</h1>
    </div>
    {loading ? <p role="status" className={styles.copy}>{text.loading}</p> : error ? <div role="alert">
      <p className={styles.error}>{text.error}</p><button type="button" className={styles.button} onClick={() => setRevision(value => value + 1)}>{text.retry}</button>
    </div> : userId ? <CommentSafetyHistory userId={userId} lang={lang} /> : <>
      <p className={styles.copy}>{getQtCommentText(lang).signIn}</p>
      <p className={styles.meta}>{text.supportInfo}</p><a className={styles.support} href="mailto:support@christian-roots.com">support@christian-roots.com</a>
    </>}
  </main>;
}
