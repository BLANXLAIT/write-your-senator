# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Write Your Senator - a web app that helps citizens write formal letters to their US Senators. Users enter their address, describe their concern, and the app generates a professional letter using Gemini AI with Google Search grounding for current events.

Live at: https://write-your-senator.web.app

## Commands

```bash
# Local development with emulators
cd functions && npm run serve

# Deploy (usually done via GitHub Actions on push to main)
firebase deploy --project write-your-senator

# Install function dependencies
cd functions && npm install

# Set a secret (e.g., API key)
firebase functions:secrets:set GEMINI_API_KEY --project write-your-senator
```

## Architecture

```
public/                 # Static frontend (Firebase Hosting)
├── index.html          # Single-page app with vanilla JS
└── style.css           # Print-optimized styles

functions/              # Firebase Functions (Node.js 20, ES modules)
├── index.js            # Two HTTP endpoints
├── senators.js         # Static data for all 100 US senators
└── package.json
```

### API Endpoints

Both exposed via Firebase Hosting rewrites at `/api/*`:

- `GET /api/lookupSenators?address=...` - Parses state from address, returns senator info
- `POST /api/generateLetter` - Uses Gemini 2.0 Flash with Google Search grounding to generate letter

### Key Implementation Details

- **Senator lookup**: Uses static data in `senators.js` (Google Civic API was shut down April 2025). State is parsed from address using regex patterns.
- **Letter generation**: Uses `@google/genai` SDK with `googleSearch` tool for real-time grounding. The model searches for recent news about the user's concern before generating.
- **Secrets**: `GEMINI_API_KEY` stored in Firebase Secret Manager, accessed via `defineSecret()`.
- **Print styling**: `@media print` rules hide UI and format letters for mailing (Georgia font, proper margins, page breaks between letters).

## Deployment

Automated via GitHub Actions on push to `main`. Uses Workload Identity Federation (WIF) - no static credentials.

The WIF service account `github-ci@github-ci-blanxlait.iam.gserviceaccount.com` needs these roles on `write-your-senator` project:
- `roles/firebase.admin`
- `roles/firebasehosting.admin`
- `roles/secretmanager.admin`
- `roles/cloudfunctions.admin`

## Non-Partisan Design

The app is intentionally non-partisan. The prompt instructs the model to write professional letters without political bias - it works for any viewpoint. Placeholder examples cover topics across the political spectrum.
