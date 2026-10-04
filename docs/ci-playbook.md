# CI 搭建手册 · Fusion

给这个项目（以及将来的项目二 / 项目三）装质量闸门的完整复盘：怎么分层、怎么装、踩了哪些坑、每次搭 CI 该拷问自己什么。
基线：`184ebaa`（CI run #5 首次全绿）。

---

## 一、分层：谁在什么时候挡你

| 层            | 触发         | 跑什么                                           | 为什么在这层                                   |
| ------------- | ------------ | ------------------------------------------------ | ---------------------------------------------- |
| L1 pre-commit | `git commit` | prettier 整仓（glob 形式，认 `.prettierignore`） | 格式化要快、要便宜，且必须只影响格式           |
| L2 pre-push   | `git push`   | `typecheck` + `lint` + `test`                    | 慢一点的静态检查放这里；比 CI 早 30 秒发现问题 |
| L3 CI         | push / PR    | L2 + `build` + `scenario:check` + 浏览器走查     | 唯一在**干净 Linux 环境**跑的地方，是真相来源  |

原则：**本地层是 CI 的预演，不是替代品**。两层必须跑同一套命令，否则本地绿是假的（我们真踩过，见坑 5）。

---

## 二、搭建步骤（可复制）

```bash
# 0. 先确认远程与网络（本机 github 直连常被掐，走系统代理 + HTTP/1.1）
git remote -v
curl -sI -x http://127.0.0.1:7897 https://github.com -o /dev/null -w "%{http_code}\n"   # 期望 200

# 1. 装工具（官方源不通时用镜像；镜像会写进 lockfile 的 resolved，见坑 2）
npm install --save-dev --registry=https://registry.npmmirror.com husky lint-staged
npx husky init                      # 建 .husky/ 并写 prepare:"husky"、core.hooksPath=.husky/_

# 2. 分层钩子
printf 'npx prettier --ignore-unknown --write .\n' > .husky/pre-commit
printf 'npm run typecheck && npm run lint && npm run test\n' > .husky/pre-push

# 3. 把 vendor 文档划出格式化范围（.prettierignore）
#    至少：package-lock.json、dist/、public/、生成物、第三方文档目录

# 4. CI workflow（.github/workflows/ci.yml）
```

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

```bash
# 5. 提交前先在本地验 CI 会验的东西（含 npm ci 的 lock 一致性）
npx npm@10 ci --dry-run          # 用 CI 那个大版本的 npm 校验 lock
npm run test                     # 数一下用例总数，别只看"0 fail"

# 6. 推送并盯第一跑
git -c http.version=HTTP/1.1 -c http.proxy=http://127.0.0.1:7897 push
# 浏览器开 https://github.com/<owner>/<repo>/actions
```

---

## 三、踩坑实录（症状 → 根因 → 修法）

**坑 1 · push 报 `SSL_ERROR_SYSCALL` / `Connection was reset`**

- 根因：本机直连 github.com 被掐；浏览器能开是因为它走系统代理。
- 修法：`git -c http.version=HTTP/1.1 -c http.proxy=http://127.0.0.1:7897 push`。HTTP/2 经代理会炸 framing，必须降 1.1。

**坑 2 · CI 第一步 `npm ci` 就挂：`Missing: lru-cache@11.5.3 from lock file`**

- 根因：`nitro → unstorage@2.0.0-alpha.7` 的**可选 peer** 要 `lru-cache@^11`，本地 npm 11 把它错去重成 5.1.1 并只报 "invalid"；npm 10（CI 的 node 22 自带）直接判定 lock 不一致。
- 排查关键：本地装 `npx npm@10 ci --dry-run` 能**离线复现**，不用反复推给 CI 试。
- 修法：`npm install --save-dev lru-cache@^11.2.6`，让根装 11.5.3、@babel 嵌套 5.1.1，两个版本都进 lock。

**坑 3 · 16 项测试 `ENOENT .grok/skills/og/SKILL.md`**

- 根因：我把平台脚手架 `.grok/`、`AGENTS.md` 当垃圾忽略了，但平台自带测试**要读这些文件**当契约校验。
- 教训：**"哪些文件是测试的输入"必须在 .gitignore 之前想清楚**。忽略一个目录 = 断掉读它的测试。
- 修法：`.grok/` 与 `AGENTS.md` 入库，只忽略两个运行时戳（`.grok/status`、`.grok/og-pending`）。

**坑 4 · pre-commit 报乱码 `文件名/命令行太长`，提交被自动回滚**

- 根因：lint-staged 把 90 个显式路径一次性传给 prettier，超 Windows 命令行上限；且显式路径**不吃** `.prettierignore`，加 ignore 也没用。
- 修法：pre-commit 改跑 `npx prettier --ignore-unknown --write .`（glob 形式，认 ignore 文件），删掉 `.lintstagedrc`。

**坑 5 · 最阴的一个：本地"测试全绿"其实是假的**

