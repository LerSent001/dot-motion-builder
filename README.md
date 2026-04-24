# Dot Motion Builder

一个面向点阵动效设计的可视化编辑器。

它的目标很直接：把原本依赖代码和大量参数调试的点阵动画，变成一个可以直接在画布上编辑、预览、组合和导出的网页产品。

## 产品定位

Dot Motion Builder 是一个纯前端、无账号、无 API 依赖的点阵动效编辑工具，适合用于：

- Loading / Spinner 设计
- 点阵图标动效
- 状态提示动效
- 序列帧点阵动画
- 导出给设计或前端继续接入的动效资产

当前项目的数据保存方式为浏览器本地存储（`localStorage`），不会上传到服务器。

## 核心功能

### 1. 无限画布

- 支持在同一画布中创建多个画板
- 支持缩放、拖拽、重置视图
- 支持选中、复制、删除画板

### 2. 动画预设

内置一组适用于点阵动画的 Motion Preset，当前包含：

- 闪烁
- 波浪
- 扫描
- 扩散
- 鱼眼波纹
- 涟漪
- 脉冲
- 螺旋
- 四角优先
- 蛇形
- 棋盘
- 雨滴
- 风车

每个预设都可以继续调整关键属性，例如：

- 方向
- 原点
- FPS 速度
- 点阵数量
- 点阵间距
- 主色
- 发光颜色与范围
- 背景点阵颜色
- 圆角
- 形状

### 3. 序列功能

除单画板动效外，还支持 Sequence 模式：

- 支持连续添加序列帧
- 新增序列帧会复制上一帧内容，便于逐帧微调
- 支持从左到右顺序播放并循环
- 预览时收拢为单个播放区域，停止时恢复为可编辑状态
- FPS 会影响序列播放速度

适合用来制作：

- 状态切换
- 帧动画图标
- Loading 进度变化
- 多步骤视觉演示

### 4. 外观系统

支持统一调整画板和点阵视觉表现：

- 主色
- 发光开关
- 发光颜色
- 发光范围
- 背景点阵颜色
- 点阵容器圆角
- 点阵数量（2x2 到 8x8）
- 点阵间距（0 到 20）
- 点阵形状

### 5. 导出能力

当前支持导出：

- Project JSON
- SVG
- HTML + CSS
- React
- Lottie JSON
- SVGA（Beta）
- PNG Sequence（ZIP 打包）

说明：

- PNG Sequence 会将所有帧统一打包为一个 zip 文件
- 导出时会尽量保持与编辑器预览一致，包括背景、间距、点阵形状和颜色

### 6. 多语言

支持中英文切换：

- 中文（默认）
- English

## 本地开发

### 环境要求

- Node.js 20+
- npm 10+

### 启动方式

```bash
npm install
npm run dev
```

本地开发地址：

```bash
http://127.0.0.1:3000/editor
```

生产启动：

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

## 项目结构

```text
src/
  app/
    editor/              # 编辑器页面
  components/editor/     # 编辑器 UI、画布、预览、导出、颜色选择器
  lib/
    exporters/           # 各类导出逻辑
    motion-presets.ts    # 动效预设
    persistence.ts       # 本地存储
    cell-shapes.ts       # 点阵形状
    canvas-grid-metrics.ts
  stores/
    use-editor-store.ts  # 编辑器状态管理
  types/
    dot-motion.ts        # 核心类型定义
```

## 使用说明

### 新建画板

点击顶部 `+ 新建`，可以创建：

- 自定义画板
- 序列画板

### 编辑点阵

- 直接在画板中点选格子
- 选中后在右侧面板调整外观和动效

### 使用动画预设

1. 选中某个自定义画板
2. 在右侧 `动效预设 / Motion Preset` 中选择一个预设
3. 根据需要继续调整方向、原点、FPS、背景点阵等参数
4. 点击 `预览动画`

### 使用序列

1. 新建一个序列画板
2. 使用顶部的 `+ 序列 / - 序列` 管理帧数
3. 逐帧修改每个点阵状态
4. 点击预览查看循环播放效果

## 数据保存说明

- 当前为纯本地保存
- 数据保存在浏览器 `localStorage`
- 清除浏览器缓存后，本地项目数据会丢失

如果后续需要：

- 云端保存
- 多端同步
- 团队协作
- 版本历史

可以在下一阶段接入后端服务。

## 如何发布给其他人访问

因为这个项目没有 API、没有数据库、没有登录系统，所以**不需要购买传统服务器**也能发布。

最推荐的方案：

### 方案 A：GitHub + Vercel

适合正式给任何人访问。

优点：

- 免费起步
- 对 Next.js 支持最好
- 自动生成公网链接
- 后续可以绑定自定义域名

最短流程：

1. 把项目上传到 GitHub
2. 登录 Vercel
3. Import 这个 GitHub 仓库
4. 直接 Deploy
5. 获得一个公网链接

### 方案 B：本地内网穿透

适合临时给别人试用，不适合正式发布。

例如使用：

- ngrok
- cpolar
- Cloudflare Tunnel

缺点：

- 你的电脑必须一直开着
- 稳定性一般
- 链接可能变化

## 推荐发布路径

如果你的目标是“把链接发给任何人打开就能用”，建议直接用：

**GitHub + Vercel**

更完整的发布步骤可以看：

- [DEPLOY.md](/Users/caicai/Documents/Codex/openclaw/dot-motion-builder/DEPLOY.md)

这是当前这个项目最轻量、最省心、最适合长期使用的方案。

## 上传到 GitHub

如果你已经创建好了一个空仓库，比如：

```bash
https://github.com/<your-name>/dot-motion-builder
```

那本地只需要执行：

```bash
git init
git branch -M main
git add .
git commit -m "feat: initial dot motion builder release"
git remote add origin https://github.com/<your-name>/dot-motion-builder.git
git push -u origin main
```

## 后续可扩展方向

- 云端项目保存
- 模板库同步
- 分享链接
- 导出参数精细化
- 团队协作与版本管理
- 更完整的序列编辑器

## 当前状态

当前版本已经具备可对外演示和使用的产品形态，重点能力包括：

- 动画预设
- 序列编辑
- 外观调节
- 多格式导出
- 纯前端本地存储

适合直接进入公开试用和早期收集反馈阶段。
