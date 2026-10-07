# 项目三嵌入方式：iframe + postMessage 注入剧本，跨仓只走发版产物

ADR-0001 要求"嵌入方式（iframe / web component / 构建产物拷贝）另立 ADR"，这条就是那条 ADR。同时它补上一个一直没建的地基：fusion 至今没发过任何版本，而 ADR-0001 规定项目三只能依赖项目一的**发布产物**、不能 import 源码——没有发版产物，跨仓契约就是空的。决定：**章节页持有剧本 JSON，用 postMessage 注入它自己 vendor 的那份 fusion 构建产物 iframe；手册对 fusion 的一切依赖都是 release 资产，按版本号 pin 死。**

## Considered Options

- **URL fetch 加载本**（`?scenario=<url>`）：被拒。Q6 导入边界写明 v1 不做 URL fetch，且这会让模拟器去连第三方域，社区剧本的信任边界（剧本只能是数据）随之失效。
- **submodule 或复制 `src/lib/scenario.ts` 进手册仓**：被拒，直接违反 ADR-0001"只能依赖发布产物，不能 import 其源码"。复制尤其危险——fusion 改了校验规则，手册那份副本不会跟着改，坏投稿会被静默放行。
- **发 npm 包**（`@fusion/scenario` 之类）：被拒（暂时）。要占包名、要跟 fusion 的发布节奏解耦，而大陆装还要等 npmmirror 同步。release 附单文件产物是零安装、CI 里一条 curl 就能拿到的最小方案；真需要复用到别处时再补发 npm，不冲突。
- **web component**：被拒。要 fusion 额外发布并维护一个组件接口，而现在的交互需求只有一个——"把这份剧本装进去"。iframe + 一条消息就够。
- **纯静态预渲染、不做交互**：被拒。ADR-0005 已经把"一章 = 一段正文 + 一个可玩 Scenario"定成内容单元，砍掉交互等于推翻它。

## Consequences

- **注入端点是 fusion 侧唯一核心改动**，已建成（`src/lib/scenario-injection.ts` + `just-app.tsx` 的 `message` 监听）。线上形状：

  ```jsonc
  // 父页 → iframe（只这两个字段，多一个都拒）
  { "type": "fusion:load-scenario", "scenario": "<剧本 JSON 的原文字符串>" }
  // iframe → 父页（同一条消息回给发起方；不是父页发的、或本页没被嵌进来，都不回）
  { "type": "fusion:load-scenario-result", "ok": true, "errors": [] }
  ```

  `scenario` 必须是**文本**而不是已解析的对象：注入不是第二条信任通道，收到的文本走的是与粘贴、拖拽**完全相同**的 `importScenario()` → `parseScenario()` 路径，同一套白名单与尺寸帽，`errors` 就是那套中文报错（`"<path>: <zh>"`）。顶层标签页（`window.parent === window`）对这类消息装聋作哑，非父页面发来的同理。走查 28–31 项盯着这四条：合法注入换机房、坏剧本被拒且机房不跟着换、夹带字段连剧本都不解析、顶层页不收注入。

- **release 资产从 v0.1.0 起固定三件**：`fusion-sim-<ver>.html`（离线单文件模拟器）、`scenario-check.mjs`（剧本校验器）、`review-cli.mjs`（事件流 → 决策表投影）。后两件是打包好的单文件，零浏览器依赖——依据是 `src/lib/review.ts` 只含两个 `import type`、`src/lib/scenario.ts` 只依赖 zod。手册 CI 按 pin 死的版本下载它们，不读 fusion 源码。
- **模拟器是一件自包含的 HTML，不是 zip**（2026-10-07 定）。原写"`fusion-sim-<ver>.zip`"，实现时发现：本仓的生产构建是 TanStack Start + nitro 的 SSR 产物，压根没有可直接双击的 `index.html`；而 `file://` 会拒绝加载模块脚本，散成几个文件就得靠一个本地服务器。所以另走一条 `vite.sim.config.ts`：无路由、无 SSR、无平台插件，JS 与 CSS 全部内联进一个 388KB 的 HTML，双击即起机房，除它自己什么都不取（走查 32–33 项盯着这条）。zip 只会把同一个文件藏起来，白拿一次解压。
- **iframe 装的是手册仓 vendor 的构建产物副本，不链接 fusion 官方部署站。** 否则官方站一挂，全书的交互同时失效；副本能按章节需要单独回滚。
- **兼容窗口沿用剧本格式现状**：应用接受 `schemaVersion ∈ [当前, 当前-1]`，所以手册可以落后 fusion 一个大版本而不烂。手册自身的内容格式版本另立编号，不与剧本的 `schemaVersion` 混用——先例是事件流的 `schemaVersion` 与剧本的版本互不绑定（ADR-0004）。
- **交互只在自有静态站成立，跨渠道必须降级。** 掘金与微信读书过滤 iframe 与原始 HTML，所以同一份章节正文要能编译成纯图文形态（决策表由 `review-cli` 从事件流投影而来，剧本 JSON 作为可复制文本附在文后）。这是渠道事实，不是可选优化。
- 若日后改用 web component 或 npm 包承载嵌入，需推翻本 ADR；改动面比当初直接建端点更大，所以真要换，得有新需求来证。
