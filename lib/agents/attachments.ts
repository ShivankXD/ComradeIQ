import "server-only";

import { randomUUID } from "node:crypto";

import { PDFParse } from "pdf-parse";

import type { MissionAttachment } from "./contracts";
import { RuntimeError } from "./errors";
import { runtimeLimits } from "./model";

const MAX_EXTRACTED_CHARACTERS = 32_000;
const MAX_PDF_PAGES = 12;

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "application/ld+json",
  "text/csv",
  "application/csv",
]);

const EXTENSION_MIME: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

function extensionOf(name: string) {
  const match = /\.([A-Za-z0-9]+)$/.exec(name);
  return match?.[1]?.toLowerCase();
}

function cleanName(name: string) {
  const normalized = name.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").trim();
  return (normalized || "attachment").slice(0, 120);
}

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function sniffMime(bytes: Uint8Array): string | undefined {
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (bytes.length > 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return undefined;
}

function truncate(text: string) {
  if (text.length <= MAX_EXTRACTED_CHARACTERS) return { text, truncated: false };
  return { text: `${text.slice(0, MAX_EXTRACTED_CHARACTERS)}\n\n[Reference truncated for safety.]`, truncated: true };
}

function looksBinary(bytes: Uint8Array) {
  const sample = bytes.slice(0, 1_024);
  return sample.some((byte) => byte === 0);
}

async function extractPdf(bytes: Uint8Array) {
  const parser = new PDFParse({ data: bytes, stopAtErrors: true, disableFontFace: true });
  try {
    const extracted = await parser.getText({ first: MAX_PDF_PAGES, parseHyperlinks: true, pageJoiner: "\n\n--- page {page_number} ---\n" });
    return truncate(extracted.text.trim());
  } finally {
    await parser.destroy();
  }
}

function unsupported(name: string, mimeType: string, size: number, summary: string): MissionAttachment {
  return { id: randomUUID(), name, mimeType, size, kind: "unsupported", status: "unsupported", summary };
}

function fileLike(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "name" in value && "size" in value;
}

export async function prepareAttachments(
  values: FormDataEntryValue[],
  options: { visionEnabled: boolean },
): Promise<MissionAttachment[]> {
  const { maxAttachments, maxAttachmentBytes } = runtimeLimits();
  if (values.length > maxAttachments) {
    throw new RuntimeError("bad_request", `Attach at most ${maxAttachments} files per mission.`, { status: 400 });
  }

  let totalBytes = 0;
  const result: MissionAttachment[] = [];
  for (const value of values) {
    if (!fileLike(value)) throw new RuntimeError("bad_request", "Attachments must be uploaded as files.", { status: 400 });
    const file = value;
    const name = cleanName(file.name);
    const size = Number(file.size);
    if (!Number.isFinite(size) || size < 0 || size > maxAttachmentBytes) {
      throw new RuntimeError("bad_request", `${name} exceeds the ${Math.floor(maxAttachmentBytes / 1024 / 1024)} MB file limit.`, { status: 413 });
    }
    totalBytes += size;
    if (totalBytes > maxAttachmentBytes * maxAttachments) {
      throw new RuntimeError("bad_request", "The combined attachment size is too large.", { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const declared = file.type.trim().toLowerCase();
    const extensionMime = EXTENSION_MIME[extensionOf(name) ?? ""];
    const magicMime = sniffMime(bytes);
    const mimeType = magicMime ?? (TEXT_MIME_TYPES.has(declared) ? declared : (extensionMime ?? declared) || "application/octet-stream");

    if (magicMime && declared && declared !== "application/octet-stream" && declared !== magicMime) {
      result.push(unsupported(name, declared, size, "The file type did not match its content and was not analyzed."));
      continue;
    }

    if (mimeType === "application/pdf") {
      if (magicMime !== "application/pdf") {
        result.push(unsupported(name, mimeType, size, "PDF content could not be verified and was not analyzed."));
        continue;
      }
      try {
        const extracted = await extractPdf(bytes);
        result.push({
          id: randomUUID(), name, mimeType, size, kind: "pdf",
          status: extracted.truncated ? "truncated" : "ready",
          summary: extracted.truncated ? "PDF text extracted (first pages, truncated)." : "PDF text extracted.",
          text: extracted.text,
        });
      } catch {
        result.push(unsupported(name, mimeType, size, "PDF text extraction failed; the document was not analyzed."));
      }
      continue;
    }

    if (mimeType.startsWith("image/")) {
      if (!magicMime?.startsWith("image/")) {
        result.push(unsupported(name, mimeType, size, "Image content could not be verified and was not analyzed."));
      } else if (!options.visionEnabled) {
        result.push(unsupported(name, mimeType, size, "Image input was received but no vision-capable model is configured."));
      } else {
        result.push({
          id: randomUUID(), name, mimeType, size, kind: "image", status: "ready",
          summary: "Image will be analyzed by the configured vision model.",
          imageDataUrl: `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`,
        });
      }
      continue;
    }

    if (TEXT_MIME_TYPES.has(mimeType)) {
      if (looksBinary(bytes)) {
        result.push(unsupported(name, mimeType, size, "Binary content was not analyzed as text."));
        continue;
      }
      const extracted = truncate(new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim());
      if (mimeType === "application/json" && extracted.text) {
        try { JSON.parse(extracted.text); } catch {
          result.push(unsupported(name, mimeType, size, "Invalid JSON was not analyzed as structured data."));
          continue;
        }
      }
      result.push({
        id: randomUUID(), name, mimeType, size, kind: "text",
        status: extracted.truncated ? "truncated" : "ready",
        summary: extracted.truncated ? "Text extracted and truncated." : "Text extracted.",
        text: extracted.text,
      });
      continue;
    }

    result.push(unsupported(name, mimeType, size, "This media type is not supported. Supported files: text, Markdown, JSON, CSV, PDF, PNG, JPEG, GIF, and WebP."));
  }
  return result;
}

/** Legacy JSON clients may still provide text context, but it has the same prompt boundary as uploaded files. */
export function prepareLegacyAttachmentContext(values: unknown): MissionAttachment[] {
  if (!Array.isArray(values)) return [];
  return values.slice(0, runtimeLimits().maxAttachments).flatMap((value, index) => {
    if (typeof value !== "string" || !value.trim()) return [];
    const extracted = truncate(value.trim());
    return [{
      id: randomUUID(),
      name: `Reference ${index + 1}.txt`,
      mimeType: "text/plain",
      size: Buffer.byteLength(extracted.text),
      kind: "text" as const,
      status: extracted.truncated ? "truncated" as const : "ready" as const,
      summary: "Legacy text reference extracted.",
      text: extracted.text,
    }];
  });
}

export function attachmentReferenceText(attachments: MissionAttachment[]) {
  const readable = attachments.filter((attachment) => (attachment.kind === "text" || attachment.kind === "pdf") && attachment.text);
  if (!readable.length) return "No textual attachments were supplied.";
  return readable.map((attachment) => [
    `BEGIN UNTRUSTED ATTACHMENT: ${attachment.name}`,
    attachment.text,
    `END UNTRUSTED ATTACHMENT: ${attachment.name}`,
  ].join("\n")).join("\n\n");
}

export function attachmentLabels(attachments: MissionAttachment[]) {
  return attachments.map(({ id, name, mimeType, size, kind, status, summary }) => ({ id, name, mimeType, size, kind, status, summary }));
}
