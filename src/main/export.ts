import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun
} from 'docx'
import { sectionTitles, atsSections, contactParts, displayResume, formatMonth, formatRange, fullName, documentFileName, resumeToText, stripProtocol } from '../shared/format'
import { placeDate } from '../shared/letter'
import type { CoverLetter, ExportFormat, ExportResult, Resume } from '../shared/types'

// ---------- Tâches d'impression (fenêtre cachée qui rend le CV puis génère le PDF) ----------

type PrintJob = { kind: 'resume'; resume: Resume } | { kind: 'letter'; letter: CoverLetter; resume?: Resume }
const jobs = new Map<string, PrintJob>()
const ready = new Map<string, () => void>()

export function getPrintJob(token: string) {
  return jobs.get(token) ?? null
}
export function markReady(token: string) {
  ready.get(token)?.()
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 80) || 'CV'
}

async function renderPdf(job: PrintJob, loadUrl: (win: BrowserWindow, hash: string) => Promise<void>): Promise<Buffer> {
  const token = Math.random().toString(36).slice(2)
  jobs.set(token, job)
  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true }
  })
  try {
    const isReady = new Promise<void>((resolve, reject) => {
      ready.set(token, resolve)
      setTimeout(() => reject(new Error("Le rendu du document a expiré.")), 20000)
    })
    await loadUrl(win, `/print/${token}`)
    await isReady
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      // PDF balisé : structure de titres/paragraphes lisible par les ATS et les lecteurs d'écran.
      generateTaggedPDF: true,
      generateDocumentOutline: true
    })
  } finally {
    jobs.delete(token)
    ready.delete(token)
    win.destroy()
  }
}

