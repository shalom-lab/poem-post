#!/usr/bin/env node
/**
 * 无头导出诗卡 PNG
 *
 * 用法：
 *   node scripts/render.mjs --template mist-card --title 敕勒歌 --author 北朝乐府 --body "..." --out out.png
 *   node scripts/render.mjs --json poem.json --out out.png
 *   npm run render -- --template mist-card --out artifacts/demo.png
 *
 * 依赖系统 Chrome / Chromium（或设 PUPPETEER_EXECUTABLE_PATH）。
 * GitHub Pages 仍走浏览器「下载 PNG」；本脚本供本地 / CI。
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') continue;
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function usage() {
  console.log(`诗帖无头导出

用法:
  node scripts/render.mjs [选项]

选项:
  --template, --templateId   模板 id（如 mist-card）
  --title --author --body --meaning --watermark --date
  --ratio                    3/4 | 3/5（默认 3/4）
  --json <file>              从 JSON 文件读 payload（与 CLI 字段合并，CLI 优先）
  --out <file>               输出 PNG 路径（默认 out/poem.png）
  --scale <n>                截图像素倍率（默认 2）
  --port <n>                 临时静态服端口（默认 0=随机）
  --chrome <path>            Chrome 可执行文件
  --help                     显示帮助

示例:
  node scripts/render.mjs --template mist-card \\
    --title 敕勒歌 --author 北朝乐府 \\
    --body $'敕勒川，阴山下。\\n天似穹庐，笼盖四野。\\n天苍苍，野茫茫，\\n风吹草低见牛羊。' \\
    --out artifacts/headless-demo.png
`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function startStaticServer(root, port = 0) {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.normalize(path.join(root, urlPath));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function findChrome(cliPath) {
  const candidates = [
    cliPath,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    process.exit(0);
  }

  let payload = {};
  if (args.json) {
    const jsonPath = path.resolve(process.cwd(), args.json);
    payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  const pick = (k, aliases = []) => {
    for (const key of [k, ...aliases]) {
      if (args[key] !== undefined && args[key] !== true) return args[key];
    }
    return undefined;
  };

  const merge = {
    ...payload,
    template: pick('template', ['templateId']) ?? payload.template ?? payload.templateId,
    title: pick('title') ?? payload.title,
    author: pick('author') ?? payload.author,
    body: pick('body') ?? payload.body,
    meaning: pick('meaning') ?? payload.meaning,
    watermark: pick('watermark') ?? payload.watermark,
    date: pick('date') ?? payload.date,
    ratio: pick('ratio') ?? payload.ratio,
    font: pick('font') ?? payload.font,
    align: pick('align') ?? payload.align,
    bodyScale: pick('bodyScale') ?? payload.bodyScale,
    titleScale: pick('titleScale') ?? payload.titleScale,
    meaningScale: pick('meaningScale') ?? payload.meaningScale,
    offsetY: pick('offsetY') ?? payload.offsetY,
    padY: pick('padY') ?? payload.padY
  };
  // 去掉 undefined，避免覆盖
  Object.keys(merge).forEach((k) => merge[k] === undefined && delete merge[k]);

  const outFile = path.resolve(process.cwd(), pick('out') || 'out/poem.png');
  const scale = Number(pick('scale') || 2);
  const listenPort = Number(pick('port') || 0);

  let puppeteer;
  try {
    puppeteer = (await import('puppeteer-core')).default;
  } catch (err) {
    console.error('未安装 puppeteer-core。请先在仓库根目录执行：npm install');
    process.exit(1);
  }

  const chrome = findChrome(pick('chrome'));
  if (!chrome) {
    console.error(
      '未找到 Chrome / Chromium。请安装浏览器，或设置环境变量 PUPPETEER_EXECUTABLE_PATH。'
    );
    process.exit(1);
  }

  const { server, port } = await startStaticServer(ROOT, listenPort);
  const url = `http://127.0.0.1:${port}/index.html`;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=none',
        '--hide-scrollbars'
      ]
    });
    const page = await browser.newPage();
    // 预览卡约 390px 宽；放大 viewport 便于高清截图
    await page.setViewport({
      width: 900,
      height: 1400,
      deviceScaleFactor: scale
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(
      () => window.PoemPost && window.PoemPost.ready,
      { timeout: 30000 }
    );

    if (Object.keys(merge).length) {
      await page.evaluate(async (p) => {
        await window.PoemPost.apply(p);
      }, merge);
    } else {
      await page.evaluate(async () => {
        await window.PoemPost.waitFonts();
      });
    }

    // 再等一拍：CDN 字体 / 背景图
    await page.evaluate(async () => {
      await window.PoemPost.waitFonts();
      const card = document.querySelector('#poem-card');
      const imgs = [...(card?.querySelectorAll('img') || [])];
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? null
            : new Promise((r) => {
                img.addEventListener('load', r, { once: true });
                img.addEventListener('error', r, { once: true });
              })
        )
      );
    });
    await new Promise((r) => setTimeout(r, 400));

    const card = await page.$('#poem-card');
    if (!card) throw new Error('#poem-card 未找到');

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    await card.screenshot({ path: outFile, type: 'png', omitBackground: false });

    const st = await page.evaluate(() => window.PoemPost.getState());
    console.log(`OK  ${outFile}`);
    console.log(`    template=${st.templateId}  title=${st.title || '(无)'}  scale=${scale}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise((r) => server.close(r));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
