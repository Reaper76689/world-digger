# 项目工作说明

## 用户信息

- 英文名：Ryder
- 中文名：子昊
- 身份：软件开发者，专注前端技术和用户体验设计
- 当前阶段：代码新手，但对学习新技术和通过实践成长非常有热情
- 协作偏好：请用清晰、友好的中文解释技术细节，尽量说明“为什么这样做”，帮助理解和成长

## 安全约束

禁止批量删除文件或目录。

不要使用：

```powershell
del /s
rd /s
rmdir /s
Remove-Item -Recurse
rm -rf
```

需要删除文件时，只能一次删除一个明确路径的文件。

正确示例：

```powershell
Remove-Item "C:\path\to\file.txt"
```

如果需要批量删除文件，应停止操作，并请求用户手动删除。

## 项目概览

- 项目名：真探
- 包名：`zhentan-campus-social`
- 当前版本：v0.3
- 类型：面向河南高校的校园现场动态 Web App MVP
- 主要目标：用户先搜索并选择学校/校区，再围绕固定校园点位发布文字和图片动态；内容进入审核队列，管理员通过后公开展示，并推送给正在浏览该校区的人
- 默认本地访问地址：`http://localhost:3000`
- 默认管理员昵称：`admin`，可通过 `ADMIN_NICKNAME` 修改
- 当前 Netlify 生产站点：`https://shitan-map-social-608.netlify.app`
- Netlify 项目名：`shitan-map-social-608`
- Netlify Project ID：`40d05be1-2012-483d-a4c7-0705b8bdaedb`

## 技术栈

- 框架：Next.js 15 App Router
- 前端：React 19、TypeScript、Tailwind CSS、lucide-react 图标
- 后端：Next.js Route Handlers、自定义 `server.js`
- 实时能力：本地开发使用 Socket.IO
- 数据库 ORM：Prisma 6
- 数据库：PostgreSQL / Supabase Postgres
- 登录认证：Supabase Auth
- 校验：Zod
- 图片上传：可选 S3 兼容存储，未配置时使用本地 Data URL 原型模式

## v0.3 业务形态

- v0.3 已从通用地点社交调整为河南高校校园现场动态。
- 校园候选数据位于 `lib/henan-campuses.ts`。
- 选择 Campus 时，系统会创建或复用 Campus 记录，并生成默认 Spot。
- 默认 Spot 包括：食堂、图书馆、教学楼、宿舍、操场、快递站、超市。
- 普通用户当前不能自由创建 Spot。
- 动态默认 24 小时后过期；过期后不删除数据库记录，但不再出现在实时流中。

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run start
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio
```

Windows PowerShell 可能因执行策略拦截 `npm.ps1` / `npx.ps1`。遇到这种情况，优先使用：

```powershell
npm.cmd run build
npx.cmd --cache .\.npm-cache-netlify netlify status
```

本地 PostgreSQL 可用：

```bash
docker compose up -d postgres
```

注意：`npm run lint` 当前脚本是 `next lint`，在较新的 Next.js 版本中可能需要确认是否仍可用。

## Netlify 部署记录与经验

### 当前部署状态

- 2026-05-22 已将 v0.3 部署到 Netlify 生产环境。
- 生产地址：`https://shitan-map-social-608.netlify.app`
- 本次唯一部署地址：`https://6a1074dc0389f9e481a72224--shitan-map-social-608.netlify.app`
- 本次构建日志：`https://app.netlify.com/projects/shitan-map-social-608/deploys/6a1074dc0389f9e481a72224`
- 线上首页基础检查返回 HTTP `200`。

### 部署命令

项目已经通过 `.netlify/state.json` 绑定到 Netlify 项目，`.netlify/` 已加入 `.gitignore`，不要提交该目录。

推荐部署命令：

```powershell
npx.cmd --cache .\.npm-cache-netlify netlify deploy --prod --build
```

原因：

- `--build` 会显式触发 Netlify Build 和 Next.js Runtime。
- 当前 Netlify CLI 会提示 `--build` 已是默认值，但显式保留更利于排障。
- 不带 `--build` 时曾出现长时间无输出并超时的情况。

### Netlify Next.js 配置

当前 `netlify.toml`：

```toml
[build]
command = "npm run build"
publish = ".next"
```

Netlify 会自动使用 Next.js Runtime，把 App Router 页面、Route Handlers、SSR 路由转换成 Netlify Functions / Edge 相关产物。

### Netlify 限制

- Netlify 不会按 `server.js` 启动长期运行的自定义 Node 服务器。
- Socket.IO 长连接在 Netlify Functions 上不能按本地方式稳定运行。
- 页面和 API Route 可以部署；实时推送若要线上稳定，建议后续迁移到 Supabase Realtime、Pusher、Ably 或其他适合 serverless 的实时方案。

### 环境变量

不要把 `.env` 中的真实密钥写入仓库或直接展示在对话中。

