// Wrapper mínimo sobre exceljs para la sección de Datos (/admin/data): armar y
// descargar un workbook, y leer un .xlsx subido a filas planas. La librería se
// importa dinámicamente para que solo pese en esa ruta.

export type SheetData = {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  // Hojas de texto libre (p.ej. "Leeme"): matriz de celdas en vez de rows/headers.
  aoa?: unknown[][];
};

// Fila leída de una hoja: {header: valor} + el número REAL de fila en Excel,
// para que los errores de import referencien la fila que ve la persona.
export type ParsedRow = Record<string, unknown> & { __row: number };

// Excel limita los nombres de hoja a 31 caracteres.
const sheetName = (name: string) => name.slice(0, 31);

async function getExcelJS() {
  const mod = await import("exceljs");
  return (mod.default ?? mod) as typeof import("exceljs");
}

export async function downloadWorkbook(filename: string, sheets: SheetData[]) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheetName(sheet.name));
    if (sheet.aoa) {
      for (const row of sheet.aoa) ws.addRow(row);
      continue;
    }
    const header = ws.addRow(sheet.headers);
    header.font = { bold: true };
    for (const row of sheet.rows) {
      ws.addRow(sheet.headers.map((h) => row[h] ?? null));
    }
    ws.columns.forEach((col, i) => {
      col.width = Math.max(12, (sheet.headers[i]?.length ?? 0) + 4);
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Aplana los valores de celda de exceljs (richText, hyperlink, fórmula) a
// primitivos; celdas vacías quedan como null.
function cellValue(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("result" in v) return cellValue(v.result);
    if ("text" in v) return cellValue(v.text);
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((r) => (r as { text?: string }).text ?? "").join("");
    }
    if ("error" in v) return null;
    return null;
  }
  return value;
}

export async function readWorkbookFile(
  file: File
): Promise<Record<string, ParsedRow[]>> {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const sheets: Record<string, ParsedRow[]> = {};
  wb.eachSheet((ws) => {
    const headers: (string | null)[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      const text = String(cellValue(cell.value) ?? "").trim();
      headers[col] = text || null;
    });

    const rows: ParsedRow[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: ParsedRow = { __row: rowNumber };
      let hasValue = false;
      headers.forEach((header, col) => {
        if (!header) return;
        const value = cellValue(row.getCell(col).value);
        if (value !== null && String(value).trim() !== "") hasValue = true;
        obj[header] = value;
      });
      if (hasValue) rows.push(obj);
    });
    sheets[ws.name] = rows;
  });
  return sheets;
}
