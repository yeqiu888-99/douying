# 项目审查报告

## 1. 总结结论
- 项目代码结构完整度较高：后端 Express 接口、定时任务与前端抖音小程序可在本地串联，数据库脚本齐全，依赖声明完整；但支付与 openid 均为占位实现，需要手动模拟回调才能跑通闭环。【F:backend/src/server.js†L1-L44】【F:sql/schema.sql†L1-L27】【F:miniapp/app.js†L1-L5】【F:miniapp/pages/index/index.js†L39-L86】
- 可部署到测试环境进行业务验证（需配置环境变量、初始化数据库并模拟支付）。距离生产级仍存在关键差距：缺少真实支付/退款 SDK 与验签幂等、真实 openid 获取、Session/输入校验/限流加固、日志与监控、数据库索引与唯一约束等。【F:backend/src/services/paymentService.js†L1-L27】【F:backend/src/middleware/adminAuth.js†L1-L25】【F:backend/src/services/orderService.js†L1-L82】【F:sql/schema.sql†L1-L19】

## 2. 项目结构与技术栈梳理
### 2.1 目录结构概览
- 根目录包含 `backend/`（Express API、定时任务、admin 静态页）、`miniapp/`（抖音小程序示例）、`sql/`（建表脚本）。【F:README.md†L3-L19】

### 2.2 后端技术栈
- Node.js/Express 4.19，使用 `dotenv`、`body-parser`、`cors`、`express-session`、`mysql2/promise`、`node-cron`、`nanoid` 等依赖。【F:backend/package.json†L1-L21】
- 路由与中间件在 `server.js` 注册，定时任务每 5 分钟扫描超时订单并退款。【F:backend/src/server.js†L1-L44】
- 数据库直连使用连接池 `mysql2/promise`，无 ORM。【F:backend/src/utils/db.js†L1-L18】

### 2.3 前端技术栈
- 抖音小程序两页面：下单页 `pages/index`，成功页 `pages/success`；`app.js` 写死 API baseURL。【F:miniapp/app.js†L1-L5】【F:miniapp/app.json†L1-L6】
- 下单页负责展示配置、校验表单、创建订单并占位调用 `tt.requestPayment`。【F:miniapp/pages/index/index.js†L17-L86】【F:miniapp/pages/index/index.ttml†L1-L41】
- 成功页展示订单号、创建时间、最晚答复时间并提供返回入口。【F:miniapp/pages/success/success.js†L1-L20】【F:miniapp/pages/success/success.ttml†L1-L10】

### 2.4 数据库结构
- `consultation_orders`：订单号、openid、昵称、联系方式、问题、reply_limit、金额、状态、支付/退款号、时间戳、摘要、原因；`order_no` 唯一，其他索引缺失。【F:sql/schema.sql†L1-L19】
- `app_config`：电话、服务条款、时间戳。【F:sql/schema.sql†L21-L27】

## 3. 程序与依赖完整性审查
### 3.1 代码引用的文件/目录
- 注册的路由、控制器、服务、静态资源均存在；`admin.html` 位于 `src/public/` 并通过 `express.static` 暴露。【F:backend/src/server.js†L10-L28】【F:backend/src/public/admin.html†L1-L95】

### 3.2 依赖声明
- 所有使用的第三方包均在 `backend/package.json` 中声明；未发现未使用或缺失的依赖。【F:backend/package.json†L1-L21】【F:backend/src/server.js†L1-L9】

### 3.3 路由与中间件映射
- `server.js` 注册 `/api`、`/admin` 路由和 session/CORS/bodyParser，均有实现文件；静态目录映射 `public` 存在。【F:backend/src/server.js†L10-L28】【F:backend/src/routes/api.js†L1-L11】【F:backend/src/routes/admin.js†L1-L11】

### 3.4 数据库表与字段对应
- 订单服务 SQL 使用的字段（`reply_limit_minutes`、`expire_at`、`payment_no` 等）在 `schema.sql` 中均存在且命名一致。【F:backend/src/services/orderService.js†L13-L82】【F:sql/schema.sql†L1-L19】

