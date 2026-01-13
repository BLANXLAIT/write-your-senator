# Write Your Senator

A simple, private tool to help citizens write formal letters to their US Senators.

**Live:** https://write-your-senator.web.app

## How It Works

1. Enter your address (only used to determine your state)
2. Describe your concern in plain language
3. AI generates a professional letter with current news context
4. Print and mail

## Privacy

**We don't log, store, or track anything.** No database, no analytics, no accounts.

- Your address is used only to find your senators, then discarded
- Your concern is sent to Google Gemini to generate the letter, not stored by us
- The generated letter exists only in your browser

See [PRIVACY.md](PRIVACY.md) for full details. Privacy guarantees are enforced by [automated tests](functions/index.test.js) that run before every deployment.

## Non-Partisan

This tool works for any political viewpoint. The AI is instructed to write professional, respectful letters without editorial bias.

## Tech Stack

- **Frontend:** Static HTML/CSS/JS (no framework)
- **Backend:** Firebase Functions (Node.js)
- **AI:** Google Gemini 2.0 Flash with Google Search grounding
- **Hosting:** Firebase Hosting

## Development

```bash
# Install dependencies
cd functions && npm install

# Run tests (privacy + functionality)
npm test

# Local development
npm run serve

# Deploy (automatic on push to main)
git push origin main
```

## License

MIT
