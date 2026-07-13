import { createRequire } from 'module';
import type { Response } from 'express';
import { getPagesData, getEventsData } from './analytics.service.js';
import { ApplicationModel } from '../../models/application.js';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function toCsv(headers: string[], rows: string[][]): string {
    const escape = (v: string) =>
        v.includes(',') || v.includes('"') || v.includes('\n')
            ? `"${v.replace(/"/g, '""')}"` : v;
    const line = (cols: string[]) => cols.map(escape).join(',');
    return '\uFEFF' + [line(headers), ...rows.map(line)].join('\r\n');
}

function setCsvHeaders(res: Response, filename: string): void {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
}

function setPdfHeaders(res: Response, filename: string): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
}

async function resolveSiteName(companyId: string, appId?: string): Promise<string> {
    const app = appId
        ? await ApplicationModel.findOne({ appId }).select('name').lean()
        : await ApplicationModel.findOne({ companyId }).select('name').lean();
    return app?.name ?? (appId ?? 'Site inconnu');
}

function tableHeader(doc: InstanceType<typeof PDFDocument>, colW: number[], colH: string[], x0: number): number {
    const tw = colW.reduce((a, b) => a + b, 0);
    const y  = doc.y;
    doc.rect(x0, y, tw, 16).fill('#1e293b');
    let x = x0;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    colH.forEach((h, i) => {
        doc.text(h, x + 4, y + 5, { width: colW[i] - 8, lineBreak: false });
        x += colW[i];
    });
    return y + 16;
}

function tableRow(doc: InstanceType<typeof PDFDocument>, colW: number[], cells: string[], x0: number, y: number, even: boolean): number {
    const tw = colW.reduce((a, b) => a + b, 0);
    doc.rect(x0, y, tw, 14).fill(even ? '#f1f5f9' : '#ffffff');
    let x = x0;
    doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b');
    cells.forEach((c, i) => {
        doc.text(c, x + 4, y + 3, { width: colW[i] - 8, lineBreak: false });
        x += colW[i];
    });
    return y + 14;
}

export async function exportPagesCsv(res: Response, companyId: string, period: string, appId?: string): Promise<void> {
    const { pages, totals } = await getPagesData(companyId, period, appId);
    const headers = ['URL', 'Vues', 'Visiteurs', 'Sessions', 'Clics', 'Survols', 'Durée moy. (s)', 'Engagement'];
    const rows: string[][] = pages.map((p) => [p.url, String(p.views), String(p.visitors), String(p.sessions), String(p.clicks), String(p.hovers), String(p.avgDuration), String(p.engagement)]);
    rows.push(['TOTAL', String(totals.views), String(totals.visitors), '', String(totals.clicks), '', String(totals.avgDuration), '']);
    setCsvHeaders(res, `pages-export-${todayStr()}.csv`);
    res.send(toCsv(headers, rows));
}

export async function exportPagesPdf(res: Response, companyId: string, period: string, appId?: string): Promise<void> {
    const [{ pages, totals }, siteName] = await Promise.all([
        getPagesData(companyId, period, appId),
        resolveSiteName(companyId, appId),
    ]);

    setPdfHeaders(res, `pages-export-${todayStr()}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.on('error', (err: Error) => { console.error('[PDF pages]', err); });
    doc.pipe(res);

    const m = doc.page.margins.left;

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Rapport Pages Analytics');
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`${siteName} · Période : ${period} · Généré le ${new Date().toLocaleDateString('fr-FR')}`);
    doc.moveDown(1.5);

    doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
        .text(`Vues : ${totals.views}`, { continued: true })
        .text(`   Visiteurs : ${totals.visitors}`, { continued: true })
        .text(`   Clics : ${totals.clicks}`, { continued: true })
        .text(`   Durée moy. : ${totals.avgDuration}s`);
    doc.moveDown(1.5);

    const colW = [195, 45, 58, 50, 45, 55];
    const colH = ['URL', 'Vues', 'Visiteurs', 'Sessions', 'Clics', 'Durée (s)'];
    const maxY = doc.page.height - doc.page.margins.bottom - 20;
    let y = tableHeader(doc, colW, colH, m);

    pages.slice(0, 60).forEach((page, idx) => {
        if (y + 14 > maxY) {
            doc.addPage();
            y = tableHeader(doc, colW, colH, m);
        }
        y = tableRow(doc, colW, [
            page.url.length > 32 ? page.url.slice(0, 30) + '…' : page.url,
            String(page.views), String(page.visitors), String(page.sessions),
            String(page.clicks), String(page.avgDuration),
        ], m, y, idx % 2 === 0);
    });

    doc.end();
}

export async function exportEventsCsv(res: Response, companyId: string, period: string, appId?: string): Promise<void> {
    const { types, total } = await getEventsData(companyId, period, appId);
    const headers = ['Type', 'Total', 'Navigateur', 'Serveur', 'Dernière occurrence'];
    const rows: string[][] = types.map((t) => [t.type, String(t.count), String(t.browser), String(t.server), new Date(t.lastSeen).toISOString()]);
    rows.push(['TOTAL', String(total), '', '', '']);
    setCsvHeaders(res, `events-export-${todayStr()}.csv`);
    res.send(toCsv(headers, rows));
}

export async function exportEventsPdf(res: Response, companyId: string, period: string, appId?: string): Promise<void> {
    const [{ types, total }, siteName] = await Promise.all([
        getEventsData(companyId, period, appId),
        resolveSiteName(companyId, appId),
    ]);

    setPdfHeaders(res, `events-export-${todayStr()}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.on('error', (err: Error) => { console.error('[PDF events]', err); });
    doc.pipe(res);

    const m = doc.page.margins.left;

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Rapport Événements Analytics');
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`${siteName} · Période : ${period} · Généré le ${new Date().toLocaleDateString('fr-FR')}`);
    doc.moveDown(1.5);

    doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
        .text(`Total événements : ${total}`, { continued: true })
        .text(`   Types distincts : ${types.length}`);
    doc.moveDown(1.5);

    const colW = [155, 62, 82, 62, 130];
    const colH = ['Type', 'Total', 'Navigateur', 'Serveur', 'Dernière occurrence'];
    const maxY = doc.page.height - doc.page.margins.bottom - 20;
    let y = tableHeader(doc, colW, colH, m);

    types.forEach((evt, idx) => {
        if (y + 14 > maxY) {
            doc.addPage();
            y = tableHeader(doc, colW, colH, m);
        }
        y = tableRow(doc, colW, [
            evt.type, String(evt.count), String(evt.browser), String(evt.server),
            new Date(evt.lastSeen).toLocaleString('fr-FR'),
        ], m, y, idx % 2 === 0);
    });

    doc.end();
}