### 3.5 小程序资源引用
- `app.json` 声明的页面、模板、样式文件均存在；图片与额外资源未引用，不存在缺失文件。【F:miniapp/app.json†L1-L6】【F:miniapp/pages/index/index.ttml†L1-L41】

**完整性评估结论：基本完整但存在若干待补项。**需补：真实支付/退款 SDK 与验签幂等、openid 获取流程、Session/参数校验/安全配置、数据库索引与唯一约束、环境变量校验。补全方案：接入抖音支付 SDK 在 `paymentService` 实现统一下单/验签/退款；前端用 `tt.login` + 后端 code2session 获取 openid；加强 session 配置与输入校验；为订单表补充索引/唯一约束并在启动时检查必要 env。 

## 4. 后端代码质量与设计审查
### 4.1 分层与职责
- 路由→控制器→服务→DB 边界清晰，定时任务直接复用 `orderService`，结构合理但缺少幂等与日志持久化。【F:backend/src/server.js†L34-L44】【F:backend/src/services/orderService.js†L45-L82】

### 4.2 业务流程完整性
1. 创建订单：`POST /api/orders/create` 校验必填后插入 DB 并返回支付参数。【F:backend/src/controllers/orderController.js†L1-L20】【F:backend/src/services/orderService.js†L13-L33】
2. 拉起支付：前端使用占位 `tt.requestPayment`，未真实调用支付网关。【F:miniapp/pages/index/index.js†L39-L86】
3. 支付回调：`POST /api/payment/notify` 调用 `verifyPaymentCallback`（当前信任 payload）后标记支付。【F:backend/src/controllers/orderController.js†L22-L33】【F:backend/src/services/paymentService.js†L19-L27】
4. 标记已支付并计算超时：`markPaid` 更新状态 `pending_answer`、设置 `expire_at`，金额从分转元写入。【F:backend/src/services/orderService.js†L35-L49】
5. 定时任务退款：cron 每 5 分钟查询超时 `pending_answer`，调用 `processRefund` 更新状态及原因。【F:backend/src/server.js†L34-L44】【F:backend/src/services/orderService.js†L68-L82】
6. 管理后台：登录后可列表、详情、标记已回答；已回答订单不会被退款逻辑再处理。【F:backend/src/routes/admin.js†L1-L11】【F:backend/src/controllers/adminController.js†L1-L36】
- 断点：支付回调无验签/幂等；退款/支付为 mock，真实业务需替换；后台无鉴权防护（弱密码、无 CSRF）。

### 4.3 安全性与健壮性
- 回调验签与幂等缺失，`verifyPaymentCallback` 直接返回 payload，易被伪造；`markPaid` 未检查状态幂等更新。【F:backend/src/services/paymentService.js†L19-L27】【F:backend/src/services/orderService.js†L35-L49】
- Session 使用内存存储，`cookie` 未配置安全属性，生产易受会话劫持；登录仅比对明文 env 用户/密码且无限次尝试。【F:backend/src/middleware/adminAuth.js†L1-L25】
- 输入校验仅在创建订单与回答摘要处做非空校验，未使用统一验证层；SQL 依赖参数化但缺少业务规则校验与长度限制。【F:backend/src/controllers/orderController.js†L1-L20】【F:backend/src/controllers/adminController.js†L22-L36】
- CORS 全局放开，错误处理中直接返回 500，缺少分级日志，可能泄露敏感堆栈（console）。【F:backend/src/server.js†L18-L30】

### 4.4 可运维性
- 环境变量未在启动时校验必填项；`.env.example` 提供模板但代码未防空。【F:backend/.env.example†L1-L17】【F:backend/src/utils/db.js†L1-L18】
- 无统一日志/审计，退款/支付日志仅 console；缺少 Docker 与 CI/CD 配置。

