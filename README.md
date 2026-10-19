# CJK-Typography

![CJK-Typography](screenshot.png)

以 Obsidian 默认主题为基准的中文排版主题：只把中文分流到合适的字体，
配色、字号、行距、西文字体全部保持默认。

## 效果

| 写法 | 说明 |
|---|---|
| `*文字*` | 中文用楷体（字面经 `size-adjust: 116%` 校准至与正文同高），西文保持原生斜体 |
| `**文字**` | 默认粗体（`--bold-weight`），不换字体 |
| `***文字***` | 楷体字面 + 默认粗体，不叠着重号 |
| `` `代码` `` / 代码块 | 西文走默认等宽栈（Consolas 等），中文用等宽中文字体 |
| 引用中的嵌套 | 楷体字面 + 默认字重，斜体套粗体不变形 |

行内盒经过校准（`ascent/descent-override` + `line-height: 0`），
楷体不参与行高计算，行距与纯正文完全一致。

## 安装

两种方式任选其一，效果一致。

### 方式一：安装主题（推荐）

1. 把整个 `CJK-Typography` 文件夹放进库中：

   ```
   <你的库>/.obsidian/themes/CJK-Typography/
   ├── manifest.json
   └── theme.css
   ```

   文件夹名必须与 `manifest.json` 里的 `name` 完全一致，否则 Obsidian 会静默忽略。

2. **重启 Obsidian**（manifest 的改动需要重启才会被读取）。
3. 设置 → 外观 → 主题，选择 **CJK-Typography**。

之后改 `theme.css` 会热重载，不必再重启。`README.md`、`preview*`、`tools/` 只是仓库里的开发文件，不会被 Obsidian 读取。

### 方式二：只用 CSS 片段（不想装主题时）

1. 把 `cjk-typography.css` 复制到库的片段目录（没有该目录就新建）：

   ```
   <你的库>/.obsidian/snippets/cjk-typography.css
   ```

2. 设置 → 外观 → **CSS 代码片段** → 点「刷新」→ 打开 `cjk-typography` 的开关。
3. 主题保留默认（或其他任意主题）即可，片段会叠加在上面。

| | 片段 | 主题 |
|---|---|---|
| 启用方式 | 外观 → CSS 代码片段 → 开关 | 外观 → 主题 → 下拉选择 |
| 与当前主题的关系 | 叠加，可继续用第三方主题 | 替代默认主题，本身成为当前主题 |
| 改完生效 | 点「重新加载片段」 | 自动热重载 |
| 分发 | 单文件，复制即用 | 整个文件夹，可提交社区主题库 |

## 字体依赖

主题与片段都只写 `local()` 引用，不打包字体：装了就用，没装就往下回退。

- **强调**：KaiTi / 楷体 → STKaiti → Kaiti SC
- **代码**：Sarasa Mono SC → Noto Sans Mono CJK SC → Maple Mono NF CN → Microsoft YaHei Mono → SimHei

`local()` 用的是字体在系统中的**真实名称**，各平台命名不一（macOS 常见 `Kaiti SC`，Windows 常见 `楷体`），所以两套都列上。

## 设计取舍

代码区刻意**只接管中文**，西文留给默认等宽栈（Windows 上是 Consolas）。曾试过让 Noto Sans Mono CJK 这类中西文 1:2 字体整段接管以换取严格 2:1 对齐，但其西文字形读代码不如 Consolas 舒服，权衡后放弃对齐、保留可读性。

楷体的垂直位置用 `vertical-align: -0.09em` 微调、字面大小用 `size-adjust: 116%` 校准、行内盒用 `ascent/descent-override` 钉回正文量级以保证行距一致——三个参数均为目测校准值，换机器或换字重后可按需微调。

## 本地预览

`preview.html` 以官方 `app.css` 为基准加载 `theme.css`，顶部可切换「叠加主题 / 深色」。基准文件需从本机 Obsidian 安装中提取（产物含 Obsidian 版权内容，已列入 `.gitignore`，不随仓库分发）：

```bash
node tools/extract-default-css.mjs
node tools/make-screenshot.mjs   # 重新生成 screenshot.png 与预览截图
```

## 社区发布

- 缩略图 `screenshot.png` 已就位（1024×576，16:9）
- 许可证 MIT 已就位
- 发布前把 `manifest.json` 里的 `author` 换成你自己的名字或 ID

## 已知限制

- `text-autospace` 属于 CSS Text 4 草案，仅较新的 Chromium 支持；不支持时整条声明被忽略，其余不受影响。
- 编辑模式样式依赖 CodeMirror 6 的类名（`.cm-em`、`.cm-strong`、`.cm-inline-code`、`.HyperMD-codeblock`）。Obsidian 大版本若重命名这些类，需要同步调整。
- 楷体的垂直微调值（`vertical-align: -0.09em`）按本机目测校准，更换机器或字体后可按观感微调。

## 许可

[MIT](LICENSE) © 2026 BallBall11

例外：`preview-default-theme.css` 是从本机 Obsidian 安装中提取的 `app.css`，版权归 Obsidian 所有，仅限本地预览对照使用，不随仓库分发。
