# 世探项目理解笔记

> 本文档由通读当前项目文件后整理，目的是帮助后续开发者快速理解项目结构、核心业务流、技术栈和开发注意事项。

## 1. 项目定位

**世探** 是一个按地点组织动态流的地图社交 Web App MVP。

核心体验是：

1. 用户在首页搜索地点。
2. 进入地点详情页，查看地图、天气、百科、外部链接和热点信息。
3. 登录用户可以发布现场文字和图片动态。
4. 新动态和评论先进入审核队列。
5. 管理员审核通过后，内容公开展示，并通过 Socket.IO 推送给正在浏览同一地点的用户。

项目包名是 `shitan-map-social`，默认本地地址是 `http://localhost:3000`。

## 2. 技术栈

- 框架：Next.js 15 App Router
- 前端：React 19、TypeScript、Tailwind CSS
- 图标：lucide-react
- 地图渲染：Leaflet + OpenStreetMap 瓦片
- 后端：Next.js Route Handlers
- 自定义服务：`server.js` 同时启动 Next.js 和 Socket.IO
- 实时能力：Socket.IO
- 数据库：PostgreSQL / Supabase Postgres
- ORM：Prisma 6
- 认证：Supabase Auth
- 数据校验：Zod
- 图片上传：可选 S3 兼容存储；未配置时使用 Data URL 原型模式
- 外部信息：Open-Meteo 天气、中文维基百科摘要、百度搜索、OpenStreetMap 链接

## 3. 常用命令

```bash
npm install
npm run dev
npm run build
npm run start
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio
```

本地 PostgreSQL：

```bash
docker compose up -d postgres
```

注意：在 Windows PowerShell 中，如果 `npm` 被执行策略拦截，可以使用 `npm.cmd run build` 这类形式。

## 4. 重要环境变量

`.env.example` 中提供了模板：

