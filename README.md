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

- 10 套竖版模板（3:4 优先，另支持 3:5、9:16）
- 字段：诗名、朝代·作者、正文、可选释义、可选水印/品牌、可选日期
- 「赤壁摘句」「漆金暗底」支持多条 `{verse, source}` 摘句
- 实时预览 + html2canvas 导出（`devicePixelRatio ≥ 2`）
- 移动端可用；中文字体：Noto Serif SC / Noto Sans SC（CDN）

## 十套模板

| # | ID | 名称 | 气质 |
|---|-----|------|------|
| 1 | `shinian` | 诗念月笺 | 羊皮纸 + 淡月，居中宋体，右对齐出处，【释义】 |
| 2 | `vesper` | 晚风薄雾 | 雾绿风景底 + 半透明竖卡，品牌/日期 |
| 3 | `crimson` | 赤壁摘句 | 深红花纹底、白字，多段摘句 |
| 4 | `willow` | 柳桥笺 | 宣纸 + 水彩柳/桥感，释义 |
| 5 | `ink-mountain` | 墨山长卷 | 浅底淡墨山，长诗全文 |
| 6 | `ink-cream` | 墨黑奶油 | 深墨底 · 奶油字色 |
| 7 | `snow-indigo` | 雪夜靛青 | 靛青夜色 · 雪意留白 |
| 8 | `dusk-peach` | 暮桃 | 暮色桃粉 · 短句情诗 |
| 9 | `bamboo-scroll` | 竹青立轴 | 竹青卷轴 · 空灵短章 |
| 10 | `lacquer-gold` | 漆金暗底 | 黑金漆器 · 摘句或长句 |

切换模板会载入对应示例诗，可点「重置示例」恢复。

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
3. 在 `css/templates.css` 写 `.tpl-<id> { ... }` 样式。
4. 在 `js/app.js` 的 `renderCard()` 增加对应 `renderXxx()`（可复制相近模板改布局）。
5. 装饰优先用 `assets/` 下小体积 SVG，或纯 CSS / data-URI。

`mode`：

- `standard`：单段正文
- `excerpts`：仅多条摘句
- `hybrid`：正文 + 摘句均可

## 目录结构

```
poem-post/
├── index.html          # 入口
├── css/
│   ├── styles.css      # 编辑器壳层
│   └── templates.css   # 十套诗卡样式
├── js/
│   ├── templates.js    # 模板元数据
│   ├── samples.js      # 示例诗
│   └── app.js          # 编辑 / 预览 / 导出
├── assets/             # 自托管 SVG 装饰
├── refs/               # 审美参考图（已 gitignore，不提交）
└── README.md
```

## 技术说明

- 纯静态：HTML / CSS / JS，根目录可直接托管
- CDN：Google Fonts、html2canvas
- 背景以 CSS / SVG 为主，无大图依赖

## License

MIT
