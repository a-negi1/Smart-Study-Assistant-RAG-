import Groq from "groq-sdk";

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function groqJSON({
  systemPrompt,
  userPrompt,
  model       = "llama-3.3-70b-versatile",
  maxTokens   = 2048,
  temperature = 0.3,
}) {
  const completion = await groqClient.chat.completions.create({
    model,
    temperature,
    max_tokens:      maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });

  const rawText = completion.choices[0]?.message?.content ?? "";


  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Groq returned non-parseable JSON.\nRaw: ${rawText}\nParse error: ${err.message}`
    );
  }
}

const LEITNER_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

export function computeNextReview(rating, currentBox) {
  let newBox;
  switch (rating) {
    case "Easy":   newBox = Math.min(currentBox + 1, 5); break;
    case "Medium": newBox = currentBox;                  break;
    case "Hard":   newBox = 1;                           break;
    default: throw new Error(`Unknown rating "${rating}". Expected Easy | Medium | Hard.`);
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + LEITNER_INTERVALS[newBox]);
  return { newBox, nextReviewDate };
}

export async function applyFlashcardRating(card, rating) {
  const { newBox, nextReviewDate } = computeNextReview(rating, card.boxNumber);

  card.boxNumber      = newBox;
  card.nextReviewDate = nextReviewDate;
  card.lastReviewedAt = new Date();

  if (rating === "Easy")        card.easyCount   += 1;
  else if (rating === "Medium") card.mediumCount  += 1;
  else                          card.hardCount    += 1;

  return card.save();
}

export function assembleContext(chunks, maxChars = 6000) {
  let out = "", len = 0;
  for (let i = 0; i < chunks.length; i++) {
    const s = `[Chunk ${i + 1}]:\n${chunks[i].text}\n\n`;
    if (len + s.length > maxChars) break;
    out += s;
    len += s.length;
  }
  return out.trim() || "No relevant context found.";
}

const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_DAYS = parseInt(process.env.JWT_COOKIE_EXPIRES_DAYS ?? "7", 10);

export function setAuthCookies(res, accessToken, refreshToken) {
  const cookieOptions = {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path:     "/",
  };

  res.cookie("accessToken",  accessToken,  { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: COOKIE_DAYS * 24 * 3600 * 1000 });
}

export function clearAuthCookies(res) {
  res.clearCookie("accessToken",  { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
}

const HF_MODEL  = "sentence-transformers/all-MiniLM-L6-v2";
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

export async function generateEmbedding(text) {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    console.warn("[embedding] HF_API_TOKEN not set — skipping embedding generation.");
    return [];
  }

  const MAX_RETRIES = 4;
  const truncated   = text.slice(0, 512);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: truncated,
          options: { wait_for_model: true },
        }),
      });

      if (res.status === 503) {

        const wait = Math.min(2000 * 2 ** (attempt - 1), 30000);
        console.log(`[embedding] Model loading (attempt ${attempt}/${MAX_RETRIES}), retrying in ${wait}ms…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`HF API ${res.status}: ${errBody}`);
      }

      const data = await res.json();


      const vec = Array.isArray(data[0]) ? data[0] : data;

      if (!Array.isArray(vec) || vec.length !== 384) {
        throw new Error(`Unexpected embedding shape: ${JSON.stringify(vec).slice(0, 120)}`);
      }

      return vec;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`[embedding] Failed after ${MAX_RETRIES} attempts:`, err.message);
        return [];
      }
      const wait = 2000 * 2 ** (attempt - 1);
      console.warn(`[embedding] Attempt ${attempt} failed (${err.message}), retrying in ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  return [];
}
