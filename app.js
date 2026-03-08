const GITHUB_CONFIG = {
  owner: "your-github-username-or-org",
  repo: "your-repository-name",
  branch: "main",
  siteBasePath: "/",
  eventLabel: "event",
  rsvpLabel: "rsvp"
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80";

const els = {
  repoLink: document.getElementById("repoLink"),
  createEventLink: document.getElementById("createEventLink"),
  heroCreateEventLink: document.getElementById("heroCreateEventLink"),
  createEventYamlLink: document.getElementById("createEventYamlLink"),
  createEventModal: document.getElementById("createEventModal"),
  jumpToEvents: document.getElementById("jumpToEvents"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  statusFilter: document.getElementById("statusFilter"),
  sortFilter: document.getElementById("sortFilter"),
  eventsGrid: document.getElementById("eventsGrid"),
  statusBanner: document.getElementById("statusBanner"),
  emptyState: document.getElementById("emptyState"),
  cardTemplate: document.getElementById("eventCardTemplate"),
  featuredSummary: document.getElementById("featuredSummary"),
  modal: document.getElementById("eventModal"),
  modalContent: document.getElementById("modalContent"),
  statEventCount: document.getElementById("statEventCount"),
  statUpcomingCount: document.getElementById("statUpcomingCount"),
  statRsvpCount: document.getElementById("statRsvpCount")
};

const state = {
  issues: [],
  events: [],
  rsvps: [],
  categories: new Set(),
  filters: {
    search: "",
    category: "all",
    status: "all",
    sort: "soonest"
  }
};

const github = {
  repoUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`,
  issuesUrl: `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues?state=all&per_page=100`,
  createEventUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/new?template=create-event.yml`,
  rsvpFormUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/new?template=rsvp.yml`
};

function init() {
  wireChrome();
  bindFilters();
  loadData();
}

function wireChrome() {
  els.repoLink.href = github.repoUrl;
  if (els.createEventYamlLink) {
    els.createEventYamlLink.href = github.createEventUrl;
  }

  els.createEventLink.addEventListener("click", openCreateEventModal);
  els.heroCreateEventLink.addEventListener("click", openCreateEventModal);

  const createForm = document.getElementById("createEventForm");
  if (createForm) {
    bindCreateEventForm(createForm);
  }

  els.jumpToEvents.addEventListener("click", () => {
    document.getElementById("eventsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindFilters() {
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.categoryFilter.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    render();
  });

  els.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    render();
  });

  els.sortFilter.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
  });
}

function openCreateEventModal() {
  els.createEventModal?.showModal();
}

function bindCreateEventForm(form) {
  const nameInput = form.elements.event_name;
  const idInput = form.elements.event_id;
  const startInput = form.elements.start_date;
  const endInput = form.elements.end_date;

  nameInput?.addEventListener("input", () => {
    if (!idInput.dataset.userEdited || !idInput.value.trim()) {
      idInput.value = slugify(nameInput.value);
    }
  });

  idInput?.addEventListener("input", () => {
    const cursor = idInput.selectionStart;
    idInput.dataset.userEdited = idInput.value.trim() ? "true" : "";
    idInput.value = slugify(idInput.value);
    if (typeof cursor === "number") {
      idInput.setSelectionRange(idInput.value.length, idInput.value.length);
    }
  });

  startInput?.addEventListener("change", () => {
    if (!endInput.value) endInput.value = startInput.value;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const eventName = String(formData.get("event_name") || "").trim();
    const eventId = slugify(formData.get("event_id") || eventName);
    const issueTitle = `Event: ${eventName}`;
    const issueBody = [
      `### Event name`,
      eventName,
      ``,
      `### Event ID`,
      eventId,
      ``,
      `### Category`,
      String(formData.get("category") || "Other"),
      ``,
      `### Start date`,
      formatDateForIssue(formData.get("start_date")),
      ``,
      `### End date`,
      formatDateForIssue(formData.get("end_date")),
      ``,
      `### Location`,
      String(formData.get("location") || "").trim(),
      ``,
      `### Cover image URL`,
      String(formData.get("cover_image") || "").trim(),
      ``,
      `### Capacity`,
      String(formData.get("capacity") || "").trim(),
      ``,
      `### Organizer`,
      String(formData.get("organizer") || "").trim(),
      ``,
      `### Registration closes`,
      formatDateForIssue(formData.get("registration_closes")),
      ``,
      `### Tags`,
      String(formData.get("tags") || "").trim(),
      ``,
      `### Description`,
      String(formData.get("description") || "").trim(),
      ``,
      `_Created from PulsePlan event studio._`
    ].join("\n");

    const quickUrl = `${github.repoUrl}/issues/new?labels=${encodeURIComponent(
      GITHUB_CONFIG.eventLabel
    )}&title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

    window.open(quickUrl, "_blank", "noopener,noreferrer");
  });
}

async function loadData() {
  setBanner("Loading public issues from GitHub…");

  try {
    const response = await fetch(github.issuesUrl, {
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const issues = await response.json();
    state.issues = issues.filter((issue) => !issue.pull_request);
    state.events = state.issues
      .filter((issue) => issue.labels.some((label) => label.name === GITHUB_CONFIG.eventLabel))
      .map(parseEventIssue)
      .filter(Boolean);

    state.rsvps = state.issues
      .filter((issue) => issue.labels.some((label) => label.name === GITHUB_CONFIG.rsvpLabel))
      .map(parseRsvpIssue)
      .filter(Boolean);

    hydrateCounts();
    populateCategories();
    render();
  } catch (error) {
    console.error(error);
    setBanner(
      "Could not load issues. Check owner/repo in app.js, confirm the repository is public, and verify issue labels and forms are enabled."
    );
    els.featuredSummary.innerHTML = `<article><h4>Configuration needed</h4><p>The site could not reach the GitHub Issues API for <code>${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}</code>.</p></article>`;
  }
}

function hydrateCounts() {
  const upcomingCount = state.events.filter((event) => deriveEventStatus(event) !== "ended").length;
  els.statEventCount.textContent = String(state.events.length);
  els.statUpcomingCount.textContent = String(upcomingCount);
  els.statRsvpCount.textContent = String(state.rsvps.length);
}

function populateCategories() {
  state.categories = new Set(state.events.map((event) => event.category).filter(Boolean));
  const current = state.filters.category;
  els.categoryFilter.innerHTML = `<option value="all">All categories</option>`;

  [...state.categories].sort().forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    if (category === current) option.selected = true;
    els.categoryFilter.appendChild(option);
  });
}

function render() {
  const filtered = getFilteredEvents();
  setBanner(buildBannerText(filtered));
  renderFeaturedSummary(filtered);
  renderEventGrid(filtered);
}

function getFilteredEvents() {
  const now = Date.now();
  const search = state.filters.search;

  const filtered = state.events.filter((event) => {
    const haystack = [
      event.title,
      event.location,
      event.organizer,
      event.category,
      event.description,
      ...(event.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || haystack.includes(search);
    const matchesCategory = state.filters.category === "all" || event.category === state.filters.category;
    const status = deriveEventStatus(event, now);
    const matchesStatus = state.filters.status === "all" || status === state.filters.status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return filtered.sort((a, b) => {
    switch (state.filters.sort) {
      case "latest":
        return new Date(b.issueCreatedAt).getTime() - new Date(a.issueCreatedAt).getTime();
      case "most-rsvps":
        return getRsvpCountForEvent(b.slug) - getRsvpCountForEvent(a.slug);
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "soonest":
      default:
        return (parseDateInput(a.startDate)?.getTime() || Number.MAX_SAFE_INTEGER) -
          (parseDateInput(b.startDate)?.getTime() || Number.MAX_SAFE_INTEGER);
    }
  });
}

function renderFeaturedSummary() {
  if (!state.events.length) {
    els.featuredSummary.innerHTML = `
      <article>
        <h4>No event issues yet</h4>
        <p>Use the <strong>Create event</strong> button to open the event studio and publish your first event.</p>
      </article>
    `;
    return;
  }

  const topUpcoming = [...state.events]
    .filter((event) => deriveEventStatus(event) !== "ended")
    .sort(
      (a, b) =>
        (parseDateInput(a.startDate)?.getTime() || Number.MAX_SAFE_INTEGER) -
        (parseDateInput(b.startDate)?.getTime() || Number.MAX_SAFE_INTEGER)
    )
    .slice(0, 3);

  els.featuredSummary.innerHTML = topUpcoming
    .map((event) => {
      const count = getRsvpCountForEvent(event.slug);
      return `
        <article>
          <h4>${escapeHtml(event.title)}</h4>
          <p>${escapeHtml(formatDateRange(event.startDate, event.endDate))} · ${escapeHtml(event.location || "TBA")}</p>
          <div class="meta-row">
            <span class="stat-pill">${count} RSVP${count === 1 ? "" : "s"}</span>
            <span class="stat-pill">${escapeHtml(event.category || "General")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderEventGrid(events) {
  els.eventsGrid.innerHTML = "";
  els.emptyState.classList.toggle("hidden", events.length !== 0);

  events.forEach((event) => {
    const fragment = els.cardTemplate.content.cloneNode(true);
    const root = fragment.querySelector(".event-card");
    const image = fragment.querySelector(".event-card-image");
    const status = deriveEventStatus(event);
    const count = getRsvpCountForEvent(event.slug);

    image.src = event.coverImage || FALLBACK_IMAGE;
    image.alt = `${event.title} cover image`;
    fragment.querySelector(".event-status-badge").textContent = prettyStatus(status);
    fragment.querySelector(".event-category-badge").textContent = event.category || "General";
    fragment.querySelector(".event-card-meta").textContent = `${formatDateRange(event.startDate, event.endDate)} · ${event.location || "Location TBA"}`;
    fragment.querySelector(".event-card-title").textContent = event.title;
    fragment.querySelector(".event-card-description").textContent = event.description || "No event description was provided.";
    fragment.querySelector(".event-rsvp-summary").textContent = `${count} RSVP${count === 1 ? "" : "s"}${event.capacity ? ` · cap ${event.capacity}` : ""}`;

    const tagRow = fragment.querySelector(".tag-row");
    (event.tags || []).slice(0, 4).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = `#${tag}`;
      tagRow.appendChild(chip);
    });

    root.querySelector(".event-open-button").addEventListener("click", () => openEventModal(event));
    els.eventsGrid.appendChild(fragment);
  });
}

function openEventModal(event) {
  const rsvpCount = getRsvpCountForEvent(event.slug);
  const yesCount = getRsvpCountForEvent(event.slug, "yes");
  const maybeCount = getRsvpCountForEvent(event.slug, "maybe");
  const declineCount = getRsvpCountForEvent(event.slug, "no");

  els.modalContent.innerHTML = `
    <div class="modal-grid">
      <section class="modal-main">
        <img class="modal-cover" src="${escapeAttribute(event.coverImage || FALLBACK_IMAGE)}" alt="${escapeAttribute(event.title)}" />
        <div class="event-modal-header">
          <span class="pill">${escapeHtml(prettyStatus(deriveEventStatus(event)))}</span>
          <span class="pill">${escapeHtml(event.category || "General")}</span>
          ${event.capacity ? `<span class="pill">Capacity ${escapeHtml(String(event.capacity))}</span>` : ""}
        </div>
        <h2 class="modal-headline">${escapeHtml(event.title)}</h2>
        <p class="modal-description">${escapeHtml(event.description || "No event description was provided.")}</p>
        <div class="info-grid">
          <div class="info-card">
            <strong>When</strong>
            <div class="meta-copy">${escapeHtml(formatDateRange(event.startDate, event.endDate))}</div>
          </div>
          <div class="info-card">
            <strong>Where</strong>
            <div class="meta-copy">${escapeHtml(event.location || "Location TBA")}</div>
          </div>
          <div class="info-card">
            <strong>Organizer</strong>
            <div class="meta-copy">${escapeHtml(event.organizer || "Not specified")}</div>
          </div>
          <div class="info-card">
            <strong>Registration closes</strong>
            <div class="meta-copy">${escapeHtml(event.registrationCloses || "Not specified")}</div>
          </div>
        </div>
        <div class="info-card">
          <strong>Details</strong>
          <div class="meta-copy">Issue #${event.issueNumber} · <a target="_blank" rel="noreferrer" href="${event.issueUrl}">Open GitHub issue</a></div>
        </div>
      </section>

      <aside class="modal-aside">
        <div class="rsvp-panel">
          <strong>RSVP snapshot</strong>
          <div class="rsvp-stat-row">
            <span class="stat-pill">${rsvpCount} total</span>
            <span class="stat-pill">${yesCount} going</span>
            <span class="stat-pill">${maybeCount} maybe</span>
            <span class="stat-pill">${declineCount} not attending</span>
          </div>
          <p class="field-hint">Use the modal below to prepare an RSVP. You can open the GitHub YAML form or generate a quick prefilled issue.</p>
        </div>

        <div class="quick-rsvp-panel">
          <strong>RSVP from this page</strong>
          <form id="quickRsvpForm" class="rsvp-form">
            <div class="split">
              <label>
                <span>Your name</span>
                <input name="name" placeholder="Alex Morgan" required />
              </label>
              <label>
                <span>Guest count</span>
                <input name="guests" type="number" min="1" value="1" required />
              </label>
            </div>
            <label>
              <span>Status</span>
              <select name="status">
                <option value="yes">Yes, attending</option>
                <option value="maybe">Maybe</option>
                <option value="no">No, cannot attend</option>
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea name="notes" placeholder="Accessibility needs, dietary notes, plus-one details, etc."></textarea>
            </label>
            <p class="inline-note field-hint">This static site cannot directly submit the issue without authentication, so the button below opens a prefilled GitHub issue composer. The YAML RSVP form is also one click away.</p>
            <div class="modal-actions">
              <button type="submit" class="button button-primary">Open quick RSVP</button>
              <a class="button button-ghost" target="_blank" rel="noreferrer" href="${buildRsvpTemplateUrl(event)}">Open YAML RSVP form</a>
            </div>
          </form>
        </div>
      </aside>
    </div>
  `;

  els.modal.showModal();

  els.modalContent.querySelector("#quickRsvpForm").addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const formData = new FormData(submitEvent.currentTarget);
    const issueTitle = `RSVP: ${event.slug} — ${formData.get("name")}`;
    const issueBody = [
      `## RSVP`,
      ``,
      `- Event ID: ${event.slug}`,
      `- Event title: ${event.title}`,
      `- Attendee name: ${formData.get("name")}`,
      `- Attendance status: ${formData.get("status")}`,
      `- Guest count: ${formData.get("guests")}`,
      `- Notes: ${formData.get("notes") || "None"}`,
      ``,
      `_Created from PulsePlan quick RSVP modal._`
    ].join("\n");

    const quickUrl = `${github.repoUrl}/issues/new?labels=${encodeURIComponent(
      GITHUB_CONFIG.rsvpLabel
    )}&title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

    window.open(quickUrl, "_blank", "noopener,noreferrer");
  });
}

function buildRsvpTemplateUrl(event) {
  const title = `RSVP: ${event.slug}`;
  return `${github.rsvpFormUrl}&title=${encodeURIComponent(title)}`;
}

function buildBannerText(events) {
  if (!state.events.length) {
    return "No event issues detected yet. Publish your first event with the event studio or the YAML event form.";
  }

  if (!events.length) {
    return `Showing 0 matching events out of ${state.events.length}.`;
  }

  const upcoming = events.filter((event) => deriveEventStatus(event) !== "ended").length;
  return `Showing ${events.length} event${events.length === 1 ? "" : "s"}. ${upcoming} still upcoming or live.`;
}

function setBanner(message) {
  els.statusBanner.textContent = message;
}

function getRsvpCountForEvent(slug, statusFilter = null) {
  return state.rsvps.filter((rsvp) => {
    const sameSlug = rsvp.eventSlug === slug;
    const sameStatus = statusFilter ? rsvp.attendanceStatus === statusFilter : true;
    return sameSlug && sameStatus;
  }).length;
}

function parseEventIssue(issue) {
  const body = issue.body || "";
  const slug = slugify(readField(body, "Event ID") || issue.title);
  const startDate = readField(body, "Start date") || readField(body, "Date");
  if (!slug || !startDate) return null;

  return {
    kind: "event",
    slug,
    title: readField(body, "Event name") || issue.title,
    category: readField(body, "Category") || "General",
    startDate,
    endDate: readField(body, "End date") || startDate,
    location: readField(body, "Location") || "",
    coverImage: readField(body, "Cover image URL") || FALLBACK_IMAGE,
    capacity: parseInt(readField(body, "Capacity"), 10) || null,
    organizer: readField(body, "Organizer") || issue.user?.login || "",
    registrationCloses: readField(body, "Registration closes") || "",
    description: readField(body, "Description") || issue.body?.slice(0, 240) || "",
    tags: splitTags(readField(body, "Tags")),
    issueNumber: issue.number,
    issueCreatedAt: issue.created_at,
    issueUrl: issue.html_url,
    state: issue.state
  };
}

function parseRsvpIssue(issue) {
  const body = issue.body || "";
  const eventSlug = slugify(
    readField(body, "Event ID") ||
      extractBulletField(body, "Event ID") ||
      extractBulletField(body, "Event title") ||
      issue.title.replace(/^RSVP:\s*/i, "")
  );

  if (!eventSlug) return null;

  return {
    kind: "rsvp",
    eventSlug,
    attendeeName: readField(body, "Attendee name") || extractBulletField(body, "Attendee name") || issue.user?.login,
    attendanceStatus: normalizeStatus(
      readField(body, "Attendance status") || extractBulletField(body, "Attendance status") || "yes"
    ),
    guestCount: parseInt(readField(body, "Guest count") || extractBulletField(body, "Guest count"), 10) || 1,
    notes: readField(body, "Notes") || extractBulletField(body, "Notes") || "",
    issueNumber: issue.number,
    issueUrl: issue.html_url
  };
}

function readField(markdown, label) {
  const regex = new RegExp(`###\\s+${escapeRegExp(label)}\\s*\\n+([\\s\\S]*?)(?=\\n###\\s+|$)`, "i");
  const match = markdown.match(regex);
  if (!match) return "";
  return cleanCapturedValue(match[1]);
}

function extractBulletField(markdown, label) {
  const regex = new RegExp(`-\\s+${escapeRegExp(label)}:\\s*(.+)`, "i");
  const match = markdown.match(regex);
  return match ? cleanCapturedValue(match[1]) : "";
}

function cleanCapturedValue(value) {
  return (value || "")
    .replace(/^_No response_$/im, "")
    .replace(/^<!--.*?-->$/gms, "")
    .replace(/\r/g, "")
    .trim();
}

function splitTags(tagText) {
  return (tagText || "")
    .split(/[\n,]/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const dmyMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForIssue(input) {
  const parsed = parseDateInput(input);
  return parsed ? formatDateDMY(parsed) : "";
}

function formatDateDMY(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function deriveEventStatus(event, now = Date.now()) {
  const startDate = parseDateInput(event.startDate);
  const endDate = parseDateInput(event.endDate || event.startDate) || startDate;
  const start = startDate ? startDate.getTime() : Number.NaN;
  const end = endDate ? endDate.getTime() : Number.NaN;

  if (Number.isNaN(start)) return "upcoming";
  if (now < start) return "upcoming";
  if (now > end + 86399999) return "ended";
  return "live";
}

function normalizeStatus(status) {
  const normalized = String(status || "yes").toLowerCase();
  if (normalized.includes("maybe")) return "maybe";
  if (normalized.includes("no") || normalized.includes("decline")) return "no";
  return "yes";
}

function prettyStatus(status) {
  return { upcoming: "Upcoming", live: "Live now", ended: "Ended", yes: "Attending", maybe: "Maybe", no: "Not attending" }[status] || status;
}

function formatDateRange(startDate, endDate) {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate || startDate) || start;
  if (!start) return "Date TBD";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const startText = formatter.format(start);
  const endText = end ? formatter.format(end) : startText;
  return startText === endText ? startText : `${startText} → ${endText}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

window.addEventListener("click", (event) => {
  if (event.target === els.modal) {
    els.modal.close();
  }

  if (event.target === els.createEventModal) {
    els.createEventModal.close();
  }

  const closeTarget = event.target.closest("[data-close-modal]");
  if (closeTarget) {
    document.getElementById(closeTarget.dataset.closeModal)?.close();
  }
});

init();
