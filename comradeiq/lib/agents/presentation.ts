import { mkdir } from "node:fs/promises";
import path from "node:path";

import PptxGenJS from "pptxgenjs";

export interface PresentationSlide {
  title: string;
  bullets: string[];
  imageQuery: string;
  transition: string;
}

export interface PresentationJson {
  slides: PresentationSlide[];
}

export function presentationFilePath(missionId: string) {
  return path.join(process.cwd(), ".comradeiq-presentations", `${missionId}.pptx`);
}

export function sanitizePresentation(raw: PresentationJson): PresentationJson {
  return {
    slides: raw.slides.slice(0, 20).map((slide) => ({
      title: slide.title.trim().slice(0, 90),
      bullets: slide.bullets.slice(0, 5).map((bullet) => bullet.trim().slice(0, 130)).filter(Boolean),
      imageQuery: slide.imageQuery.trim().slice(0, 180),
      transition: slide.transition.trim().slice(0, 40) || "fade",
    })).filter((slide) => slide.title),
  };
}

export async function buildPresentation(missionId: string, presentation: PresentationJson) {
  const outputPath = presentationFilePath(missionId);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "ComradeIQ";
  pptx.subject = "Commander-generated presentation";
  pptx.title = presentation.slides[0]?.title ?? "ComradeIQ Presentation";
  pptx.company = "ComradeIQ";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };

  presentation.slides.forEach((definition, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: "0A0A0A" };
    slide.addText("COMRADEIQ  /  COMMANDER BRIEF", { x: 0.6, y: 0.38, w: 7, h: 0.18, fontFace: "Aptos", fontSize: 8, color: "93C5FD", charSpacing: 1.7, margin: 0 });
    slide.addText(definition.title, { x: 0.6, y: 0.75, w: 7.25, h: 0.75, fontFace: "Aptos Display", fontSize: 31, bold: true, color: "F8FAFC", breakLine: false, margin: 0 });
    slide.addText(definition.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 18 }, hanging: 4 } })), { x: 0.8, y: 1.8, w: 6.7, h: 4.55, fontFace: "Aptos", fontSize: 18, breakLine: true, color: "D1D5DB", paraSpaceAfter: 13, margin: 0.05, valign: "middle" });
    slide.addText(`IMAGE DIRECTION\n${definition.imageQuery || "Contextual editorial image"}`, { x: 8.3, y: 1.85, w: 4.35, h: 2.25, fontFace: "Aptos", fontSize: 14, color: "BFDBFE", breakLine: false, margin: 0.18, fill: { color: "0F1D31", transparency: 10 }, line: { color: "3B82F6", transparency: 55 } });
    slide.addText(`${String(index + 1).padStart(2, "0")}  /  ${presentation.slides.length}`, { x: 11.3, y: 7.05, w: 1.4, h: 0.2, align: "right", fontFace: "Aptos", fontSize: 8, color: "64748B", margin: 0 });
  });

  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}
