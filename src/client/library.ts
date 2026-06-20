import { renderLayout } from "./layout";
import {
  fetchAuth,
  loginUrl,
  htmlEncode,
  escapeAttr,
  statusLabel,
  LIST_STATUSES,
} from "./auth";
import "@m3e/web/heading";
import "@m3e/web/list";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/skeleton";
import "@m3e/web/icon";
import "@m3e/web/card";

interface ListEntry {
  id: number;
  status: string;
  progress?: number;
  score?: number;
  notes?: string;
  media: {
    id: number;
    title: { romaji?: string; english?: string };
    coverImage?: { medium?: string };
    episodes?: number;
    averageScore?: number;
    format?: string;
    status?: string;
  };
}

const pageContent = document.getElementById("page-content")!;
let currentStatus = new URLSearchParams(window.location.search).get("status") ?? "";

function listItem(entry: ListEntry): string {
  const m = entry.media;
  const title = m.title?.english || m.title?.romaji || "Unknown";
  const img = m.coverImage?.medium || "";
  const progress = entry.progress ?? 0;
  const total = m.episodes ? ` / ${m.episodes}` : "";
  const meta = [
    statusLabel(entry.status),
    `${progress}${total} eps`,
    entry.score ? `Score: ${entry.score}` : "",
    m.format,
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <m3e-list-action onclick="window.location.href='/anime?id=${m.id}'">
      <img slot="leading" src="${escapeAttr(img)}" alt="${htmlEncode(title)}" style="border-radius:8px" loading="lazy" />
      ${htmlEncode(title)}
      <span slot="supporting-text">${htmlEncode(meta)}</span>
    </m3e-list-action>
  `;
}

function renderStatusTabs(): string {
  return `
    <div class="tab-bar scrollable">
      <m3e-button-group variant="connected" style="overflow-y:hidden">
        <m3e-button variant="tonal" toggle ${!currentStatus ? "selected" : ""} data-status="">All</m3e-button>
        ${LIST_STATUSES.map(
          (s) => `
          <m3e-button variant="tonal" toggle ${currentStatus === s.value ? "selected" : ""} data-status="${s.value}">
            <m3e-icon slot="icon" name="${s.icon}"></m3e-icon>
            ${htmlEncode(s.label)}
          </m3e-button>
        `,
        ).join("")}
      </m3e-button-group>
    </div>
  `;
}

async function loadLibrary(): Promise<void> {
  pageContent.innerHTML = `
    <div class="page-container">
      ${renderStatusTabs()}
      <m3e-list id="library-list">
        ${Array.from({ length: 5 }, () => `<m3e-skeleton style="height:72px;margin:8px 0;border-radius:12px" variant="rounded"></m3e-skeleton>`).join("")}
      </m3e-list>
    </div>
  `;

  pageContent.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentStatus = btn.getAttribute("data-status") ?? "";
      const url = currentStatus ? `?status=${currentStatus}` : "";
      history.replaceState(null, "", url);
      loadLibrary();
    });
  });

  const apiUrl = currentStatus ? `/api/library?status=${currentStatus}` : "/api/library";
  try {
    const res = await fetch(apiUrl);
    if (res.status === 401) {
      pageContent.innerHTML = `
        <div class="page-container profile-login">
          <m3e-card>
            <div class="card-content profile-login-content">
              <m3e-icon name="account_circle" style="font-size:4rem"></m3e-icon>
              <m3e-heading level="2">Sign in with AniList</m3e-heading>
              <p>Connect your AniList account to manage your lists, track progress, and sync your library.</p>
              <m3e-button variant="filled" id="login-btn">
                      <m3e-icon slot="icon" name="login"></m3e-icon>
                      Login with AniList
                    </m3e-button> 
            </div>
          </m3e-card>
        </div>
      `;
      document.getElementById("login-btn")?.addEventListener("click", () => {
        window.location.href = loginUrl();
      });
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = (data.entries ?? []) as ListEntry[];
    const list = document.getElementById("library-list");

    if (list) {
      if (entries.length === 0) {
        list.innerHTML = `<m3e-list-item><span slot="supporting-text">No entries${currentStatus ? ` with status ${statusLabel(currentStatus)}` : ""}.</span></m3e-list-item>`;
      } else {
        list.innerHTML = entries.map(listItem).join("");
      }
    }
  } catch (err) {
    console.error("Library failed:", err);
    const list = document.getElementById("library-list");
    if (list) list.innerHTML = `<m3e-list-item><span slot="supporting-text">Failed to load library.</span></m3e-list-item>`;
  }
}

(async () => {
  const auth = await fetchAuth();
  renderLayout({ title: "Library", subtitle: "Your anime list", user: auth.user });
  await loadLibrary();
})();
