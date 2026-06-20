import { renderLayout } from "./layout";
import {
  fetchAuth,
  saveListEntry,
  toggleFavourite,
  LIST_STATUSES,
  statusLabel,
  htmlEncode,
  escapeAttr,
  showSnackbar,
} from "./auth";
import "@m3e/web/heading";
import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/skeleton";
import "@m3e/web/shape";
import "@m3e/web/icon";
import "@m3e/web/icon-button";
import "@m3e/web/progress-indicator";
import "@m3e/web/snackbar";
import "@m3e/web/expansion-panel";
import "@m3e/web/fab";
import "@m3e/web/fab-menu";
import "@m3e/web/bottom-sheet";

interface Title {
  romaji?: string;
  english?: string;
  native?: string;
}

interface AnimeDetail {
  id: number;
  title: Title;
  coverImage: { extraLarge?: string; large?: string; medium?: string };
  bannerImage?: string;
  description?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  genres?: string[];
  tags?: { name: string; rank: number; isMediaSpoiler: boolean }[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  studios?: { nodes: { name: string; id: number }[] };
  staff?: {
    edges: {
      role: string;
      node: { id: number; name: { full: string }; image: { medium?: string } };
    }[];
  };
  characters?: {
    edges: {
      role: string;
      node: { id: number; name: { full: string }; image: { medium?: string } };
      voiceActors: { id: number; name: { full: string }; image: { medium?: string } }[];
    }[];
  };
  trailer?: { id: number; site: string; thumbnail?: string };
  externalLinks?: { url: string; site: string; title: string; type: string }[];
  source?: string;
  rankings?: { rank: number; type: string; allTime: boolean; context: string }[];
  streamingEpisodes?: { title: string; thumbnail: string; url: string; site: string }[];
  relations?: {
    edges: {
      relationType: string;
      node: { id: number; title: { romaji: string }; format: string; coverImage: { medium: string }; averageScore: number };
    }[];
  };
  nextAiringEpisode?: { episode: number; airingAt: number; timeUntilAiring: number };
  siteUrl?: string;
  isFavourite?: boolean;
  mediaListEntry?: {
    id: number;
    status?: string;
    progress?: number;
    score?: number;
    notes?: string;
    repeat?: number;
    updatedAt?: number;
  };
}

function extractDominantColor(imgUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i]!;
        const pg = data[i + 1]!;
        const pb = data[i + 2]!;
        const brightness = (pr * 299 + pg * 587 + pb * 114) / 1000;

        if (brightness > 30 && brightness < 225) {
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }

      if (count === 0) {
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]!; g += data[i + 1]!; b += data[i + 2]!;
        }
        count = data.length / 4;
      }

      const hex = "#" + [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count),
      ].map((c) => c.toString(16).padStart(2, "0")).join("");

      resolve(hex);
    };
    img.onerror = () => resolve("#6750A4");
  });
}

function applyThemeColor(hex: string): void {
  const theme = document.querySelector("m3e-theme");
  if (theme) {
    theme.setAttribute("color", hex);
  }
}

const params = new URLSearchParams(window.location.search);
const animeId = params.get("id");

const pageContent = document.getElementById("page-content");
let authUser: Awaited<ReturnType<typeof fetchAuth>>["user"] = null;
let currentEntry: AnimeDetail["mediaListEntry"] | null = null;
let isFavourite = false;

function mediaStatusLabel(status?: string): string {
  if (!status) return "";
  const map: Record<string, string> = {
    FINISHED: "Finished",
    RELEASING: "Airing",
    NOT_YET_RELEASED: "Not Yet Aired",
    CANCELLED: "Cancelled",
    HIATUS: "On Hiatus",
  };
  return map[status] || status;
}

function formatLabel(format?: string): string {
  if (!format) return "";
  const map: Record<string, string> = {
    TV: "TV",
    TV_SHORT: "TV Short",
    MOVIE: "Movie",
    SPECIAL: "Special",
    OVA: "OVA",
    ONA: "ONA",
    MUSIC: "Music",
  };
  return map[format] || format;
}

