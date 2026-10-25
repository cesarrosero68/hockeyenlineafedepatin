import { jsPDF } from "jspdf";
import { CANCHA, CANCHA_RATIO, LOGO_FCP, LOGO_FCP_RATIO } from "./disciplinePdfImages";

/**
 * Genera el PDF "Planilla Incidente Partido - FEDEPATIN 2026" con el mismo diseño de la planilla Excel.
 * Función pura: recibe los datos ya cargados y devuelve el PDF (no toca la base de datos).
 */

export interface DisciplineSanction {
  player: string;
  jersey: number | string | null;
  side: "LOC" | "VIS";
  period: string; // 1T / 2T / OT
  time: string; // mm:ss
  sanction: string;
  rule: string;
}

export interface RefereeInfo {
  name: string;
  phone: string;
  registry: string;
}

export interface DisciplineReportData {
  /** 4 filas: Referee, Referee, Ref. Mesa, Ref. Mesa (se escriben a mano en la ventana, no están en la plataforma) */
  referees?: RefereeInfo[];
  /** Texto libre de lesiones; si se llena, sale al final del informe. */
  injuries?: string;
  dateText: string;
  timeText: string;
  league: string; // división (Copa ...)
  division: string; // categoría
  venue: string;
  phase: string;
  statusText: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreExtra: number | null;
  awayScoreExtra: number | null;
  homeCoach: string;
  awayCoach: string;
  homeDelegate: string;
  awayDelegate: string;
  sanctions: DisciplineSanction[];
  notes: string;
}

/** "JUAN PABLO CHAPETON" -> "Juan Pablo Chapeton" (solo si viene todo en mayúsculas). */
const titleCase = (t: string): string =>
  t && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t)
    ? t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase())
    : t;

const M = 10; // margen (mm)
const W = 190; // ancho útil (A4 = 210)
const GREY: [number, number, number] = [176, 176, 176];
const RED: [number, number, number] = [192, 0, 0];
const LINE_H = 5.6;

