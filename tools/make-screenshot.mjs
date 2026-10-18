#!/usr/bin/env node
/**
 * 生成社区主题库用的 16:9 缩略图 screenshot.png。
 *
 * 用法：
 *   node tools/make-screenshot.mjs
 *
 * 前置：先跑 `node tools/extract-default-css.mjs` 生成 preview-default-theme.css，
 *       缩略图需要以官方 app.css 为底，才能真实反映默认主题的配色与字号。
 *
 * 做法：拼一个 512×288 的卡片页 → 用本机 Edge/Chrome 无头截图（2× 缩放，
 *       输出 1024×576）→ 存成 screenshot.png。采样内容刻意只保留
 *       强调 / 粗体 / 行内代码三行，缩到 512 宽仍能看清。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const defaultCss = path.join(root, "preview-default-theme.css");
const themeCss = path.join(root, "theme.css");
const out = path.join(root, "screenshot.png");

if (!fs.existsSync(defaultCss)) {
  console.error("缺少 preview-default-theme.css。先运行：node tools/extract-default-css.mjs");
  process.exit(1);
}
if (!fs.existsSync(themeCss)) {
  console.error("缺少 theme.css，请在仓库根目录运行。");
  process.exit(1);
}

const BROWSERS = [
  process.env.EDGE_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/microsoft-edge",
  "/usr/bin/google-chrome",
].filter(Boolean);

const browser = BROWSERS.find((p) => fs.existsSync(p));
if (!browser) {
  console.error("没找到 Edge/Chrome。可以用 EDGE_PATH 或 CHROME_PATH 指定可执行文件路径。");
  process.exit(1);
}

const toUrl = (p) => "file:///" + p.replace(/\\/g, "/");
const W = 512;
const H = 288;

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<link rel="stylesheet" href="${toUrl(defaultCss)}">
<link rel="stylesheet" href="${toUrl(themeCss)}">
<style>
  /* 只负责这张卡片的版式；文字样式与配色全部来自 app.css + theme.css。
     注意：app.css 的 .markdown-rendered p 会注入 --p-spacing 段距，
     这里用更高优先级的选择器把段距压实，避免内容超出 288px 被裁掉。 */
  html { height: auto !important; overflow: visible !important; }
  body.theme-light {
    contain: none !important; height: auto !important; overflow: visible !important;
    margin: 0; width: ${W}px; height: ${H}px; overflow: hidden;
  }
  .card {
    box-sizing: border-box; width: ${W}px; height: ${H}px;
    padding: 20px 26px; overflow: hidden;
    background: var(--background-primary); color: var(--text-normal);
  }
  .card p { margin: 0; }
  .kicker {
    margin: 0 0 6px; font-size: 9px; letter-spacing: .16em; text-transform: uppercase;
    color: var(--text-muted);
  }
  .card h1 { margin: 0 0 3px; font-size: 18px; line-height: 1.2; letter-spacing: -.01em; }
  .sub { margin: 0 0 9px !important; font-size: 10.5px; color: var(--text-muted); }
  .rule { height: 1px; background: var(--background-modifier-border); margin: 0 0 7px; }
  .row { margin: 0 0 6px !important; font-size: 12px; line-height: 1.5; }
  .row b { font-size: 9px; letter-spacing: .04em; color: var(--text-muted); }
</style></head>
<body class="theme-light">
  <div class="card markdown-rendered">
    <p class="kicker">Obsidian theme · CJK typography</p>
    <h1>CJK-Typography</h1>
    <p class="sub">只给中文分流字体，配色、字号、行高与西文全部沿用默认主题</p>
    <div class="rule"></div>
    <p class="row"><b>强调</b>　<em>中文用重楷体承担语气</em>，<em>Latin stays italic</em></p>
    <p class="row"><b>粗体</b>　<strong>沿用默认粗体权重</strong>，<strong>bold in Latin</strong></p>
    <p class="row"><b>代码</b>　<code>npm install --save 依赖</code> 等宽中文对齐</p>
  </div>
</body></html>`;

const tmp = path.join(os.tmpdir(), `cjk-screenshot-${process.pid}.html`);
fs.writeFileSync(tmp, html);
if (fs.existsSync(out)) fs.rmSync(out);

const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  "--force-device-scale-factor=2",
  `--window-size=${W},${H}`,
  `--screenshot=${out}`,
  "--virtual-time-budget=2500",
  `--user-data-dir=${path.join(os.tmpdir(), `cjk-shot-profile-${process.pid}`)}`,
  toUrl(tmp),
];

const res = spawnSync(browser, args, { stdio: "ignore", timeout: 60000 });
fs.rmSync(tmp, { force: true });
fs.rmSync(path.join(os.tmpdir(), `cjk-shot-profile-${process.pid}`), { recursive: true, force: true });

if (!fs.existsSync(out)) {
  console.error(`截图失败（浏览器退出码 ${res.status}）。`);
  process.exit(1);
}

const buf = fs.readFileSync(out);
console.log(`浏览器: ${browser}`);
console.log(`输出:   ${out}`);
console.log(`尺寸:   ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}（${W}×${H} 的 2× 版本，16:9）`);
console.log(`大小:   ${buf.length} bytes`);
