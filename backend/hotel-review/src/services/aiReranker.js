import OpenAI from "openai";
import { settings } from "../config/settings.js";

let client = null;

function getClient() {
  if (!settings.openaiApiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey: settings.openaiApiKey });
  }
  return client;
}

export async function aiRerankCandidates({ property, guestProfile, draftText, candidates, limit = 3 }) {
  const openai = getClient();
  if (!openai || !settings.enableAiRerank || !candidates.length) {
    return null;
  }

  const payload = {
    property,
    guestProfile,
    draftText: draftText || "",
    limit,
    candidates: candidates.map((candidate) => ({
      facetKey: `${candidate.amenity_id}:${candidate.facet}`,
      amenity_id: candidate.amenity_id,
      facet: candidate.facet,
      state: candidate.state,
      score: candidate.score,
      question_text: candidate.question_text,
      debug: candidate.debug,
    })),
  };

  const response = await openai.responses.create({
    model: settings.openaiModel,
    reasoning: { effort: "low" },
    instructions:
      "You rank hotel review follow-up questions. Pick only from the supplied candidates. Prefer questions that are both high-value for data coverage and realistically answerable by this guest profile. Avoid child-related questions for guests without children, avoid parking questions for guests who did not drive, and avoid repeating topics already covered in the draft review. Return compact JSON only.",
    input: JSON.stringify(payload),
    text: {
      format: {
        type: "json_schema",
        name: "followup_selection",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            selections: {
              type: "array",
              maxItems: limit,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  facetKey: { type: "string" },
                  rationale: { type: "string" },
                  profileFit: { type: "string", enum: ["strong", "medium", "weak"] },
                  mustAsk: { type: "boolean" },
                },
                required: ["facetKey", "rationale", "profileFit", "mustAsk"],
              },
            },
          },
          required: ["selections"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.output_text);
  } catch {
    return null;
  }
}
