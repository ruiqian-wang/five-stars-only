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

  const body = {
    model: settings.openaiModel,
    reasoning: { effort: "low" },
    instructions:
      "You rank hotel review follow-up questions. Pick only from the supplied candidates. Prefer questions that are both high-value for data coverage and realistically answerable by this guest profile. Avoid child-related questions for guests without children, avoid parking questions for guests who did not drive, and avoid repeating topics already covered in the draft review.\n\nFor each selection, facetKey MUST exactly match one candidate's facetKey string from the payload (same spelling and casing).\n\nFor each selected candidate, write personalizedQuestion: a concise natural-language question the guest can answer with the same meaning as that candidate's question_text (same facet, same implied answer choices). Rephrase clearly for a human reader—do not copy question_text verbatim. Prefer second person (you / your stay). Match the draft review language when the draft is clearly in a non-English language; otherwise use clear English. Do not introduce new topics or options beyond the facet. Max ~180 characters.\n\ninteractionType:\n- likert_5: 1-5 satisfaction scale (best for broad quality/comfort feelings or unknown option sets)\n- single_choice: pick exactly 1 option from candidate options\n- multi_select: pick up to 2 options (use only when options are a category list where more than one can reasonably apply)\n- nps_10: 0-10 scale (use for recommendation/intensity style questions)\nConstraints: if candidate has fewer than 2 options, avoid single_choice or multi_select unless the question clearly asks a recommendation/intensity score (then nps_10). If candidate has exactly 2 options, prefer single_choice over likert_5 unless sentiment-only scoring is clearly better.\n\ncommentPlaceholder: one short sentence inviting an optional free-text note about that same topic only (not the overall stay). Match the language of personalizedQuestion. Return compact JSON only.",
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
                  personalizedQuestion: { type: "string", minLength: 8, maxLength: 220 },
                  interactionType: {
                    type: "string",
                    enum: ["likert_5", "single_choice", "multi_select", "nps_10"],
                  },
                  commentPlaceholder: { type: "string", minLength: 10, maxLength: 240 },
                },
                required: [
                  "facetKey",
                  "rationale",
                  "profileFit",
                  "mustAsk",
                  "personalizedQuestion",
                  "interactionType",
                  "commentPlaceholder",
                ],
              },
            },
          },
          required: ["selections"],
        },
      },
    },
  };

  let response;
  try {
    response = await openai.responses.parse(body);
  } catch {
    try {
      response = await openai.responses.create(body);
    } catch {
      return null;
    }
  }

  const parsed = response.output_parsed;
  if (parsed?.selections?.length) return parsed;

  const raw = typeof response.output_text === "string" ? response.output_text.trim() : "";
  if (!raw) return null;

  const tryParse = (text) => {
    try {
      const out = JSON.parse(text);
      return out?.selections?.length ? out : null;
    } catch {
      return null;
    }
  };

  let out = tryParse(raw);
  if (out) return out;

  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  out = tryParse(stripped);
  if (out) return out;

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    out = tryParse(raw.slice(start, end + 1));
    if (out) return out;
  }

  return null;
}