export function buildDisciplinePdf(d: DisciplineReportData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);

  const text = (
    s: string,
    x: number,
    y: number,
    o: { size?: number; bold?: boolean; align?: "left" | "center" | "right"; color?: [number, number, number]; maxW?: number } = {},
  ) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    let size = o.size ?? 9;
    doc.setFontSize(size);
    // Reduce la letra hasta que el texto quepa en maxW (como "reducir hasta ajustar" en Excel)
    if (o.maxW) while (size > 5.5 && doc.getTextWidth(s) > o.maxW) doc.setFontSize((size -= 0.5));
    doc.setTextColor(...(o.color ?? [0, 0, 0]));
    doc.text(s ?? "", x, y, { align: o.align ?? "left", baseline: "middle" });
  };
  const bar = (label: string, y: number, h = 5.5) => {
    doc.setFillColor(...GREY);
    doc.rect(M, y, W, h, "F");
    text(label, M + 1, y + h / 2, { size: 8.5, bold: true });
  };
  const cell = (x: number, y: number, w: number, h: number) => doc.rect(x, y, w, h);
  const hline = (x: number, y: number, w: number) => doc.line(x, y, x + w, y);

  // ── Título ──
  doc.setFillColor(...RED);
  doc.rect(M + 20, 8, W - 40, 7.5, "FD");
  text("2026 - FORMATO DE EVALUACIÓN REFEREE", M + W / 2, 11.75, { size: 13, bold: true, align: "center", color: [255, 255, 255] });

  // ── Logos + título central ──
  const logoH = 11;
  const logoW = logoH * LOGO_FCP_RATIO;
  doc.addImage(LOGO_FCP, "JPEG", M + 4, 17.5, logoW, logoH);
  doc.addImage(LOGO_FCP, "JPEG", M + W - 4 - logoW, 17.5, logoW, logoH);
  text("HOCKEY EN LÍNEA", M + W / 2, 20.5, { size: 11, bold: true, align: "center" });
  doc.setFillColor(217, 217, 217);
  doc.rect(M + W / 2 - 23, 24.5, 46, 6, "FD");
  text("CONFIDENCIAL", M + W / 2, 27.5, { size: 11, bold: true, align: "center" });

  // ── Nombre referee ──
  let y = 33;
  bar("NOMBRE REFEREE:", y);
  text(d.referees?.[0]?.name ?? "", M + 38, y + 2.75, { size: 9, bold: true, maxW: 100 });
  y += 5.5;

  // ── Encabezado del partido ──
  const hdrTop = y;
  const rowH = 6.2;
  // Fila 1: Fecha / Hora / Liga / División
  text("Fecha:", M + 1, y + rowH / 2, { size: 8.5, bold: true });
  text(d.dateText, M + 20, y + rowH / 2, { size: 9, bold: true, align: "center", maxW: 24 });
  text("Hora:", M + 38, y + rowH / 2, { size: 8.5, bold: true });
  text(d.timeText, M + 50, y + rowH / 2, { size: 8.5, bold: true, maxW: 18 });
  text("Liga:", M + 70, y + rowH / 2, { size: 8.5, bold: true });
  text(d.league, M + 100, y + rowH / 2, { size: 9, bold: true, align: "center", maxW: 52 });
  text("División:", M + 138, y + rowH / 2, { size: 8.5, bold: true });
  text(d.division, M + W - 2, y + rowH / 2, { size: 9, bold: true, align: "right", maxW: 30 });
  y += rowH;

  const pair = (label: string, l: string, r: string, lLabel: string, rLabel: string) => {
    const cy = y + rowH / 2;
    text(lLabel, M + 1, cy, { size: 8.5, bold: true });
    text(l, M + 51, cy, { size: 9, bold: label === "team", align: "center", maxW: 66 });
    hline(M + 24, y + rowH - 0.8, 55);
    text(rLabel, M + 96, cy, { size: 8.5, bold: true });
    text(r, M + 148, cy, { size: 9, bold: label === "team", align: "center", maxW: 66 });
    hline(M + 120, y + rowH - 0.8, 68);
    y += rowH;
  };
  pair("team", d.homeTeam, d.awayTeam, "Equipo Local:", "Equipo Away:");
  pair("coach", titleCase(d.homeCoach), titleCase(d.awayCoach), "Coach Local:", "Coach Away:");
  pair("del", titleCase(d.homeDelegate), titleCase(d.awayDelegate), "Delegado Local:", "Delegado Away:");

  // Fila extra (información de la plataforma): lugar, fase, marcador
  const cy = y + rowH / 2;
  text("Lugar:", M + 1, cy, { size: 8.5, bold: true });
  text(d.venue || "—", M + 14, cy, { size: 9, maxW: 52 });
  text("Fase:", M + 70, cy, { size: 8.5, bold: true });
  text(d.phase || "—", M + 81, cy, { size: 9, maxW: 25 });
  text("Marcador:", M + 108, cy, { size: 8.5, bold: true });
  const hasScore = d.homeScore !== null && d.awayScore !== null;
  let score = hasScore ? `LOC ${d.homeScore} - ${d.awayScore} VIS` : "—";
  if (hasScore && (d.homeScoreExtra || d.awayScoreExtra)) score += `  (OT ${d.homeScoreExtra ?? 0}-${d.awayScoreExtra ?? 0})`;
  text(score, M + 128, cy, { size: 9, bold: true, maxW: 40 });
  text(d.statusText, M + W - 1, cy, { size: 8, align: "right", maxW: 22 });
  y += rowH;
  cell(M, hdrTop, W, y - hdrTop);

  // ── Información referee ──
  bar("INFORMACIÓN REFEREE:", y);
  y += 5.5;
  const refTop = y;
  ["Referee:", "Referee:", "Ref. Mesa:", "Ref. Mesa:"].forEach((lab, idx) => {
    const c = y + 3.1;
    const ref = d.referees?.[idx];
    text(lab, M + 1, c, { size: 8.5, bold: true });
    hline(M + 22, y + 5.2, 80);
    text(ref?.name ?? "", M + 23, c, { size: 9, maxW: 78 });
    text("Celular:", M + 106, c, { size: 8.5, bold: true });
    hline(M + 123, y + 5.2, 31);
    text(ref?.phone ?? "", M + 124, c, { size: 9, maxW: 29 });
    text("Registro #:", M + 156, c, { size: 8.5, bold: true });
    hline(M + 173, y + 5.2, 16);
    text(ref?.registry ?? "", M + 174, c, { size: 9, maxW: 14 });
    y += 6.2;
  });
  cell(M, refTop, W, y - refTop);

  // ── Resumen / detalle sanciones ──
  bar("RESUMEN / DETALLE SANCIONES:", y);
  y += 5.5;
  const cols = [50, 10, 14, 15, 15, 44, 14, 14, 14];
  const heads = ["Nombre Jugador", "#", "LOC / VIS", "Período", "Tiempo", "Sanción", "Regla", "¿Registrado en la Planilla de Juego?", "¿Lesiones?"];
  const headH = 8;
  let x = M;
  heads.forEach((h, i) => {
    cell(x, y, cols[i], headH);
    if (h.length > 14) {
      const parts = doc.splitTextToSize(h, cols[i] - 1) as string[];
      doc.setFontSize(6.2);
      parts.slice(0, 3).forEach((p, k) => text(p, x + cols[i] / 2, y + 2.2 + k * 2.3, { size: 6.2, bold: true, align: "center" }));
    } else {
      text(h, x + cols[i] / 2, y + headH / 2, { size: 8, bold: true, align: "center", maxW: cols[i] - 1 });
    }
    x += cols[i];
  });
  y += headH;

  const sanctRows = Math.min(Math.max(d.sanctions.length, 4), 9);
  const shown = d.sanctions.slice(0, sanctRows);
  const extra = d.sanctions.slice(sanctRows);
  for (let r = 0; r < sanctRows; r++) {
    const s = shown[r];
    x = M;
    const vals = s
      ? [titleCase(s.player), s.jersey === null || s.jersey === "" ? "" : String(s.jersey), s.side, s.period, s.time, s.sanction, s.rule, "SÍ", ""]
      : ["", "", "", "", "", "", "", "", ""];
    vals.forEach((v, i) => {
      cell(x, y, cols[i], 6.2);
      if (v) text(v, x + cols[i] / 2, y + 3.1, { size: 8, align: "center", maxW: cols[i] - 1.5 });
      x += cols[i];
    });
    y += 6.2;
  }
  y += 1.5;

  // ── Informe referee (notas del partido) ──
  bar("INFORME REFEREE:", y);
  y += 5.5;
  let note = (d.notes ?? "").replace(/\r/g, "").replace(/\t/g, " ").trim();
  if (extra.length) {
    const ex = extra
      .map((s) => `${s.jersey ? "#" + s.jersey + " " : ""}${titleCase(s.player)} (${s.side}, ${s.period}${s.time ? " " + s.time : ""}, ${s.rule})`)
      .join("; ");
    note += `${note ? "\n" : ""}Sanciones adicionales: ${ex}.`;
  }
  if (d.injuries?.trim()) note += `${note ? "\n" : ""}Lesiones: ${d.injuries.trim()}`;

  const pageBottom = 287;
  const signH = 5.5 + 11;
  const fieldH = 52;
  const PAD = 2;
  const blocks = note
    .split("\n")
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  type RLine = { text: string; x: number; w: number; bold: boolean; justify: boolean; before: number };
  const layout = (size: number): { lines: RLine[]; lh: number } => {
    const lh = size * 0.46; // mm por renglón
    const out: RLine[] = [];
    const innerW = W - 2 * PAD;
    blocks.forEach((blk, bi) => {
      const num = blk.match(/^(\d{1,2}[.)])\s+(.*)$/);
      const isHeading = !num && blk.length <= 60 && !/[.,;]$/.test(blk) && !/:\s*\S/.test(blk);
      const before = bi === 0 ? 0 : isHeading ? 2.2 : 1.2;
      if (isHeading) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        out.push({ text: blk, x: M + PAD, w: innerW, bold: true, justify: false, before });
        return;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const indent = num ? 7 : 0;
      const body = num ? num[2] : blk;
      const parts = doc.splitTextToSize(body, innerW - indent) as string[];
      parts.forEach((ln, i) => {
        if (num && i === 0) out.push({ text: num[1], x: M + PAD + 1, w: 6, bold: false, justify: false, before });
        out.push({
          text: ln,
          x: M + PAD + indent,
          w: innerW - indent,
          bold: false,
          justify: i < parts.length - 1,
          before: num && i === 0 ? -lh : i === 0 ? before : 0,
        });
      });
    });
    return { lines: out, lh };
  };
  const heightOf = (L: { lines: RLine[]; lh: number }) => L.lines.reduce((h, r) => h + L.lh + r.before, 0) + 2 * PAD;
  const MIN_BOX = 40;

  const drawBox = (L: { lines: RLine[]; lh: number }, from: number, to: number, boxH: number) => {
    const top = y;
    doc.rect(M, top, W, boxH);
    let cy = top + PAD;
    for (let i = from; i < to; i++) {
      const r = L.lines[i];
      cy += r.before;
      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      doc.setFontSize(size_);
      doc.setTextColor(0);
      doc.text(r.text, r.x, cy + L.lh * 0.75, r.justify ? { align: "justify", maxWidth: r.w } : undefined);
      cy += L.lh;
    }
    y = top + boxH;
  };

  // Elige la letra más grande (10 → 8) con la que todo el informe + firmas cabe en la hoja 1.
  let size_ = 9;
  let chosen: { lines: RLine[]; lh: number } | null = null;
  for (const sz of [10, 9.5, 9, 8.5, 8]) {
    const L = layout(sz);
    if (Math.max(heightOf(L), MIN_BOX) + signH + 2 <= pageBottom - y) {
      size_ = sz;
      chosen = L;
      break;
    }
  }

  if (chosen) {
    drawBox(chosen, 0, chosen.lines.length, Math.max(heightOf(chosen), Math.min(MIN_BOX + 14, pageBottom - y - signH - 2 - 0.01)));
    y += 2;
  } else {
    // Texto muy largo: letra 9 y continúa en hojas siguientes; firmas y cancha después del final del informe.
    size_ = 9;
    const L = layout(9);
    let i = 0;
    let first = true;
    while (i < L.lines.length) {
      if (!first) {
        doc.addPage();
        y = 15;
        bar("INFORME REFEREE (continuación):", y);
        y += 5.5;
      }
      const room = pageBottom - y - PAD * 2 - (first ? 0 : signH + 2);
      let h = 0;
      let j = i;
      while (j < L.lines.length && h + L.lh + L.lines[j].before <= room) {
        h += L.lh + L.lines[j].before;
        j++;
      }
      if (j === i) j = i + 1;
      drawBox(L, i, j, h + 2 * PAD);
      i = j;
      first = false;
    }
    y += 2;
    if (pageBottom - y < signH) {
      doc.addPage();
      y = 15;
    }
  }

  // ── Firmas ──
  doc.setFillColor(...GREY);
  doc.rect(M, y, W, 5.5, "F");
  text("FIRMA REFEREE #1:", M + 1, y + 2.75, { size: 8.5, bold: true });
  text("FIRMA REFEREE #2:", M + 128, y + 2.75, { size: 8.5, bold: true });
  y += 5.5;
  cell(M, y, W, 11);
  doc.line(M + W / 2, y, M + W / 2, y + 11);
  y += 11 + 3;

  // ── Cancha (si hay espacio) ──
  const avail = pageBottom - y;
  if (avail > 30) {
    let h = Math.min(avail, fieldH + 6);
    let w = h * CANCHA_RATIO;
    if (w > W - 10) {
      w = W - 10;
      h = w / CANCHA_RATIO;
    }
    doc.addImage(CANCHA, "JPEG", M + (W - w) / 2, y, w, h);
  }

  return doc;
}
