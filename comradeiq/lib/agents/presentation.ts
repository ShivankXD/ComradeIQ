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

export interface ThemeConfig {
  bg: string;
  sidebar: string;
  chromeText: string;
  pageNumber: string;
  titleText: string;
  messageBg: string;
  messageBorder: string;
  messageTitle: string;
  messageText: string;
  bulletText: string;
  slideDesc: string;
  actionCardBgOdd: string;
  actionCardBgEven: string;
  actionCardBorder: string;
  actionNumberBg: string;
  actionNumberText: string;
}

export const themeStyles: Record<string, ThemeConfig> = {
  camo: {
    bg: "0A0D0C",
    sidebar: "10A37F",
    chromeText: "73E0BE",
    pageNumber: "8CA59D",
    titleText: "F7FAF9",
    messageBg: "10251F",
    messageBorder: "1C6B57",
    messageTitle: "73E0BE",
    messageText: "E8F8F1",
    bulletText: "D9E3DF",
    slideDesc: "CDE9DD",
    actionCardBgOdd: "10251F",
    actionCardBgEven: "0E1915",
    actionCardBorder: "1C6B57",
    actionNumberBg: "10A37F",
    actionNumberText: "073C30"
  },
  cyberpunk: {
    bg: "0C051A",
    sidebar: "FF007F",
    chromeText: "FF007F",
    pageNumber: "00F3FF",
    titleText: "FFFFFF",
    messageBg: "1C0A33",
    messageBorder: "FF007F",
    messageTitle: "00F3FF",
    messageText: "FCE4FF",
    bulletText: "E5D6FA",
    slideDesc: "E1C0FF",
    actionCardBgOdd: "1E093D",
    actionCardBgEven: "0E0522",
    actionCardBorder: "00F3FF",
    actionNumberBg: "FF007F",
    actionNumberText: "FFFFFF"
  },
  minimal: {
    bg: "121212",
    sidebar: "FFFFFF",
    chromeText: "8E8E93",
    pageNumber: "8E8E93",
    titleText: "FFFFFF",
    messageBg: "2C2C2E",
    messageBorder: "48484A",
    messageTitle: "FFFFFF",
    messageText: "E5E5EA",
    bulletText: "E5E5EA",
    slideDesc: "E5E5EA",
    actionCardBgOdd: "1C1C1E",
    actionCardBgEven: "2C2C2E",
    actionCardBorder: "48484A",
    actionNumberBg: "8E8E93",
    actionNumberText: "1C1C1E"
  },
  ocean: {
    bg: "040C1A",
    sidebar: "3D9EFF",
    chromeText: "00E5FF",
    pageNumber: "88B6E5",
    titleText: "FFFFFF",
    messageBg: "081E3D",
    messageBorder: "103C73",
    messageTitle: "00E5FF",
    messageText: "EEF6FF",
    bulletText: "D0E1F5",
    slideDesc: "C0D8F0",
    actionCardBgOdd: "061730",
    actionCardBgEven: "0B2545",
    actionCardBorder: "134074",
    actionNumberBg: "3D9EFF",
    actionNumberText: "051630"
  }
};

function addChrome(pptx: PptxGenJS, slide: PptxGenJS.Slide, index: number, total: number, styles: ThemeConfig) {
  slide.background = { color: styles.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.11, h: 7.5, fill: { color: styles.sidebar }, line: { color: styles.sidebar } });
  slide.addText("COMRADEIQ  /  COMMANDER BRIEF", { x: 0.62, y: 0.38, w: 7, h: 0.18, fontFace: "Aptos", fontSize: 8, color: styles.chromeText, charSpacing: 1.7, margin: 0 });
  slide.addText(`${String(index + 1).padStart(2, "0")}  /  ${String(total).padStart(2, "0")}`, { x: 11.15, y: 7.05, w: 1.55, h: 0.2, align: "right", fontFace: "Aptos", fontSize: 8, color: styles.pageNumber, margin: 0 });
}

function addTitle(slide: PptxGenJS.Slide, title: string, styles: ThemeConfig, width = 11.6) {
  slide.addText(title, { x: 0.62, y: 0.78, w: width, h: 0.92, fontFace: "Aptos Display", fontSize: 36, bold: true, color: styles.titleText, margin: 0, fit: "shrink" });
}

function addKeyMessage(pptx: PptxGenJS, slide: PptxGenJS.Slide, keyMessage: string, x: number, y: number, w: number, h: number, styles: ThemeConfig) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: styles.messageBg }, line: { color: styles.messageBorder, transparency: 15 } });
  slide.addText("KEY MESSAGE", { x: x + 0.3, y: y + 0.3, w: w - 0.6, h: 0.2, fontFace: "Aptos", fontSize: 9, bold: true, color: styles.messageTitle, charSpacing: 1.1, margin: 0 });
  slide.addText(keyMessage, { x: x + 0.3, y: y + 0.78, w: w - 0.6, h: h - 1.05, fontFace: "Aptos Display", fontSize: 22, bold: true, color: styles.messageText, margin: 0, valign: "middle", fit: "shrink" });
}

function addBullets(slide: PptxGenJS.Slide, bullets: string[], x: number, y: number, w: number, h: number, styles: ThemeConfig) {
  slide.addText(
    bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 19 }, hanging: 5 } })),
    { x, y, w, h, fontFace: "Aptos", fontSize: 18, breakLine: true, color: styles.bulletText, paraSpaceAfter: 14, margin: 0.05, valign: "middle", fit: "shrink" },
  );
}

function addOpeningSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide, styles: ThemeConfig) {
  addTitle(slide, definition.title, styles, 11.9);
  slide.addText(definition.keyMessage, { x: 0.72, y: 2.1, w: 8.5, h: 1.15, fontFace: "Aptos Display", fontSize: 26, color: styles.slideDesc, margin: 0, fit: "shrink" });
  if (definition.bullets.length) addBullets(slide, definition.bullets, 0.82, 3.7, 7.0, 2.3, styles);
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.1, y: 1.55, w: 3.0, h: 3.0, fill: { color: styles.bg, transparency: 100 }, line: { color: styles.sidebar, width: 5, transparency: 18 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.75, y: 2.2, w: 1.75, h: 1.75, fill: { color: styles.bg, transparency: 100 }, line: { color: styles.chromeText, width: 2, transparency: 10 } });
  slide.addText("START WITH THE OUTCOME", { x: 8.65, y: 5.25, w: 3.85, h: 0.24, fontFace: "Aptos", fontSize: 10, bold: true, color: styles.chromeText, align: "center", charSpacing: 0.9, margin: 0 });
}

function addInsightSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide, styles: ThemeConfig) {
  addTitle(slide, definition.title, styles, 7.2);
  addBullets(slide, definition.bullets, 0.82, 1.98, 6.65, 4.55, styles);
  addKeyMessage(pptx, slide, definition.keyMessage, 8.26, 1.9, 4.45, 3.7, styles);
}

function addProcessSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide, styles: ThemeConfig) {
  addTitle(slide, definition.title, styles, 11.7);
  slide.addText(definition.keyMessage, { x: 0.74, y: 1.68, w: 11.4, h: 0.48, fontFace: "Aptos", fontSize: 20, color: styles.slideDesc, margin: 0, fit: "shrink" });
  definition.bullets.slice(0, 4).forEach((bullet, index) => {
    const y = 2.45 + index * 0.92;
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.82, y, w: 11.55, h: 0.66, rectRadius: 0.08, fill: { color: index % 2 ? styles.actionCardBgOdd : styles.actionCardBgEven }, line: { color: styles.actionCardBorder, transparency: 55 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 1.06, y: y + 0.12, w: 0.42, h: 0.42, fill: { color: styles.actionNumberBg }, line: { color: styles.actionNumberBg } });
    slide.addText(String(index + 1), { x: 1.06, y: y + 0.16, w: 0.42, h: 0.16, fontFace: "Aptos", fontSize: 9, bold: true, color: styles.actionNumberText, align: "center", margin: 0 });
    slide.addText(bullet, { x: 1.78, y: y + 0.17, w: 10.0, h: 0.27, fontFace: "Aptos", fontSize: 18, color: styles.messageText, margin: 0, fit: "shrink" });
  });
}

function addActionSlide(pptx: PptxGenJS, slide: PptxGenJS.Slide, definition: PresentationSlide, styles: ThemeConfig) {
  addTitle(slide, definition.title, styles, 11.7);
  addKeyMessage(pptx, slide, definition.keyMessage, 0.78, 1.82, 4.0, 3.9, styles);
  const cards = definition.bullets.slice(0, 4);
  cards.forEach((bullet, index) => {
    const x = 5.2 + (index % 2) * 3.58;
    const y = 1.82 + Math.floor(index / 2) * 2.02;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.14, h: 1.7, rectRadius: 0.1, fill: { color: index === 0 ? styles.actionNumberBg : styles.actionCardBgOdd }, line: { color: styles.actionCardBorder, transparency: 18 } });
    slide.addText(`ACTION ${index + 1}`, { x: x + 0.22, y: y + 0.22, w: 2.65, h: 0.16, fontFace: "Aptos", fontSize: 9, bold: true, color: index === 0 ? styles.actionNumberText : styles.messageTitle, charSpacing: 0.8, margin: 0 });
    slide.addText(bullet, { x: x + 0.22, y: y + 0.62, w: 2.65, h: 0.78, fontFace: "Aptos Display", fontSize: 15, bold: true, color: index === 0 ? styles.actionNumberText : styles.messageText, margin: 0, valign: "middle", fit: "shrink" });
  });
}

function addSourceFooter(slide: PptxGenJS.Slide, sources: MissionSource[], styles: ThemeConfig) {
  const labels = sources.slice(0, 3).map((source, index) => `[${index + 1}] ${source.title.trim().slice(0, 62)}`).filter(Boolean);
  if (!labels.length) return;
  slide.addText(`Sources: ${labels.join("  ·  ")}`, {
    x: 0.82, y: 6.67, w: 10.1, h: 0.18, fontFace: "Aptos", fontSize: 7.5, color: styles.pageNumber, margin: 0, fit: "shrink",
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
export async function buildPresentation(presentation: PresentationJson, sources: MissionSource[] = [], theme: string = "camo"): Promise<Uint8Array> {
  assertPresentationQuality(presentation);

  const styles = themeStyles[theme] || themeStyles.camo;

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
    addChrome(pptx, slide, index, presentation.slides.length, styles);
    if (definition.layout === "opening") addOpeningSlide(pptx, slide, definition, styles);
    else if (definition.layout === "process") addProcessSlide(pptx, slide, definition, styles);
    else if (definition.layout === "action") addActionSlide(pptx, slide, definition, styles);
    else addInsightSlide(pptx, slide, definition, styles);
    if (index === presentation.slides.length - 1) addSourceFooter(slide, sources, styles);
  });

  const output = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const bytes = new Uint8Array(output);
  if (!isPptxArchive(bytes)) throw new Error("PPTX output did not contain the required presentation parts.");
  return bytes;
}
