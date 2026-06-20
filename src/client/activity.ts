import { renderLayout } from "./layout";
import { fetchAuth, htmlEncode, escapeAttr, timeAgo } from "./auth";
import "@m3e/web/heading";
import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/skeleton";
import "@m3e/web/icon";
import "@m3e/web/avatar";

interface ActivityUser {
  id: number;
  name: string;
  avatar?: { medium?: string };
  siteUrl?: string;
}

interface ActivityItem {
  id: number;
  type?: string;
  status?: string;
  progress?: number;
  text?: string;
  message?: string;
  createdAt: number;
  user?: ActivityUser;
  messenger?: ActivityUser;
  media?: {
    id: number;
    type?: string;
    title?: { romaji?: string; english?: string };
    coverImage?: { medium?: string };
    format?: string;
  };
  recipient?: ActivityUser;
}

const pageContent = document.getElementById("page-content")!;

function activityUser(a: ActivityItem): ActivityUser | undefined {
  return a.user ?? a.messenger;
}

function activityText(a: ActivityItem): string {
  const user = activityUser(a);
  const name = user?.name ?? "Someone";
  const mediaTitle = a.media?.title?.english || a.media?.title?.romaji || "an anime";

  if (a.text) return `${name}: ${a.text}`;
  if (a.message && a.recipient) {
    return `${name} messaged ${a.recipient.name}: ${a.message}`;
  }
  if (a.status) {
    const progress = a.progress ? ` (${a.progress} eps)` : "";
    return `${name} ${a.status} ${mediaTitle}${progress}`;
  }
  return `${name} updated their list`;
}

function activityCard(a: ActivityItem): string {
  const user = activityUser(a);
  const avatar = user?.avatar?.medium ?? "";
  const cover = a.media?.coverImage?.medium ?? "";
  const text = activityText(a);

  return `
    <m3e-card class="activity-card">
      <div class="activity-row">
        <a href="/profile?name=${encodeURIComponent(user?.name ?? "")}" class="activity-avatar-link">
          <m3e-avatar><img src="${escapeAttr(avatar)}" alt="${htmlEncode(user?.name ?? "")}"></img></m3e-avatar>
        </a>
        <div class="activity-body">
          <p>${htmlEncode(text)}</p>
          <span class="activity-time">${timeAgo(a.createdAt)}</span>
        </div>
        ${
          a.media
            ? `
          <a href="/anime?id=${a.media.id}" class="activity-media-link">
            <img src="${escapeAttr(cover)}" alt="" loading="lazy" />
          </a>`
            : ""
        }
      </div>
    </m3e-card>
  `;
}

async function loadActivity(userId?: number): Promise<void> {
  pageContent.innerHTML = `
    <div class="page-container">
      <div class="activity-header">
        <m3e-heading level="2">Activity Feed</m3e-heading>
        <div class="activity-filters">
          <m3e-button variant="tonal" id="filter-global" ${!userId ? "selected" : ""}>Global</m3e-button>
          <m3e-button variant="tonal" id="filter-mine" ${userId ? "selected" : ""} disabled>My Activity</m3e-button>
        </div>
      </div>
      <div id="activity-list">
        ${Array.from({ length: 5 }, () => `<m3e-skeleton style="height:80px;margin-bottom:12px;border-radius:16px" variant="rounded"></m3e-skeleton>`).join("")}
      </div>
    </div>
  `;

  const auth = await fetchAuth();
  const mineBtn = document.getElementById("filter-mine") as HTMLElement & { disabled?: boolean };
  if (mineBtn && auth.user) {
    mineBtn.disabled = false;
    mineBtn.addEventListener("click", () => loadActivity(auth.user!.id));
  }
  document.getElementById("filter-global")?.addEventListener("click", () => loadActivity());

  const url = userId ? `/api/activity?userId=${userId}` : "/api/activity";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const activities = (data.activities ?? []) as ActivityItem[];
    const list = document.getElementById("activity-list");

    if (list) {
      if (activities.length === 0) {
        list.innerHTML = `<p class="empty-state">No activity yet.</p>`;
      } else {
        list.innerHTML = activities.map(activityCard).join("");
      }
    }
  } catch (err) {
    console.error("Activity failed:", err);
    const list = document.getElementById("activity-list");
    if (list) list.innerHTML = `<p class="empty-state">Failed to load activity.</p>`;
  }
}

(async () => {
  const auth = await fetchAuth();
  renderLayout({ title: "Activity", subtitle: "What's happening", user: auth.user });
  await loadActivity();
})();
