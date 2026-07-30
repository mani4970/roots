export type GroupLeaderTextLang = "ko" | "en" | "de" | "fr";

type GroupLeaderText = {
  groupLeader: string;
  groupManagement: string;
  editGroup: string;
  editGroupTitle: string;
  editGroupError: string;
  transferLeadership: string;
  transferSelectMessage: string;
  transferEmpty: string;
  transferNext: string;
  transferConfirmTitle: string;
  transferConfirmMessage: (name: string) => string;
  transferWarning: string;
  transferAction: string;
  transferError: string;
  removeMember: string;
  removeConfirmTitle: string;
  removeConfirmMessage: (name: string) => string;
  removeError: string;
  deleteGroup: string;
  deleteGroupTitle: string;
  deleteGroupMessage: (name: string) => string;
  deleteGroupAction: string;
  deleteGroupError: string;
};

const GROUP_LEADER_TEXT: Record<GroupLeaderTextLang, GroupLeaderText> = {
  ko: {
    groupLeader: "그룹장",
    groupManagement: "그룹 관리",
    editGroup: "그룹 정보 수정",
    editGroupTitle: "그룹 정보 수정",
    editGroupError:
      "그룹 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
    transferLeadership: "그룹장 권한 넘기기",
    transferSelectMessage: "그룹장 권한을 넘길 그룹원을 선택해주세요.",
    transferEmpty: "권한을 넘길 다른 그룹원이 없어요.",
    transferNext: "다음",
    transferConfirmTitle: "그룹장 권한을 넘길까요?",
    transferConfirmMessage: (name) =>
      `${name}님에게 그룹장 권한을 넘기시겠어요?`,
    transferWarning: "권한을 넘기면 회원님은 일반 그룹원이 됩니다.",
    transferAction: "권한 넘기기",
    transferError:
      "그룹장 권한을 넘기지 못했어요. 그룹원 상태를 확인한 뒤 다시 시도해주세요.",
    removeMember: "내보내기",
    removeConfirmTitle: "그룹원을 내보낼까요?",
    removeConfirmMessage: (name) =>
      `${name}님을 그룹에서 내보내시겠어요? 내보낸 뒤에도 초대 링크나 공개 그룹을 통해 다시 참여할 수 있어요.`,
    removeError:
      "그룹원을 내보내지 못했어요. 잠시 후 다시 시도해주세요.",
    deleteGroup: "그룹 삭제",
    deleteGroupTitle: "그룹을 삭제할까요?",
    deleteGroupMessage: (name) =>
      `"${name}" 그룹은 영구적으로 삭제됩니다. 그룹원·초대·진행 중인 그룹 챌린지는 종료되지만, 개인 말씀 묵상 기록·말씀동행·하트·이미 받은 배지는 삭제되지 않습니다.`,
    deleteGroupAction: "그룹 삭제",
    deleteGroupError:
      "그룹을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.",
  },
  en: {
    groupLeader: "Group leader",
    groupManagement: "Manage group",
    editGroup: "Edit group details",
    editGroupTitle: "Edit group details",
    editGroupError:
      "Could not save the group details. Please try again shortly.",
    transferLeadership: "Transfer group leadership",
    transferSelectMessage: "Choose the member who should become the group leader.",
    transferEmpty: "There is no other member to transfer leadership to.",
    transferNext: "Next",
    transferConfirmTitle: "Transfer group leadership?",
    transferConfirmMessage: (name) =>
      `Transfer group leadership to ${name}?`,
    transferWarning:
      "After the transfer, you will become a regular group member.",
    transferAction: "Transfer leadership",
    transferError:
      "Could not transfer leadership. Check the member status and try again.",
    removeMember: "Remove",
    removeConfirmTitle: "Remove this member?",
    removeConfirmMessage: (name) =>
      `Remove ${name} from this group? They can join again later through an invite link or the public group.`,
    removeError: "Could not remove the member. Please try again shortly.",
    deleteGroup: "Delete group",
    deleteGroupTitle: "Delete this group?",
    deleteGroupMessage: (name) =>
      `"${name}" will be permanently deleted. Memberships, invites, and active group challenges will end, but personal Bible Reflection records, Word Walk progress, hearts, and earned badges will remain.`,
    deleteGroupAction: "Delete group",
    deleteGroupError: "Could not delete the group. Please try again shortly.",
  },
  de: {
    groupLeader: "Gruppenleitung",
    groupManagement: "Gruppe verwalten",
    editGroup: "Gruppeninformationen bearbeiten",
    editGroupTitle: "Gruppeninformationen bearbeiten",
    editGroupError:
      "Die Gruppeninformationen konnten nicht gespeichert werden. Bitte versuchen Sie es später erneut.",
    transferLeadership: "Gruppenleitung übertragen",
    transferSelectMessage:
      "Wählen Sie das Mitglied aus, das die Gruppenleitung übernehmen soll.",
    transferEmpty:
      "Es gibt kein anderes Mitglied, dem die Leitung übertragen werden kann.",
    transferNext: "Weiter",
    transferConfirmTitle: "Gruppenleitung übertragen?",
    transferConfirmMessage: (name) =>
      `Möchten Sie die Gruppenleitung an ${name} übertragen?`,
    transferWarning:
      "Nach der Übertragung sind Sie ein reguläres Gruppenmitglied.",
    transferAction: "Leitung übertragen",
    transferError:
      "Die Gruppenleitung konnte nicht übertragen werden. Prüfen Sie den Mitgliedsstatus und versuchen Sie es erneut.",
    removeMember: "Entfernen",
    removeConfirmTitle: "Mitglied entfernen?",
    removeConfirmMessage: (name) =>
      `${name} aus dieser Gruppe entfernen? Ein späterer Beitritt über einen Einladungslink oder die öffentliche Gruppe bleibt möglich.`,
    removeError:
      "Das Mitglied konnte nicht entfernt werden. Bitte versuchen Sie es später erneut.",
    deleteGroup: "Gruppe löschen",
    deleteGroupTitle: "Gruppe löschen?",
    deleteGroupMessage: (name) =>
      `Die Gruppe „${name}“ wird dauerhaft gelöscht. Mitgliedschaften, Einladungen und laufende Gruppen-Challenges werden beendet. Persönliche Stille-Zeit-Einträge, Wortweg, Herzen und bereits erhaltene Abzeichen bleiben erhalten.`,
    deleteGroupAction: "Gruppe löschen",
    deleteGroupError:
      "Die Gruppe konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.",
  },
  fr: {
    groupLeader: "Responsable du groupe",
    groupManagement: "Gérer le groupe",
    editGroup: "Modifier les informations",
    editGroupTitle: "Modifier le groupe",
    editGroupError:
      "Impossible d’enregistrer les informations du groupe. Veuillez réessayer dans un instant.",
    transferLeadership: "Transférer la responsabilité",
    transferSelectMessage:
      "Choisissez le membre qui deviendra responsable du groupe.",
    transferEmpty:
      "Aucun autre membre ne peut recevoir la responsabilité du groupe.",
    transferNext: "Suivant",
    transferConfirmTitle: "Transférer la responsabilité ?",
    transferConfirmMessage: (name) =>
      `Transférer la responsabilité du groupe à ${name} ?`,
    transferWarning:
      "Après le transfert, vous redeviendrez un membre ordinaire.",
    transferAction: "Transférer",
    transferError:
      "Impossible de transférer la responsabilité. Vérifiez le statut du membre et réessayez.",
    removeMember: "Retirer",
    removeConfirmTitle: "Retirer ce membre ?",
    removeConfirmMessage: (name) =>
      `Retirer ${name} de ce groupe ? Cette personne pourra le rejoindre plus tard avec un lien d’invitation ou via le groupe public.`,
    removeError:
      "Impossible de retirer le membre. Veuillez réessayer dans un instant.",
    deleteGroup: "Supprimer le groupe",
    deleteGroupTitle: "Supprimer ce groupe ?",
    deleteGroupMessage: (name) =>
      `Le groupe « ${name} » sera définitivement supprimé. Les adhésions, invitations et défis en cours prendront fin, mais les méditations personnelles, la progression, les cœurs et les badges déjà obtenus seront conservés.`,
    deleteGroupAction: "Supprimer",
    deleteGroupError:
      "Impossible de supprimer le groupe. Veuillez réessayer dans un instant.",
  },
};

export function getGroupLeaderText(
  lang: GroupLeaderTextLang,
): GroupLeaderText {
  return GROUP_LEADER_TEXT[lang] ?? GROUP_LEADER_TEXT.ko;
}
