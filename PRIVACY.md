# Privacy Policy

**Write Your Senator** is designed with privacy as a core principle. We do not collect, store, or log any user data.

## What We Don't Do

- **No logging**: Server functions do not log any user input, errors, or request data
- **No database**: There is no database - we don't store addresses, concerns, or generated letters
- **No analytics**: No tracking scripts, cookies, or analytics of any kind
- **No accounts**: No user registration or authentication

## Data Flow

1. **Your address** → Used only to determine your state (parsed client-side and server-side), then discarded
2. **Your concern** → Sent to Google Gemini API to generate the letter, not stored by us
3. **Generated letter** → Returned to your browser, not stored anywhere

## Third-Party Services

- **Google Gemini API**: Your concern text is sent to Google's Gemini API for letter generation. See [Google's AI Privacy Policy](https://policies.google.com/privacy)
- **Firebase Hosting**: Static files are served via Firebase. No user data is sent to Firebase beyond standard HTTP requests

## Verification

This project is open source. You can verify our privacy claims by:

1. **Reading the code**: [github.com/BLANXLAIT/write-your-senator](https://github.com/BLANXLAIT/write-your-senator)
2. **Running the tests**: `npm test` verifies no logging occurs (see `functions/index.test.js`)
3. **Checking the functions**: `functions/index.js` contains all server-side code - grep for `console.log` (you won't find any)

## Firebase Configuration

Cloud Functions are configured with:
- No Cloud Logging integration for user data
- CORS enabled for browser access only
- No persistent storage or database connections

## Contact

Questions about privacy? Open an issue on GitHub.
