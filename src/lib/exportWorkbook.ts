// Genera el Excel de exportación con el mismo estilo del reporte de Fedepatín:
// cuadrícula oculta, encabezado azul, filas alternadas, color por categoría y por estado.
import ExcelJS from "exceljs";

const NAVY = "0A3D7C";
const LIGHT = "EEF2FA";
const LINE = "C9D1E0";
const HEAD_FONT = "Georgia";
const BODY_FONT = "Calibri";

// Un color distinto por categoría (se asigna por orden alfabético, igual en todas las hojas).
const CAT_PALETTE = [
  "1565C0", "2E7D32", "EF6C00", "7B1FA2", "C62828",
  "00838F", "6D4C41", "AD1457", "455A64", "9E9D24", "283593",
];

export const STATUS_COLORS: Record<string, string> = {
  Jugado: "2E7D32",
  "En juego": "F9A825",
  Programado: "1565C0",
  Aplazado: "C62828",
  "Por definir": "7B1FA2",
};

export interface ExportColumn {
  header: string;
  key: string;
  /** "center" para números y textos cortos; por defecto alineado a la izquierda */
  align?: "left" | "center";
  width?: number;
  bold?: boolean;
}

export interface ExportSheetSpec {
  /** Nombre de la pestaña (máx. 31 caracteres) */
  name: string;
  title: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  /** Columna que lleva el nombre de la categoría (se pinta con su color) */
  categoryKey?: string;
  /** Columna con el estado del partido (pinta el texto de toda la fila) */
  statusKey?: string;
  legend?: boolean;
}

export interface ExportMeta {
  tournamentName: string;
  exportedAtLabel: string;
  categoryNames: string[];
}

const thin = { style: "thin" as const, color: { argb: "FF" + LINE } };
const border = { left: thin, right: thin, top: thin, bottom: thin };

export async function buildWorkbook(specs: ExportSheetSpec[], meta: ExportMeta): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Fedepatín · Hockey en Línea";
  wb.created = new Date();

  const catColor = new Map<string, string>();
  [...new Set(meta.categoryNames)].sort((a, b) => a.localeCompare(b, "es")).forEach((n, i) => {
    catColor.set(n, CAT_PALETTE[i % CAT_PALETTE.length]);
  });
  const colorOfCategory = (n: string) => {
    if (!catColor.has(n)) catColor.set(n, CAT_PALETTE[catColor.size % CAT_PALETTE.length]);
    return catColor.get(n)!;
  };

  for (const spec of specs) {
    const ws = wb.addWorksheet(spec.name.slice(0, 31), {
      properties: { tabColor: { argb: "FF" + NAVY } },
      views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
    });
    const ncols = spec.columns.length;

    // Título y subtítulo
    ws.getCell("A1").value = `${spec.title} — ${meta.tournamentName}`;
    ws.getCell("A1").font = { name: HEAD_FONT, size: 16, bold: true, color: { argb: "FF" + NAVY } };
    ws.getRow(1).height = 26;
    ws.getCell("A2").value = `${spec.rows.length} registros · Exportado el ${meta.exportedAtLabel} (hora Bogotá)`;
    ws.getCell("A2").font = { name: BODY_FONT, size: 10, italic: true, color: { argb: "FF555555" } };

    // Leyenda de estados (solo hoja de partidos)
    if (spec.legend) {
      ws.getCell("A3").value = "Leyenda:";
      ws.getCell("A3").font = { name: BODY_FONT, size: 10, bold: true };
      Object.entries(STATUS_COLORS).forEach(([label, color], i) => {
        const c = ws.getCell(3, 2 + i);
        c.value = "● " + label;
        c.font = { name: BODY_FONT, size: 10, bold: true, color: { argb: "FF" + color } };
      });
    }

    // Encabezado
    const HR = 4;
    const head = ws.getRow(HR);
    head.height = 22;
    spec.columns.forEach((col, i) => {
      const c = head.getCell(i + 1);
      c.value = col.header;
      c.font = { name: HEAD_FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + NAVY } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = border;
    });

    // Filas
    const widths = spec.columns.map((c) => Math.max(c.header.length + 3, c.width ?? 0));
    let prevCat: string | null = null;
    spec.rows.forEach((row, idx) => {
      const r = ws.getRow(HR + 1 + idx);
      const catName = spec.categoryKey ? String(row[spec.categoryKey] ?? "") : "";
      const statusColor = spec.statusKey ? STATUS_COLORS[String(row[spec.statusKey] ?? "")] : undefined;
      const newCat = !!spec.categoryKey && prevCat !== null && prevCat !== catName;
      prevCat = catName;

      spec.columns.forEach((col, i) => {
        const v = row[col.key];
        const c = r.getCell(i + 1);
        c.value = v === undefined || v === null || v === "" ? null : v;
        const isCat = col.key === spec.categoryKey && catName;
        c.border = newCat && !spec.statusKey ? { ...border, top: { style: "medium", color: { argb: "FF" + NAVY } } } : border;
        c.alignment = {
          horizontal: isCat ? "center" : col.align ?? "left",
          vertical: "middle",
        };
        if (isCat) {
          c.font = { name: BODY_FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + colorOfCategory(catName) } };
        } else {
          c.font = {
            name: BODY_FONT,
            size: 10,
            bold: !!col.bold || (!!statusColor && col.key === spec.statusKey),
            color: statusColor ? { argb: "FF" + statusColor } : undefined,
          };
          if (idx % 2 === 0) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + LIGHT } };
        }
        const len = v == null ? 0 : String(v).length;
        if (len + 2 > widths[i]) widths[i] = len + 2;
      });
    });

    if (spec.rows.length === 0) {
      const c = ws.getCell(HR + 1, 1);
      c.value = "Sin datos para esta edición";
      c.font = { name: BODY_FONT, size: 10, italic: true, color: { argb: "FF777777" } };
    }

    spec.columns.forEach((_, i) => {
      ws.getColumn(i + 1).width = Math.min(Math.max(widths[i], 8), 42);
    });
    ws.autoFilter = { from: { row: HR, column: 1 }, to: { row: HR, column: ncols } };
  }

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
