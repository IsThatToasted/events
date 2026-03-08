# PulsePlan

PulsePlan is a static GitHub Pages event planner with a modern calendar UI, native date-picker modals, GitHub YAML issue forms, and public GitHub Issues as the data source.

## What changed in this version

- Calendar-first dashboard with month view and day agenda
- Event studio modal with native browser date pickers
- Event issue output normalized to `MM/DD/YYYY`
- YAML issue forms fixed to avoid GitHub parser errors
- RSVP quick modal plus YAML fallback
- Event parser supports both `MM/DD/YYYY` and `YYYY-MM-DD`
- `data/events.json` cache for fast loading and fewer API-rate-limit problems
- GitHub Actions workflow that rebuilds `data/events.json` whenever event or RSVP issues change

## Setup

1. Create a public GitHub repository.
2. Copy this project into the repository root.
3. Edit `GITHUB_CONFIG` in `app.js`.
4. Create labels named `event` and `rsvp`.
5. Keep GitHub Actions enabled so `data/events.json` updates automatically.
6. Enable Issues for the repo.
7. Enable GitHub Pages from the repository root on your default branch.

## How event creation works

- The **site modal** uses real date pickers and opens a prefilled GitHub issue.
- The **YAML issue form** remains available as a fallback for maintainers.
- The planner reads event fields from issue headings such as `### Event name` and `### Start date`.

## File map

- `index.html` — app shell, calendar layout, and modals
- `styles.css` — visual design system
- `app.js` — GitHub Issues API integration, calendar rendering, parsing, filtering, and RSVP flow
- `.github/ISSUE_TEMPLATE/create-event.yml` — fixed event issue form
- `.github/ISSUE_TEMPLATE/rsvp.yml` — fixed RSVP issue form
- `.github/workflows/issue-hygiene.yml` — optional helper comment workflow

## Important note about date pickers

GitHub Issue Forms do not provide a native date-picker field. This project solves that by using the site modal for a polished date-picker UX and the YAML form as a fallback.


## events.json cache

PulsePlan now tries to load `data/events.json` first for faster page loads and more reliable public rendering. If that file is not available yet, it falls back to the public GitHub Issues API.

The included workflow `.github/workflows/generate-events-json.yml` rebuilds the file whenever relevant issues change.


## GitHub Action for data/events.json

This project includes `.github/workflows/generate-events-json.yml`.

To make it work:

1. Push the workflow file to your repository's default branch.
2. Make sure GitHub Actions are enabled for the repository.
3. Create the `event` and `rsvp` labels.
4. Open **Actions** and run **Build events.json** once with **Run workflow**.
5. After that, new event and RSVP issues will automatically update `data/events.json`.

Important:
- `issues` workflows only trigger from the repository's default branch.
- The workflow needs `contents: write` so it can commit the refreshed `data/events.json`.
