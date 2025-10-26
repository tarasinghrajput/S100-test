# Super100 Student Portfolio Builder

Refined onboarding experience for the Super100 cohort. Students claim a handle, pick an avatar style, and share their story; the backend then asks Google Gemini to craft the text for their portfolio page and timeline.

## Highlights
- **Handle-first onboarding** – reserve a unique handle, tagline, and avatar before any content is generated.
- **Guided storytelling** – capture focus areas, goals, and milestone prompts that Gemini turns into structured copy.
- **Timeline output** – generated portfolios now include a three-step journey timeline alongside about copy, interests, and calls to action.
- **Handle availability API** – instant validation via `GET /api/handles/:handle` keeps handle selection collision-free.
- **Text-only Gemini usage** – Gemini is only asked for narrative content; avatars, colours, and preferences are user controlled.

## Requirements
- Node.js 18+
- A Google Gemini API key (`GEMINI_API_KEY`)
- Optional: SMTP credentials for password/reset emails
- Optional: MongoDB connection (`MONGODB_URI`, `MONGODB_DB`) for persistence beyond in-memory storage

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Populate at least `GEMINI_API_KEY`. Provide SMTP fields to deliver real emails and MongoDB details to persist profiles.
3. Run both the Vite client and Express API:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - API server: http://localhost:4000

## Production Build
1. Build the client bundle:
   ```bash
   npm run build
   ```
2. Configure production environment variables (see `.env.example`):
   - Set `NODE_ENV=production` so the API serves the bundled client from `dist/`.
   - Provide `CORS_ORIGINS` with a comma-separated list of allowed domains.
   - Point `VITE_API_BASE_URL` to the public URL of your API (for example `https://s100.apnapc.com/api`; leave blank if the API and client share a domain).
   - Optional: set `TRUST_PROXY` when running behind a load balancer or reverse proxy.
   - Optional: override `CLIENT_DIST` if the built assets live outside `./dist`.
3. Start the combined server:
   ```bash
   npm start
   ```
   The Express server now delivers the static build and exposes the API on the same port (default `4000`).

## Core API Routes
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/students` | Onboard or refresh a student profile and portfolio. |
| `GET` | `/api/students/:handle` | Fetch the stored profile + portfolio for a handle. |
| `GET` | `/api/handles/:handle` | Check whether a handle is available. |
| `GET` | `/api/users/:email` | Legacy email lookup (still supported for account management). |

Example `POST /api/students` payload:

```jsonc
{
  "name": "Aria Patel",
  "email": "aria@example.com",
  "handle": "ariastudio",
  "tagline": "Designing products with heart",
  "avatar": "aurora",
  "focusArea": "Product design",
  "interests": "UX strategy, prototyping, design systems",
  "goals": "Ship two portfolio-ready case studies this term",
  "milestones": "2024 - Joined the Super100 cohort\nMay 2024 - Led a design sprint\nQ3 2024 - Presenting capstone at demo day",
  "socialLinks": { "linkedin": "https://linkedin.com/in/aria" },
  "preferences": { "themeColor": "#2563eb", "showEmail": true }
}
```

The response includes the generated portfolio JSON alongside the stored profile details.

## Frontend Flow
1. **Onboarding step** – claim handle, choose avatar style, add tagline, confirm email.
2. **Story & focus** – share title, bio, focus area, goals, and timeline seed notes.
3. **Preferences** – pick theme colour, toggles, and social links.
4. **Review & launch** – confirm everything, then Gemini produces the hero copy, about section, interests, and three-step timeline.

The portfolio preview route now accepts `/portfolio/:handle` (or `?handle=...`). Legacy `?email=` queries are still supported by auto-resolving the corresponding handle when possible.

## Implementation Notes
- Backend lives in `server/` with the new student-centric routes (`index.js`) and data model updates (`models/User.js`, `store.js`).
- `server/gemini.js` contains the updated prompt/normalisation logic that coercively returns timeline, hero copy, and spotlight text in JSON.
- Client code under `src/` features the refactored onboarding wizard (`components/SignupForm.jsx`) and the new portfolio view (`components/PortfolioPreview.jsx`).
- Gemini integration intentionally stays text-only; avatars, colors, and preferences are entirely user supplied.

## Next Steps
- Swap the mocked password reset flow with your production auth provider.
- Extend the profile to track publishing status, mentor assignments, or project URLs.
- Deploy the Express API and Vite app, pointing `APP_BASE_URL` to your production domain for email links.
