# PulsePlan

PulsePlan is a static GitHub Pages event planner that uses public GitHub Issues as its data layer.

## What it includes

- A modern event dashboard built with plain HTML, CSS, and JavaScript
- GitHub YAML issue forms for:
  - creating events
  - RSVPing to events
- A polished RSVP modal with two paths:
  - open the official YAML RSVP form
  - generate a quick prefilled issue from the site
- A lightweight GitHub Actions workflow that comments on malformed event or RSVP issues

## Repository structure

- `index.html` — app shell and modal markup
- `styles.css` — unique modern visual system
- `app.js` — GitHub Issues API integration, parsing, filters, and RSVP modal logic
- `.github/ISSUE_TEMPLATE/create-event.yml` — structured event creation form
- `.github/ISSUE_TEMPLATE/rsvp.yml` — structured RSVP form
- `.github/ISSUE_TEMPLATE/config.yml` — issue template chooser config
- `.github/workflows/issue-hygiene.yml` — validation helper comments

## Setup

1. Create a GitHub repository.
2. Copy this project into the repository root.
3. Edit `GITHUB_CONFIG` in `app.js`.
4. Create labels named `event` and `rsvp` in the repository.
5. Enable Issues for the repository.
6. Enable GitHub Pages from the root of your default branch.

## How the data flow works

1. A maintainer creates an event through the YAML issue form.
2. The issue gets the `event` label.
3. The site fetches issues from the GitHub Issues REST API and parses the form-generated markdown.
4. Visitors browse events on the GitHub Pages site.
5. Visitors RSVP either through:
   - the YAML RSVP form, or
   - the quick RSVP modal that opens a prefilled issue composer with the `rsvp` label.
6. RSVP issues are counted and associated with events using `Event ID`.

## Notes

- This site works best with a public repository because the browser fetches public issues directly from the GitHub API.
- The quick RSVP modal opens a new GitHub issue instead of posting silently, because a static GitHub Pages site does not have a secure backend for authenticated issue creation.
- If you want true one-click RSVP submission, pair this UI with a GitHub App, serverless function, or OAuth flow.