- `DATABASE_URL`：Prisma 连接 PostgreSQL / Supabase Postgres 的地址
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：Supabase 前端 publishable key
- `ADMIN_NICKNAME`：昵称等于该值的用户会成为管理员，默认 `admin`
- `AMAP_REST_KEY`：服务端高德地点搜索 key
- `NEXT_PUBLIC_AMAP_WEB_KEY`：前端高德地图 key，目前代码实际主要使用 Leaflet/OSM
- `S3_ENDPOINT`、`S3_BUCKET`、`S3_REGION`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PUBLIC_BASE_URL`：S3 兼容图片上传配置

不要把真实 `.env` 密钥提交到仓库或写进文档。

## 5. 目录结构

- `app/`：Next.js App Router 页面和 API 路由
- `app/page.tsx`：首页搜索入口、地点结果、登录入口和部分地点内容展示
- `app/places/[placeId]/page.tsx`：地点详情页，包含地图、外部线索、热点、发布框和动态流
- `app/admin/page.tsx`：管理员审核后台
- `app/login/page.tsx`：登录/注册页面
- `app/api/`：认证、地点、动态、评论、审核、图片上传等接口
- `components/`：可复用前端组件，如动态流、登录面板、发布框、地图预览
- `lib/`：服务端工具函数，如认证、Supabase、Prisma、实时推送、地点搜索、动态组装、校验
- `types/`：前端共享类型
- `prisma/schema.prisma`：Prisma 数据模型
- `prisma/migrations/`：数据库迁移，包含 RLS、RPC、热点表等
- `server.js`：自定义 Next.js + Socket.IO 服务
- `netlify.toml`：Netlify 构建配置

## 6. 页面与组件

### 首页 `app/page.tsx`

首页负责：

- 获取当前登录用户 `/api/auth/me`
- 搜索地点 `/api/places/search`
- 解析地点并跳转 `/api/places/resolve`
- 加载地点外部信息 `/api/places/intel`
- 连接 Socket.IO，监听 `post.approved`、`comment.approved`、`post.hidden`

### 地点页 `app/places/[placeId]/page.tsx`

地点页负责：

- 读取地点详情 `/api/places/[placeId]`
- 读取公开动态 `/api/places/[placeId]/posts`
- 读取天气、百科、外部链接 `/api/places/intel`
- 读取热点信号 `/api/places/[placeId]/signals`
- 展示 `PostComposer` 和 `Feed`
- 加入 Socket.IO 房间 `place:{placeId}`

### 管理后台 `app/admin/page.tsx`

后台负责：

- 判断当前用户是否为管理员
- 拉取待审核帖子和评论 `/api/admin/moderation`
- 执行通过、拒绝、隐藏、封禁操作
- 审核通过后由后端触发实时推送

### 关键组件

- `components/LoginPanel.tsx`：登录状态展示、退出登录、登录/注册表单
- `components/PostComposer.tsx`：动态发布框，支持文字和最多 4 张图片
- `components/Feed.tsx`：公开动态流和评论输入
- `components/AmapPreview.tsx`：实际使用 Leaflet 渲染 OpenStreetMap 地图

## 7. API 路由概览

### 认证

- `POST /api/auth/register`：Supabase Auth 注册；密码要求至少 6 位，并包含大小写字母和数字
- `POST /api/auth/login`：Supabase Auth 登录，同步或创建本地 `User` 资料
- `POST /api/auth/logout`：清除 httpOnly cookie
- `GET /api/auth/me`：读取当前用户

服务端通过两个 httpOnly cookie 维护会话：

- `shitan_access_token`
- `shitan_refresh_token`

### 地点

- `GET /api/places/search?q=...`：调用 `lib/amap.ts` 搜索地点；未配置高德 key 时返回内置示例匹配
- `POST /api/places/resolve`：调用 Supabase RPC `resolve_place` 写入或复用地点
- `GET /api/places/[placeId]`：读取单个地点信息
- `GET /api/places/intel`：聚合天气、维基百科和外部链接
- `GET /api/places/[placeId]/signals`：读取地点热点
- `POST /api/places/[placeId]/signals`：登录用户可插入热点信号

### 动态与评论

- `GET /api/places/[placeId]/posts`：读取该地点已审核通过的动态和评论
- `POST /api/places/[placeId]/posts`：登录用户提交动态，默认进入 `pending`
- `POST /api/posts/[postId]/comments`：登录用户评论已公开动态，默认进入 `pending`

### 审核

- `GET /api/admin/moderation`：管理员读取待审核帖子和评论
- `POST /api/admin/moderation/[targetType]/[targetId]/[action]`：管理员执行审核动作

支持的动作：

- 帖子：`approve`、`reject`、`hide`
- 评论：`approve`、`reject`、`hide`
- 用户：`ban`

### 图片上传

- `POST /api/uploads/sign`：登录用户获取上传签名或原型模式返回值

限制：

- 类型：JPG、PNG、WebP
- 单图最大：5MB
- 单条动态最多：4 张图片

## 8. 数据模型

Prisma 主要模型：

- `User`：用户资料，ID 对应 Supabase `auth.users.id`
- `LoginAccount`：登录账号记录，当前 provider 默认为 `email`
- `Place`：地点信息，包含名称、地址、城市、经纬度和 `amapPoiId`
- `Post`：地点动态，包含文字、图片数组、审核状态
- `Comment`：动态评论，包含文字和审核状态
- `ModerationAction`：管理员审核行为记录

主要枚举：

- `UserStatus`：`active`、`banned`
- `UserRole`：`user`、`admin`
- `ContentStatus`：`pending`、`approved`、`rejected`、`hidden`
- `ModerationActionType`：`approve`、`reject`、`hide`、`ban`

注意：`PlaceSignal` 表来自迁移文件，不在当前 `prisma/schema.prisma` 中定义 model，相关读写走 Supabase 客户端。

## 9. 认证与权限设计

认证入口在 `lib/auth.ts`：

- `getCurrentUser()`：从 cookie 读取 access token，调用 Supabase 获取用户，再读取或创建 `User` 资料
- `requireUser()`：要求用户存在且状态为 `active`
- `requireAdmin()`：要求用户为管理员
- `getCurrentSupabaseClient()`：用当前 access token 创建带用户身份的 Supabase client，让 RLS 生效

管理员判断逻辑：

- 用户昵称等于 `ADMIN_NICKNAME` 时，角色设为 `admin`
- 默认管理员昵称是 `admin`

RLS 规则大致是：

- 公开可读地点、公开用户资料、已通过的帖子和评论
- 登录用户可以创建自己的 pending 帖子和评论
- 管理员可以读取和更新全部帖子、评论、用户状态，并写入审核记录

## 10. 数据库迁移与 RPC

重要迁移能力：

- 创建基础枚举和表结构
- 开启 RLS
- 添加登录账号表 `LoginAccount`
- 添加邮件确认请求节流表 `EmailConfirmationRequest`
- 添加地点热点表 `PlaceSignal`
- 创建 `resolve_place` RPC，用于公开地解析和复用地点
- 创建 `submit_post` RPC，用于登录用户提交 pending 动态

`resolve_place` 使用 `security definer`，允许匿名和登录用户调用；它会根据 `amapPoiId` 或地点名+坐标生成稳定 key。

`submit_post` 使用 `auth.uid()` 确认当前用户，并检查用户未被封禁、地点存在，再创建 pending 帖子。

## 11. 实时推送

实时能力由 `server.js` 和 `lib/realtime.ts` 组成：

- `server.js` 创建 HTTP server 和 Socket.IO server
- Socket.IO 连接后监听 `place:join`
- 客户端加入 `place:{placeId}` 房间
- 管理员审核通过帖子后推送 `post.approved`
- 管理员审核通过评论后推送 `comment.approved`
- 帖子被隐藏后推送 `post.hidden`

注意：Netlify 的标准 Next.js 部署不会以常驻 Node 服务器方式运行 `server.js`，因此 Socket.IO 长连接在 Netlify 上需要单独方案，例如第三方实时服务、Supabase Realtime、Pusher、Ably，或改成轮询。

## 12. 外部信息与地图

地点搜索：

- `lib/amap.ts` 调用高德 REST API
- 未配置 `AMAP_REST_KEY` 时，使用内置 fallback 地点

地点信息：

- 天气来自 Open-Meteo
- 百科摘要来自中文维基百科 REST summary API
- 外部链接包含 OpenStreetMap、百度搜索、维基百科

地图展示：

- `components/AmapPreview.tsx` 实际使用 Leaflet + OpenStreetMap
- 组件名仍叫 `AmapPreview`，命名和实际地图来源不完全一致

## 13. 样式与 UI

Tailwind 主题色在 `tailwind.config.ts`：

- `ink`：深色文字
- `jade` / `jadeDark`：绿色主色
- `mint`：浅绿色背景
- `clay`、`stone`：暖色辅助背景

全局样式在 `app/globals.css`，整体风格是温和、浅色、地图探索感，常用浅边框、柔和阴影和圆角。

## 14. 部署注意事项

当前已存在 `netlify.toml`：

```toml
[build]
command = "npm run build"
publish = ".next"
```

部署到 Netlify 时需要配置环境变量，尤其是：

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_NICKNAME`
- `AMAP_REST_KEY`
- S3 相关变量，如果要启用真实图片上传

