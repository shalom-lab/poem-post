# 诗帖 · 古诗贴图生成器

纯静态站点：编辑古诗字段 → 实时预览竖版诗卡 → 导出高清 PNG（适合小红书 / 微信发帖）。

**预计 Pages 地址：** [https://shalom-lab.github.io/poem-post/](https://shalom-lab.github.io/poem-post/)

## 本地用法

无需构建。任意静态服务器即可：

```bash
# Python
python3 -m http.server 8080 --directory .

# 或 Node
npx --yes serve -p 8080
```

浏览器打开 `http://localhost:8080`。

也可直接双击打开 `index.html`（部分浏览器对本地字体 / canvas 有限制，更推荐起本地服务）。

## 功能

- 13 套竖版模板（右侧下拉选择；默认 3:4，另支持 3:5；已去掉 9:16）
- 字段：诗名、朝代·作者、正文、可选释义、可选水印/品牌、可选日期
- 内容结构：完整篇章 / 名句 + 简介（释义），不做多出处拼盘
- 实时预览 + html2canvas 导出（`devicePixelRatio ≥ 2`，导出前 `document.fonts.ready`）
- **右侧分 Tab**：模板（选择模板 + 比例 + **遮罩层透明度** + **更换背景图**）/ 预设 / 排版 / 内容，避免一屏堆叠；当前 Tab 记入 `localStorage`（`poem-post:editor-tab`）
- **自由排版（绝对可控）**：左侧预览可点选标题 / 作者 / 正文 / 释义 / 水印 / 日期等可见区块，拖动摆放、右下角手柄或滚轮缩放、方向键微调（默认 0.5%，Shift ×5）；点选后自动切到「排版」Tab；「选中区块」分「排布」与「文字样式」：整块排布芯片、宽度 / X / Y（滑块 + 精确数字 + ±）；块内对齐芯片、字号/缩放（倍率 0.01 + 精确 px 反推）、**粗细芯片**（跟随/细/常/中/半粗/粗）、行距 / 字距、**颜色**（跟随 / 色板 / 取色）、**透明度**、有装饰线时的显隐；行距·字距·透明度双击可恢复「跟随」；子元素上的 `color` / `font-weight` / `line-height` / `letter-spacing` 会被覆盖；右键菜单仍可作排布快捷项；全局字体可切换；「重置排版」恢复模板默认
- 宽屏可拖动预览 / 操控区分隔线调比例，比例写入 `localStorage`（`poem-post:split`）；双击分隔线重置；小屏自动隐藏
- **预设样式**：在「预设」Tab 可「存为预设 / 应用 / 更新当前 / 改名 / 删除」；本地 IndexedDB（库 `poem-post` / 表 `presets` + `blobs`）持久化模板、比例（仅 3:4|3:5）、**遮罩层透明度**、**背景图引用**（内置路径或自定义 blob id）、**自由排版 layout**（含粗细 / 颜色 / 透明度 / 装饰等）、字体与内容字段；旧预设仅含全局字号时会自动迁移为各区块 scale；旧 `bgOpacity`（背景图可见度）会迁移为 `veilOpacity = 1 - bgOpacity`
- 移动端可用
- 字体：诗正文默认 **霞鹜文楷（LXGW WenKai）**，可在排版中切换多种免费 CJK 面（仿宋 / 正宋 / 正楷 / 明朝 / 标题体等，CDN unicode-range 分包）；UI / 释义 **Noto Sans SC**
- 多套模板使用 Unsplash 免费风景 / 纸纹图作背景（见下）

## 自由排版模型

每个可见内容区块（`title` / `author` / `body` / `meaning` / `watermark` / `date`）有独立状态：

| 字段 | 含义 |
|------|------|
| `x`, `y` | 相对诗卡宽高的百分比定位（`position: absolute; left/top %`）；面板提供滑块、数字框与 ±；方向键默认 0.5% |
| `scale` | **字号唯一存储字段**：`transform: scale()`，原点左上（视觉向右下扩展）。面板同时给倍率数字（步长 0.01）与「精确字号 px」；改 px 时按当前区块测量到的基准字号反推 `scale = px / basePx`，旧预设无需迁移 |
| `w` | 宽度（占诗卡宽度 %） |
| `align` | 块内水平对齐（左/中/右 / 跟随）；覆盖子元素 `text-align` |
| `lineHeight` / `letterSpacing` / `fontWeight` | 可选；`null` = 跟随模板；分别覆盖子元素行距 / 字距 / 粗细（300–700，芯片点选） |
| `color` | 可选 CSS 颜色；`null` = 跟随；覆盖子元素 `color`，并尽量同步标题/品牌装饰线颜色 |
| `opacity` | 可选 0.05–1；`null` = 跟随；作用于整块（含装饰） |
| `showDeco` | 可选；仅当块内有 `.pc-title-line` / `.pc-brand-line` 时面板出现；`true`/`false` 强制显隐，`null` = 跟随模板 |

整块水平排布（居中/靠左/靠右）按**视觉宽度** `w × scale` 重算 `x`（因 `transform-origin: top left`，缩放后视觉中心会偏右；居中时 `x = (100 - w·scale) / 2`），并同步块内 `align`；与「文字样式 → 水平对齐」可再单独改。过窄的块在显式块内对齐时会略扩宽以便看得见效果。数值越界会被夹紧并短暂高亮数字框提示。

全局 **遮罩层透明度**（`veilOpacity`，0–1，越高遮罩越强）在「模板 → 背景」调节：用卡片底色遮罩盖住背景图，文字与装饰不受影响。亦可更换背景图（内置 `assets/bg/` 风景 JPEG 与流光/艺术 SVG，或上传本地图；自定义图存 IndexedDB `blobs`，不进仓库）。导出 PNG 与预设均会保留遮罩与背景引用。

兼容：旧预设的 `bgOpacity` 表示「背景图可见度」，加载时 `veilOpacity = 1 - bgOpacity`；保存时仍附带写出 `bgOpacity` 供旧读者使用。

实现要点：模板 HTML 外包一层 `.layout-block[data-block]`；首次进入或「重置排版」时按模板流式布局测量自然坐标，再切入自由定位层；导出前去掉选中描边与手柄。预设的 `layout` + `layoutDirty` 与内容一并写入 IndexedDB。

## 十三套模板

| # | ID | 名称 | 气质 / 默认背景 |
|---|-----|------|----------------|
| 1 | `moon-letter` | 清月笺 | 浅纸纹 + 淡月，居中诗句，【释义】 · `parchment-soft.jpg` |
| 2 | `mist-card` | 薄雾笺 | 雾绿风景底 + 半透明竖卡 · `mist-green.jpg` |
| 3 | `crimson` | 赤金笺 | 深红纹理 + 花纹，全篇/名句+简介 · `red-texture.jpg` |
| 4 | `willow` | 柳桥笺 | 柳水风景 + 宣纸感，释义 · `willow-water.jpg` |
| 5 | `ink-mountain` | 墨山长卷 | 墨山风景，长诗全文（略小字号） · `ink-mountains.jpg` |
| 6 | `ink-cream` | 墨黑奶油 | 深墨底 · 奶油字色 · `paper-texture.jpg` |
| 7 | `snow-indigo` | 雪夜靛青 | 夜空靛青 · 雪意留白 · `night-indigo.jpg` |
| 8 | `dusk-peach` | 暮桃 | 暮色风景 · 名句+释义 · `peach-dusk.jpg` |
| 9 | `bamboo-scroll` | 竹青立轴 | 竹雾风景 · 空灵短章 · `bamboo-fog.jpg` |
| 10 | `lacquer-gold` | 漆金暗底 | 黑金漆器 · 全篇/名段+简介（CSS 渐变） |
| 11 | `photo-quote` | 风光引号 | 风景底 · 大引号白字 + 软阴影 · `peach-dusk.jpg` |
| 12 | `wall-light` | 窗影笺 | 墙纸窗光 · 栏目标题/句柄/译文/页脚 · `parchment-soft.jpg` |
| 13 | `parchment-navy` | 羊皮残卷 | 羊皮纸 · 海军蓝正文 · 幽灵大字水印 · `parchment-soft.jpg` |

切换模板会载入对应示例诗，可点「重置示例」恢复。默认水印为中性「诗帖」，可清空。

## 字体（CDN，免费可商用面）

下拉「字体样式」可选（均通过 CDN 加载，unicode-range 分包，不把大体积 TTF 打进仓库）：

| 选项 | family | 来源 |
|------|--------|------|
| 霞鹜文楷（默认） | `LXGW WenKai` | jsDelivr `lxgw-wenkai-webfont` |
| 思源宋体 | `Noto Serif SC` | Google Fonts |
| 朱雀仿宋 | `Zhuque Fangsong` | jsDelivr `@free-fonts/zhuque-fangsong` |
| 全字库正宋 | `TW-Sung` | jsDelivr `@free-fonts/tw-sung` |
| 全字库正楷 | `TW-Kai` | jsDelivr `@free-fonts/tw-kai` |
| 汇文明朝 | `Huiwen-MinchoGBK` | jsDelivr `gh/eterfinal/ReiFonts/HuiwenMinchoGBK` |
| 小薇标题 | `ZCOOL XiaoWei` | Google Fonts（短句/题签更合适） |
| 马善政题签 | `Ma Shan Zheng` | Google Fonts（题签/标题感） |
| 思源黑体 | `Noto Sans SC` | Google Fonts |
| 系统宋体 | Songti / SimSun 等 | 本机回退 |

导出 PNG 前会 `document.fonts.ready` 并 `fonts.load` 当前所选面。小薇 / 马善政偏展示用，长文正文更推荐文楷 / 宋 / 仿宋 / 明朝。

## 背景图

`assets/bg/` 下风景 JPEG 来自 [Unsplash](https://unsplash.com)，可按 Unsplash License 免费商用；使用时请保留本致谢。另有自制流光/艺术 SVG，可在「模板 → 背景」内置条中选用。文件与大致题材：

| 文件 | 用途 |
|------|------|
| `parchment-soft.jpg` | 清月笺浅纸纹 |
| `mist-green.jpg` | 薄雾笺雾绿风景 |
| `red-texture.jpg` | 赤金笺深红纹理 |
| `willow-water.jpg` | 柳桥水景 |
| `ink-mountains.jpg` | 墨山 |
| `paper-texture.jpg` | 墨黑奶油暗纹 |
| `night-indigo.jpg` | 雪夜靛青 |
| `peach-dusk.jpg` | 暮桃 |
| `bamboo-fog.jpg` | 竹青立轴 |
| `aurora-flow.svg` | 极光流光（艺术） |
| `light-trails.svg` | 流光飞舞（艺术） |
| `gold-dust.svg` | 金粉微尘（艺术） |
| `ink-wash-glow.svg` | 墨晕柔光（艺术） |
| `starfield-shimmer.svg` | 星野微闪（艺术） |
| `silk-ribbon.svg` | 丝带流光（艺术） |

风景 JPEG 致谢 Unsplash；艺术 SVG 为本仓库自制矢量底，体积小、导出清晰。导出 PNG 时背景走同域相对路径，会一并进入画布。

## 开启 GitHub Pages

仓库推送到 `main` 后：

1. 打开仓库 **Settings → Pages**
2. **Source** 选 **Deploy from a branch**
3. Branch 选 `main`，文件夹选 `/ (root)`，保存
4. 等待一两分钟，访问 `https://shalom-lab.github.io/poem-post/`

若 Organization / 个人账号已默认用 Actions 部署，也可在 Pages 里选用 GitHub Actions；本仓库无构建步骤，选 branch `/` 即可。

## 如何加模板

1. 在 `js/templates.js` 增加一条元数据（`id`、`name`、`mode`、显示哪些字段等）。
2. 在 `js/samples.js` 为该 `id` 写默认示例诗。
3. 在 `css/templates.css` 写 `.tpl-<id> { ... }` 样式（背景可用 `../assets/bg/*.jpg` + 半透明遮罩）。
4. 在 `js/app.js` 的 `renderCard()` 增加对应 `renderXxx()`（可复制相近模板改布局）。
5. 装饰优先用 `assets/` 下小体积 SVG，或纯 CSS / data-URI。

`mode`：

- `standard`：完整篇章或名句正文，可选释义（简介）

## 目录结构

```
poem-post/
├── index.html
├── package.json        # 无头导出依赖（puppeteer-core）
├── scripts/
│   └── render.mjs      # CLI：node scripts/render.mjs ...
├── css/
│   ├── styles.css      # 编辑器壳层 + 字体变量（默认浅色）
│   └── templates.css   # 十三套诗卡样式（含背景图）
├── js/
│   ├── templates.js
│   ├── samples.js
│   ├── presets.js      # IndexedDB 预设 CRUD
│   └── app.js          # 含 window.PoemPost API
├── assets/
│   ├── *.svg           # 装饰
│   └── bg/*            # Unsplash JPEG + 自制艺术 SVG（见上）
├── refs/               # 审美参考图（已 gitignore，不提交）
├── out/                # CLI 默认输出（gitignore）
└── README.md
```

## 技术说明

- 纯静态：HTML / CSS / JS，根目录可直接托管
- CDN：jsDelivr（霞鹜文楷、朱雀仿宋、TW-Sung/Kai、汇文明朝、html2canvas）、Google Fonts（Noto Sans/Serif SC、ZCOOL XiaoWei、Ma Shan Zheng）
- 背景：相对路径 `assets/bg/`（JPEG / SVG）+ CSS 半透明遮罩，保证正文可读且进 PNG


## 无头导出（Node / CI）

浏览器里点「下载 PNG」适合日常发帖；本地或 CI 也可用 Node + Chrome **无头截取** `#poem-card`。

GitHub Pages 仍是纯静态浏览器导出，**不依赖**本 CLI。

### 依赖

```bash
npm install
```

需要本机可执行的 Chrome / Chromium（或设置 `PUPPETEER_EXECUTABLE_PATH`）。本仓库用 `puppeteer-core`，不下载自带 Chromium。

若装不动 puppeteer / 找不到 Chrome：代码与文档仍可提交；浏览器导出不受影响。

### 用法

```bash
# 命令行字段
npm run render -- \
  --template mist-card \
  --title 敕勒歌 \
  --author 北朝乐府 \
  --body $'敕勒川，阴山下。\n天似穹庐，笼盖四野。\n天苍苍，野茫茫，\n风吹草低见牛羊。' \
  --out artifacts/headless-demo.png

# 或等价
node scripts/render.mjs --template mist-card --title 敕勒歌 --author 北朝乐府 \
  --body "..." --out out.png

# JSON 文件（字段与页面 state 对齐）
node scripts/render.mjs --json poem.json --out out.png
```

`poem.json` 示例：

```json
{
  "template": "mist-card",
  "title": "敕勒歌",
  "author": "北朝乐府",
  "body": "敕勒川，阴山下。\n天似穹庐，笼盖四野。\n天苍苍，野茫茫，\n风吹草低见牛羊。",
  "watermark": "诗帖",
  "date": "09/17",
  "ratio": "3/4"
}
```

实现要点：脚本起临时 `localhost` 静态服 → Puppeteer 打开 `index.html` → 调用页面 API `window.PoemPost.apply(payload)` → 截取 `#poem-card`。也可在页内用 `PoemPost.exportPng()` 取 dataURL。

## License

MIT（站点代码）。背景图遵循 Unsplash License。

## GitHub Pages（Actions）

仓库已配置 **GitHub Actions** 部署（Settings → Pages → Source = GitHub Actions）。

- 工作流：[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
- 触发：推送到 `main`，或手动 **Actions → Deploy GitHub Pages → Run workflow**
- 产物：仅 `index.html` + `css/` + `js/` + `assets/`（不含 `refs/`、`artifacts/`）
- 站点：https://shalom-lab.github.io/poem-post/