## 5. 前端（抖音小程序）代码审查
### 5.1 配置与接口调用
- `apiBase` 写死本地地址，需按环境切换；openid 使用 `'mock-openid'`；支付参数直接沿用返回值但为占位。【F:miniapp/app.js†L1-L5】【F:miniapp/pages/index/index.js†L58-L78】
- 成功页倒计时基于前端当前时间计算，未从后端读取实际 `expire_at`，存在偏差风险。【F:miniapp/pages/success/success.js†L1-L20】

### 5.2 交互与校验
- 表单校验覆盖昵称/联系方式/问题长度，未防止重复提交或支付按钮防抖；错误提示使用 toast，缺少失败重试与客服入口。【F:miniapp/pages/index/index.js†L43-L86】

### 5.3 与后端契合度
- 创建订单字段与后端一致（`reply_limit_minutes`、`nickname` 等）；支付字段为 mock，需替换为后端签名字段后方可调用 `tt.requestPayment`。【F:miniapp/pages/index/index.js†L58-L78】【F:backend/src/services/paymentService.js†L1-L18】

## 6. 数据库 schema 与代码匹配性
### 6.1 表与字段
- `consultation_orders` 字段：order_no、douyin_openid、nickname、contact、question、reply_limit_minutes、amount、status、payment_no、refund_no、时间戳等；`amount` 默认 200.00，状态无默认值。【F:sql/schema.sql†L1-L19】
- `app_config` 字段：phone_number、service_terms 及时间戳。【F:sql/schema.sql†L21-L27】

### 6.2 字段/索引问题
- 订单表缺少 `status, expire_at` 联合索引支撑定时扫描；`payment_no`/`refund_no` 未唯一，幂等风险；状态无默认值导致插入需显式传值。【F:sql/schema.sql†L1-L19】【F:backend/src/services/orderService.js†L13-L49】

### 6.3 支撑性判断与修改建议
- 现有 schema 可支撑当前查询/更新，但缺少索引/默认值会影响性能与一致性。建议：
  - 为 `status, expire_at` 建联合索引；`payment_no` 唯一；`status` 默认 `pending_pay`；`paid_at`/`expire_at` 允许 NULL；保留金额单位统一（建议全用分存储）。
  - 示例 SQL：
    ```sql
    ALTER TABLE consultation_orders
      MODIFY status VARCHAR(32) NOT NULL DEFAULT 'pending_pay',
      ADD INDEX idx_status_expire (status, expire_at),
      ADD UNIQUE KEY uk_payment_no (payment_no);
    ```

## 7. 部署条件与环境要求评估
### 7.1 测试环境可部署条件与步骤
- 前置条件：Node.js 18+、MySQL 5.7/8；准备 `.env`（数据库、管理员账号、SESSION_SECRET、可选业务配置、端口）。【F:backend/.env.example†L1-L17】
- 步骤：1) `npm install` 安装后端依赖；2) 执行 `sql/schema.sql` 初始化数据库；3) 复制 `.env.example` 为 `.env` 并填值；4) `npm run start` 启动后端；5) 抖音开发者工具导入 `miniapp/`，配置请求域名为后端地址，支付回调可用 Postman 模拟 `POST /api/payment/notify`。
- 阻碍点：无真实支付/退款与 openid，需模拟；Session 内存存储不适合多实例。

### 7.2 生产部署差距与建议
- 支付安全（高）：接入抖音支付 SDK，验签、金额校验、幂等（payment_no 唯一）与退款失败补偿机制。【F:backend/src/services/paymentService.js†L1-L27】
- 身份与会话（高）：使用 `tt.login` + 后端 code2session 获取 openid；Session 存 Redis，启用 `cookie` 安全属性与 CSRF 保护。【F:backend/src/middleware/adminAuth.js†L1-L25】
- 参数校验与风控（中）：统一校验层、限流/防重放、管理员登录失败锁定。【F:backend/src/controllers/orderController.js†L1-L20】
- 监控与日志（中）：接入结构化日志、审计支付/退款、报警；持久化错误跟踪。
- 数据库与备份（中）：添加索引/约束，定期备份，使用迁移脚本。
- 运维（低）：Dockerfile、docker-compose、CI/CD pipeline、配置分环境化。

