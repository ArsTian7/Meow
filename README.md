# 🍬 喵喵糖果屋 (Meow Candy House)

一个二次元、可爱、糖果感的娱乐向单页网站。点击页面任意处，即可在点击位置触发动漫 OP 风格的可爱粒子特效，同时播放动感的喵叫声效！

## ✨ 功能特性

- 🎨 **糖果粒子特效**：点击页面随机生成糖果、棒棒糖、爱心、星星、泡泡、猫爪、闪光、蝴蝶结、甜甜圈、彩虹拖尾等粒子效果
- 🔊 **动感喵叫音效**：每次点击随机播放喵叫音效，支持真实音频文件和 Web Audio API 合成音效
- 📱 **响应式设计**：支持桌面端鼠标点击和移动端触摸操作
- 🌈 **二次元风格**：粉色、薄荷蓝、奶油黄、紫色渐变背景，浮动泡泡装饰
- ⚡ **高性能**：Canvas 2D + requestAnimationFrame，最大 600 粒子限制，流畅不卡顿

## 📁 项目结构

```
meow-candy/
├── index.html              # 页面结构
├── style.css               # 页面样式、UI、动画
├── script.js               # Canvas 粒子、音效、交互逻辑
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

> 💡 推荐使用 HTTP 服务器方式，因为部分浏览器在使用 `file://` 协议时可能限制 Web Audio API 的使用。

## 🌐 GitHub Pages 部署步骤

### 1. 创建 GitHub 仓库

- 登录 [GitHub](https://github.com)
- 点击右上角 **+** → **New repository**
- 填写仓库名称，例如 `meow-candy`
- 选择 **Public**（公开）
- **不要**勾选 "Add a README file"（我们会上传自己的）
- 点击 **Create repository**

### 2. 上传项目文件

**方式 A：网页上传**

- 在新建的仓库页面，点击 **uploading an existing file** 链接
- 将 `meow-candy/` 目录下的所有文件和文件夹拖拽上传
- 确保文件结构正确（`index.html` 在根目录）
- 点击 **Commit changes**

**方式 B：Git 命令行**

```bash
cd meow-candy
git init
git add .
git commit -m "Initial commit: 喵喵糖果屋"
git branch -M main
git remote add origin https://github.com/你的用户名/meow-candy.git
git push -u origin main
```

### 3. 启用 GitHub Pages

1. 进入仓库页面，点击顶部的 **Settings**（设置）
2. 左侧菜单找到 **Pages**
3. 在 **Build and deployment** 部分：
   - **Source** 选择 **Deploy from a branch**
   - **Branch** 选择 `main`
   - **Folder** 选择 `/ (root)`
4. 点击 **Save** 保存

### 4. 等待部署完成

- 部署通常需要 1-3 分钟
- 刷新 Pages 页面，看到绿色提示 "Your site is live" 即表示部署成功

### 5. 访问你的网站

- 普通仓库名：`https://你的用户名.github.io/meow-candy/`
- 如果仓库名是 `你的用户名.github.io`：`https://你的用户名.github.io/`

> ⚠️ **提示**：如果 GitHub Pages 页面更新后没有变化，可以等待几分钟或按 `Ctrl + Shift + R`（Windows）/ `Cmd + Shift + R`（Mac）强制刷新缓存。

## 🎵 如何替换真实喵叫音频

1. 准备 1~5 个可爱的猫叫声 MP3 音频文件
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
- 内容：可爱的猫叫声效果最佳

> 💡 如果没有放入任何音频文件，代码会自动使用 Web Audio API 合成"电子喵"占位音效，不会报错。

## ⚙️ 自定义配置

打开 `script.js`，找到顶部的 `CONFIG` 对象，可以修改以下配置：

```javascript
var CONFIG = {
    MAX_PARTICLES: 600,       // 最大粒子数量（影响性能和视觉效果）
    MIN_TYPES: 1,             // 每次点击最少粒子种类
    MAX_TYPES: 3,             // 每次点击最多粒子种类
    MIN_PER_TYPE: 8,          // 每种粒子最少数量
    MAX_PER_TYPE: 15,         // 每种粒子最多数量
    BUBBLE_COUNT: 15          // 背景装饰泡泡数量
};
```

### 修改标题

打开 `index.html`，修改 `<h1>` 标签内容：

```html
<h1 id="title">你的标题</h1>
```

### 修改颜色

打开 `style.css`，修改 `#bg-layer` 的渐变色：

```css
background: linear-gradient(
    135deg,
    #ffd6e8 0%,    /* 修改为你喜欢的颜色 */
    #e8d6ff 25%,
    ...
);
```

修改粒子颜色，打开 `script.js`，修改 `CONFIG.COLORS` 数组：

```javascript
COLORS: ['#FF6B9D', '#你的颜色', ...]
```

### 修改副标题提示文字

打开 `index.html`，修改 `<p>` 标签内容：

```html
<p id="subtitle">你的提示文字</p>
```

## 📋 技术栈

- **纯前端**：HTML + CSS + JavaScript + Canvas 2D
- **无框架**：不使用 React/Vue/Angular/Svelte
- **无构建工具**：不使用 npm/Webpack/Vite/TypeScript/Sass
- **音效方案**：Web Audio API（合成音效 + 真实音频播放）
- **兼容浏览器**：Chrome、Edge、Safari、Firefox

## 📄 许可证

MIT License - 自由使用和修改。
