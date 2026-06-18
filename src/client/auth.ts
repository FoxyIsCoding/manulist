export interface AuthUser {
  id: number;
  name: string;
  about?: string;
  avatar?: { large?: string; medium?: string };
  bannerImage?: string;
  siteUrl?: string;
}

export interface AuthState {
  user: AuthUser | null;
  configured: boolean;
  error?: string;
}

let cachedAuth: AuthState | null = null;

export async function fetchAuth(force = false): Promise<AuthState> {
  if (cachedAuth && !force) return cachedAuth;

  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    cachedAuth = {
      user: data.user ?? null,
      configured: data.configured ?? true,
      error: data.error,
    };
  } catch {
    cachedAuth = { user: null, configured: true };
  }
  return cachedAuth;
}

export function clearAuthCache(): void {
  cachedAuth = null;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  clearAuthCache();
}

export function loginUrl(): string {
  return "/api/auth/login";
}

export async function saveListEntry(entry: {
  id?: number;
  mediaId?: number;
  status?: string;
  progress?: number;
  score?: number;
  scoreRaw?: number;
  notes?: string;
  repeat?: number;
  priority?: number;
  private?: boolean;
}): Promise<unknown> {
  const res = await fetch("/api/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()).entry;
}

export async function deleteListEntry(id: number): Promise<void> {
  const res = await fetch(`/api/list/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
}

export async function toggleFavourite(animeId: number): Promise<boolean> {
  const res = await fetch("/api/favourite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ animeId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.result?.anime?.isFavourite ?? false;
}

export const LIST_STATUSES = [
  { value: "CURRENT", label: "Watching", icon: "play_circle" },
  { value: "PLANNING", label: "Planning", icon: "bookmark" },
  { value: "COMPLETED", label: "Completed", icon: "check_circle" },
  { value: "PAUSED", label: "Paused", icon: "pause_circle" },
  { value: "DROPPED", label: "Dropped", icon: "cancel" },
  { value: "REPEATING", label: "Repeating", icon: "replay" },
] as const;

export function statusLabel(status?: string): string {
  return LIST_STATUSES.find((s) => s.value === status)?.label ?? status ?? "";
}

export function htmlEncode(str: string): string {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

export function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function showSnackbar(message: string): void {
  import("@m3e/web/snackbar").then(() => {
    let bar = document.querySelector("m3e-snackbar") as HTMLElement & { open?: () => void };
    if (!bar) {
      bar = document.createElement("m3e-snackbar") as HTMLElement & { open?: () => void };
      document.querySelector("m3e-theme")?.appendChild(bar);
    }
    bar.textContent = message;
    bar.open?.();
  });
}