## 8. 具体优化与重构建议
### 8.1 后端
- 支付回调验签与幂等示例：
  ```js
  // paymentService.js
  export async function verifyPaymentCallback(rawBody, signature) {
    const valid = sdk.verify(rawBody, signature, process.env.PAY_SECRET);
    if (!valid) throw new Error('invalid sign');
    return JSON.parse(rawBody);
  }

  // orderController.js
  export async function paymentNotifyHandler(req, res) {
    try {
      const payload = await verifyPaymentCallback(req.rawBody, req.headers['x-sign']);
      await withTransaction(async (conn) => {
        const order = await getOrderByNo(conn, payload.order_no);
        if (!order || order.status !== 'pending_pay') return; // 幂等
        await markPaidTx(conn, payload);
      });
      res.json({ code: 'SUCCESS' });
    } catch (e) {
      res.status(400).json({ code: 'FAIL', message: 'invalid callback' });
    }
  }
  ```
- Session 安全配置示例（使用 Redis）：
  ```js
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 12 * 3600 * 1000 }
  }));
  ```
- 输入参数统一校验中间件：
  ```js
  function validate(schema) {
    return (req, res, next) => {
      const errors = Object.entries(schema)
        .filter(([k, rule]) => !rule(req.body[k]))
        .map(([k]) => k);
      if (errors.length) return res.status(400).json({ message: `缺少/非法参数:${errors.join(',')}` });
      next();
    };
  }
  router.post('/orders/create', validate({
    nickname: v => typeof v === 'string' && v.trim() && v.length <= 64,
    contact: v => typeof v === 'string' && v.trim(),
    question: v => typeof v === 'string' && v.trim().length >= 20,
    reply_limit_minutes: v => Number.isInteger(v) && v > 0,
    douyin_openid: v => typeof v === 'string' && v.trim(),
  }), createOrderHandler);
  ```

### 8.2 前端小程序
- 获取真实 openid 流程：`tt.login` 获取 code → 后端 `code2session` 换 openid → 存入 `globalData`，创建订单时携带；失败时提示重新授权。
- 支付与错误处理优化：
  ```js
  async submit() {
    if (this.data.submitting) return;
    const err = this.validateForm();
    if (err) return tt.showToast({ title: err, icon: 'none' });
    this.setData({ submitting: true });
    try {
      const openid = await ensureOpenid();
      const { data } = await tt.request({ url: `${api}/orders/create`, method: 'POST', data: { ...form, reply_limit_minutes: limit, douyin_openid: openid } });
      await tt.requestPayment({ ...data.payParams,
        success: () => tt.navigateTo({ url: `/pages/success/success?orderNo=${data.orderNo}` }),
        fail: (e) => tt.showToast({ title: e.errMsg || '支付失败，请重试', icon: 'none' })
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
  ```

### 8.3 数据库与运维
- 建表优化示例同 6.3；如需金额存分可将 `amount INT NOT NULL`，配合业务换算。
- 容器化示例：
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY backend/package*.json ./
  RUN npm ci --only=production
  COPY backend/src ./src
  ENV NODE_ENV=production
  CMD ["node", "src/server.js"]
  ```
  ```yaml
  services:
    api:
      build: .
      env_file: ./backend/.env
      ports: ["3000:3000"]
      depends_on: [db]
    db:
      image: mysql:8
      environment:
        MYSQL_DATABASE: consultation
        MYSQL_ROOT_PASSWORD: pass
      volumes:
        - ./sql/schema.sql:/docker-entrypoint-initdb.d/schema.sql
  ```

## 9. 后续工作优先级清单
- 高：接入支付/退款 SDK，完成验签与幂等；实现 openid 获取；Session 安全（Redis 存储、cookie 安全）；为支付回调增加事务与状态检查。
- 中：参数校验/限流、管理员登录防爆破；结构化日志与监控，支付/退款审计；数据库索引与唯一约束、迁移脚本；成功页从后端获取 `expire_at`。
- 低：前端 UX（防重复提交、状态查询、客服入口）、后台权限与操作日志、文档与 Docker/CI 配置完善。
