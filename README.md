# 咨询何律师小程序方案

本仓库包含抖音小程序前端示例（`miniapp/`）、Node.js 后端（`backend/`）以及 MySQL 建表 SQL（`sql/schema.sql`），用于收集并筛选愿意支付咨询费的潜在客户，并实现超时自动退款与律师后台管理。

## 目录结构
- `miniapp/`：抖音小程序示例，提供下单、支付、成功页展示。
- `backend/`：Express + MySQL 后端，含支付封装占位、定时退款任务与后台管理页。
- `sql/schema.sql`：数据库建表脚本。

## 启动后端
1. 安装依赖：
   ```bash
   cd backend
   npm install
   ```
2. 复制环境变量模板并填写真实值：
   ```bash
   cp .env.example .env
   ```
   需配置数据库、管理员账号、支付密钥（用于替换占位支付逻辑）。
3. 初始化数据库：执行 `sql/schema.sql`。
4. 启动服务：
   ```bash
   npm run start
   ```

## 启动小程序示例
- 在抖音开发者工具中导入 `miniapp/` 目录。
- 如需调用真实支付能力，请在 `miniapp/app.js` 配置后端地址，并在 `pages/index/index.js` 中替换 `tt.requestPayment` 的占位参数为真实支付返回值。

## 关键业务说明
- 下单接口：`POST /api/orders/create`，创建待支付订单并返回支付参数。
- 支付回调：`POST /api/payment/notify`，校验后写入支付流水并计算最晚答复时间。
- 自动退款：后端使用 `node-cron` 每 5 分钟扫描超时未回答订单并调用退款占位接口。
- 律师后台：访问后端根路径提供的简易管理页，管理员登录后可筛选订单并标记“已回答”，已回答订单不再进入自动退款。
