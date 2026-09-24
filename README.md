# 🍬 小天喵喵屋 (Meow Candy House)

一个柚子社（Yuzusoft）风格的华丽萌系娱乐向单页网站。点击页面任意处，即可触发**全屏超大糖果爆发**特效，配合**闪白冲击 + 彩虹冲击波 + 屏幕震动**的强烈视觉反馈，同时播放可爱的"喵呜喵呜"猫叫声效！

## ✨ 功能特性

- 🎨 **全屏超大糖果特效**：点击时产生占据屏幕 1/4 尺寸的巨型糖果、马卡龙、冰淇淋、大棒棒糖，带着光晕向四周飞散
- 💥 **强烈视觉反馈**：全屏闪白（flash）+ 彩虹冲击波（shockwave）+ 屏幕震动（shake）三重特效联动
- 🌟 **多层粒子纵深**：底层大糖果 → 中层星星爱心 → 顶层闪光，制造空间纵深感
- 🔊 **"喵呜喵呜"音效**：模拟幼猫连续猫叫节奏，支持真实音频和 Web Audio API 合成
- 🎯 **超大字体标题**：Fredoka One + M PLUS Rounded 1c 圆润可爱字体，5rem+ 粉色/黄色描边发光
- 📱 **响应式设计**：支持桌面端和移动端
- ⚡ **高性能**：Canvas 2D + requestAnimationFrame，最大 1000 粒子限制，流畅不卡顿

## 📁 项目结构

```
meow-candy/
├── index.html              # 页面结构
├── style.css               # 柚子社风格样式、动画特效
├── script.js               # 多层粒子系统、音效、交互逻辑
├── README.md               # 本文件
├── .nojekyll               # 避免 GitHub Pages Jekyll 处理
└── assets/
    └── audio/
        └── README.md       # 音频文件说明
```

## 🚀 PyCharm 本地运行

### 方式一：直接打开

在文件管理器中找到 `meow-candy/index.html`，双击用浏览器打开即可。

### 方式二：本地 HTTP 服务器（推荐）

1. 打开 PyCharm 的终端（Terminal）
2. 切换到项目目录：
   ```bash
   cd meow-candy
   ```
3. 启动 Python 内置 HTTP 服务器：
   ```bash
   python -m http.server 8080
   ```
4. 打开浏览器访问：`http://localhost:8080`

> 💡 推荐使用 HTTP 服务器方式，因为部分浏览器在使用 `file://` 协议时可能限制 Web Audio API 和 Google Fonts 的加载。

## 🌐 GitHub Pages 部署步骤

### 1. 推送代码到 GitHub

```bash
cd D:\DevelopWork\PythonProject\Meow_Project
git add .
git commit -m "feat: 柚子社风格全面升级 - 超大糖果特效、喵呜音效、多层粒子"
git push origin main
```

### 2. 启用 GitHub Pages

1. 进入仓库页面，点击顶部的 **Settings**（设置）
2. 左侧菜单找到 **Pages**
3. 在 **Build and deployment** 部分：
   - **Source** 选择 **Deploy from a branch**
   - **Branch** 选择 `main`
   - **Folder** 选择 `/ (root)` 或 `/meow-candy` 子目录（取决于你的仓库结构）
4. 点击 **Save** 保存

### 3. 等待部署完成

- 部署通常需要 1-3 分钟
- 刷新 Pages 页面，看到绿色提示 "Your site is live" 即表示部署成功
- 如果页面没有更新，按 `Ctrl + Shift + R` 强制刷新缓存

### 4. 访问你的网站

- 普通仓库名：`https://你的用户名.github.io/仓库名/meow-candy/`
- 如果仓库名是 `你的用户名.github.io`：`https://你的用户名.github.io/meow-candy/`

## 🎵 如何替换真实喵叫音频

1. 准备 1~5 个可爱的猫叫声 MP3 音频文件（推荐幼猫/夹子音）
2. 将它们重命名为以下名称：
   - `meow1.mp3`
   - `meow2.mp3`
   - `meow3.mp3`
   - `meow4.mp3`
   - `meow5.mp3`
3. 将文件放入 `assets/audio/` 目录
4. 刷新页面即可自动使用真实音频

**音频要求：**
- 格式：MP3（推荐 128kbps 以上）
- 时长：建议 0.3 ~ 1.5 秒
- 内容：可爱的猫叫声效果最佳（幼猫/夹子音最萌）

> 💡 如果没有放入任何音频文件，代码会自动使用 Web Audio API 合成"喵呜喵呜"电子猫叫，不会报错。

## ⚙️ 自定义配置

打开 `script.js`，找到顶部的 `CONFIG` 对象，可以修改以下配置：

```javascript
var CONFIG = {
    MAX_PARTICLES: 1000,      // 最大粒子数量（影响性能和视觉效果）
    BIG_MIN_SIZE: 40,         // 底层大糖果最小尺寸
    BIG_MAX_SIZE: 80,         // 底层大糖果最大尺寸
    MID_MIN_SIZE: 15,         // 中层粒子尺寸
    MID_MAX_SIZE: 30,
    TOP_MIN_SIZE: 5,          // 顶层闪光尺寸
    TOP_MAX_SIZE: 12,
    BUBBLE_COUNT: 20          // 背景装饰泡泡数量
};
```

## 📋 技术栈

- **纯前端**：HTML + CSS + JavaScript + Canvas 2D
- **无框架**：不使用 React/Vue/Angular/Svelte
- **无构建工具**：不使用 npm/Webpack/Vite/TypeScript/Sass
- **字体**：Google Fonts（Fredoka One + M PLUS Rounded 1c）
- **音效方案**：Web Audio API（合成猫叫 + 真实音频播放）
- **兼容浏览器**：Chrome、Edge、Safari、Firefox

## 📄 许可证

MIT License - 自由使用和修改。
