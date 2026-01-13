import { onRequest } from "firebase-functions/v2/https";
import { VertexAI } from "@google-cloud/vertexai";

const CIVIC_API_KEY = process.env.CIVIC_API_KEY;
const PROJECT_ID = process.env.GCLOUD_PROJECT || "write-your-senator";

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: PROJECT_ID, location: "us-central1" });
const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Look up US Senators for a given address using Google Civic Information API
 */
export const lookupSenators = onRequest({ cors: true }, async (req, res) => {
  const address = req.query.address;

  if (!address) {
    res.status(400).json({ error: "Address is required" });
    return;
  }

  try {
    const url = new URL("https://www.googleapis.com/civicinfo/v2/representatives");
    url.searchParams.set("key", CIVIC_API_KEY);
    url.searchParams.set("address", address);
    url.searchParams.set("levels", "country");
    url.searchParams.set("roles", "legislatorUpperBody");

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      res.status(400).json({ error: data.error.message });
      return;
    }

    // Extract senator information
    const senators = [];
    const offices = data.offices || [];
    const officials = data.officials || [];

    for (const office of offices) {
      if (office.name.includes("Senator") || office.roles?.includes("legislatorUpperBody")) {
        for (const index of office.officialIndices || []) {
          const official = officials[index];
          if (official) {
            senators.push({
              name: official.name,
              party: official.party,
              phones: official.phones || [],
              urls: official.urls || [],
              address: official.address?.[0] || null,
            });
          }
        }
      }
    }

    res.json({
      senators,
      normalizedAddress: data.normalizedInput,
    });
  } catch (error) {
    console.error("Civic API error:", error);
    res.status(500).json({ error: "Failed to look up senators" });
  }
});

/**
 * Generate a formal letter to a senator using Gemini
 */
export const generateLetter = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST required" });
    return;
  }

  const { userName, userAddress, senator, concern } = req.body;

  if (!userName || !userAddress || !senator || !concern) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `You are helping a citizen write a formal letter to their US Senator. Generate a professional, respectful letter that:
- Is addressed properly to "The Honorable ${senator.name}"
- Clearly states the constituent's concern
- Makes specific asks of the Senator
- Maintains a formal but personal tone
- Is concise (one page maximum)

User's information:
- Name: ${userName}
- Address: ${userAddress}

Senator's information:
- Name: ${senator.name}
- Office: ${senator.office || "United States Senate, Washington, D.C. 20510"}

The constituent's concern (in their own words):
${concern}

Generate ONLY the letter body (starting with "Dear Senator..." and ending with "Sincerely,"). Do not include the header addresses or signature block - those will be added separately. Do not use markdown formatting.`;

  try {
    const result = await model.generateContent(prompt);
    const letterBody = result.response.candidates[0].content.parts[0].text;

    // Build the complete letter HTML
    const letterHtml = `
<div class="letter">
  <div class="address-block">
    ${userName}<br>
    ${userAddress.replace(/,/g, "<br>")}
  </div>

  <div class="date">${today}</div>

  <div class="recipient">
    The Honorable ${senator.name}<br>
    United States Senate<br>
    ${senator.office || "Washington, D.C. 20510"}
  </div>

  <div class="body">
    ${letterBody.split("\n").filter(p => p.trim()).map(p => `<p>${p}</p>`).join("\n    ")}
  </div>

  <div class="signature-block">
    ${userName}
  </div>
</div>`;

    res.json({ letterHtml, letterBody });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to generate letter" });
  }
});
