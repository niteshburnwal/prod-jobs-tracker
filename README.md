# Role Radar — Product Management Job Tracker

A responsive Next.js dashboard for tracking product-management roles, linking to official applications, saving opportunities, and estimating resume-to-job-description fit.

## Features
- Live jobs from public Greenhouse, Lever, and Ashby job-board endpoints.
- Filters by keyword, company, and location; sort by estimated resume fit, updated date, company, or title.
- Resume text analysis runs in the browser; saved roles and resume text use browser local storage.
- Official career links for FAANG, AI, fintech, and other top-tier tech companies where a public ATS feed may not be available.
- Vercel-ready Next.js API route. No API keys required for the public feeds used here.

## Run locally
Requires Node.js 18.17+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to GitHub + Vercel
1. Create a GitHub repository and push all files from this folder.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the default Next.js settings.
3. Deploy. No environment variables are required for the included company feeds.
4. To add more supported ATS boards, set `GREENHOUSE_BOARDS`, `LEVER_BOARDS`, or `ASHBY_BOARDS` in Vercel Project Settings → Environment Variables. Values are comma-separated board slugs, not career-site URLs. Redeploy after changing them.

## Job feed notes
- The app reads publicly exposed company ATS job boards, then filters titles to product-related roles. It does **not** crawl every company or job site on the internet.
- A supported public ATS board can be unavailable, change its slug, or return no product roles. The API reports partial-feed warnings and the UI includes a company directory with official career links as a fallback.
- Company career links are search shortcuts, not a guarantee that a particular role is open. Always confirm the role and requirements on the employer's site.
- Public ATS endpoints and board slugs can change. See [Greenhouse Job Board API docs](https://docs.greenhouse.io/job-board.html) and [Lever Postings API docs](https://github.com/lever/postings-api).
- Some career sites (including many large FAANG career portals) do not expose a stable public ATS feed suitable for this simple integration. They are provided as direct official search links instead.

## Resume fit scoring
This is an explainable, client-side heuristic using overlap across broad PM skill groups and shared keywords. It is **not** an AI model, not a recruiter score, and not a prediction of interview success. It currently accepts pasted resume text or a `.txt` file. PDF/DOCX extraction and LLM-based semantic analysis are intentionally not included in this starter to avoid sending personal resume data to an external service. A future version could add an opt-in server-side model with clear privacy and API-key controls.

## Project structure
```text
app/
  api/jobs/route.ts   # Public ATS feed aggregator
  globals.css         # Responsive visual design
  layout.tsx
  page.tsx             # Dashboard, filtering, resume fit, saved roles
```

## Privacy
Resume text and saved roles are stored in this browser's local storage. They are not submitted to `/api/jobs`. Clear them using the app controls or clear this site's local storage in your browser.
