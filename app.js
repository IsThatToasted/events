const GITHUB_CONFIG = {
  owner: "IsThatToasted",
  repo: "events",
  eventLabel: "event",
  rsvpLabel: "rsvp"
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80";

const els = {
  repoLink: document.getElementById("repoLink"),
  openCreateEvent: document.getElementById("openCreateEvent"),
  heroCreateEvent: document.getElementById("heroCreateEvent"),
  openCreateEventSecondary: document.getElementById("openCreateEventSecondary"),
  createEventYamlLink: document.getElementById("createEventYamlLink"),
  jumpToCalendar: document.getElementById("jumpToCalendar"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  statusFilter: document.getElementById("statusFilter"),
  sortFilter: document.getElementById("sortFilter"),
  statEventCount: document.getElementById("statEventCount"),
  statUpcomingCount: document.getElementById("statUpcomingCount"),
  statRsvpCount: document.getElementById("statRsvpCount"),
  calendarTitle: document.getElementById("calendarTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  todayMonth: document.getElementById("todayMonth"),
  statusBanner: document.getElementById("statusBanner"),
  featuredSummary: document.getElementById("featuredSummary"),
  agendaTitle: document.getElementById("agendaTitle"),
  agendaCount: document.getElementById("agendaCount"),
  agendaList: document.getElementById("agendaList"),
  eventsGrid: document.getElementById("eventsGrid"),
  emptyState: document.getElementById("emptyState"),
  createEventModal: document.getElementById("createEventModal"),
  createEventForm: document.getElementById("createEventForm"),
  eventModal: document.getElementById("eventModal"),
  eventModalContent: document.getElementById("eventModalContent"),
  rsvpModal: document.getElementById("rsvpModal"),
  rsvpForm: document.getElementById("rsvpForm"),
  rsvpModalTitle: document.getElementById("rsvpModalTitle"),
  rsvpYamlLink: document.getElementById("rsvpYamlLink"),
  cardTemplate: document.getElementById("eventCardTemplate")
};

const state = {
  issues: [],
  events: [],
  rsvps: [],
  selectedDateKey: dateKey(new Date()),
  monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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
  eventsJsonUrl: `./data/events.json`,
  createEventUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/new?template=create-event.yml`,
  rsvpFormUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/new?template=rsvp.yml`
};

function syncGithubLinks(owner, repo) {
  if (!owner || !repo) return;
  GITHUB_CONFIG.owner = owner;
  GITHUB_CONFIG.repo = repo;
  github.repoUrl = `https://github.com/${owner}/${repo}`;
  github.issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`;
  github.createEventUrl = `https://github.com/${owner}/${repo}/issues/new?template=create-event.yml`;
  github.rsvpFormUrl = `https://github.com/${owner}/${repo}/issues/new?template=rsvp.yml`;
  if (els.repoLink) els.repoLink.href = github.repoUrl;
  if (els.createEventYamlLink) els.createEventYamlLink.href = github.createEventUrl;
  if (els.rsvpYamlLink) els.rsvpYamlLink.href = github.rsvpFormUrl;
}

init();

function init() {
  wireChrome();
  bindFilters();
  bindCreateEventForm();
  bindRsvpForm();
  loadData();
}

function wireChrome() {
  els.repoLink.href = github.repoUrl;
  els.createEventYamlLink.href = github.createEventUrl;
  els.rsvpYamlLink.href = github.rsvpFormUrl;

  [els.openCreateEvent, els.heroCreateEvent, els.openCreateEventSecondary].forEach((button) => {
    button?.addEventListener("click", () => els.createEventModal.showModal());
  });

  els.jumpToCalendar.addEventListener("click", () => {
    document.getElementById("calendarSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.closeModal)?.close();
    });
  });

  els.prevMonth.addEventListener("click", () => {
    state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() - 1, 1);
    renderCalendar(getFilteredEvents());
  });

  els.nextMonth.addEventListener("click", () => {
    state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() + 1, 1);
    renderCalendar(getFilteredEvents());
  });

  els.todayMonth.addEventListener("click", () => {
    const today = new Date();
    state.monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
    state.selectedDateKey = dateKey(today);
    render();
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

function bindCreateEventForm() {
  const form = els.createEventForm;
  const nameInput = form.elements.event_name;
  const idInput = form.elements.event_id;
  const startInput = form.elements.start_date;
  const endInput = form.elements.end_date;

  nameInput.addEventListener("input", () => {
    if (!idInput.dataset.userEdited || !idInput.value.trim()) {
      idInput.value = slugify(nameInput.value);
    }
  });

  idInput.addEventListener("input", () => {
    idInput.dataset.userEdited = idInput.value.trim() ? "true" : "";
    idInput.value = slugify(idInput.value);
  });

  startInput.addEventListener("change", () => {
    if (!endInput.value) endInput.value = startInput.value;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const eventName = String(data.get("event_name") || "").trim();
    const eventId = slugify(String(data.get("event_id") || eventName));
    const title = `Event: ${eventName}`;
    const body = [
      "### Event name",
      eventName,
      "",
      "### Event ID",
      eventId,
      "",
      "### Category",
      String(data.get("category") || "Other").trim(),
      "",
      "### Start date",
      formatDateForIssue(String(data.get("start_date") || "")),
      "",
      "### End date",
      formatDateForIssue(String(data.get("end_date") || "")),
      "",
      "### Location",
      String(data.get("location") || "").trim(),
      "",
      "### Cover image URL",
      String(data.get("cover_image") || "").trim(),
      "",
      "### Capacity",
      String(data.get("capacity") || "").trim(),
      "",
      "### Organizer",
      String(data.get("organizer") || "").trim(),
      "",
      "### Registration closes",
      formatDateForIssue(String(data.get("registration_closes") || "")),
      "",
      "### Tags",
      String(data.get("tags") || "").trim(),
      "",
      "### Description",
      String(data.get("description") || "").trim(),
      "",
      "_Created from PulsePlan event studio._"
    ].join("\n");

    openIssueComposer(title, body, GITHUB_CONFIG.eventLabel);
  });
}

function bindRsvpForm() {
  els.rsvpForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(els.rsvpForm);
    const eventId = String(data.get("event_id") || "").trim();
    const attendeeName = String(data.get("attendee_name") || "").trim();
    const title = `RSVP: ${eventId} — ${attendeeName}`;
    const body = [
      "### Event ID",
      eventId,
      "",
      "### Attendee name",
      attendeeName,
      "",
      "### Attendance status",
      String(data.get("attendance_status") || "").trim(),
      "",
      "### Guest count",
      String(data.get("guest_count") || "1").trim(),
      "",
      "### Notes",
      String(data.get("notes") || "").trim(),
      "",
      "_Created from PulsePlan quick RSVP._"
    ].join("\n");

    openIssueComposer(title, body, GITHUB_CONFIG.rsvpLabel);
  });
}

async function loadData() {
  setBanner("Loading published events...");

  try {
    const cached = await tryLoadEventsJson();
    if (cached) {
      if (cached.repo?.owner && cached.repo?.name) {
        syncGithubLinks(cached.repo.owner, cached.repo.name);
      }

      state.issues = Array.isArray(cached.issues) ? cached.issues : [];
      state.events = (cached.events || cached.items || []).map(normalizeCachedEvent).filter(Boolean);
      state.rsvps = (cached.rsvps || []).map(normalizeCachedRsvp).filter(Boolean);

      hydrateStats();
      populateCategories();
      render();

      if (state.events.length) {
        setBanner(`Loaded ${state.events.length} event${state.events.length === 1 ? "" : "s"} from events.json.`);
        return;
      }

      setBanner("events.json loaded, but no valid events were found. Falling back to live GitHub issues...");
    }

    setBanner("Loading public issues from GitHub...");
    const response = await fetch(github.issuesUrl, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

    const issues = await response.json();
    state.issues = issues.filter((issue) => !issue.pull_request);
    state.events = state.issues
      .filter(hasLabel(GITHUB_CONFIG.eventLabel))
      .map(parseEventIssue)
      .filter(Boolean);
    state.rsvps = state.issues
      .filter(hasLabel(GITHUB_CONFIG.rsvpLabel))
      .map(parseRsvpIssue)
      .filter(Boolean);

    hydrateStats();
    populateCategories();
    render();
  } catch (error) {
    console.error(error);
    setBanner(
      `Could not load event data. Make sure data/events.json exists, GitHub Pages is serving the latest files, and GITHUB_CONFIG or events.json repo metadata point to a public repository.`
    );
    els.featuredSummary.innerHTML = `
      <article class="featured-item">
        <h4>Configuration needed</h4>
        <p>The planner could not reach the repository data yet. Update <code>GITHUB_CONFIG</code> in <code>app.js</code>, then refresh.</p>
      </article>
    `;
    renderCalendar([]);
    renderAgenda([]);
    renderEvents([]);
  }
}

function hydrateStats() {
  els.statEventCount.textContent = String(state.events.length);
  els.statUpcomingCount.textContent = String(
    state.events.filter((event) => deriveEventStatus(event) !== "ended").length
  );
  els.statRsvpCount.textContent = String(state.rsvps.length);
}

function populateCategories() {
  const categories = [...new Set(state.events.map((event) => event.category).filter(Boolean))].sort();
  els.categoryFilter.innerHTML = '<option value="all">All categories</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
}

function render() {
  const filtered = getFilteredEvents();
  setBanner(buildBannerText(filtered));
  renderFeaturedSummary(filtered);
  renderCalendar(filtered);
  renderAgenda(filtered);
  renderEvents(filtered);
}

function getFilteredEvents() {
  const search = state.filters.search;

  return [...state.events]
    .filter((event) => {
      const haystack = [event.title, event.location, event.organizer, event.category, event.description, ...(event.tags || [])]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesCategory = state.filters.category === "all" || event.category === state.filters.category;
      const status = deriveEventStatus(event);
      const matchesStatus = state.filters.status === "all" || status === state.filters.status;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      switch (state.filters.sort) {
        case "latest":
          return new Date(b.issueCreatedAt).getTime() - new Date(a.issueCreatedAt).getTime();
        case "most-rsvps":
          return getRsvpCountForEvent(b.slug) - getRsvpCountForEvent(a.slug);
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "soonest":
        default:
          return (a.start?.getTime() || Number.MAX_SAFE_INTEGER) - (b.start?.getTime() || Number.MAX_SAFE_INTEGER);
      }
    });
}

function renderFeaturedSummary(events) {
  if (!events.length) {
    els.featuredSummary.innerHTML = `
      <article class="featured-item">
        <h4>No events yet</h4>
        <p>Open the event studio to publish your first event. The calendar and agenda will update automatically after the issue is created.</p>
      </article>
    `;
    return;
  }

  const highlighted = [...events]
    .slice(0, 3)
    .map((event) => `
      <article class="featured-item">
        <div class="agenda-date">${formatDateRange(event.start, event.end)} · ${event.category}</div>
        <h4>${escapeHtml(event.title)}</h4>
        <p>${escapeHtml(event.location)} · ${escapeHtml(event.organizer)}</p>
      </article>
    `)
    .join("");

  els.featuredSummary.innerHTML = highlighted;
}

function renderCalendar(events) {
  const viewStart = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
  const calendarStart = new Date(viewStart);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const monthName = viewStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  els.calendarTitle.textContent = monthName;
  els.calendarGrid.innerHTML = "";

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + i);
    const key = dateKey(date);
    const dayEvents = eventsForDate(events, key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "calendar-day",
      date.getMonth() !== viewStart.getMonth() ? "muted" : "",
      key === dateKey(new Date()) ? "today" : "",
      key === state.selectedDateKey ? "selected" : ""
    ]
      .filter(Boolean)
      .join(" ");

    button.innerHTML = `
      <div class="day-head">
        <span class="day-number">${date.getDate()}</span>
        <span class="day-count">${dayEvents.length ? `${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}</span>
      </div>
      <div class="day-items">
        ${dayEvents
          .slice(0, 2)
          .map(
            (event) => `<span class="day-chip">${escapeHtml(event.title)}</span>`
          )
          .join("")}
        ${dayEvents.length > 2 ? `<span class="day-chip more">+${dayEvents.length - 2} more</span>` : ""}
      </div>
    `;

    button.addEventListener("click", () => {
      state.selectedDateKey = key;
      if (date.getMonth() !== state.monthCursor.getMonth()) {
        state.monthCursor = new Date(date.getFullYear(), date.getMonth(), 1);
      }
      render();
    });

    els.calendarGrid.appendChild(button);
  }
}

function renderAgenda(events) {
  const selectedDate = parseDateKey(state.selectedDateKey);
  const dayEvents = eventsForDate(events, state.selectedDateKey);
  const title = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  els.agendaTitle.textContent = title;
  els.agendaCount.textContent = `${dayEvents.length} item${dayEvents.length === 1 ? "" : "s"}`;

  if (!dayEvents.length) {
    els.agendaList.innerHTML = `
      <article class="agenda-item">
        <h4>No events scheduled</h4>
        <p class="agenda-meta">Pick another day or publish a new event to see it appear here.</p>
      </article>
    `;
    return;
  }

  els.agendaList.innerHTML = "";
  dayEvents.forEach((event) => {
    const item = document.createElement("article");
    item.className = "agenda-item";
    item.innerHTML = `
      <div class="agenda-date">${formatDateRange(event.start, event.end)} · ${escapeHtml(event.location)}</div>
      <h4>${escapeHtml(event.title)}</h4>
      <p class="agenda-meta">${escapeHtml(event.organizer)} · ${getRsvpCountForEvent(event.slug)} RSVPs</p>
      <button class="button button-secondary button-small" type="button">View event</button>
    `;
    item.querySelector("button").addEventListener("click", () => openEventModal(event));
    els.agendaList.appendChild(item);
  });
}

function renderEvents(events) {
  els.eventsGrid.innerHTML = "";
  els.emptyState.classList.toggle("hidden", events.length > 0);
  if (!events.length) {
    const emptyText = els.emptyState?.querySelector("p");
    if (emptyText) {
      emptyText.textContent = "No scheduled events are visible yet. If data/events.json already contains events, hard refresh once so the newest JSON is loaded.";
    }
    return;
  }

  events.forEach((event) => {
    const card = els.cardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".event-cover").src = event.coverImage || FALLBACK_IMAGE;
    card.querySelector(".event-cover").alt = `${event.title} cover image`;
    card.querySelector(".status-pill").textContent = displayStatus(deriveEventStatus(event));
    card.querySelector(".category-pill").textContent = event.category || "Other";
    card.querySelector(".event-date").textContent = formatDateRange(event.start, event.end);
    card.querySelector(".event-rsvp-count").textContent = `${getRsvpCountForEvent(event.slug)} RSVPs`;
    card.querySelector(".event-title").textContent = event.title;
    card.querySelector(".event-meta").textContent = `${event.location} · ${event.organizer}`;
    card.querySelector(".event-description").textContent = truncate(event.description, 140);

    const tagRow = card.querySelector(".tag-row");
    (event.tags || []).slice(0, 4).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      tagRow.appendChild(span);
    });

    card.querySelector('[data-action="view"]').addEventListener("click", () => openEventModal(event));
    card.querySelector('[data-action="rsvp"]').addEventListener("click", () => openRsvpModal(event));
    els.eventsGrid.appendChild(card);
  });
}

function openEventModal(event) {
  const rsvpCount = getRsvpCountForEvent(event.slug);
  els.eventModalContent.innerHTML = `
    <div class="modal-hero">
      <img src="${escapeAttribute(event.coverImage || FALLBACK_IMAGE)}" alt="${escapeAttribute(event.title)} cover image" />
      <div class="detail-stack">
        <div class="panel-header panel-spread">
          <div>
            <p class="eyebrow">${escapeHtml(event.category)}</p>
            <h2>${escapeHtml(event.title)}</h2>
          </div>
          <span class="pill">${displayStatus(deriveEventStatus(event))}</span>
        </div>
        <p class="modal-description">${escapeHtml(event.description)}</p>
        <div class="meta-grid">
          <article class="meta-card"><span>Date</span><strong>${escapeHtml(formatDateRange(event.start, event.end))}</strong></article>
          <article class="meta-card"><span>Location</span><strong>${escapeHtml(event.location)}</strong></article>
          <article class="meta-card"><span>Organizer</span><strong>${escapeHtml(event.organizer)}</strong></article>
          <article class="meta-card"><span>RSVPs</span><strong>${rsvpCount}</strong></article>
          <article class="meta-card"><span>Capacity</span><strong>${escapeHtml(event.capacity || "Open")}</strong></article>
          <article class="meta-card"><span>Registration closes</span><strong>${escapeHtml(event.registrationCloses || "Not set")}</strong></article>
        </div>
        <div class="tag-row">
          ${(event.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="modal-actions">
          <button id="eventModalRsvpButton" class="button button-primary" type="button">RSVP now</button>
          <a class="button button-ghost" href="${escapeAttribute(event.issueUrl)}" target="_blank" rel="noreferrer">Open issue</a>
        </div>
      </div>
    </div>
  `;

  els.eventModal.showModal();
  document.getElementById("eventModalRsvpButton").addEventListener("click", () => {
    els.eventModal.close();
    openRsvpModal(event);
  });
}

function openRsvpModal(event) {
  els.rsvpForm.reset();
  const slug = event.slug || "";
  els.rsvpForm.elements.event_id.value = slug;
  els.rsvpModalTitle.textContent = `RSVP to ${event.title}`;

  const params = new URLSearchParams({
    template: "rsvp.yml",
    title: `RSVP: ${slug} — `,
    event_id: slug
  });
  els.rsvpYamlLink.href = `${github.repoUrl}/issues/new?${params.toString()}`;

  els.rsvpModal.showModal();
}

function parseEventIssue(issue) {
  const body = issue.body || "";
  const title = pickField(body, "Event name") || issue.title.replace(/^Event:\s*/i, "").trim();
  const slug = slugify(pickField(body, "Event ID") || title);
  const startRaw = pickField(body, "Start date");
  const endRaw = pickField(body, "End date") || startRaw;
  const start = parseFlexibleDate(startRaw);
  const end = parseFlexibleDate(endRaw) || start;
  if (!title || !slug || !start) return null;

  return {
    issueNumber: issue.number,
    issueCreatedAt: issue.created_at,
    issueUrl: issue.html_url,
    title,
    slug,
    category: pickField(body, "Category") || "Other",
    startDate: startRaw,
    endDate: endRaw,
    start,
    end,
    location: pickField(body, "Location") || "Location TBD",
    coverImage: pickField(body, "Cover image URL") || FALLBACK_IMAGE,
    capacity: pickField(body, "Capacity"),
    organizer: pickField(body, "Organizer") || "Organizer TBD",
    registrationCloses: pickField(body, "Registration closes"),
    tags: splitTags(pickField(body, "Tags")),
    description: pickField(body, "Description") || "No description provided yet."
  };
}

function parseRsvpIssue(issue) {
  const body = issue.body || "";
  const eventId = slugify(pickField(body, "Event ID") || issue.title.replace(/^RSVP:\s*/i, "").split("—")[0].trim());
  if (!eventId) return null;

  return {
    eventId,
    attendeeName: pickField(body, "Attendee name") || "Guest",
    attendanceStatus: pickField(body, "Attendance status") || "Yes, attending",
    guestCount: Number.parseInt(pickField(body, "Guest count") || "1", 10) || 1,
    notes: pickField(body, "Notes") || "",
    issueUrl: issue.html_url
  };
}

function pickField(markdown, heading) {
  const regex = new RegExp(`^###\\s+${escapeRegex(heading)}\\s*$([\\s\\S]*?)(?=^###\\s+|$)`, "im");
  const match = markdown.match(regex);
  if (!match) return "";
  return match[1]
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .replace(/^[-*]\s+/gm, "")
    .trim();
}

function deriveEventStatus(event) {
  const now = new Date();
  const start = event.start;
  const end = event.end || event.start;
  const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  if (now < start) return "upcoming";
  if (now > dayEnd) return "ended";
  return "live";
}

function displayStatus(status) {
  return status === "live" ? "Live now" : status === "ended" ? "Ended" : "Upcoming";
}

function eventsForDate(events, key) {
  return events.filter((event) => {
    const current = stripTime(parseDateKey(key));
    const start = stripTime(event.start);
    const end = stripTime(event.end || event.start);
    return current >= start && current <= end;
  });
}

function getRsvpCountForEvent(slug) {
  return state.rsvps
    .filter((rsvp) => rsvp.eventId === slug && /^yes/i.test(rsvp.attendanceStatus))
    .reduce((sum, rsvp) => sum + (rsvp.guestCount || 1), 0);
}

function buildBannerText(events) {
  if (!state.events.length) return "No published event issues found yet.";
  return `${events.length} event${events.length === 1 ? "" : "s"} match your current filters in ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}.`;
}

function setBanner(message) {
  els.statusBanner.textContent = message;
}

async function tryLoadEventsJson() {
  try {
    const separator = github.eventsJsonUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${github.eventsJsonUrl}${separator}ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const raw = await response.text();
    const data = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (!data || !Array.isArray(data.events || data.items || []) || !Array.isArray(data.rsvps || [])) return null;
    return data;
  } catch (error) {
    console.warn("events.json unavailable, falling back to Issues API", error);
    return null;
  }
}

function normalizeCachedEvent(event) {
  if (!event) return null;

  const title = event.title || event.name || event.eventName || "";
  const slug = slugify(event.slug || event.eventId || event.event_id || event.id || title);
  const startValue = event.startDate || event.start_date || event.start || event.date || "";
  const endValue = event.endDate || event.end_date || event.end || startValue || "";
  const start = parseFlexibleDate(startValue);
  const end = parseFlexibleDate(endValue) || start;

  if (!title || !slug || !start) return null;

  return {
    issueNumber: event.issueNumber || event.issue_number || null,
    issueCreatedAt: event.issueCreatedAt || event.issue_created_at || new Date().toISOString(),
    issueUrl: event.issueUrl || event.issue_url || github.createEventUrl,
    title,
    slug,
    category: event.category || "Other",
    startDate: startValue,
    endDate: endValue,
    start,
    end,
    location: event.location || "Location TBD",
    coverImage: event.coverImage || event.cover_image || FALLBACK_IMAGE,
    capacity: event.capacity || "",
    organizer: event.organizer || "Organizer TBD",
    registrationCloses: event.registrationCloses || event.registration_closes || "",
    tags: Array.isArray(event.tags) ? event.tags : splitTags(event.tags || event.tagList || ""),
    description: event.description || event.summary || "No description provided yet."
  };
}

function normalizeCachedRsvp(rsvp) {
  if (!rsvp) return null;
  const eventId = slugify(rsvp.eventId || rsvp.event_id || rsvp.slug || "");
  if (!eventId) return null;

  return {
    eventId,
    attendeeName: rsvp.attendeeName || rsvp.attendee_name || "Guest",
    attendanceStatus: rsvp.attendanceStatus || rsvp.attendance_status || "Yes, attending",
    guestCount: Number.parseInt(rsvp.guestCount || rsvp.guest_count || "1", 10) || 1,
    notes: rsvp.notes || "",
    issueUrl: rsvp.issueUrl || rsvp.issue_url || github.rsvpFormUrl
  };
}

function openIssueComposer(title, body, label) {
  const params = new URLSearchParams({
    title,
    body,
    labels: label
  });
  const url = `${github.repoUrl}/issues/new?${params.toString()}`;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.href = url;
  }
}

function formatDateForIssue(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${month}/${day}/${year}`;
}

function parseFlexibleDate(input) {
  if (!input) return null;
  const value = String(input).trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    let [, first, second, year] = slash.map(Number);
    let month = first;
    let day = second;

    if (month > 12 && day <= 12) {
      month = second;
      day = first;
    }

    return new Date(year, month - 1, day);
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateRange(start, end) {
  if (!start) return "Date TBD";
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const endLabel = end?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (!end || stripTime(start).getTime() === stripTime(end).getTime()) return startLabel;
  return `${startLabel} — ${endLabel}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length - 1).trim()}…` : text;
}

function dateKey(date) {
  const d = stripTime(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function hasLabel(labelName) {
  return (issue) => issue.labels.some((label) => label.name === labelName);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
