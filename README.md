# Voice App

## Overview
This repository contains a **Next.js** based voice application that integrates **LiveKit** for real‑time audio/video, **Supabase** for authentication and storage, and a set of custom UI components.

## Prerequisites
- **Node.js** (v20 or later) and **npm** (or **pnpm**/**yarn**) installed.
- A **LiveKit** project with API key/secret.
- A **Supabase** project (URL and anon/public key).
- (Optional) **Docker** if you prefer containerised development.

## Setup
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd voice-app
   ```
2. **Install dependencies**
   ```bash
   npm install   # or `pnpm install` / `yarn`
   ```
3. **Configure environment variables**
   - Copy the example file:
     ```bash
     cp .env.example .env.local
     ```
   - Fill in the required values:
     ```
     NEXT_PUBLIC_LIVEKIT_URL=<your-livekit-url>
     LIVEKIT_API_KEY=<your-livekit-api-key>
     LIVEKIT_API_SECRET=<your-livekit-api-secret>

     NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
     ```

## Development
Run the development server with hot‑reloading:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production
```bash
npm run build   # creates an optimized production build
npm start       # serves the built app
```
You can also deploy to Vercel, Netlify, or any platform that supports Next.js.

## Testing
- Linting: `npm run lint`
- (Add unit/integration test commands here if applicable.)

## Project Structure (quick glance)
```
voice-app/
├─ app/                # Next.js app router (pages, API routes)
│   ├─ api/            # Server‑side API endpoints (e.g., friends, upload)
│   └─ dashboard/      # Example UI pages
├─ components/         # Re‑usable React components (modals, profile cards)
├─ public/             # Static assets
├─ styles/             # Tailwind CSS config (if any)
└─ ...
```

## Common Issues
- **LiveKit connection errors** – double‑check the LiveKit URL, API key, and secret.
- **Supabase auth failures** – ensure the Supabase URL and anon key are correct and that the project allows public sign‑in.
- **Missing env variables** – the app will crash on start if required env vars are not defined.

## Contributing
1. Fork the repo.
2. Create a feature branch.
3. Open a Pull Request with a clear description of your changes.

---
*Happy coding!*
