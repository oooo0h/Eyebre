# Eyebre 公司介绍主页

沿用参考站的文字层级、画幅、背景线条、3D 场景、鼠标互动、平滑滚动和卡片缩放过渡，局部替换为 Eyebre 的公司内容。

源码与网页资源通过 GitHub 管理，可在本地或帽子云等静态托管平台运行。项目不需要构建服务器端程序。

## 运行

执行 `node server.mjs`，预览地址 `http://127.0.0.1:4186/`。无需构建，发布目录为 `dist/`。`npm run check` 检查所有项目脚本语法。本地服务支持 PDF 的 HTTP Range 请求。

## 品牌与语言

首次访问默认英文；Language 原地切换简体中文和英文，选择保存在浏览器中，URL 同步更新。切换只刷新文字及动画文字的测量缓存，不重新加载页面或初始化 3D 场景，并保留当前滚动进度。

电脑端（至少 1024px）显示放大的 Logo、竖线与两行标语：竖线由上向下显现，内容从竖线两侧滑出后停止，没有左右抖动。品牌组随首屏滚出，右上角按钮继续固定。手机端保留原布局。系统减少动态效果时显示静态品牌组。

## 产品画册

主页 10 个分类依次为：双筒望远镜、天文望远镜、单筒望远镜、瞄准镜、观鸟镜、测距仪、夜视仪、热成像、显微镜、支架&夹具。卡片保留参考站原图与鼠标视差。点击后直接在当前页面的全屏层中打开对应网页预览，由自托管的完整 Mozilla PDF.js 阅读器渲染，电脑与手机都可在线阅读，不依赖浏览器的 PDF 插件，不跳转详情页。移除顶部抬头，仅在左下角固定显示返回按钮，关闭后回到原滚动位置。

页码跳转、连续滚动、缩放、查找、缩略图、打印及主动下载使用 PDF.js 完整阅读器；手机支持触摸滚动与缩放。热成像按打开时的当前语言选择中英文版本；界面语言切换不会翻译 PDF 内文。Ctrl/Command 点击或右键可在新标签页打开对应网页预览。放大镜文件仍保留在资源目录中，未添加额外主页分类。

`dist/assets/catalogues/` 包含 12 本完整页面的网页阅读版、封面及 `manifest.json`。原始大画册单独保留在本机上层 `产品画册/`，保持不变，不纳入 GitHub 仓库；运行网页所需的完整 PDF 已包含在本项目中。网页阅读版优化了图片与文件体积，保留全部 719 页及可提取文字；适合在线阅读，印刷请使用原稿。目前使用官方 PDF.js 6.4.299 legacy 完整阅读器，自托管在 `dist/assets/vendor/pdfjs-viewer/`，保留其许可证。原稿与网页阅读版 PDF 文件不变。

## 文件

- `dist/brand.js`：公司双语内容、分类映射、品牌和语言控件。
- `dist/brand.css`：品牌、语言控件及中文排版兼容。
- `dist/desktop-intro.js`：电脑端入场及随首屏滚动的同步。
- `dist/runtime-copy.js`：动画文字原地刷新与原路由桥接。
- `dist/catalogue-reader.js`、`.css`：首页全屏预览容器与安全的返回消息桥接。
- `dist/catalogue-preview.js`、`.css`：共享网页阅读器配置、中文/英文界面、深灰工具栏和左下角返回按钮。
- `dist/catalogues/*/index.html`：可直接分享的真实静态预览页面，不需要服务器路由规则。
- `scripts/build-catalogue-pages.py`：从官方完整阅读器模板生成各分类页面。
- `dist/_astro/hoisted.CUO_IjfL.js`：原动画引擎，适配公司入口与语言缓存，卡片继续加载原视觉素材。
- `dist/projects/*/index.html`：保留原卡片到详情的路由/缩放过渡骨架。
- `scripts/`：网页阅读版与封面准备脚本。

## 已确认资料与后续替换

公司：浙江胤远光学仪器有限公司；品牌 Eyebre；电话 13906893397；数十年光学行业经验。未添加未经提供的认证、客户、具体成立年份或性能承诺。正式英文公司名待提供。

首屏仍保留原互动场景，待确定望远镜实时预览；影片仍为参考影片，待用户提供公司介绍视频；宇航员/隧道叙事待确定自然 → 人文 → 星空的新动画。其余参考模型、纹理、声音和视频从 `https://lusion.dev/assets/` 加载，预览需联网。`reference/`、`qa/`、`.tools/` 不参与发布。


## 可分享的在线预览地址

将下列路径加到网站域名后即可在线阅读。`?lang=zh` / `?lang=en` 控制界面语言；`#page=4` 可指定页码。原来的 `/assets/catalogues/*.pdf` 仍为原文件下载地址。

| 分类 | 预览路径 |
|---|---|
| 双筒望远镜 | `/catalogues/binoculars/` |
| 天文望远镜 | `/catalogues/astronomical-telescopes/` |
| 单筒望远镜 | `/catalogues/monoculars/` |
| 瞄准镜 | `/catalogues/riflescopes/` |
| 观鸟镜 | `/catalogues/spotting-scopes/` |
| 测距仪 | `/catalogues/rangefinders/` |
| 夜视仪 | `/catalogues/night-vision/` |
| 热成像（按界面语言选版本） | `/catalogues/thermal/` |
| 热成像英文原稿 | `/catalogues/thermal-en/` |
| 热成像中文原稿 | `/catalogues/thermal-zh/` |
| 显微镜 | `/catalogues/microscopes/` |
| 支架&夹具 | `/catalogues/mounts-clamps/` |
| 放大镜 | `/catalogues/magnifiers/` |

帽子云构建根目录留空，构建命令 `npm run check`，输出目录 `dist`。阅读器与依赖已提交，不需要构建时下载第三方服务。
