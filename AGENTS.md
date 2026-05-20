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

- 项目名：世探
- 包名：`shitan-map-social`
- 类型：按地点组织动态流的地图社交 Web App MVP
- 主要目标：用户搜索地点、进入地点页、发布现场文字和图片动态；内容进入审核队列，管理员通过后公开展示，并实时推送给正在浏览该地点的人
- 默认本地访问地址：`http://localhost:3000`
- 默认管理员昵称：`admin`，可通过 `ADMIN_NICKNAME` 修改

## 技术栈

- 框架：Next.js 15 App Router
- 前端：React 19、TypeScript、Tailwind CSS、lucide-react 图标
- 后端：Next.js Route Handlers、自定义 `server.js`
- 实时能力：Socket.IO
- 数据库 ORM：Prisma 6
- 数据库：PostgreSQL / Supabase Postgres
- 登录认证：Supabase Auth
- 校验：Zod
- 图片上传：可选 S3 兼容存储，未配置时使用本地 Data URL 原型模式
- 地图搜索与跳转：高德地图 REST API 和高德 URI
- 外部信息：Open-Meteo 天气、中文维基百科摘要、百度搜索链接

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

本地 PostgreSQL 可用：

```bash
docker compose up -d postgres
```

注意：`npm run lint` 当前脚本是 `next lint`，在较新的 Next.js 版本中可能需要确认是否仍可用。

## 环境变量

`.env.example` 提供环境变量模板。重点变量包括：

- `DATABASE_URL`：Prisma 连接的 Postgres / Supabase Postgres 地址
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：Supabase 前端可用 publishable key
- `ADMIN_NICKNAME`：指定哪个昵称登录后拥有管理员角色，默认是 `admin`
- `AMAP_REST_KEY`：服务端高德地点搜索 key
- `NEXT_PUBLIC_AMAP_WEB_KEY`：前端高德地图渲染 key
- `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PUBLIC_BASE_URL`、`S3_REGION`：S3 兼容图片上传配置

未配置高德 REST key 时，地点搜索会使用内置示例地点：上海交通大学闵行校区、杭州西湖风景名胜区、三里屯太古里。

## 目录结构

- `app/`：Next.js 页面和 API 路由
- `app/page.tsx`：首页搜索入口和地点结果展示
- `app/places/[placeId]/page.tsx`：地点详情页，包含地图、外部线索、热点、发布框和动态流
- `app/admin/page.tsx`：审核后台
- `app/login/page.tsx`：登录/注册页面
- `app/api/`：登录、地点、帖子、评论、审核、上传签名等接口
- `components/`：前端组件，如登录面板、发布框、动态流、高德地图预览
- `lib/`：服务端工具，如认证、Supabase、Prisma、实时推送、地点搜索、动态组装、校验
- `types/`：前端共享类型
- `prisma/schema.prisma`：Prisma 数据模型
- `prisma/migrations/`：数据库迁移，包含 Supabase Auth、RLS、地点解析 RPC、热点信号等变更
- `server.js`：自定义 Next.js + Socket.IO 服务器

## 核心功能流

1. 用户在首页搜索地点。
2. `app/api/places/search/route.ts` 调用 `lib/amap.ts` 搜索高德地点；未配置 key 时返回内置示例。
3. 用户选择地点后，`app/api/places/resolve/route.ts` 调用 Supabase RPC `resolve_place`，把地点写入或复用数据库记录。
4. 地点详情页通过 `app/api/places/[placeId]/route.ts` 获取地点信息。
5. 地点动态通过 `app/api/places/[placeId]/posts/route.ts` 获取，只展示 `approved` 内容。
6. 登录用户可发布动态，动态默认状态为 `pending`。
7. 管理员在 `/admin` 审核帖子和回复。
8. 审核通过后，`lib/realtime.ts` 通过 Socket.IO 向 `place:{placeId}` 房间推送 `post.approved` 或 `comment.approved`。
9. 前端地点页和首页监听 Socket.IO 事件，实时更新动态流。

## 数据模型

Prisma 中的主要模型：

- `User`：用户资料，ID 对应 Supabase `auth.users.id`
- `LoginAccount`：登录账号记录，目前 provider 默认是 `email`
- `Place`：地点信息，包含高德 POI、名称、地址、城市、经纬度
- `Post`：地点动态，包含文字、图片数组、审核状态
- `Comment`：帖子回复，包含文字和审核状态
- `ModerationAction`：管理员审核行为记录

主要枚举：

- `UserStatus`：`active`、`banned`
- `UserRole`：`user`、`admin`
- `ContentStatus`：`pending`、`approved`、`rejected`、`hidden`
- `ModerationActionType`：`approve`、`reject`、`hide`、`ban`

注意：代码中的 `PlaceSignal` 热点功能来自迁移文件和 Supabase 表，当前 `prisma/schema.prisma` 里没有对应 model，相关读写走 Supabase 客户端。

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
- 只有审核通过的帖子和评论会出现在公开动态流。

## 地点信息与外部线索

- 高德地点搜索：`lib/amap.ts`
- 地图预览：`components/AmapPreview.tsx`
- 地点聚合信息接口：`app/api/places/intel/route.ts`
- 天气来源：Open-Meteo
- 百科摘要来源：中文维基百科 REST summary API
- 外部跳转：高德地图、百度搜索、维基百科
- 项目明确避免抓取需要登录或未授权的平台内容。

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

- Tailwind 主题色在 `tailwind.config.ts`：
  - `ink`：深色文字
  - `jade` / `jadeDark`：绿色主色
  - `mint`：浅绿色背景
  - `clay`、`stone`：暖色辅助背景
- 全局样式在 `app/globals.css`。
- UI 风格偏温和、清爽、地图探索感，组件普遍使用圆角、浅边框、柔和阴影。
- 图标主要来自 `lucide-react`。

## 开发注意事项

- 优先保持中文界面文案清晰自然。
- 新增接口时建议继续使用 Zod 做输入校验。
- 写入受保护数据时优先使用 `requireUser` 或 `requireAdmin`。
- 公开读取可以使用 `createSupabaseServerClient`。
- 用户态写入需要使用 `getCurrentSupabaseClient`，让 Supabase RLS 生效。
- 修改实时推送相关逻辑时，同时检查 `server.js`、`lib/realtime.ts` 和前端 Socket.IO 监听。
- 修改数据库结构时，需要同步考虑 Prisma schema、迁移文件、Supabase RLS 策略和前端类型。
- 涉及地点热点 `PlaceSignal` 时，注意它当前不是 Prisma model。
- 不要泄露 `.env` 中的真实密钥。
