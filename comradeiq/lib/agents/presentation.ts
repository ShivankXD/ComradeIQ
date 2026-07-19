import "server-only";

import PptxGenJS from "pptxgenjs";

import type { MissionSource } from "./contracts";

export interface PresentationSlide {
  title: string;
  bullets: string[];
  imageQuery: string;
  transition: string;
}

export interface PresentationJson {
  slides: PresentationSlide[];
}

export function sanitizePresentation(raw: PresentationJson): PresentationJson {
  const sourceSlides = Array.isArray(raw?.slides) ? raw.slides : [];
  return {
    slides: sourceSlides.slice(0, 20).flatMap((slide) => {
      if (!slide || typeof slide !== "object") return [];
      const candidate = slide as Partial<PresentationSlide>;
      const title = typeof candidate.title === "string" ? candidate.title.trim().slice(0, 90) : "";
      if (!title) return [];
      return [{
        title,
        bullets: Array.isArray(candidate.bullets)
          ? candidate.bullets.filter((bullet): bullet is string => typeof bullet === "string").map((bullet) => bullet.trim().slice(0, 130)).filter(Boolean).slice(0, 5)
          : [],
        imageQuery: typeof candidate.imageQuery === "string" ? candidate.imageQuery.trim().slice(0, 180) : "",
        transition: typeof candidate.transition === "string" ? candidate.transition.trim().slice(0, 40) || "fade" : "fade",
      }];
    }),
  };
}

export function presentationFilename(title: string) {
  const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56) || "brief";
  return `comradeiq-${stem}.pptx`;
}

/** Builds a real PPTX buffer. Persistence is handled by the storage adapter, never the local filesystem. */
export async function buildPresentation(presentation: PresentationJson, sources: MissionSource[] = []): Promise<Uint8Array> {
  if (!presentation.slides.length) throw new Error("A presentation needs at least one slide.");

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
    slide.background = { color: "0A0D0C" };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.11, h: 7.5, fill: { color: "10A37F" }, line: { color: "10A37F" } });
    slide.addText("COMRADEIQ  /  COMMANDER BRIEF", { x: 0.62, y: 0.38, w: 7, h: 0.18, fontFace: "Aptos", fontSize: 8, color: "73E0BE", charSpacing: 1.7, margin: 0 });
    slide.addText(definition.title, { x: 0.62, y: 0.76, w: 7.25, h: 0.82, fontFace: "Aptos Display", fontSize: 29, bold: true, color: "F7FAF9", breakLine: false, margin: 0, fit: "shrink" });
    slide.addText(
      definition.bullets.length
        ? definition.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 17 }, hanging: 4 } }))
        : "",
      { x: 0.82, y: 1.84, w: 6.65, h: 4.55, fontFace: "Aptos", fontSize: 17, breakLine: true, color: "D9E3DF", paraSpaceAfter: 12, margin: 0.05, valign: "middle", fit: "shrink" },
    );
    slide.addShape(pptx.ShapeType.roundRect, { x: 8.26, y: 1.84, w: 4.45, h: 3.05, rectRadius: 0.12, fill: { color: "10251F" }, line: { color: "1C6B57", transparency: 25 } });
    slide.addText("VISUAL DIRECTION", { x: 8.56, y: 2.15, w: 3.8, h: 0.2, fontFace: "Aptos", fontSize: 8, color: "73E0BE", charSpacing: 1.2, margin: 0 });
    slide.addText(definition.imageQuery || "No external image was inserted for this slide.", { x: 8.56, y: 2.63, w: 3.72, h: 1.52, fontFace: "Aptos", fontSize: 15, color: "E2F6EE", margin: 0, valign: "middle", fit: "shrink" });
    slide.addText(`${String(index + 1).padStart(2, "0")}  /  ${presentation.slides.length}`, { x: 11.25, y: 7.06, w: 1.45, h: 0.2, align: "right", fontFace: "Aptos", fontSize: 8, color: "8CA59D", margin: 0 });
  });

  if (sources.length) {
    const slide = pptx.addSlide();
    slide.background = { color: "0A0D0C" };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.11, h: 7.5, fill: { color: "10A37F" }, line: { color: "10A37F" } });
    slide.addText("SOURCES & PROVENANCE", { x: 0.62, y: 0.76, w: 8, h: 0.55, fontFace: "Aptos Display", fontSize: 26, bold: true, color: "F7FAF9", margin: 0 });
    slide.addText(sources.slice(0, 12).map((source, index) => ({ text: `${index + 1}. ${source.title}\n${source.url}`, options: { breakLine: true } })), {
      x: 0.8, y: 1.65, w: 11.7, h: 5.2, fontFace: "Aptos", fontSize: 12, color: "D9E3DF", margin: 0.05, paraSpaceAfter: 10, fit: "shrink",
    });
  }

  const output = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return new Uint8Array(output);
}
