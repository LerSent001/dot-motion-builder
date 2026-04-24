# 发布说明

这个项目是一个纯前端的 Next.js 应用：

- 不依赖数据库
- 不依赖后端 API
- 不依赖登录系统
- 用户数据保存在各自浏览器的 `localStorage`

这意味着它非常适合轻量部署，**不需要购买传统服务器**。

## 最推荐方案

### GitHub + Vercel

这是最适合当前项目的上线方式。

优点：

- 免费起步
- 配置最少
- 直接生成公网访问链接
- 后续可以绑定你自己的域名
- 每次推送 GitHub 都可以自动更新线上版本

## 第一步：上传到 GitHub

先在 GitHub 上创建一个空仓库，比如：

```text
dot-motion-builder
```

如果你这台电脑第一次提交 Git 仓库，先执行：

```bash
git config --global user.name "你的 GitHub 名称"
git config --global user.email "你的 GitHub 邮箱"
```

然后在本地项目目录执行：

```bash
git init
git branch -M main
git add .
git commit -m "feat: initial dot motion builder release"
git remote add origin https://github.com/<your-name>/dot-motion-builder.git
git push -u origin main
```

如果你已经初始化过仓库，就只需要执行后面几步。

## 第二步：部署到 Vercel

### 方式 A：网页控制台导入 GitHub 仓库

1. 打开 [Vercel](https://vercel.com/)
2. 使用 GitHub 账号登录
3. 点击 `Add New...` -> `Project`
4. 选择你的 `dot-motion-builder` 仓库
5. 保持默认设置直接部署

Vercel 会自动识别这是一个 Next.js 项目。

部署完成后，你会得到一个类似下面的公网链接：

```text
https://dot-motion-builder.vercel.app
```

这个链接就可以直接发给任何人使用。

### 方式 B：使用 Vercel CLI

如果你本机安装了 Vercel CLI，也可以在项目根目录执行：

```bash
npm i -g vercel
vercel
```

首次会提示你登录和绑定项目，后面再次部署就会更快。

## 为什么这个项目适合 Vercel

因为当前项目：

- 没有服务端依赖
- 没有数据库迁移
- 没有环境变量门槛
- 主要是前端交互和本地存储

所以部署复杂度非常低。

## 数据存储说明

需要注意一点：

当前项目的数据保存在用户自己的浏览器本地。

也就是说：

- 你部署到线上后，每个访问者都会在自己的浏览器里保存自己的项目数据
- 数据不会自动同步到别人设备
- 清空浏览器缓存后，本地数据会丢失

这对于演示版、公开试用版、早期产品验证来说通常是够用的。

## 如果你只是临时给别人看

如果你只是想临时发一个链接给别人试试，也可以用内网穿透工具：

- ngrok
- cpolar
- Cloudflare Tunnel

但这不适合正式上线，因为：

- 你的电脑要一直开着
- 链接可能变化
- 稳定性一般

## 推荐结论

如果你的目标是：

**“我想把这个网页产品发链接给任何人直接打开用。”**

最简单方案就是：

**GitHub + Vercel**

它不需要你自己买服务器，也不需要你额外维护后端环境。
