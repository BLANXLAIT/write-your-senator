import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";
import { senators, stateAbbreviations } from "./senators.js";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Rate limiting config
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = {
  lookupSenators: 30,   // 30 lookups per minute per IP
  generateLetter: 5     // 5 letter generations per minute per IP
};

// In-memory rate limit store (resets on cold start, which is fine for basic protection)
const rateLimitStore = new Map();

/**
 * Simple IP-based rate limiter
 * Returns true if request should be allowed, false if rate limited
 */
function checkRateLimit(ip, endpoint) {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const limit = RATE_LIMIT_MAX_REQUESTS[endpoint] || 10;

  // Clean up old entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(k);
      }
    }
  }

  const record = rateLimitStore.get(key);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get client IP from request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.ip ||
         'unknown';
}

/**
 * Parse state from address string
 */
function parseStateFromAddress(address) {
  // Try to find state abbreviation (2 capital letters followed by space and zip)
  const abbrevMatch = address.match(/\b([A-Z]{2})\s+\d{5}/);
  if (abbrevMatch && senators[abbrevMatch[1]]) {
    return abbrevMatch[1];
  }

  // Try to find full state name
  const lowerAddress = address.toLowerCase();
  for (const [stateName, abbrev] of Object.entries(stateAbbreviations)) {
    if (lowerAddress.includes(stateName)) {
      return abbrev;
    }
  }

  // Try to find state abbreviation anywhere (less precise)
  const anyAbbrevMatch = address.match(/\b([A-Z]{2})\b/g);
  if (anyAbbrevMatch) {
    for (const match of anyAbbrevMatch) {
      if (senators[match]) {
        return match;
      }
    }
  }

  return null;
}

/**
 * Look up US Senators for a given address
 */
export const lookupSenators = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  // Rate limiting
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp, 'lookupSenators')) {
    res.status(429).json({ error: "Too many requests. Please try again in a minute." });
    return;
  }

  const address = req.query.address;

  if (!address) {
    res.status(400).json({ error: "Address is required" });
    return;
  }

  try {
    const state = parseStateFromAddress(address);

    if (!state) {
      res.status(400).json({
        error: "Could not determine state from address. Please include state abbreviation (e.g., OH, CA)."
      });
      return;
    }

    const stateSenators = senators[state];
    if (!stateSenators) {
      res.status(400).json({ error: `No senators found for state: ${state}` });
      return;
    }

    res.json({
      senators: stateSenators,
      state: state,
      normalizedAddress: address
    });
  } catch {
    // Privacy: No logging of errors or user data
    res.status(500).json({ error: "Failed to look up senators" });
  }
});

/**
 * Generate a formal letter to a senator using Gemini with Google Search grounding
 */
export const generateLetter = onRequest({
  cors: true,
  secrets: [geminiApiKey],
  maxInstances: 5
}, async (req, res) => {
  // Rate limiting
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp, 'generateLetter')) {
    res.status(429).json({ error: "Too many requests. Please try again in a minute." });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "POST required" });
    return;
  }

  const { userName, userAddress, senator, concern } = req.body;

  if (!userName || !userAddress || !senator || !concern) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const prompt = `You are helping a citizen write a formal letter to their US Senator.

First, search for recent news and developments related to the constituent's concern to ensure the letter references current events accurately.

Then generate a professional, respectful letter that:
- Is addressed properly to "The Honorable ${senator.name}"
- Clearly states the constituent's concern
- References specific recent events, legislation, or news when relevant
- Makes specific asks of the Senator
- Maintains a formal but personal tone
- MUST fit on ONE page when printed (maximum 3-4 short paragraphs, ~250-300 words for the body)

User's information:
- Name: ${userName}
- Address: ${userAddress}

Senator's information:
- Name: ${senator.name}
- Office: ${senator.address || "United States Senate, Washington, D.C. 20510"}

The constituent's concern (in their own words):
${concern}

Generate ONLY the letter body (starting with "Dear Senator..." and ending with "Sincerely,"). Do not include the header addresses or signature block - those will be added separately. Do not use markdown formatting.`;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const letterBody = response.text;

    res.json({ letterBody });
  } catch {
    // Privacy: No logging of errors or user data
    res.status(500).json({ error: "Failed to generate letter" });
  }
});
