## 本次修改目标

请说明这次 PR 要修复或新增什么功能。

示例：
- 修复 Organization Diagnosis 维度无法新增 / 删除的问题
- 修复多个项目之间数据被覆盖的问题
- 修复 HR / employee demo 登录失败的问题

## 变更范围

- [ ] 前端页面
- [ ] 前端 API client
- [ ] TypeScript types
- [ ] 后端 FastAPI routes
- [ ] 后端 schemas / models
- [ ] 数据库初始化 / SQLite persistence
- [ ] 登录 / 权限
- [ ] Dashboard / Reports
- [ ] 其他：

## 功能验收点

请勾选本次 PR 相关的验收点。

### 基础运行

- [ ] 后端可以启动
- [ ] 后端 `/docs` 可以打开
- [ ] 健康检查接口可以访问
- [ ] 前端可以启动
- [ ] 前端 build 通过

### 登录与角色

- [ ] boss demo 可以登录
- [ ] HR demo 可以登录
- [ ] employee demo 可以登录
- [ ] 不同角色看到的页面和权限符合预期

### 项目与数据隔离

- [ ] 可以创建项目 A
- [ ] 可以创建项目 B
- [ ] 项目 B 不会覆盖项目 A
- [ ] 切换回项目 A 后，项目 A 的数据仍然存在
- [ ] 刷新页面后项目数据仍然存在

### Organization Diagnosis

- [ ] 可以新增维度
- [ ] 可以编辑维度
- [ ] 可以删除维度
- [ ] 维度操作会正确保存到当前项目
- [ ] 删除维度不会影响其他项目

### 回归检查

- [ ] 360 Review 没有被破坏
- [ ] Survey Center 没有被破坏
- [ ] Organization Feedback 没有被破坏
- [ ] Dashboard 没有被破坏
- [ ] Reports 没有被破坏

## 已测试内容

请写清楚你实际跑过哪些命令、看过哪些页面。

```bash
# 示例
pnpm install
pnpm build
pnpm dev:backend
pnpm dev -- --host 0.0.0.0
```

## 手动测试记录

请描述实际操作过程，而不是只写“已测试”。

示例：
1. 使用 boss demo 登录
2. 创建项目 111
3. 进入 Organization Diagnosis，新增维度 A
4. 创建项目 222
5. 进入 Organization Diagnosis，新增维度 B
6. 切回项目 111，确认维度 A 仍然存在，维度 B 不出现

## 需要 Codex / Copilot 重点审查

- [ ] 代码是否真的实现了本次 PR 目标
- [ ] 是否存在前后端 API 不一致
- [ ] 是否存在项目数据覆盖风险
- [ ] 是否破坏 boss / HR / employee 登录
- [ ] 是否破坏旧功能
- [ ] 是否缺少测试或手动验证

## 风险说明

请说明本次修改可能影响的地方，以及还没完全确认的地方。
