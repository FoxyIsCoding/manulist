import { renderLayout } from "./layout";
import { fetchAuth, htmlEncode, escapeAttr } from "./auth";
import "@m3e/web/heading";
import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/skeleton";
import "@m3e/web/icon";

interface MediaItem {
  id: number;
  title: { romaji?: string; english?: string };
  coverImage?: { medium?: string; large?: string };
  format?: string;
  episodes?: number;
  averageScore?: number;
  popularity?: number;
  season?: string;
  seasonYear?: number;
  status?: string;
  genres?: string[];
}

const TABS = [
  { id: "trending", label: "Trending", icon: "trending_up" },
  { id: "popular", label: "Popular", icon: "local_fire_department" },
  { id: "top", label: "Top Rated", icon: "star" },
  { id: "seasonal", label: "This Season", icon: "calendar_month" },
];

const pageContent = document.getElementById("page-content")!;
let currentTab = new URLSearchParams(window.location.search).get("tab") ?? "trending";

function mediaCard(m: MediaItem): string {
  const title = m.title?.english || m.title?.romaji || "Unknown";
  const img = m.coverImage?.large || m.coverImage?.medium || "";
  const meta = [
    m.format,
    m.episodes ? `${m.episodes} eps` : "",
    m.averageScore ? `${m.averageScore}%` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <a href="/anime?id=${m.id}" class="media-card">
      <img src="${escapeAttr(img)}" alt="${htmlEncode(title)}" loading="lazy" />
      <div class="media-card-info">
        <strong>${htmlEncode(title)}</strong>
        <span>${htmlEncode(meta)}</span>
        ${m.genres?.length ? `<div class="media-card-tags">${m.genres.slice(0, 2).map((g) => `<m3e-chip>${htmlEncode(g)}</m3e-chip>`).join("")}</div>` : ""}
      </div>
    </a>
  `;
}

function renderTabs(): string {
  return `
    <div class="tab-bar">
      <m3e-button-group variant="connected">
        ${TABS.map(
          (t) => `
          <m3e-button variant="tonal" toggle ${currentTab === t.id ? "selected" : ""} data-tab="${t.id}">
            <m3e-icon slot="icon" name="${t.icon}"></m3e-icon>
            ${htmlEncode(t.label)}
          </m3e-button>
        `,
        ).join("")}
      </m3e-button-group>
    </div>
  `;
}

async function loadExplore(): Promise<void> {
  pageContent.innerHTML = `
    <div class="page-container">
      ${renderTabs()}
      <div class="media-grid" id="explore-grid">
        ${Array.from({ length: 8 }, () => `<m3e-skeleton style="aspect-ratio:3/4;border-radius:16px" variant="rounded"></m3e-skeleton>`).join("")}
      </div>
    </div>
  `;

  pageContent.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.getAttribute("data-tab") ?? "trending";
      history.replaceState(null, "", `?tab=${currentTab}`);
      loadExplore();
    });
  });

  try {
    const res = await fetch(`/api/explore?tab=${encodeURIComponent(currentTab)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const media = (data.media ?? []) as MediaItem[];
    const grid = document.getElementById("explore-grid");

    if (grid) {
      if (media.length === 0) {
        grid.innerHTML = `<p class="empty-state">No anime found.</p>`;
      } else {
        const seasonNote =
          data.season ? `<p class="section-note">${htmlEncode(data.season.season)} ${data.season.year}</p>` : "";
        grid.innerHTML = seasonNote + media.map(mediaCard).join("");
      }
    }
  } catch (err) {
    console.error("Explore failed:", err);
    const grid = document.getElementById("explore-grid");
    if (grid) grid.innerHTML = `<p class="empty-state">Failed to load. Try again.</p>`;
  }
}

(async () => {
  const auth = await fetchAuth();
  renderLayout({ title: "Explore", subtitle: "Discover anime", user: auth.user });
  await loadExplore();
})();