Netlify 上要特别注意：

- Next.js 页面和 API 路由可以由 Netlify Next runtime 处理
- 自定义 `server.js` 和 Socket.IO 常驻连接不能直接按本地方式运行
- 如果需要保留实时能力，建议改造为 Netlify 兼容的实时方案

## 15. 已知风险与待改进点

1. **源码中大量中文文案疑似乱码**
   - 多个 `.tsx`、`.ts`、`README.md`、`AGENTS.md` 文件在终端读取时出现 mojibake。
   - 这可能是历史编码转换问题。
   - 后续建议统一修复为 UTF-8，并用浏览器实际确认页面展示。

2. **Netlify 与 Socket.IO 不完全兼容**
   - 本地 `server.js` 可以运行 Socket.IO。
   - Netlify 标准 Next.js 部署不适合常驻 WebSocket server。

3. **`PlaceSignal` 未同步到 Prisma schema**
   - 表和 RLS 在迁移中存在。
   - 代码通过 Supabase client 读写。
   - 如果后续希望 Prisma 管理热点，需要补充 model 并重新生成 client。

4. **`LoginAccount` 表目前使用不充分**
   - Prisma schema 和迁移都有该表。
   - 当前登录/注册代码主要同步 `User`，没有明显写入 `LoginAccount` 的业务逻辑。

5. **README 与部分项目说明存在编码问题**
   - 如果新成员直接打开 README，可能会看到乱码。
   - 建议后续重写 README，保留快速启动、环境变量、部署说明和业务流程。

6. **高德与 OSM 命名不一致**
   - 项目早期说明中提到高德地图。
   - 当前地图预览实际是 OpenStreetMap。
   - 可以后续统一产品文案和组件命名。

## 16. 开发约定

- 新增接口优先使用 Zod 做输入校验。
- 写入用户数据时优先使用 `requireUser()` 或 `requireAdmin()`。
- 公开读取可以使用 `createSupabaseServerClient()`。
- 用户身份写入应使用 `getCurrentSupabaseClient()`，保证 Supabase RLS 生效。
- 修改实时推送时，同时检查 `server.js`、`lib/realtime.ts`、地点页和首页的 Socket.IO 监听。
- 修改数据库结构时，同步考虑 Prisma schema、迁移文件、RLS 策略和前端类型。
- 不要泄露 `.env` 中的真实密钥。

## 17. 安全约束

禁止批量删除文件或目录。

不要使用：

```powershell
del /s
rd /s
rmdir /s
Remove-Item -Recurse
rm -rf
```

需要删除文件时，只能一次删除一个明确路径的文件：

```powershell
Remove-Item "C:\path\to\file.txt"
```

如果需要批量删除文件，应停止操作，并请求用户手动删除。
