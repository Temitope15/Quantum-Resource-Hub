# Quantum Resource Hub

> A community-built archive of quantum computing resources — curated, annotated, and maintained by the **GDG OAU Quantum Computing Community**.

A lightweight, single-page web app that turns a Google Sheet into a living, searchable library of papers, courses, talks, and tools. No backend to host, no database to manage — your sheet *is* the database.

---

## Why it exists

Members of the community kept sharing great quantum-computing links across WhatsApp, Discord, and meetings — and the good ones kept getting lost. This hub gives those resources a permanent home: anyone can contribute, anyone can leave notes or corrections, and the canonical record sits in a Google Sheet that the community already controls.

---

## Features

- **Live archive** — all resources and comments fetched on load from a Google Sheet
- **Search & filter** — instant search across title, author, and description; category chips for `Article / Video / Course / Paper / Tool / Book / Other`
- **Contribute in-app** — add a new resource via a modal form that writes directly to the sheet
- **Community notes** — leave comments, corrections, or updated links on any resource
- **Stats at a glance** — resource count, note count, and topic count in the masthead
- **Editorial light-mode UI** — Fraunces serif + JetBrains Mono, warm paper palette, animated quantum orbital
- **No build step, no framework** — plain HTML/CSS/JS, modular files, ~30 KB total
- **Keyboard friendly** — `Esc` closes modals; click outside to dismiss
- **Toast feedback** for success and error states
- **Fully responsive** down to ~360 px

---

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | Vanilla HTML, CSS (custom properties), and ES5+ JavaScript — no framework, no bundler |
| Data     | Google Sheets, accessed via Google Apps Script `doGet` / `doPost` |
| Hosting  | Any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, or just `index.html`) |
| Fonts    | Google Fonts (`Fraunces`, `Instrument Sans`, `JetBrains Mono`) |

---

## Project structure

```
quantum_resource_hub/
├── index.html              # Semantic markup only — no inline styles or scripts
├── css/
│   └── styles.css          # Design tokens + component styles
└── js/
    ├── utils.js            # Pure helpers (escapeHtml, timeAgo, $, debounce…)
    ├── api.js              # Google Apps Script GET / POST wrappers
    ├── ui.js               # Rendering, modals, toast, forms (DOM-only)
    └── app.js              # State, derived selectors, event wiring (the glue)
```

The four JS files are loaded in order via `<script>` tags — there is no bundler. Each module exposes a single namespace (`Utils`, `API`, `UI`) used by `app.js`.

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/quantum-resource-hub.git
cd quantum-resource-hub
```

### 2. Open it locally

Just open `index.html` in your browser, or serve the folder:

```bash
# any static server works
python3 -m http.server 8000
# then visit http://localhost:8000
```

The app will try to talk to the Apps Script endpoint baked into [`js/api.js`](js/api.js). If you're forking it for your own community, follow the backend setup below to point it at *your* sheet.

---

## Backend setup (Google Sheets + Apps Script)

The app is designed so anyone can fork it, attach their own Google Sheet, and run their own community archive in under 10 minutes.

### Step 1 — Create the sheet

Make a new Google Sheet with **two tabs**:

**`Resources`** (header row, in order):

```
id  |  title  |  url  |  category  |  submittedBy  |  description  |  timestamp
```

**`Comments`** (header row):

```
commentId  |  resourceId  |  comment  |  commenterName  |  timestamp
```

### Step 2 — Add the Apps Script

In the sheet, go to **Extensions → Apps Script** and paste the following:

```js
const SHEET_RESOURCES = 'Resources';
const SHEET_COMMENTS  = 'Comments';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getResources') return json_(readSheet_(SHEET_RESOURCES));
  if (action === 'getComments')  return json_(readSheet_(SHEET_COMMENTS));
  return json_({ error: 'unknown action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss   = SpreadsheetApp.getActiveSpreadsheet();

  if (data.action === 'addResource') {
    const id = 'R' + Date.now();
    ss.getSheetByName(SHEET_RESOURCES).appendRow([
      id,
      data.title,
      data.url,
      data.category,
      data.submittedBy || 'Anonymous',
      data.description || '',
      new Date().toISOString(),
    ]);
    return json_({ success: true, id });
  }

  if (data.action === 'addComment') {
    const id = 'C' + Date.now();
    ss.getSheetByName(SHEET_COMMENTS).appendRow([
      id,
      data.resourceId,
      data.comment,
      data.commenterName || 'Anonymous',
      new Date().toISOString(),
    ]);
    return json_({ success: true, id });
  }

  return json_({ error: 'unknown action' });
}

function readSheet_(name) {
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  const rows   = sheet.getDataRange().getValues();
  const header = rows.shift();
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 3 — Deploy

In the Apps Script editor: **Deploy → New deployment → Web app**.
- **Execute as:** *Me*
- **Who has access:** *Anyone*

Copy the resulting web-app URL.

### Step 4 — Wire it up

Open [`js/api.js`](js/api.js) and replace the `URL` constant with your deployment URL:

```js
const URL = "https://script.google.com/macros/s/<YOUR_DEPLOYMENT_ID>/exec";
```

That's it. Reload the page and your archive is live.

---

## Customising the look

All design tokens live at the top of [`css/styles.css`](css/styles.css) under `:root`. Change the palette, fonts, or radii in one place and it ripples through the whole app:

```css
:root {
  --paper:      #f6f3ec;   /* page background */
  --ink:        #0c1330;   /* primary text */
  --cobalt:     #2545d6;   /* primary accent */
  --terracotta: #d35a3d;   /* secondary accent */
  --serif:  'Fraunces', Georgia, serif;
  --sans:   'Instrument Sans', system-ui, sans-serif;
  --mono:   'JetBrains Mono', monospace;
}
```

Category colours are mapped in the same file under `.cat-article`, `.cat-video`, etc.

---

## Contributing

Contributions are welcome — both to the code and to the archive itself.

**To contribute resources** (no coding needed)
Open the live site and hit **+ Contribute**. Fill in the title, URL, and category, and your entry is added to the sheet.

**To contribute code**

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-thing`
3. Keep changes small and focused — match the existing style (DRY, no inline styles, design tokens for colors/spacing)
4. Open a pull request describing what changed and why

Bug reports and design suggestions are also very welcome via Issues.

---

## Roadmap

Ideas being considered — PRs welcome:

- [ ] Tag system in addition to single-category
- [ ] Upvote / "found this useful" counter
- [ ] Sort by most-noted, most-recent, most-upvoted
- [ ] Light-touch moderation queue for new submissions
- [ ] Export the archive as a static JSON snapshot
- [ ] Dark mode toggle

---

## License

[MIT](LICENSE) — use it, fork it, run your own community archive.

---

## Credits

Built for and by the **[GDG OAU](https://gdg.community.dev/) Quantum Computing Community** at Obafemi Awolowo University.

If you spin up your own instance for a different community, drop us a note — we'd love to see it.