- 症状：`npm run test` 报 `tests 32 / fail 0`，CI 报 195+ 项、8 项失败。
- 根因：脚本写 `node --test 'scripts/**/*.test.mjs'`，单引号 glob 在 Windows（npm 经 cmd 执行）没展开，`scripts/` 下 9 个测试文件**一次都没跑过**。
- 修法：加 `scripts/run-tests.mjs`，用 `fs.globSync` 自己解析文件列表再 spawn `node --test`，跨平台一致；`npm test` 指向它。
- 教训：**门禁的强度等于它对"没跑"的敏感度**。永远核对用例总数，不只看退出码。

**坑 6 · 平台 og 测试与我们的品牌资产天然冲突**

- 症状：`og:title` 期望 "Hello World" 实得 "Fusion · 聚变"；期望占位卡 URL 实得 `https://<host>/og.jpg`。
- 根因：测试不传 `cwd`/`site`，于是读到真实仓库的 `src/lib/og/site.json` 与 `public/og.jpg`。这类测试在**带品牌资产的仓库里永远不可能绿**（我们改名字之前就不绿）。
- 修法：① `site.json` 去掉 `title`，og:title 由页面标题提供（对外结果不变）；② 给两个占位卡测试补空 `cwd` 隔离。改的是测试的环境假设，不是产品行为。

**坑 7 · CI 脚本里 `spawn("npm")` 在 Windows 直接 ENOENT**

- 症状：本地跑 `node scripts/ci-qa.mjs` 报 `spawn npm ENOENT`（CI 的 Linux 上不会）。
- 根因：Windows 上 npm 是 `.cmd` 垫片，`child_process.spawn` 不经 shell 找不到它。与本项目早先 `spawn vite ENOENT` 同一类。
- 修法：别 spawn npm，直接 `spawn(process.execPath, ["scripts/with-app-env.mjs", "vite", "preview"])`——那就是 `npm run preview` 实际执行的东西；收尾用 `taskkill /T /F`（Windows）或杀进程组（POSIX），因为包装器还会派生一个孙进程。
- 附带教训：**在 shell 命令串里写反引号会被当命令替换执行**。我因此误跑了一次 `npm ci`，把 `node_modules` 删到只剩 48 项（dev server 锁住文件让它中途失败，比跑完更糟）。用 Edit 工具改文件，不要用 `node -e "...\`...\`..."`。

---

## 四、每次搭 CI 的拷问清单

1. **本地和 CI 跑的是同一套命令吗？** 同一条 `npm run test`，在两个 OS 上展开的结果一样吗？
2. **用例总数对得上吗？** 本地 `tests N` 与 CI 的 `N` 一致吗？不一致就是有一边根本没跑。
3. **干净环境会缺什么？** CI 的 checkout 里没有：未入库文件、`node_modules` 里的意外、本地环境变量、代理。测试若读仓库内文件，那文件必须入库。
4. **lockfile 在 CI 的 npm 版本下自洽吗？** 本地 npm 大版本 ≠ CI 时，用 `npx npm@<CI版> ci --dry-run` 先问一遍。
5. **失败能在 60 秒定位到步骤吗？** 步骤名要就是命令名；日志里 `#step:N` 能直接指出是哪个脚本。别把五件事塞进一个 shell step。
6. **门禁会不会诱导人绕过？** 越慢越容易被 `--no-verify`。所以：格式化进 pre-commit（快），build/浏览器走查进 CI（慢），别把 3 分钟的东西挂每次 commit。
7. **有没有"永远红"的存量测试？** 先跑一遍裸 CI（不带任何修改）看基线。我们就是这么发现坑 6 的——它跟我的改动无关。
8. **绕过路径有记录吗？** 提交信息里写清"为什么这么修"，否则下一个人会把它"修回去"。

---

## 五、给项目二 / 项目三的裁剪

- **项目三（静态手册站）**：L3 保留 `typecheck + build`，加一步 `linkinator`/死链检查即可；剧本文件与事件流格式要做 **schema 校验步骤**（读项目一发版的规范），这是它唯一的跨仓契约。
- **项目二（真仪表盘，带后端）**：CI 必须加服务层测试与 lint 之外的 `npm audit --omit=dev`；浏览器走查在 CI 里跑得比本地稳（Linux 上装 Chromium 没有端口/代理纠缠），本项目就是这么把走查从手动挪进 CI 的。
- **不要照搬**：本仓把构建平台自带的 `.grok/skills`、`.grok/references` 语料留在本地、不入库——它们是构建环境，不是 Fusion 的内容。项目二/三同理：脚手架文档除非有代码读它，否则别塞进仓库。

## 六、本仓的门禁构成

- 本地（Husky）：pre-commit `prettier --check`，pre-push `typecheck + lint + test`。
- CI（`.github/workflows/ci.yml`）：`npm ci` → `typecheck` → `lint` → `test` → `build` →
  `scenario:check` → 装 Chromium → `node scripts/ci-qa.mjs`（起 production preview，跑
  `output/qa-local.mjs` 的全部走查项）。
- 上面那八个问题就是这套构成的验收单；动门禁之前先自查一遍，别等 CI 告诉你。
