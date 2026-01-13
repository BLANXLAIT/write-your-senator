import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";
import { senators, stateAbbreviations } from "./senators.js";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

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
export const lookupSenators = onRequest({ cors: true }, async (req, res) => {
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
export const generateLetter = onRequest({ cors: true, secrets: [geminiApiKey] }, async (req, res) => {
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
