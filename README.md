# YouTube Subscription Cleaner

A lightweight, single-page web application built with **Angular 20**, **TypeScript**, and **Tailwind CSS** that helps users clean up unwanted YouTube subscriptions using AI-powered topic categorization and safe bulk unsubscription.

This is a one-time utility application designed to run entirely in the browser as a static site without any backend server, database, or external infrastructure.

---

## Key Features

1. **Google OAuth 2.0 Authorization**:
   - Secure authorization via Google Identity Services (`google.accounts.oauth2`).
   - Requests only the necessary scopes (`youtube.readonly`, `youtube.force-ssl`, `openid`, `email`, `profile`).
   - Access tokens are stored **strictly in-memory** (never saved to `localStorage`, never logged).
   - Instant Disconnect button that revokes tokens and wipes session data.

2. **Complete Subscription Retrieval**:
   - Fetches all subscribed channels using YouTube Data API v3 with automatic pagination (`subscriptions.list`).
   - Retrieves channel statistics, custom `@handle` URLs, video counts, and high-resolution avatars (`channels.list`).
   - Visual progress sync bar showing fetched vs total channels.

3. **AI Topic Classification**:
   - **Provider-Agnostic**: Supports **Google Gemini** (e.g. `gemini-1.5-flash`), **OpenAI** (`gpt-4o-mini`), **Groq** (`llama-3.1-8b-instant`), **Custom/Local Proxies**, and an **Offline Rule Heuristic**.
   - Assigns 1–3 relevant categories per channel (Programming, Software Engineering, DevOps, Cloud Computing, AI, Gaming, Finance, Music, etc.).
   - Generates a concise 1-sentence summary and confidence score.
   - Batch processes channels (1–10 per request) to optimize token usage and speed.
   - LLM API keys are kept **strictly in-memory** and cleared when disconnected.

4. **Multi-Filter & Search Interface**:
   - Instant search by channel name, handle, description, or AI summary.
   - Filter by topic tags (single or multi-select).
   - Filter unclassified, selected, or protected favorite channels.
   - Sort by channel name (A–Z / Z–A), subscription date, video count, or AI confidence.
   - Switch between **Grid View** and compact **Table View**.

5. **Safe Bulk & Individual Unsubscribe**:
   - **Favorite Protection**: Pinned/favorite channels are locked and permanently excluded from unsubscription.
   - **Explicit Confirmation**: Requires users to review target channel names and type `UNSUBSCRIBE` before calling the API.
   - Controlled concurrency with live status updates (Pending, Success, Failed).
   - Retry mechanism for any failed operations.

6. **Data Export**:
   - Export full subscription list or selected channels to **JSON** or **CSV**.

7. **Sample / Demo Mode**:
   - Explore and test the complete filtering, classification, and UI workflows instantly with sample subscriptions without needing immediate Google Cloud credentials.

---

## Tech Stack

- **Framework**: Angular 20 (Standalone Components, Signals, `provideHttpClient(withFetch())`)
- **Styling**: Tailwind CSS
- **APIs**:
  - Google Identity Services (GIS) OAuth 2.0
  - YouTube Data API v3
  - Google Gemini API / OpenAI-compatible Chat Completions API

---

## Google Cloud Console OAuth Setup (Step-by-Step)

To connect your real YouTube account, you need a Google OAuth 2.0 Web Client ID:

1. **Create or Open a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Click the project dropdown at the top and click **New Project** (e.g., `YouTube Cleaner`).

2. **Enable YouTube Data API v3**:
   - In the navigation menu, go to **APIs & Services > Library**.
   - Search for **YouTube Data API v3**.
   - Click **Enable**.

3. **Configure the OAuth Consent Screen**:
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **External** and click **Create**.
   - Enter an **App name** (e.g. `YouTube Cleaner`) and your **User support email**.
   - Under **Scopes**, you can add:
     - `.../auth/youtube.readonly`
     - `.../auth/youtube.force-ssl`
     - `openid`, `email`, `profile`
   - Under **Test Users**, click **+ ADD USERS** and add the Gmail address you will use to test. Click **Save and Continue**.

4. **Create OAuth 2.0 Web Client ID**:
   - Go to **APIs & Services > Credentials**.
   - Click **+ CREATE CREDENTIALS > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `YouTube Cleaner Web Client`.
   - **Authorized JavaScript origins**:
     - For local development: `http://localhost:4200`
     - For production: Your deployment URL (e.g., `https://your-domain.web.app`)
   - Click **Create**.
   - Copy the generated **Client ID** (it looks like `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`).

5. **Configure Client ID in the App**:
   - You can enter it directly in the app UI by clicking the **"Set Google Client ID"** button in the header.
   - Or configure it permanently in `src/environments/environment.ts`:
     ```typescript
     export const environment = {
       production: false,
       googleClientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
     };
     ```

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node v20/v24)
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
# or: npx ng serve
```

Open your browser at `http://localhost:4200`.

### Production Build

```bash
npm run build
# or: npx ng build --configuration production
```

The compiled static assets are output to:
```
dist/youtube-cleaner/browser/
```

This folder can be deployed directly to GitHub Pages, Cloudflare Pages, Netlify, Vercel, Firebase Hosting, or any static HTTP server (e.g., Nginx, Apache, or S3).

---

## Privacy & Security

- **No Backend**: All network requests to Google and LLM providers originate directly from your web browser.
- **In-Memory Only**:
  - OAuth access tokens are stored in private memory variables only.
  - LLM API keys are stored in private memory variables only.
  - Neither are written to `localStorage`, cookies, or remote analytics.
- **Disconnect**: Clicking the **Disconnect** button revokes the active Google token and cleans up all temporary state.
