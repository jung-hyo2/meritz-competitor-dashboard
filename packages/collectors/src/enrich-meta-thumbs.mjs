// Meta thumbnail downloader
// Facebook CDN URLs expire after ~2 weeks.
// This script downloads them locally to public/thumbs/{external_id}.jpg
// and updates the DB so the dashboard shows permanent local images.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import https from 'node:https';
import http from 'node:http';
import { openDb } from '@mcd/db';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const THUMBS_DIR = path.join(ROOT, 'packages/dashboard/public/thumbs');
fs.mkdirSync(THUMBS_DIR, { recursive: true });

const CONCURRENCY = parseInt(process.env.ENRICH_CONCURRENCY ?? '6', 10);
const forceArg = process.argv.includes('--force');

const db = openDb();

const rows = db.prepare(`
  SELECT id, external_id, thumbnail_url
  FROM ad
  WHERE channel = 'meta'
    AND thumbnail_url IS NOT NULL
    AND thumbnail_url != ''
    ${forceArg ? '' : "AND thumbnail_url NOT LIKE '/thumbs/%'"}
`).all();

console.log(`Meta ?몃꽕???ㅼ슫濡쒕뱶 ??? ${rows.length}嫄?);

function download(srcUrl, destPath) {
  return new Promise((resolve, reject) => {
    const proto = srcUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(srcUrl, { timeout: 20000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(destPath, () => {});
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (e) => {
      fs.unlink(destPath, () => {});
      reject(e);
    });
  });
}

const updateThumb = db.prepare(`UPDATE ad SET thumbnail_url = ? WHERE id = ?`);

let done = 0, failed = 0;

async function processChunk(chunk) {
  await Promise.all(chunk.map(async (row) => {
    const ext = row.thumbnail_url.includes('.png') ? 'png' : 'jpg';
    const destName = `${row.external_id}.${ext}`;
    const destPath = path.join(THUMBS_DIR, destName);
    try {
      await download(row.thumbnail_url, destPath);
      updateThumb.run(`/thumbs/${destName}`, row.id);
      done++;
      process.stdout.write(`\r?꾨즺: ${done}  ?ㅽ뙣: ${failed}  ?⑥?: ${rows.length - done - failed}`);
    } catch (e) {
      failed++;
      process.stdout.write(`\r?꾨즺: ${done}  ?ㅽ뙣: ${failed}  ?⑥?: ${rows.length - done - failed}`);
    }
  }));
}

for (let i = 0; i < rows.length; i += CONCURRENCY) {
  await processChunk(rows.slice(i, i + CONCURRENCY));
}

console.log(`\n\n=== Meta ?몃꽕???ㅼ슫濡쒕뱶 ?꾨즺 ===`);
console.log(`?깃났: ${done}  ?ㅽ뙣: ${failed}`);
db.close();

