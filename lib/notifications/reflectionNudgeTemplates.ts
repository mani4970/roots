import type { Lang } from "@/lib/i18n";

type ReflectionNudgeScope = "group" | "partner";

type ReflectionNudgeTemplateVariables = {
  actorName?: string | null;
  groupName?: string | null;
};

type ReflectionNudgeTemplate = {
  title: string;
  body: string;
};

function safeName(value: string | null | undefined) {
  return value?.trim() || "Roots";
}

export function getReflectionNudgeNotificationTemplate(
  scope: ReflectionNudgeScope,
  lang: Lang,
  variables: ReflectionNudgeTemplateVariables,
): ReflectionNudgeTemplate {
  const actorName = safeName(variables.actorName);
  const groupName = safeName(variables.groupName);

  if (lang === "de") {
    return scope === "group"
      ? {
          title: `${groupName}: Lasst uns gemeinsam Stille Zeit machen! 👋`,
          body: "Lasst uns auch heute gemeinsam vor Gottes Wort treten!",
        }
      : {
          title: `${actorName} lädt dich zur gemeinsamen Stillen Zeit ein! 👋`,
          body: "Lasst uns auch heute gemeinsam vor Gottes Wort treten!",
        };
  }

  if (lang === "en") {
    return scope === "group"
      ? {
          title: `${groupName}, let’s reflect on the Word together! 👋`,
          body: "Let’s come before God’s Word together today!",
        }
      : {
          title: `${actorName} invites you to reflect on the Word together! 👋`,
          body: "Let’s come before God’s Word together today!",
        };
  }

  if (lang === "fr") {
    return scope === "group"
      ? {
          title: `${groupName}, méditons la Parole ensemble ! 👋`,
          body: "Aujourd’hui encore, avançons ensemble vers la Parole de Dieu !",
        }
      : {
          title: `${actorName} vous invite à méditer la Parole ensemble ! 👋`,
          body: "Aujourd’hui encore, avançons ensemble vers la Parole de Dieu !",
        };
  }

  return scope === "group"
    ? {
        title: `${groupName} 같이 묵상해요! 👋`,
        body: "오늘도 우리 함께 하나님 말씀 앞으로 나아가요!",
      }
    : {
        title: `${actorName}님이 같이 묵상하재요! 👋`,
        body: "오늘도 우리 함께 하나님 말씀 앞으로 나아가요!",
      };
}
