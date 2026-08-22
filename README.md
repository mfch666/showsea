# GitHub 项目展示静态站（仿 liuhouliang.com）

一个**纯静态**的 GitHub 开源项目展示站，设计语言 1:1 复刻 [liuhouliang.com](https://liuhouliang.com/)（Tailwind slate 色系 + 蓝色强调 + 暗色模式 + 玻璃拟态头部 + 卡片悬浮）。

- 本地用 Node.js 指定要采集的仓库，一键同步 GitHub 数据
- 生成的站点零依赖、零后端，可直接托管到 **SAE Pages**（或任意静态托管）
- 文案处理规则：**纯英文做"一些翻译"（词表级，离线）**，**含中文则摘取中文部分**

---

## 目录结构

```
github-showcase/
├── config.json            # 站点信息 + 要采集的仓库列表（你只改这个）
├── package.json
├── src/
│   ├── server.js          # 本地预览服务器（http://localhost:3000）
│   └── translate.js       # 文本处理：摘中文 / 译英文
├── scripts/
│   └── sync.js            # 采集脚本：读 config -> 调 GitHub API -> 生成数据
└── public/                # ← 这就是要部署到 SAE Pages 的静态站点
    ├── index.html
    ├── styles.css         # 设计系统（复刻参考站 CSS 变量与组件类）
    ├── app.js             # 渲染逻辑 + 主题切换
    ├── data.js            # 由 sync 生成（window.SITE_DATA），已内置，file:// 也能跑
    ├── data.json          # 由 sync 生成（开发用 / API）
    └── images/avatar.svg
```

---

## 快速开始

### 1. 配置要展示的仓库

编辑 `config.json`：

```jsonc
{
  "site": {
    "title": "My Projects",
    "author": "你的名字",
    "avatar": "images/avatar.svg",
    "bio": "一句话介绍你自己 / 你的项目方向",
    "github": "https://github.com/你的用户名",
    "githubUser": "你的用户名",          // 用于拉取 followers/following 等统计
    "startYear": 2024,
    "nav": [ {"label":"项目","href":"#projects"}, {"label":"关于","href":"#about"} ]
  },
  "repos": [
    { "owner": "vuejs", "name": "vue", "featured": true },
    { "owner": "facebook", "name": "react" }
    // 也支持 "owner/name" 简写：{ "name": "facebook/react", "featured": true }
  ],
  "githubToken": ""        // 可选：填 GitHub PAT 提升 API 限额（也可设环境变量 GITHUB_TOKEN）
}
```

> 想展示你自己所有公开仓库？把 `repos` 留空、填好 `githubUser` 即可（脚本会拉取该用户公开仓库，你再手动挑选）。

### 2. 采集数据（本地 Node.js）

```bash
npm run sync          # 等价于 node scripts/sync.js
```

脚本会：调用 GitHub API 拉取每个仓库的元信息 → 对描述做文本处理 → 写入 `public/data.js` 与 `public/data.json`。

### 3. 本地预览

```bash
npm start             # 启动 http://localhost:3000
```

打开浏览器即可看到效果。修改 `config.json` 后重新 `npm run sync` 即可更新。

### 3.1 一行 URL 采集指定仓库（最省事）

本地服务器跑起来后，**不用改 `config.json`、不用敲命令**，直接在浏览器访问带 `repo` 参数的地址即可把仓库采集落地：

```
http://localhost:3000/?repo=facebook/react
```

- 访问后服务器会：① 把该仓库去重加入 `config.json` ② 自动重新采集 GitHub 数据写入 `public/data.js` / `data.json` ③ 302 跳回首页，页面立即显示新仓库。
- **支持一次多个**：`http://localhost:3000/?repo=pallets/flask&repo=torvalds/linux`（多个 `repo=`），或逗号分隔 `?repo=a/b,c/d`。
- 重复访问同一仓库会自动跳过、不会重复添加。
- 本质仍是"本地采集 → git 推送上线"，只是触发方式从改配置变成 URL 一行搞定。

---

## 部署到 SAE Pages（手动 git 同步）

本模板**纯静态**，把 `public/` 整个目录部署即可：

1. 本地 `npm run sync` 生成最新 `data.js` / `data.json`
2. 提交并推送：
   ```bash
   git add public/data.js public/data.json config.json
   git commit -m "sync repos"
   git push
   ```
3. SAE Pages 绑定该仓库，构建/发布目录设为 `public/`，推送后自动更新。

> 因为是静态站，`data.js` 必须跟随提交（已写入内容，非忽略项）。

---

## 文案处理规则（translation）

| 原始描述 | 处理方式 | 示例 |
|----------|----------|------|
| 纯英文 | 词表级"一些翻译"成中文，未知词保留原文 | `JavaScript 3D Library.` → `JavaScript 3D 库.` |
| 含中文 | 摘取中文部分，去掉英文/噪声 | `:books: 技术面试必备...` → `技术面试必备基础知识、计算机操作系统…` |

如需**更自然的完整翻译**，在 `src/translate.js` 的 `translateEN()` 里接入真实翻译 API（如 LibreTranslate / 有道 / 百度）替换词表逻辑即可，其余流程不变。

---

## 自定义

- **配色**：改 `public/styles.css` 顶部的 CSS 变量（`--accent`、`--bg-surface` 等），暗色在 `html.dark` 块。
- **头像**：替换 `public/images/avatar.svg`（或改 `config.json` 的 `avatar` 指向你的图片）。
- **语言色点**：`public/styles.css` 的 `.lang-*` 类参照 GitHub linguist 颜色。
- **卡片字段**：`public/app.js` 的 `renderRepo()` 调整显示内容。