function wirePersonCards(): void {
  const personCards = pageContent?.querySelectorAll(".person-card");
  const randomShapes = [
    "4-leaf-clover", "4-sided-cookie", "6-sided-cookie", "7-sided-cookie", "8-leaf-clover",
    "9-sided-cookie", "12-sided-cookie", "arch", "arrow", "boom", "bun", "burst", "circle",
    "diamond", "fan", "flower", "gem", "ghost-ish", "heart", "hexagon", "oval", "pentagon",
    "pill", "pixel-circle", "pixel-triangle", "puffy", "puffy-diamond", "semicircle",
    "slanted", "soft-boom", "soft-burst", "square", "sunny", "triangle", "very-sunny",
  ];
  personCards?.forEach((card) => {
    const shape = card.querySelector("m3e-shape");
    if (shape) {
      card.addEventListener("mouseover", () => {
        const randomIndex = Math.floor(Math.random() * randomShapes.length);
        shape.setAttribute("name", randomShapes[randomIndex]!);
      });
      card.addEventListener("mouseout", () => {
        shape.setAttribute("name", "circle");
      });
    }
  });
}

function updateEditSheetDisplay(anime: AnimeDetail): void {
  const progress = currentEntry?.progress ?? 0;
  const maxEps = anime.episodes ?? 0;
  const el = document.getElementById("edit-progress-display");
  if (el) el.textContent = `${progress}${maxEps ? ` / ${maxEps}` : ""}`;
}

function wireFabMenu(anime: AnimeDetail): void {
  const sheet = document.getElementById("edit-sheet") as any;


  document.getElementById("fab-next-ep")?.addEventListener("click", async () => {
    const max = anime.episodes ?? Infinity;
    const next = Math.max(0, Math.min(max === Infinity ? 9999 : max, (currentEntry?.progress ?? 0) + 1));
    try {
      const entry = (await saveListEntry({
        id: currentEntry?.id,
        mediaId: anime.id,
        status: currentEntry?.status ?? "PLANNING",
        progress: next,
      })) as AnimeDetail["mediaListEntry"];
      if (entry) currentEntry = entry;
      else if (currentEntry) currentEntry.progress = next;
      else currentEntry = { id: 0, status: "PLANNING", progress: next };
      updateEditSheetDisplay(anime);
      showSnackbar(`Progress: ${next}${anime.episodes ? ` / ${anime.episodes}` : ""}`);
    } catch {
      showSnackbar("Failed to update progress");
    }
  });


  document.getElementById("fab-fav")?.addEventListener("click", async () => {
    try {
      isFavourite = await toggleFavourite(anime.id);
      const icon = document.querySelector("#fav-btn m3e-icon");
      icon?.setAttribute("name", isFavourite ? "favorite" : "favorite_border");
      showSnackbar(isFavourite ? "Added to favourites" : "Removed from favourites");
    } catch {
      showSnackbar("Failed to update favourite");
    }
  });


  document.getElementById("fab-edit")?.addEventListener("click", () => {
    sheet?.show();
  });


  document.getElementById("edit-cancel-btn")?.addEventListener("click", () => {
    sheet?.hide();
  });


  document.getElementById("edit-save-btn")?.addEventListener("click", async () => {
    const statusGroup = document.getElementById("edit-status-group");
    const selectedStatus = statusGroup?.querySelector("[selected]")?.getAttribute("data-status");

    const scoreGroup = document.getElementById("edit-score-group");
    const selectedScore = scoreGroup?.querySelector("[selected]")?.getAttribute("data-score");

    const notes = (document.getElementById("edit-notes") as HTMLTextAreaElement)?.value ?? "";

    try {
      const entry = (await saveListEntry({
        id: currentEntry?.id,
        mediaId: anime.id,
        status: selectedStatus ?? currentEntry?.status ?? "PLANNING",
        score: selectedScore ? parseInt(selectedScore, 10) : currentEntry?.score,
        progress: currentEntry?.progress,
        notes,
      })) as AnimeDetail["mediaListEntry"];
      if (entry) currentEntry = entry;
      showSnackbar("List entry updated");
      sheet?.hide();
      const statusBadges = document.querySelectorAll(".list-badge");
      if (selectedStatus) {
        statusBadges.forEach((b) => {
          b.textContent = statusLabel(selectedStatus);
        });
      }
    } catch {
      showSnackbar("Failed to save changes");
    }
  });

  document.querySelectorAll("#edit-status-group [data-status]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#edit-status-group [data-status]").forEach((b) => b.removeAttribute("selected"));
      btn.setAttribute("selected", "");
    });
  });


  document.querySelectorAll("#edit-score-group [data-score]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#edit-score-group [data-score]").forEach((b) => b.removeAttribute("selected"));
      btn.setAttribute("selected", "");
    });
  });


  document.getElementById("edit-progress-dec")?.addEventListener("click", () => {
    const max = anime.episodes ?? Infinity;
    const next = Math.max(0, Math.min(max === Infinity ? 9999 : max, (currentEntry?.progress ?? 0) - 1));
    if (currentEntry) currentEntry.progress = next;
    else currentEntry = { id: 0, status: "PLANNING", progress: next };
    updateEditSheetDisplay(anime);
  });

  document.getElementById("edit-progress-inc")?.addEventListener("click", () => {
    const max = anime.episodes ?? Infinity;
    const next = Math.max(0, Math.min(max === Infinity ? 9999 : max, (currentEntry?.progress ?? 0) + 1));
    if (currentEntry) currentEntry.progress = next;
    else currentEntry = { id: 0, status: "PLANNING", progress: next };
    updateEditSheetDisplay(anime);
  });
}

