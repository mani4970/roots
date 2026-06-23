import type { Lang } from "@/lib/i18n";

export const NOTIFICATION_EVENT_TYPES = [
  "group_qt_shared",
  "group_prayer_shared",
  "group_prayer_answered",
  "partner_qt_shared",
  "partner_prayer_shared",
  "partner_prayer_answered",
] as const;

export type NotificationEventType = typeof NOTIFICATION_EVENT_TYPES[number];

export type NotificationTemplateVariables = {
  groupName?: string;
  name?: string;
};

type NotificationTemplate = {
  title: string;
  body: string;
};

export const NOTIFICATION_TEMPLATES: Record<NotificationEventType, Record<Lang, NotificationTemplate>> = {
  group_qt_shared: {
    ko: {
      title: "{groupName}에 새 말씀 묵상이 올라왔어요",
      body: "축복하러 가볼까요?",
    },
    de: {
      title: "In {groupName} gibt es eine neue Stille Zeit",
      body: "Möchtest du segnen gehen?",
    },
    en: {
      title: "A new Bible Reflection was shared in {groupName}",
      body: "Shall we go bless them?",
    },
    fr: {
      title: "Une nouvelle méditation biblique a été partagée dans {groupName}",
      body: "Allons bénir cette personne ?",
    },
  },
  group_prayer_shared: {
    ko: {
      title: "{groupName}에 함께 기도할 제목이 있어요",
      body: "중보하러 가볼까요?",
    },
    de: {
      title: "In {groupName} gibt es ein neues Gebetsanliegen",
      body: "Möchtest du mitbeten?",
    },
    en: {
      title: "There is a prayer request in {groupName}",
      body: "Shall we intercede together?",
    },
    fr: {
      title: "Il y a un sujet de prière dans {groupName}",
      body: "Allons intercéder ensemble ?",
    },
  },
  group_prayer_answered: {
    ko: {
      title: "{groupName}에 응답된 기도 소원이 있어요!",
      body: "함께 축복하러 가요!",
    },
    de: {
      title: "In {groupName} gibt es ein erhörtes Gebet!",
      body: "Lasst uns gemeinsam segnen!",
    },
    en: {
      title: "There is an answered prayer in {groupName}!",
      body: "Let’s go bless them together!",
    },
    fr: {
      title: "Il y a une prière exaucée dans {groupName} !",
      body: "Allons bénir ensemble !",
    },
  },
  partner_qt_shared: {
    ko: {
      title: "{name}님이 말씀 묵상을 나눴어요",
      body: "축복하러 가볼까요?",
    },
    de: {
      title: "{name} hat eine Stille Zeit geteilt",
      body: "Möchtest du segnen gehen?",
    },
    en: {
      title: "{name} shared a Bible Reflection",
      body: "Shall we go bless them?",
    },
    fr: {
      title: "{name} a partagé une méditation biblique",
      body: "Allons bénir cette personne ?",
    },
  },
  partner_prayer_shared: {
    ko: {
      title: "{name}님이 기도 제목을 나눴어요",
      body: "함께 기도해볼까요?",
    },
    de: {
      title: "{name} hat ein Gebetsanliegen geteilt",
      body: "Möchtest du mitbeten?",
    },
    en: {
      title: "{name} shared a prayer request",
      body: "Shall we pray together?",
    },
    fr: {
      title: "{name} a partagé un sujet de prière",
      body: "Prions ensemble ?",
    },
  },
  partner_prayer_answered: {
    ko: {
      title: "{name}님의 기도 응답이 있어요",
      body: "함께 감사하고 축복해요!",
    },
    de: {
      title: "{name} hat ein erhörtes Gebet",
      body: "Lasst uns gemeinsam danken und segnen!",
    },
    en: {
      title: "{name} has an answered prayer",
      body: "Let’s give thanks and bless them together!",
    },
    fr: {
      title: "{name} a reçu une réponse à la prière",
      body: "Rendons grâce et bénissons ensemble !",
    },
  },
};

function interpolate(template: string, variables: NotificationTemplateVariables) {
  return template.replace(/\{(groupName|name)\}/g, (_match, key) => {
    const variableKey = key as keyof NotificationTemplateVariables;
    const value = variables[variableKey];
    return typeof value === "string" && value.trim() ? value.trim() : "Roots";
  });
}

export function getNotificationTemplate(eventType: NotificationEventType, lang: Lang, variables: NotificationTemplateVariables = {}) {
  const localized = NOTIFICATION_TEMPLATES[eventType]?.[lang] ?? NOTIFICATION_TEMPLATES[eventType].ko;
  return {
    title: interpolate(localized.title, variables),
    body: interpolate(localized.body, variables),
  };
}
