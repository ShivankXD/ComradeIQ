import "server-only";

import PptxGenJS from "pptxgenjs";

import type { MissionSource } from "./contracts";

export const presentationLayouts = ["opening", "insight", "process", "action"] as const;
export type PresentationLayout = typeof presentationLayouts[number];

export interface PresentationSlide {
  title: string;
  keyMessage: string;
  bullets: string[];
  layout: PresentationLayout;
}

export interface PresentationJson {
  slides: PresentationSlide[];
}

function isPresentationLayout(value: unknown): value is PresentationLayout {
  return typeof value === "string" && presentationLayouts.includes(value as PresentationLayout);
}

/**
 * Accepts older generated objects defensively, but only retains concise,
 * audience-facing fields that can be rendered honestly in the deck.
 */
export function sanitizePresentation(raw: PresentationJson): PresentationJson {
  const sourceSlides = Array.isArray(raw?.slides) ? raw.slides : [];
  const seenTitles = new Set<string>();
  const slides: PresentationSlide[] = [];

  for (const slide of sourceSlides.slice(0, 12)) {
    if (!slide || typeof slide !== "object") continue;
    const candidate = slide as Partial<PresentationSlide> & { imageQuery?: unknown; transition?: unknown };
    const title = typeof candidate.title === "string" ? candidate.title.trim().slice(0, 90) : "";
    const normalizedTitle = title.toLocaleLowerCase();
    if (!title || seenTitles.has(normalizedTitle)) continue;
    seenTitles.add(normalizedTitle);

    const legacyKeyMessage = typeof candidate.transition === "string"
      ? candidate.transition
      : typeof candidate.imageQuery === "string"
        ? candidate.imageQuery
        : "";
    const keyMessage = (typeof candidate.keyMessage === "string" ? candidate.keyMessage : legacyKeyMessage).trim().slice(0, 210) || title;
    const layout = isPresentationLayout(candidate.layout) ? candidate.layout : slides.length === 0 ? "opening" : "insight";
    const bullets = Array.isArray(candidate.bullets)
      ? candidate.bullets
        .filter((bullet): bullet is string => typeof bullet === "string")
        .map((bullet) => bullet.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 5)
      : [];
    slides.push({ title, keyMessage, bullets, layout });
  }

  return { slides };
}

export function requestedSlideCount(objective: string) {
  const match = objective.match(/\b([1-9]|1[0-2])\s*(?:-|\s)?slides?\b/i);
  return match ? Number.parseInt(match[1], 10) : 3;
}

export function assertPresentationQuality(presentation: PresentationJson, expectedSlideCount?: number) {
  if (!presentation.slides.length) throw new Error("A presentation needs at least one slide.");
  if (expectedSlideCount && presentation.slides.length !== expectedSlideCount) {
    throw new Error(`Expected ${expectedSlideCount} slides, received ${presentation.slides.length}.`);
  }
  for (const [index, slide] of presentation.slides.entries()) {
    if (!slide.title || !slide.keyMessage) throw new Error(`Slide ${index + 1} is missing audience-facing copy.`);
    if (slide.layout !== "opening" && slide.bullets.length < 2) {
      throw new Error(`Slide ${index + 1} needs at least two concrete points.`);
    }
  }
}

export function presentationFilename(title: string) {
  const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56) || "brief";
  return `comradeiq-${stem}.pptx`;
}

function addChrome(pptx: PptxGenJS, slide: PptxGenJS.Slide, index: number, total: number) {
  slide.background = { color: "0A0D0C" };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.11, h: 7.5, fill: { color: "10A37F" }, line: { color: "10A37F" } });
  slide.addText("COMRADEIQ  /  COMMANDER BRIEF", { x: 0.62, y: 0.38, w: 7, h: 0.18, fontFace: "Aptos", fontSize: 8, color: "73E0BE", charSpacing: 1.7, margin: 0 });
  slide.addText(`${String(index + 1).padStart(2, "0")}  /  ${String(total).padStart(2, "0")}`, { x: 11.15, y: 7.05, w: 1.55, h: 0.2, align: "right", fontFace: "Aptos", fontSize: 8, color: "8CA59D", margin: 0 });
}

function addTitle(slide: PptxGenJS.Slide, title: string, width = 11.6) {
  slide.addText(title, { x: 0.62, y: 0.78, w: width, h: 0.92, fontFace: "Aptos Display", fontSize: 36, bold: true, color: "F7FAF9", margin: 0, fit: "shrink" });
}

function addKeyMessage(pptx: PptxGenJS, slide: PptxGenJS.Slide, keyMessage: string, x: number, y: number, w: number, h: number) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: "10251F" }, line: { color: "1C6B57", transparency: 15 } });
  slide.addText("KEY MESSAGE", { x: x + 0.3, y: y + 0.3, w: w - 0.6, h: 0.2, fontFace: "Aptos", fontSize: 9, bold: true, color: "73E0BE", charSpacing: 1.1, margin: 0 });
  slide.addText(keyMessage, { x: x + 0.3, y: y + 0.78, w: w - 0.6, h: h - 1.05, fontFace: "Aptos Display", fontSize: 22, bold: true, color: "E8F8F1", margin: 0, valign: "middle", fit: "shrink" });
}

function addBullets(slide: PptxGenJS.Slide, bullets: string[], x: number, y: number, w: number, h: number) {
  slide.addText(
    bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 19 }, hanging: 5 } })),
    { x, y, w, h, fontFace: "Aptos", fontSize: 18, breakLine: true, color: "D9E3DF", paraSpaceAfter: 14, margin: 0.05, valign: "middle", fit: "shrink" },
  );
}

function addOpeningSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide) {
  addTitle(slide, definition.title, 11.9);
  slide.addText(definition.keyMessage, { x: 0.72, y: 2.1, w: 8.5, h: 1.15, fontFace: "Aptos Display", fontSize: 26, color: "CDE9DD", margin: 0, fit: "shrink" });
  if (definition.bullets.length) addBullets(slide, definition.bullets, 0.82, 3.7, 7.0, 2.3);
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.1, y: 1.55, w: 3.0, h: 3.0, fill: { color: "0A0D0C", transparency: 100 }, line: { color: "10A37F", width: 5, transparency: 18 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.75, y: 2.2, w: 1.75, h: 1.75, fill: { color: "0A0D0C", transparency: 100 }, line: { color: "73E0BE", width: 2, transparency: 10 } });
  slide.addText("START WITH THE OUTCOME", { x: 8.65, y: 5.25, w: 3.85, h: 0.24, fontFace: "Aptos", fontSize: 10, bold: true, color: "73E0BE", align: "center", charSpacing: 0.9, margin: 0 });
}

function addInsightSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide) {
  addTitle(slide, definition.title, 7.2);
  addBullets(slide, definition.bullets, 0.82, 1.98, 6.65, 4.55);
  addKeyMessage(pptx, slide, definition.keyMessage, 8.26, 1.9, 4.45, 3.7);
}

function addProcessSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide) {
  addTitle(slide, definition.title, 11.7);
  slide.addText(definition.keyMessage, { x: 0.74, y: 1.68, w: 11.4, h: 0.48, fontFace: "Aptos", fontSize: 20, color: "CDE9DD", margin: 0, fit: "shrink" });
  definition.bullets.slice(0, 4).forEach((bullet, index) => {
    const y = 2.45 + index * 0.92;
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.82, y, w: 11.55, h: 0.66, rectRadius: 0.08, fill: { color: index % 2 ? "10251F" : "0E1915" }, line: { color: "1C6B57", transparency: 55 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 1.06, y: y + 0.12, w: 0.42, h: 0.42, fill: { color: "10A37F" }, line: { color: "10A37F" } });
    slide.addText(String(index + 1), { x: 1.06, y: y + 0.16, w: 0.42, h: 0.16, fontFace: "Aptos", fontSize: 9, bold: true, color: "073C30", align: "center", margin: 0 });
    slide.addText(bullet, { x: 1.78, y: y + 0.17, w: 10.0, h: 0.27, fontFace: "Aptos", fontSize: 18, color: "E2F0EA", margin: 0, fit: "shrink" });
  });
}

function addActionSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide) {
  addTitle(slide, definition.title, 11.7);
  addKeyMessage(pptx, slide, definition.keyMessage, 0.78, 1.82, 4.0, 3.9);
  const cards = definition.bullets.slice(0, 4);
  cards.forEach((bullet, index) => {
    const x = 5.2 + (index % 2) * 3.58;
    const y = 1.82 + Math.floor(index / 2) * 2.02;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.14, h: 1.7, rectRadius: 0.1, fill: { color: index === 0 ? "104B3D" : "10251F" }, line: { color: "1C6B57", transparency: 18 } });
    slide.addText(`ACTION ${index + 1}`, { x: x + 0.22, y: y + 0.22, w: 2.65, h: 0.16, fontFace: "Aptos", fontSize: 9, bold: true, color: "73E0BE", charSpacing: 0.8, margin: 0 });
    slide.addText(bullet, { x: x + 0.22, y: y + 0.62, w: 2.65, h: 0.78, fontFace: "Aptos Display", fontSize: 15, bold: true, color: "E8F8F1", margin: 0, valign: "middle", fit: "shrink" });
  });
}

function addSourceFooter(slide: PptxGenJS.Slide, sources: MissionSource[]) {
  const labels = sources.slice(0, 3).map((source, index) => `[${index + 1}] ${source.title.trim().slice(0, 62)}`).filter(Boolean);
  if (!labels.length) return;
  slide.addText(`Sources: ${labels.join("  ·  ")}`, {
    x: 0.82, y: 6.67, w: 10.1, h: 0.18, fontFace: "Aptos", fontSize: 7.5, color: "8CA59D", margin: 0, fit: "shrink",
  });
}

export function isPptxArchive(bytes: Uint8Array) {
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const archiveNames = Buffer.from(bytes).toString("latin1");
  return archiveNames.includes("[Content_Types].xml")
    && archiveNames.includes("ppt/presentation.xml")
    && archiveNames.includes("ppt/slides/slide1.xml");
}

/** Builds a real, audience-ready PPTX buffer. Persistence is handled by the storage adapter. */
export async function buildPresentation(presentation: PresentationJson, sources: MissionSource[] = []): Promise<Uint8Array> {
  assertPresentationQuality(presentation);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "ComradeIQ";
  pptx.subject = "Commander-generated presentation";
  pptx.title = presentation.slides[0]?.title ?? "ComradeIQ Presentation";
  pptx.company = "ComradeIQ";
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  pptx.defineLayout({ name: "COMRADE_WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "COMRADE_WIDE";

  presentation.slides.forEach((definition, index) => {
    const slide = pptx.addSlide();
    addChrome(pptx, slide, index, presentation.slides.length);
    if (definition.layout === "opening") addOpeningSlide(pptx, slide, definition);
    else if (definition.layout === "process") addProcessSlide(pptx, slide, definition);
    else if (definition.layout === "action") addActionSlide(pptx, slide, definition);
    else addInsightSlide(pptx, slide, definition);
    if (index === presentation.slides.length - 1) addSourceFooter(slide, sources);
  });

  const output = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const bytes = new Uint8Array(output);
  if (!isPptxArchive(bytes)) throw new Error("PPTX output did not contain the required presentation parts.");
  return bytes;
}