function renderAnimeDetail(anime: AnimeDetail): string {
  const title = anime.title?.romaji || anime.title?.english || anime.title?.native || "Unknown";
  const enTitle = anime.title?.english && anime.title.english !== title ? anime.title.english : null;
  const nativeTitle = anime.title?.native && anime.title.native !== title && anime.title.native !== enTitle ? anime.title.native : null;
  const coverImg = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || "";
  const bannerImg = anime.bannerImage || coverImg;
  const score = anime.averageScore ? `${anime.averageScore}%` : null;
  const epsText = anime.episodes ? `${anime.episodes} episodes` : null;
  const durText = anime.duration ? `${anime.duration} min/ep` : null;
  const seasonText = anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : anime.seasonYear ? `${anime.seasonYear}` : null;

  const nextAiring = anime.nextAiringEpisode
    ? `Ep ${anime.nextAiringEpisode.episode} airing ${new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleDateString()}`
    : null;

  const bestRank = anime.rankings?.find((r) => r.allTime && r.type === "RANKED")?.rank;

  const description = anime.description
    ? anime.description.replace(/\n/g, "<br>").replace(/__/g, "").replace(/~(.*?)~/g, "$1")
    : "No description available.";

  const staffHTML = anime.staff?.edges?.length
    ? anime.staff.edges.slice(0, 10).map((s) => `
      <div class="person-card">
        <m3e-shape name="circle" slot="leading">
          <img src="${escapeAttr(s.node.image?.medium || "")}" alt="${htmlEncode(s.node.name.full)}" loading="lazy" />
        </m3e-shape>
        <div class="person-info">
          <strong>${htmlEncode(s.node.name.full)}</strong>
          <span>${htmlEncode(s.role)}</span>
        </div>
      </div>
    `).join("")
    : "<p>No staff data.</p>";

  const charHTML = anime.characters?.edges?.length
    ? anime.characters.edges.slice(0, 12).map((c) => `
      <div class="person-card character-card">
        <div class="char-main">
          <m3e-shape name="circle" slot="leading">
            <img src="${escapeAttr(c.node.image?.medium || "")}" alt="${htmlEncode(c.node.name.full)}" loading="lazy" />
          </m3e-shape>
          <div class="person-info">
            <strong>${htmlEncode(c.node.name.full)}</strong>
            <span>${htmlEncode(c.role)}</span>
          </div>
        </div>
        ${c.voiceActors?.length ? `
        <div class="va-row">
          <span class="va-label">VA:</span>
          ${c.voiceActors.map((va) => `
            <div class="va-item">
              <img src="${escapeAttr(va.image?.medium || "")}" alt="${htmlEncode(va.name.full)}" loading="lazy" />
              <span>${htmlEncode(va.name.full)}</span>
            </div>
          `).join("")}
        </div>` : ""}
      </div>
    `).join("")
    : "<p>No character data.</p>";

  const relHTML = anime.relations?.edges?.length
    ? `<div class="card-grid">${anime.relations.edges.map((r) => `
      <a href="/anime?id=${r.node.id}" class="relation-card" style="text-decoration:none;color:inherit">
        <img src="${escapeAttr(r.node.coverImage?.medium || "")}" alt="${htmlEncode(r.node.title?.romaji || "")}" loading="lazy" />
        <div class="relation-info">
          <span class="relation-type">${htmlEncode(r.relationType)}</span>
          <strong>${htmlEncode(r.node.title?.romaji || "")}</strong>
          <span>${formatLabel(r.node.format)}${r.node.averageScore ? ` · ${r.node.averageScore}%` : ""}</span>
        </div>
      </a>
    `).join("")}</div>`
    : "";

  const streamingHTML = anime.streamingEpisodes?.length
    ? `<div class="card-grid">${anime.streamingEpisodes.slice(0, 6).map((ep) => `
      <a href="${escapeAttr(ep.url)}" target="_blank" rel="noopener" class="stream-card" style="text-decoration:none;color:inherit">
        <img src="${escapeAttr(ep.thumbnail || "")}" alt="${htmlEncode(ep.title)}" loading="lazy" />
        <div class="stream-info">
          <strong>${htmlEncode(ep.title)}</strong>
          <span>${htmlEncode(ep.site)}</span>
        </div>
      </a>
    `).join("")}</div>`
    : "";

  const linksHTML = anime.externalLinks?.length
    ? `<div class="links-list"><m3e-button-group variant="connected">${anime.externalLinks.map((l) => `
      <m3e-button variant="tonal" toggle onclick="window.open('${escapeAttr(l.url)}','_blank')">
        ${htmlEncode(l.title || l.site)}
      </m3e-button>
    `).join("")}</m3e-button-group></div>`
    : "";

  const studiosText = anime.studios?.nodes?.map((s) => s.name).join(", ") || "Unknown";

  const genresHTML = anime.genres?.length
    ? `<div class="tags-row">${anime.genres.map((g) => `<m3e-chip variant="assist">${htmlEncode(g)}</m3e-chip>`).join("")}</div>`
    : "";

  const tagsHTML = anime.tags?.filter((t) => !t.isMediaSpoiler && t.rank > 50).slice(0, 10).length
    ? `<div class="tags-row">${anime.tags.filter((t) => !t.isMediaSpoiler && t.rank > 50).slice(0, 10).map((t) => `<m3e-chip>${htmlEncode(t.name)}</m3e-chip>`).join("")}</div>`
    : "";

  return `
    <div class="anime-detail">
      <div class="anime-hero" style="background-image: url('${escapeAttr(bannerImg)}')">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <img class="hero-cover" src="${escapeAttr(coverImg)}" alt="${escapeAttr(title)}" />
          <div class="hero-text">
            <h1>${htmlEncode(title)}</h1>
            ${enTitle ? `<h2>${htmlEncode(enTitle)}</h2>` : ""}
            ${nativeTitle ? `<h3>${htmlEncode(nativeTitle)}</h3>` : ""}
            <div class="hero-badges">
              ${score ? `<span class="badge score-badge">${htmlEncode(score)}</span>` : ""}
              ${bestRank ? `<span class="badge rank-badge">#${bestRank}</span>` : ""}
              <span class="badge">${formatLabel(anime.format)}</span>
              ${anime.status ? `<span class="badge status-badge">${mediaStatusLabel(anime.status)}</span>` : ""}
              ${currentEntry?.status ? `<span class="badge list-badge">${htmlEncode(statusLabel(currentEntry.status))}</span>` : ""}
              ${nextAiring ? `<span class="badge">${htmlEncode(nextAiring)}</span>` : ""}
            </div>
          </div>
        </div>
      </div>

      <div class="anime-body">
        <div class="info-bar">
          ${epsText ? `<div class="info-item"><m3e-icon name="smart_display"></m3e-icon><span>${htmlEncode(epsText)}</span></div>` : ""}
          ${durText ? `<div class="info-item"><m3e-icon name="timer"></m3e-icon><span>${htmlEncode(durText)}</span></div>` : ""}
          ${seasonText ? `<div class="info-item"><m3e-icon name="calendar_month"></m3e-icon><span>${htmlEncode(seasonText)}</span></div>` : ""}
          <div class="info-item"><m3e-icon name="business"></m3e-icon><span>${htmlEncode(studiosText)}</span></div>
          ${anime.source ? `<div class="info-item"><m3e-icon name="auto_stories"></m3e-icon><span>${htmlEncode(anime.source.replace(/_/g, " "))}</span></div>` : ""}
          ${anime.popularity ? `<div class="info-item"><m3e-icon name="favorite"></m3e-icon><span>${anime.popularity.toLocaleString()} favs</span></div>` : ""}
        </div>

        ${genresHTML || tagsHTML ? `
        <section class="anime-section">
          <m3e-heading level="3">Tags & Genres</m3e-heading>
          ${genresHTML}
          ${tagsHTML}
        </section>` : ""}

        <section class="anime-section">
          <m3e-heading level="3">Synopsis</m3e-heading>
          <div class="description-text">${description}</div>
        </section>

        ${staffHTML ? `
        <section class="anime-section">
          <m3e-heading level="3">Staff</m3e-heading>
          <div class="person-grid">${staffHTML}</div>
        </section>` : ""}

        ${charHTML ? `
        <section class="anime-section">
          <m3e-heading level="3">Characters & Voice Actors</m3e-heading>
          <div class="person-grid">${charHTML}</div>
        </section>` : ""}

        ${relHTML ? `
        <section class="anime-section">
          <m3e-heading level="3">Related</m3e-heading>
          ${relHTML}
        </section>` : ""}

        ${streamingHTML ? `
        <section class="anime-section">
          <m3e-heading level="3">Streaming Episodes</m3e-heading>
          ${streamingHTML}
        </section>` : ""}

        ${linksHTML ? `
        <section class="anime-section">
          <m3e-heading level="3">External Links</m3e-heading>
          ${linksHTML}
        </section>` : ""}

        <div class="anime-footer">
          <a href="${htmlEncode(anime.siteUrl || `https://anilist.co/anime/${anime.id}`)}" target="_blank" rel="noopener">
            View on AniList
          </a>
        </div>
      </div>

      <!-- FAB with quick actions -->
      <m3e-fab variant="primary" size="medium" id="anime-fab" lowered>
        <m3e-fab-menu-trigger for="anime-fab-menu">
          <m3e-icon name="more_vert"></m3e-icon>
        </m3e-fab-menu-trigger>
      </m3e-fab>
      <m3e-fab-menu id="anime-fab-menu" variant="primary">

        <m3e-fab-menu-item id="fab-next-ep">
          <m3e-icon slot="icon" name="skip_next" filled></m3e-icon>
          Next Episode
        </m3e-fab-menu-item>
        <m3e-fab-menu-item id="fab-fav">
          <m3e-icon slot="icon" name="favorite" filled></m3e-icon>
          Like
        </m3e-fab-menu-item>
        <m3e-fab-menu-item id="fab-edit">
          <m3e-icon slot="icon" name="edit" filled></m3e-icon>
          Edit Info
        </m3e-fab-menu-item>
      </m3e-fab-menu>

      <!-- Bottom sheet for edit info -->
      <m3e-bottom-sheet id="edit-sheet" modal handle detents="fit" hideable>
        <div class="edit-sheet-content">
          <h3 class="edit-sheet-title">Edit List Entry</h3>

          <div class="edit-field">
            <label class="edit-label">Status</label>
            <div class="scrollable-btn-group">
              <m3e-button-group variant="connected" id="edit-status-group">
                ${LIST_STATUSES.map(
                  (s) => `
                  <m3e-button variant="tonal" toggle data-status="${s.value}" ${currentEntry?.status === s.value ? "selected" : ""}>
                    <m3e-icon slot="icon" name="${s.icon}"></m3e-icon>
                    ${htmlEncode(s.label)}
                  </m3e-button>
                `,
                ).join("")}
              </m3e-button-group>
            </div>
          </div>

          <div class="edit-field">
            <label class="edit-label">Progress</label>
            <div class="edit-progress-row">
              <m3e-icon-button variant="tonal" id="edit-progress-dec" aria-label="Decrease progress">
                <m3e-icon name="remove"></m3e-icon>
              </m3e-icon-button>
              <span class="edit-progress-text" id="edit-progress-display">${currentEntry?.progress ?? 0}${anime.episodes ? ` / ${anime.episodes}` : ""}</span>
              <m3e-icon-button variant="tonal" id="edit-progress-inc" aria-label="Increase progress">
                <m3e-icon name="add"></m3e-icon>
              </m3e-icon-button>
            </div>
          </div>

          <div class="edit-field">
            <label class="edit-label">Score</label>
            <div class="scrollable-btn-group">
              <m3e-button-group variant="connected" id="edit-score-group">
                ${[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                  (s) => `
                  <m3e-button variant="tonal" toggle data-score="${s}" ${currentEntry?.score === s ? "selected" : ""}>${s}</m3e-button>
                `,
                ).join("")}
              </m3e-button-group>
            </div>
          </div>

          <div class="edit-field">
            <label class="edit-label">Notes</label>
            <textarea id="edit-notes" class="about-textarea" rows="3" placeholder="Private notes...">${htmlEncode(currentEntry?.notes ?? "")}</textarea>
          </div>

          <div class="edit-actions">
            <m3e-button variant="outlined" id="edit-cancel-btn">Cancel</m3e-button>
            <m3e-button variant="filled" id="edit-save-btn">Save</m3e-button>
          </div>
        </div>
      </m3e-bottom-sheet>
    </div>
  `;
}

function renderLoading(): void {
  if (pageContent) {
    pageContent.innerHTML = `
      <div class="loading-page">
        <m3e-skeleton style="width:100%;height:200px;border-radius:16px" variant="rounded"></m3e-skeleton>
        <m3e-skeleton style="width:60%;height:24px;margin-top:16px" variant="text"></m3e-skeleton>
        <m3e-skeleton style="width:40%;height:20px;margin-top:8px" variant="text"></m3e-skeleton>
        <m3e-skeleton style="width:100%;height:120px;margin-top:16px;border-radius:12px" variant="rounded"></m3e-skeleton>
      </div>
    `;
  }
}

function renderError(msg: string): void {
  if (pageContent) {
    pageContent.innerHTML = `
      <div class="error-page">
        <m3e-icon name="error" style="font-size:3rem;color:var(--md-sys-color-error)"></m3e-icon>
        <p>${htmlEncode(msg)}</p>
        <m3e-button variant="filled" onclick="window.location.href='/'">Back to Home</m3e-button>
      </div>
    `;
  }
}

(async () => {
  if (!animeId) {
    const auth = await fetchAuth();
    authUser = auth.user;
    renderLayout({ title: "Error", subtitle: "Missing ID", user: auth.user });
    renderError("No anime ID provided.");
    return;
  }

  renderLoading();

  try {
    const auth = await fetchAuth();
    authUser = auth.user;

    const res = await fetch(`/api/anime/${encodeURIComponent(animeId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const anime = data?.anime as AnimeDetail | undefined;
    if (!anime) throw new Error("Anime not found");

    currentEntry = anime.mediaListEntry ?? null;
    isFavourite = anime.isFavourite ?? false;

    const title = anime.title?.romaji || anime.title?.english || "Anime";
    renderLayout({ title, subtitle: "Anime details", user: auth.user });

    if (pageContent) {
      pageContent.innerHTML = renderAnimeDetail(anime);
      wirePersonCards();
      wireFabMenu(anime);
    }

    const coverUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium;
    if (coverUrl) {
      extractDominantColor(coverUrl).then(applyThemeColor);
    }
  } catch (err) {
    console.error("Failed to load anime:", err);
    const auth = await fetchAuth();
    renderLayout({ title: "Error", subtitle: "Failed to load", user: auth.user });
    renderError(err instanceof Error ? err.message : "Failed to load anime details.");
  }
})();
