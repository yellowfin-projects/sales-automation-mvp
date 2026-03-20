import mammoth from "mammoth";

export interface ParsedTranscript {
  text: string;
  speakerLabels: string[];
  wordCount: number;
}

/**
 * Extract text from an uploaded file (.txt or .docx).
 * Returns the raw text, detected speaker labels, and word count.
 */
export async function parseTranscriptFile(file: File): Promise<ParsedTranscript> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  let text: string;

  if (extension === "txt") {
    text = await file.text();
  } else if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else {
    throw new Error(`Unsupported file type: .${extension}. Please upload a .txt or .docx file.`);
  }

  // Clean up: normalize line endings, trim
  text = text.replace(/\r\n/g, "\n").trim();

  if (!text) {
    throw new Error("The file appears to be empty.");
  }

  const speakerLabels = detectSpeakers(text);
  const wordCount = countWords(text);

  return { text, speakerLabels, wordCount };
}

/**
 * Parse a transcript file from a Buffer (for server-side API route usage).
 * Accepts raw bytes + filename to determine file type.
 */
export async function parseTranscriptBuffer(
  buffer: Buffer,
  filename: string
): Promise<ParsedTranscript> {
  const extension = filename.split(".").pop()?.toLowerCase();

  let text: string;

  if (extension === "txt") {
    text = buffer.toString("utf-8");
  } else if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error(`Unsupported file type: .${extension}. Please upload a .txt or .docx file.`);
  }

  text = text.replace(/\r\n/g, "\n").trim();

  if (!text) {
    throw new Error("The file appears to be empty.");
  }

  const speakerLabels = detectSpeakers(text);
  const wordCount = countWords(text);

  return { text, speakerLabels, wordCount };
}

/**
 * Detect speaker labels from transcript text.
 * Looks for patterns like:
 *   [Speaker Name]: ...
 *   Speaker Name: ...
 * at the start of lines.
 */
export function detectSpeakers(text: string): string[] {
  const speakers = new Set<string>();

  // Pattern 1: [Speaker Name]: text
  const bracketPattern = /^\[([^\]]+)\]\s*:/gm;
  let match;
  while ((match = bracketPattern.exec(text)) !== null) {
    speakers.add(match[1].trim());
  }

  // Pattern 2: Speaker Name: text (at start of line, name is 1-5 words, no brackets)
  // Only use this if no bracket-style speakers were found, to avoid false positives
  if (speakers.size === 0) {
    const colonPattern = /^([A-Z][A-Za-z\s.\-']{1,50}):\s+\S/gm;
    while ((match = colonPattern.exec(text)) !== null) {
      const name = match[1].trim();
      // Filter out common false positives (timestamps, labels)
      if (!name.match(/^\d/) && name.split(/\s+/).length <= 6) {
        speakers.add(name);
      }
    }
  }

  return Array.from(speakers).sort();
}

/**
 * Count words in text.
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
