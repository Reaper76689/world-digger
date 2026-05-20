# 世探

世探是一个按地点组织动态流的地图社交 Web App MVP。用户可以搜索地点、进入地点页、发布文字和图片动态；内容先进入审核队列，管理员通过后会公开展示并实时推送给正在浏览该地点的人。

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

## 地图和搜索

- `AMAP_REST_KEY` 用于服务端地点搜索。
- `NEXT_PUBLIC_AMAP_WEB_KEY` 用于前端高德地图渲染。
- 未配置高德 key 时，搜索会使用内置示例地点，方便本地演示。

## 图片上传

`/api/uploads/sign` 已包含图片类型、大小和数量限制。配置 `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_PUBLIC_BASE_URL` 后，接口会返回真实 S3 兼容 PUT 签名。

未配置 S3 时，前端会用本地 Data URL 预览和保存，便于原型运行。
