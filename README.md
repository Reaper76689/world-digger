# 真探

真探是一个面向河南高校的校园现场动态 Web App MVP。用户先选择具体校区，再围绕食堂、图书馆、教学楼、宿舍、操场、快递站、超市等固定点位发布和查看实时内容。

内容默认先进入审核队列，管理员通过后公开展示；公开内容默认 24 小时后过期，过期后不删除数据库记录，但不会出现在实时流中。

## 快速开始

1. 安装依赖：

```bash
npm install
```

2. 准备环境变量：

```bash
cp .env.example .env
```

3. 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

4. 初始化数据库：

```bash
npm run prisma:migrate
```

5. 启动应用：

```bash
npm run dev
```

默认访问 `http://localhost:3000`。默认管理员昵称是 `admin`，可通过 `ADMIN_NICKNAME` 修改。

## 校园数据

- 第一版只做河南普通高校校园版。
- 校园候选数据位于 `lib/henan-campuses.ts`。
- 178 所河南普通高校全部进入候选列表。
- 已官方核验的多校区学校会拆成 `XX大学（YY校区）`；未核验学校先作为单一 Campus。
- 用户选择 Campus 时，系统会自动创建该 Campus，并生成 7 个默认 Spot：食堂、图书馆、教学楼、宿舍、操场、快递站、超市。
- 第一版不允许普通用户自由创建 Spot。

## Supabase

- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 用于 Supabase Auth 注册/登录。
- `DATABASE_URL` 需要指向同一个 Supabase Postgres 数据库。
- 当前项目使用 Prisma 管理 Campus、Spot、Post、Comment、ModerationAction 等数据。

## 图片上传

`/api/uploads/sign` 已包含图片类型、大小和数量限制。配置 `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PUBLIC_BASE_URL` 后，接口会返回真实 S3 兼容 PUT 签名。

未配置 S3 时，前端会用本地 Data URL 预览和保存，便于原型运行。
