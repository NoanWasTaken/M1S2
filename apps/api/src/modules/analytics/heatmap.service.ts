import { EventModel } from '../../models/event.js';
import { buildHeatmapPipeline } from './analytics.engine.js';
import { normalizeUrl } from '../../utils/normalize-url.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';

const SCREENSHOTS_DIR = path.resolve('screenshots');
const TTL_MS = 60 * 60 * 1000;
const MAX_FILES = 50;

function cacheKey(appId: string, url: string): string {
  return createHash('md5').update(`${appId}:${url}`).digest('hex');
}

function cachePath(key: string): string {
  return path.join(SCREENSHOTS_DIR, `${key}.webp`);
}

function cacheCount(): number {
  if (!fs.existsSync(SCREENSHOTS_DIR)) return 0;
  return fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.webp')).length;
}

function cachePrune(): void {
  const files = fs
    .readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(SCREENSHOTS_DIR, f)).mtimeMs }))
    .sort((a, b) => a.time - b.time);
  while (files.length >= MAX_FILES) {
    const oldest = files.shift()!;
    fs.unlinkSync(path.join(SCREENSHOTS_DIR, oldest.name));
  }
}

export class HeatmapService {
  async getScreenshot(appId: string, url: string): Promise<Buffer> {
    const key = cacheKey(appId, url);
    const cpath = cachePath(key);

    if (fs.existsSync(cpath)) {
      const stat = fs.statSync(cpath);
      if (Date.now() - stat.mtimeMs < TTL_MS) {
        return Buffer.from(fs.readFileSync(cpath));
      }
    }

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      const buf = Buffer.from(await page.screenshot({ type: 'webp', quality: 80 }));

      if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
      }
      fs.writeFileSync(cpath, buf);
      if (cacheCount() > MAX_FILES) cachePrune();

      return buf;
    } finally {
      await browser.close();
    }
  }

  async getClickData(
    appId: string,
    url: string,
    start: string,
    end: string,
  ): Promise<{
    points: { x: number; y: number; count: number }[];
    totalClicks: number;
    pageWidth: number;
    pageHeight: number;
  }> {
    const pipeline = buildHeatmapPipeline({
      type: 'heatmap',
      appId,
      metric: 'event_count',
      filters: [],
      period: { start: new Date(start), end: new Date(end) },
      mode: 'count',
      pageUrl: normalizeUrl(url),
    });
    const result = await EventModel.aggregate(pipeline);
    return result[0] || { points: [], totalClicks: 0, pageWidth: 0, pageHeight: 0 };
  }
}