Netlify 线上运行通常需要在控制台手动配置：

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_NICKNAME`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

自动执行 `netlify env:import .env` 会批量上传敏感凭据，除非用户明确授权并理解风险，否则不要执行。

## 环境变量

`.env.example` 提供环境变量模板。重点变量包括：

- `DATABASE_URL`：Prisma 连接的 Postgres / Supabase Postgres 地址
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：Supabase 前端可用 publishable key
- `ADMIN_NICKNAME`：指定哪个昵称登录后拥有管理员角色，默认是 `admin`
- `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PUBLIC_BASE_URL`、`S3_REGION`：S3 兼容图片上传配置

## 目录结构

- `app/`：Next.js 页面和 API 路由
- `app/page.tsx`：首页校园搜索入口和结果展示
- `app/campuses/[campusId]/page.tsx`：校区详情页，包含点位、发布框和动态流
- `app/admin/page.tsx`：审核后台
- `app/login/page.tsx`：登录/注册页面
- `app/api/`：登录、校园、点位、帖子、评论、审核、上传签名等接口
- `components/`：前端组件，如登录面板、发布框、动态流
- `lib/`：服务端工具，如认证、Supabase、Prisma、实时推送、校园解析、动态组装、校验
- `types/`：前端共享类型
- `prisma/schema.prisma`：Prisma 数据模型
- `prisma/migrations/`：数据库迁移，包含 Supabase Auth、RLS、校园/点位重构等变更
- `server.js`：本地自定义 Next.js + Socket.IO 服务器

## 核心功能流

1. 用户在首页搜索河南高校或校区。
2. `app/api/campuses/search/route.ts` 使用 `lib/henan-campuses.ts` 返回校园候选。
3. 用户选择校园后，`app/api/campuses/resolve/route.ts` 创建或复用 Campus，并确保默认 Spot 存在。
4. 校区详情页通过 `app/api/campuses/[campusId]/route.ts` 获取校园信息。
5. 点位通过 `app/api/campuses/[campusId]/spots/route.ts` 获取。
6. 动态通过 `app/api/campuses/[campusId]/posts/route.ts` 获取，只展示 `approved` 且未过期内容。
7. 登录用户可发布动态，动态默认状态为 `pending`。
8. 管理员在 `/admin` 审核帖子和回复。
9. 审核通过后，`lib/realtime.ts` 通过 Socket.IO 向校园房间推送事件。

## 数据模型

Prisma 中的主要模型：

- `User`：用户资料，ID 对应 Supabase `auth.users.id`
- `LoginAccount`：登录账号记录，目前 provider 默认是 `email`
- `Campus`：校园/校区信息，包含学校名、校区名、城市、层次、办学属性、来源编码
- `Spot`：校园内固定点位，如食堂、图书馆、教学楼等
- `Post`：校园动态，关联 Campus 和 Spot，包含文字、图片数组、审核状态和过期时间
- `Comment`：帖子回复，包含文字和审核状态
- `ModerationAction`：管理员审核行为记录

主要枚举：

- `UserStatus`：`active`、`banned`
- `UserRole`：`user`、`admin`
- `ContentStatus`：`pending`、`approved`、`rejected`、`hidden`
- `ModerationTargetType`：`post`、`comment`、`user`
- `ModerationActionType`：`approve`、`reject`、`hide`、`ban`

## 认证与权限

- 登录和注册使用 Supabase Auth。
- 服务端通过 `shitan_access_token` 和 `shitan_refresh_token` 两个 httpOnly cookie 维护会话。
- `lib/auth.ts` 提供 `getCurrentUser`、`requireUser`、`requireAdmin` 等工具函数。
- 用户资料写入 Prisma 管理的 `User` 表，同时与 Supabase Auth 用户 ID 对齐。
- 昵称等于 `ADMIN_NICKNAME` 的用户会被赋予 `admin` 角色。
- 被封禁用户状态为 `banned`，`requireUser` 会拒绝其继续发布内容。

## 审核机制

- 帖子和评论创建后默认是 `pending`。
- 管理员可执行：
  - 通过：状态改为 `approved`
  - 拒绝：状态改为 `rejected`
  - 隐藏：状态改为 `hidden`
  - 封禁用户：用户状态改为 `banned`
- 审核操作会写入 `ModerationAction`。
- 只有审核通过且未过期的帖子和评论会出现在公开动态流。

## 图片上传

- 前端发布框：`components/PostComposer.tsx`
- 签名接口：`app/api/uploads/sign/route.ts`
- 限制：
  - 类型：JPG、PNG、WebP
  - 单图最大：5MB
  - 单条动态最多：4 张图片
- 配置 S3 后返回 PUT 签名 URL。
- 未配置 S3 时，前端使用 Data URL 预览和保存，方便 MVP 原型运行。

## UI 与样式

- Tailwind 主题色在 `tailwind.config.ts`。
- 全局样式在 `app/globals.css`。
- UI 风格应保持中文文案清晰、温和、清爽，偏校园现场感。
- 图标主要来自 `lucide-react`。

## 开发注意事项

- 优先保持中文界面文案清晰自然。
- 新增接口时建议继续使用 Zod 做输入校验。
- 写入受保护数据时优先使用 `requireUser` 或 `requireAdmin`。
- 公开读取可以使用 `createSupabaseServerClient`。
- 用户态写入需要使用 `getCurrentSupabaseClient`，让 Supabase RLS 生效。
- 修改实时推送相关逻辑时，同时检查 `server.js`、`lib/realtime.ts` 和前端 Socket.IO 监听。
- 修改数据库结构时，需要同步考虑 Prisma schema、迁移文件、Supabase RLS 策略和前端类型。
- 不要泄露 `.env` 中的真实密钥。
