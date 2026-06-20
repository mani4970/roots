export const GROUP_CHALLENGE_BADGE_BUCKET = "group-challenge-badges";
export const GROUP_CHALLENGE_BADGE_FALLBACK = "/badge_roots_together.webp";

type GroupChallengeBadgeImageOptions = {
  fallback?: string | null;
};

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join("/");
}

function storagePublicUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = encodeStoragePath(path);
  if (!cleanPath) return null;
  return `${cleanBase}/storage/v1/object/public/${GROUP_CHALLENGE_BADGE_BUCKET}/${cleanPath}`;
}

export function getGroupChallengeBadgeImageSrc(
  path?: string | null,
  options: GroupChallengeBadgeImageOptions = {}
) {
  const fallback = options.fallback === undefined ? GROUP_CHALLENGE_BADGE_FALLBACK : options.fallback;
  const value = String(path ?? "").trim();

  if (!value) return fallback ?? null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  if (value.startsWith("public/")) return `/${value.slice("public/".length)}`;

  const storagePath = value
    .replace(/^storage:\/\//i, "")
    .replace(/^group-challenge-badges\/+/, "")
    .replace(/^\/+/, "");

  return storagePublicUrl(storagePath) ?? fallback ?? null;
}
