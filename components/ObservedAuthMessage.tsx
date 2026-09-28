"use client";
import { useEffect, useRef, type ComponentProps } from "react";
import { observe, type ObservationFlow } from "@/lib/appObservation";

type Props = ComponentProps<"p"> & { flow: ObservationFlow | null; messageKey: string };
/** Records DOM visibility only; it cannot prove that a person read a notice. */
export default function ObservedAuthMessage({ flow, messageKey, ...props }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const attempt = flow?.attempt;
  useEffect(() => {
    const captured = flow ? { ...flow } : null;
    let frame = 0, sent = false, disposed = false;
    const check = () => {
      if (disposed || sent || !ref.current || document.visibilityState !== "visible") return;
      const element = ref.current;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0") {
        sent = true;
        observe(captured, "notice_rendered", { notice_key: messageKey, outcome: "dom_visible" });
      }
    };
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(check); });
    document.addEventListener("visibilitychange", check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { disposed = true; cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", check); window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [flow?.id, attempt, messageKey, props.children]);
  return <p ref={ref} {...props} />;
}
