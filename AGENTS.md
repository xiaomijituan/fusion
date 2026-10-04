# Fusion / 聚变 — 仓库说明

多 agent 编码工作流的交互式教学模拟器。产品说明见 [README.md](./README.md)，术语表见
[CONTEXT.md](./CONTEXT.md)，设计决策见 [docs/adr/](./docs/adr/)。这份文件只写给改代码的人
（含 AI 编码代理）：怎么跑、哪些是门禁、代码放哪、什么不该提交。

## 跑起来

```bash
npm install
npm run dev -- --port 5273      # 打开 http://127.0.0.1:5273/
```

`npm run dev` / `build` / `preview` 都必须走 npm 脚本：它们经
`scripts/with-app-env.mjs` 把 `.grok/app-env.json`（`VITE_AUTH_ENABLED`）注入环境，
直接跑 `npx vite` 会绕过这层，导致 dev 与构建产物的开关不一致。

## 门禁

本地（Husky，`core.hooksPath=.husky/_`）：

- pre-commit：`npx prettier --check .`（格式化用 `npm run format`，钩子不改写工作树）
- pre-push：`npm run typecheck && npm run lint && npm test`

CI（`.github/workflows/ci.yml`）在此基础上再加 `npm run build`、
`npm run scenario:check` 和一次真实浏览器走查（`node scripts/ci-qa.mjs`：起
production preview，跑 `output/qa-local.mjs` 的全部走查项）。

改完源码至少跑 `npm test`；改了渲染层再跑一次走查，别只信单元测试。

## 代码地图

- `src/lib/scenario.ts` — 剧本 JSON 的 zod 白名单校验 + 归一化（`string | {zh,en}` →
  `{zh,en}`，英文缺省回退中文），错误一次报全。渲染层因此没有语言分支。
- `src/lib/sim.ts` — 纯函数模拟层（`step` / `answer` / `dispatch` / `revealedFor`），
  不碰 React 也不碰存储，确定性在这里单元测试。
- `src/lib/rng.ts` — mulberry32。每个 tick 的随机流由 `(seed, n)` 派生，所以 F5 之后
  同一局仍是同一局（ADR-0003）。
- `src/lib/event-stream.ts` — 唯一运行时产物：JSONL 事件流（ADR-0002 / ADR-0004）。
  状态存 sessionStorage，每次调用读写存储，没有模块级缓存。
- `src/lib/review.ts` — 事件流的**投影**：`parseRun()` 解析 JSONL，`buildReview()` 把决策与它
  引发的跃迁配成一条复盘。只读，不写存储、不重算模拟（ADR-0007）。
- `src/lib/store.ts` — zustand，把上面几层接起来；出厂剧本也走同一个解析器。
- `src/components/` — 视图。`just-app.tsx` 是外壳与键盘流。
- `scenarios/` — 随仓库发布的剧本；`scenarios/TEMPLATE.json` 是最短合法剧本。

## 约定

- 事件流是唯一的记录源。要新视图（课后笔记、导出、统计）就从事件流做**投影**，
  不要新增第二份状态存储。
- 剧本字段是对外契约：新增字段要同时改 `scenario.ts` 的白名单、
  `docs/scenario-format.md` 和 `scenarios/` 里的样例。
- 双语字段一律走归一化，不要在组件里写 `lang === "en" ? …`。
- 注释默认不写；要写就写为什么（隐藏约束、不变量、针对某个 bug 的绕行），不复述代码在做什么。

## 仓库边界（什么不提交）

- `.grok/skills/`、`.grok/references/`、`.grok/AGENTS.grok-build.md`：构建平台自带的指令语料与
  原始沙箱契约，本地开发会读，但不是 Fusion 的内容。
- `任务*.md`、`docs/GIT.md`、`docs/build-log.md`、`docs/grill-checkpoint.md`：只给作者看的
  过程稿。
- `screenshots/`、`output/`（`qa-local.mjs` 除外）、`.vercel/`、`node_modules/`：产物。

## 模板禁区

仓库继承自 App Builder 脚手架，以下几处是平台侧约定，删掉会静默破坏构建或部署：

- `server/`、`scripts/grok-pwa-*`、`public/__grok/`：PWA 与分享卡服务。
- `vite.config.ts` 里的 `grokPwaPlugin()` 与 branding injector：不要移除，也不要用 CSS 藏起
  "Created with Grok" 徽标——那是平台设置，不是代码问题。
- `src/components/preview-host-bridge.tsx`：预览面板与应用的 postMessage 通道，别处挂载是
  noop，删了会切断预览操控。
- 不要新建 `.env`；只有 `VITE_` 前缀的变量能到浏览器。
- 后端与账号默认关闭（ADR-0005：无后端、无排行榜，文件即分享物）。不要引入
  `@/lib/db`、migrations 或 `authMiddleware`。
