#!/usr/bin/env node
/**
 * 从 Obsidian 的 asar 里提取官方 app.css，作为 preview.html 的「原生默认主题」基准。
 *
 * 用法：
 *   node tools/extract-default-css.mjs                     # 自动探测本机安装，输出 preview-default-theme.css
 *   node tools/extract-default-css.mjs --out foo.css       # 指定输出
 *   node tools/extract-default-css.mjs --asar <path>       # 指定 asar（支持 .asar 与 .asar.gz）
 *
 * 说明：
 *   - Windows 上自更新会把新版 asar 先下到 %APPDATA%\obsidian\obsidian-<ver>.asar，
 *     重启后才替换安装目录里的旧版。auto 探测会优先选版本号更高的那个。
 *   - app.css 是 Obsidian 的版权文件，仅用于本地预览对照，不随仓库分发（已 .gitignore）。
 *
 * 安全约束：
 *   输出路径若以 .asar / .asar.gz 结尾、或指向一个 asar 文件，脚本直接拒绝运行。
 *   （历史上这条工具的参数顺序错位，曾把 CSS 写进用户的更新包。）
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const argv = process.argv.slice(2);
const opts = { asar: null, out: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--asar") opts.asar = argv[++i];
  else if (a === "--out") opts.out = argv[++i];
  else if (a === "-h" || a === "--help") {
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]);
    process.exit(0);
  } else if (!opts.out && !a.startsWith("-")) opts.out = a;
  else {
    console.error(`无法识别的参数: ${a}`);
    process.exit(2);
  }
}

const out = path.resolve(opts.out ?? path.join(process.cwd(), "preview-default-theme.css"));

// ---- 输出路径护栏 ----------------------------------------------------------
if (/\.asar(\.gz)?$/i.test(out)) {
  console.error(`拒绝写入: 输出路径不能是 asar 文件 (${out})`);
  console.error("提示: 用 --out 指定 .css 输出路径；--asar 指定输入。");
  process.exit(2);
}
if (fs.existsSync(out)) {
  const fd = fs.openSync(out, "r");
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  fs.closeSync(fd);
  if (isAsarLike(head)) {
    console.error(`拒绝覆盖: ${out} 看起来是 asar 容器，不是 CSS。`);
    process.exit(2);
  }
}

function isAsarLike(head) {
  if (!head || head.length < 16) return false;
  // asar 魔数布局：uint32(4) | headerPickleSize | headerStringSize | jsonSize
  if (head.readUInt32LE(0) !== 4) return false;
  const jsonSize = head.readUInt32LE(12);
  return jsonSize > 0 && jsonSize < 64 * 1024 * 1024;
}

// ---- 定位 asar ------------------------------------------------------------
function versionOf(name) {
  const m = /^obsidian-(\d+\.\d+\.\d+)\.asar$/.exec(name);
  return m ? m[1].split(".").map(Number) : null;
}
function cmpVersion(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function localCandidates() {
  const roots = [
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "obsidian", "resources"),
    path.join(process.env.LOCALAPPDATA ?? "", "Obsidian", "resources"),
    path.join(process.env.PROGRAMFILES ?? "", "Obsidian", "resources"),
    path.join("/Applications/Obsidian.app/Contents/Resources"),
  ].filter(Boolean);

  const found = [];
  for (const dir of roots) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name === "obsidian.asar" || /^obsidian-\d+\.\d+\.\d+\.asar$/.test(name)) {
        found.push({ file: path.join(dir, name), version: versionOf(name) });
      }
    }
  }

  // 自更新暂存的版本：%APPDATA%\obsidian\obsidian-<ver>.asar
  const staging = path.join(process.env.APPDATA ?? "", "obsidian");
  if (fs.existsSync(staging)) {
    for (const name of fs.readdirSync(staging)) {
      const v = versionOf(name);
      if (v) found.push({ file: path.join(staging, name), version: v, staged: true });
    }
  }

  found.sort((a, b) => (a.version && b.version ? cmpVersion(b.version, a.version) : -1));
  return found;
}

let input = opts.asar;
if (input) input = path.resolve(input);
if (!input) {
  const candidates = localCandidates().filter((c) => fs.existsSync(c.file));
  if (!candidates.length) {
    console.error("没找到本机 Obsidian 的 asar。请用 --asar 指定，或到安装目录确认。");
    process.exit(1);
  }
  input = candidates[0].file;
}

// ---- 读取 asar（自动解 gz）------------------------------------------------
let raw = fs.readFileSync(input);
if (input.endsWith(".gz") || (raw[0] === 0x1f && raw[1] === 0x8b)) {
  raw = zlib.gunzipSync(raw);
}

const headerSize = raw.readUInt32LE(4);
const jsonSize = raw.readUInt32LE(12);
const header = JSON.parse(raw.subarray(16, 16 + jsonSize).toString("utf8"));
const dataStart = 8 + headerSize;

function readEntry(node, prefix = "") {
  if (node.files) {
    for (const [name, child] of Object.entries(node.files)) {
      const p = prefix ? `${prefix}/${name}` : name;
      const hit = readEntry(child, p);
      if (hit) return hit;
    }
    return null;
  }
  if (prefix === "app.css" || prefix.endsWith("/app.css")) {
    const start = dataStart + Number(node.offset);
    const size = Number(node.size);
    return { name: prefix, buf: raw.subarray(start, start + size) };
  }
  return null;
}

const css = readEntry(header);
if (!css) {
  console.error(`${input} 里没有 app.css`);
  process.exit(1);
}

let version = "unknown";
const pkg = header.files?.["package.json"];
if (pkg && !pkg.files) {
  const start = dataStart + Number(pkg.offset);
  try {
    version = JSON.parse(raw.subarray(start, start + Number(pkg.size)).toString("utf8")).version ?? "unknown";
  } catch {
    /* 忽略：版本号只用于溯源 */
  }
}

fs.writeFileSync(out, css.buf);
console.log(`来源: ${input}`);
console.log(`Obsidian 版本: ${version}`);
console.log(`条目: ${css.name} (${css.buf.length} bytes)`);
console.log(`输出: ${out}`);
