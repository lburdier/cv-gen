import { dialog, type BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import JSZip from 'jszip'
import type { ExportResult, TableExport } from '../shared/types'

/**
 * Export d'un tableau (suivi des candidatures) en Excel (.xlsx) ou CSV.
 * Le .xlsx est écrit à la main (SpreadsheetML) : en-tête en gras, ligne figée, filtres, largeurs de colonnes.
 * Le CSV suit l'usage d'Excel en français : séparateur « ; », UTF-8 avec BOM (accents conservés).
 */

const xml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caractères de contrôle interdits en XML (sauf tabulation et retours à la ligne).
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

/** Nom de colonne Excel : 0 → A, 26 → AA. */
function colName(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Une cellule qui commence par = + - @ serait interprétée comme une formule : on la neutralise. */
const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v)

export function toCsv(t: TableExport): string {
  const cell = (v: string) => {
    const s = safe(v ?? '')
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [t.headers, ...t.rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
}

export async function toXlsx(t: TableExport): Promise<Buffer> {
  const all = [t.headers, ...t.rows]
  // Largeur de colonne : la plus longue ligne de texte, entre 10 et 60 caractères.
  const longest = (c: number) => Math.max(0, ...all.map((r) => Math.max(...String(r[c] ?? '').split('\n').map((l) => l.length))))
  const widths = t.headers.map((_, c) => Math.min(60, Math.max(10, longest(c) + 2)))
  const last = `${colName(t.headers.length - 1)}${all.length}`
  const rowXml = (r: string[], i: number) =>
    `<row r="${i + 1}">${r
      .map((v, c) => {
        const ref = `${colName(c)}${i + 1}`
        const style = i === 0 ? ' s="1"' : /\n/.test(v ?? '') ? ' s="2"' : ''
        const val = v ?? ''
        // Nombres purs (scores) en vraies valeurs numériques.
        if (i > 0 && /^\d+(?:[.,]\d+)?$/.test(val) && val.length < 12) return `<c r="${ref}"${style}><v>${val.replace(',', '.')}</v></c>`
        return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(safe(val))}</t></is></c>`
      })
      .join('')}</row>`

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${all.map(rowXml).join('')}</sheetData>
<autoFilter ref="A1:${last}"/>
</worksheet>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B0B0C"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

  const zip = new JSZip()
  // Pas d'entrées « dossier » dans l'archive : le format OOXML n'en a pas besoin.
  const add = (name: string, data: string) => zip.file(name, data, { createFolders: false })
  add(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
  )
  add(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  )
  add(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xml(t.sheet.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${xml(t.sheet.slice(0, 31))}'!$A$1:$${colName(t.headers.length - 1)}$${all.length}</definedName></definedNames>
</workbook>`
  )
  add(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  )
  add('xl/worksheets/sheet1.xml', sheet)
  add('xl/styles.xml', styles)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export async function exportTable(parent: BrowserWindow, t: TableExport, format: 'xlsx' | 'csv'): Promise<ExportResult> {
  const filters = format === 'xlsx' ? [{ name: 'Classeur Excel', extensions: ['xlsx'] }] : [{ name: 'CSV (Excel, séparateur point-virgule)', extensions: ['csv'] }]
  const { canceled, filePath } = await dialog.showSaveDialog(parent, { defaultPath: `${t.fileName}.${format}`, filters })
  if (canceled || !filePath) return { ok: false, canceled: true }
  try {
    writeFileSync(filePath, format === 'xlsx' ? await toXlsx(t) : toCsv(t), format === 'csv' ? 'utf8' : undefined)
    return { ok: true, path: filePath }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
