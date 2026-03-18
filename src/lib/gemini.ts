import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

/**
 * Create a Gemini client. Only call this server-side (API routes).
 * The API key is never exposed to the browser.
 */
export function getGeminiModel() {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Gemini 2.5 Flash — stable, free tier: 10 RPM, 250K TPM, 250 requests/day
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Estimate token count for a string (rough approximation).
 * Gemini uses ~4 characters per token on average for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
