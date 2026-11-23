import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export function stringifyCsv(rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n")}`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inQuotes) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (inQuotes) throw new Error("File CSV memiliki tanda kutip yang tidak lengkap.");
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export async function shareCsvFile(
  fileName: string,
  contents: string,
  title: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Fitur berbagi tidak tersedia di perangkat ini.");
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(contents);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: title,
    UTI: "public.comma-separated-values-text",
  });
}