export async function exportResume(
  parent: BrowserWindow,
  resume: Resume,
  format: ExportFormat,
  loadUrl: (win: BrowserWindow, hash: string) => Promise<void>
): Promise<ExportResult> {
  const base = safeName(documentFileName(resume.basics.firstName, resume.basics.lastName, 'CV', resume.title))
  const filters = {
    pdf: [{ name: 'PDF', extensions: ['pdf'] }],
    docx: [{ name: 'Document Word', extensions: ['docx'] }],
    txt: [{ name: 'Texte brut', extensions: ['txt'] }]
  }[format]
  const { canceled, filePath } = await dialog.showSaveDialog(parent, { defaultPath: `${base}.${format}`, filters })
  if (canceled || !filePath) return { ok: false, canceled: true }
  try {
    if (format === 'pdf') writeFileSync(filePath, await renderPdf({ kind: 'resume', resume }, loadUrl))
    else if (format === 'docx') writeFileSync(filePath, await resumeToDocx(displayResume(resume)))
    else writeFileSync(filePath, '﻿' + resumeToText(displayResume(resume)), 'utf8')
    return { ok: true, path: filePath }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function exportLetter(
  parent: BrowserWindow,
  letter: CoverLetter,
  resume: Resume | undefined,
  format: 'docx' | 'txt' | 'pdf',
  loadUrl: (win: BrowserWindow, hash: string) => Promise<void>
): Promise<ExportResult> {
  const base = safeName(documentFileName(resume?.basics.firstName ?? '', resume?.basics.lastName ?? '', 'Lettre', letter.title))
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: `${base}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  })
  if (canceled || !filePath) return { ok: false, canceled: true }
  try {
    if (format === 'pdf') writeFileSync(filePath, await renderPdf({ kind: 'letter', letter, resume }, loadUrl))
    else if (format === 'txt') writeFileSync(filePath, '﻿' + letterText(letter, resume), 'utf8')
    else writeFileSync(filePath, await letterToDocx(letter, resume))
    return { ok: true, path: filePath }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- DOCX : une colonne, styles natifs Word (Titre 1/2), police standard ----------

const FONT = 'Calibri'

function hex(accent: string) {
  return accent.replace('#', '').toUpperCase()
}

async function resumeToDocx(r: Resume): Promise<Buffer> {
  const t = sectionTitles(r)
  const accent = hex(r.accent)
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      heading: 'Title',
      spacing: { after: 40 },
      children: [new TextRun({ text: fullName(r), bold: true, size: 40, font: FONT, color: '111111' })]
    })
  )
  if (r.basics.headline)
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: r.basics.headline, size: 24, font: FONT, color: accent })] }))
  const contact = contactParts(r)
  if (contact.length)
    children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: contact.join('  |  '), size: 19, font: FONT, color: '444444' })] }))

  const heading = (text: string) =>
    new Paragraph({
      heading: 'Heading1',
      spacing: { before: 220, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 2 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: FONT, color: '111111', characterSpacing: 20 })]
    })
  const line = (left: string, right: string, bold = true) =>
    new Paragraph({
      heading: bold ? 'Heading2' : undefined,
      spacing: { before: 100, after: 20 },
      tabStops: [{ type: TabStopType.RIGHT, position: 10200 }],
      children: [
        new TextRun({ text: left, bold, size: 21, font: FONT, color: '111111' }),
        ...(right ? [new TextRun({ text: `\t${right}`, size: 19, font: FONT, color: '555555' })] : [])
      ]
    })
  const body = (text: string) => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text, size: 20, font: FONT, color: '222222' })] })
  const bullet = (text: string) =>
    new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text, size: 20, font: FONT, color: '222222' })] })

  for (const k of atsSections(r)) {
    children.push(heading(t[k]))
    switch (k) {
      case 'summary':
        children.push(body(r.basics.summary.trim()))
        break
      case 'experience':
        for (const e of r.experiences) {
          children.push(line(`${e.role}${e.company ? ' · ' + e.company : ''}`, formatRange(e.start, e.end, e.current, r.lang)))
          if (e.location) children.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: e.location, italics: true, size: 19, font: FONT, color: '555555' })] }))
          for (const b of e.bullets.filter((x) => x.trim())) children.push(bullet(b.trim()))
        }
        break
      case 'education':
        for (const e of r.education) {
          children.push(line(`${e.degree}${e.school ? ' · ' + e.school : ''}`, formatRange(e.start, e.end, false, r.lang)))
          if (e.details.trim()) children.push(body(e.details.trim()))
        }
        break
      case 'skills':
        for (const g of r.skills.filter((g) => g.items.length))
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                ...(g.name ? [new TextRun({ text: `${g.name} : `, bold: true, size: 20, font: FONT })] : []),
                new TextRun({ text: g.items.join(', '), size: 20, font: FONT, color: '222222' })
              ]
            })
          )
        break
      case 'projects':
        for (const p of r.projects)
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: p.name, bold: true, size: 20, font: FONT }),
                ...(p.link ? [new TextRun({ text: ` (${stripProtocol(p.link)})`, size: 19, font: FONT, color: '555555' })] : []),
                ...(p.description ? [new TextRun({ text: ` : ${p.description}`, size: 20, font: FONT, color: '222222' })] : [])
              ]
            })
          )
        break
      case 'certifications':
        for (const c of r.certifications) children.push(body([c.name, c.issuer, formatMonth(c.date)].filter(Boolean).join(' · ')))
        break
      case 'languages':
        children.push(body(r.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', ')))
        break
      case 'interests':
        children.push(body(r.interests.trim()))
        break
      case 'gallery':
        children.push(body((r.gallery ?? []).map((g) => g.caption.trim()).filter(Boolean).join(' · ')))
        break
    }
  }

  const doc = new Document({
    creator: fullName(r),
    title: `CV · ${fullName(r)}`,
    description: r.basics.headline,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }]
        }
      ]
    },
    sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 900, right: 900 } } }, children }]
  })
  return Packer.toBuffer(doc)
}

async function letterToDocx(letter: CoverLetter, resume?: Resume): Promise<Buffer> {
  const children: Paragraph[] = []
  if (resume) {
    children.push(new Paragraph({ children: [new TextRun({ text: fullName(resume), bold: true, size: 26, font: FONT })] }))
    const c = contactParts(resume)
    if (c.length) children.push(new Paragraph({ spacing: { after: 320 }, children: [new TextRun({ text: c.join('  |  '), size: 19, font: FONT, color: '555555' })] }))
  }
  // En-tête : destinataire (moitié droite), lieu et date (à droite), objet (gras).
  const recipient = letter.recipient?.trim()
  if (recipient) {
    const lines = recipient.split('\n')
    children.push(
      new Paragraph({
        indent: { left: 5000 },
        spacing: { after: 280 },
        children: lines.map((t, i) => new TextRun({ text: t, size: 22, font: FONT, break: i ? 1 : 0 }))
      })
    )
  }
  const lang = letter.options?.lang ?? 'fr'
  if (letter.place || letter.date) children.push(new Paragraph({ alignment: 'right', spacing: { after: 280 }, children: [new TextRun({ text: placeDate(letter.place ?? '', letter.date ?? '', lang), size: 22, font: FONT })] }))
  if (letter.subject?.trim())
    children.push(new Paragraph({ spacing: { after: 280 }, children: [new TextRun({ text: `${lang === 'en' ? 'Subject: ' : 'Objet : '}${letter.subject.trim()}`, bold: true, size: 22, font: FONT })] }))
  for (const para of letter.body.split(/\n\s*\n/)) {
    children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: para.replace(/\n/g, ' ').trim(), size: 22, font: FONT })] }))
  }
  const doc = new Document({
    creator: resume ? fullName(resume) : 'CV GEN',
    title: letter.title,
    sections: [{ properties: { page: { margin: { top: 1130, bottom: 1130, left: 1130, right: 1130 } } }, children }]
  })
  return Packer.toBuffer(doc)
}

/** Lettre complète en texte brut : expéditeur, destinataire, lieu et date, objet, corps. */
function letterText(letter: CoverLetter, resume?: Resume): string {
  const lang = letter.options?.lang ?? 'fr'
  const parts = [
    resume ? [fullName(resume), ...contactParts(resume)].join('\n') : '',
    letter.recipient?.trim() ?? '',
    letter.place || letter.date ? placeDate(letter.place ?? '', letter.date ?? '', lang) : '',
    letter.subject?.trim() ? `${lang === 'en' ? 'Subject: ' : 'Objet : '}${letter.subject.trim()}` : '',
    letter.body.trim()
  ]
  return parts.filter(Boolean).join('\n\n') + '\n'
}
