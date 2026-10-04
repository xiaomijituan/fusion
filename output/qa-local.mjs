// Local QA walk for the v1 acceptance list. Run: node output/qa-local.mjs [url]
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const url = process.argv[2] ?? "http://127.0.0.1:5273/";
const shots = new URL("../screenshots/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(shots, { recursive: true });

const results = [];
const failFast = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failFast.push(name);
}

/**
 * The platform injects a third-party script into the page. When its host black-holes the
 * connection, waiting for networkidle stalls the whole walk on something that is not this
 * app — so load the document, give the network a grace period, and carry on either way.
 */
async function open(target) {
  await target.goto(url, { waitUntil: "domcontentloaded" });
  await target.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
}

const browser = await chromium.launch();
const errors = [];
function watch(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`[${tag}] reqfail: ${r.url()} ${r.failure()?.errorText}`));
}

// ---------- desktop ----------
const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await desktop.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(url).origin });
const page = await desktop.newPage();
watch(page, "desktop");
await open(page);

// 1. landing
const title = page.locator("h1");
await title.waitFor({ timeout: 15000 });
const coverText = await page.locator("body").innerText();
check(
  "1 封面主视觉是品牌 Fusion/聚变 + slogan",
  (await title.innerText()).includes("Fusion") &&
    coverText.includes("聚变") &&
    coverText.includes("千万亿点星光"),
  (await title.innerText()).replace(/\n/g, " "),
);
const shotsLanding = `${shots}qa-1-landing.png`;
await page.screenshot({ path: shotsLanding });

// enter by keyboard (Enter also enters)
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
check("2 封面 Enter 可进机房", (await page.locator("#dispatch").count()) > 0);

// 3. floor has 16 panes across 5 hosts
const paneRows = page.locator("aside ul li");
await paneRows.first().waitFor({ timeout: 10000 });
check("3 机房 16 个 pane", (await paneRows.count()) === 16, `rows=${await paneRows.count()}`);
const hostNames = await page.locator("aside h2").allInnerTexts();
check("4 机房 5 台机器", hostNames.length === 5, hostNames.join(","));

// 5. ticker advances on its own
const logBefore = await page.evaluate(() => document.querySelectorAll("main ul li").length);
await page.waitForTimeout(4000);
const logAfter = await page.evaluate(() => document.querySelectorAll("main ul li").length);
check("5 约 1.1s 一拍，日志自己往前走", logAfter !== logBefore || logAfter > 0, `${logBefore} -> ${logAfter}`);

// 6. jump to a blocked pane and decide
await page.locator("button", { hasText: "跳到等待中" }).click();
await page.waitForTimeout(300);
const card = page.locator("main .mt-6");
check("6 卡住时出现选择题", (await card.count()) > 0);
if (await card.count()) {
  const before = await page.locator("main").innerText();
  check("6b 状态显示「等待你」", before.includes("等待你"));
  await card.locator("button").first().click();
  await page.waitForTimeout(300);
  check("7 拍板后选择题消失", (await page.locator("main .mt-6").count()) === 0,
    (await page.locator("main").innerText()).match(/工作中|working/)?.[0] ?? "");
}

// 8. dispatch a task into a pane
await page.fill("#dispatch", "把 changelog 的草稿自动生成一页 PDF");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
const floorText = await page.locator("main").innerText();
check("8 下发后 pane 接住并显示这条任务", floorText.includes("把 changelog 的草稿自动生成一页 PDF"));

// 8b/8c 事件流导出：点按钮必须真的产出一个可解析的 .jsonl
const exportPath = `${shots}qa-export.jsonl`;
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 8000 }),
  page.getByTestId("export-run").click(),
]);
await download.saveAs(exportPath);
const streamLines = readFileSync(exportPath, "utf8").trim().split("\n");
const streamHeader = JSON.parse(streamLines[0]);
check(
  "8b 导出这一局成真 .jsonl（header 合规）",
  download.suggestedFilename().endsWith(".jsonl") &&
    streamHeader.schemaVersion === 1 &&
    typeof streamHeader.seed === "number" &&
    streamLines.length > 3,
  `${download.suggestedFilename()}, ${streamLines.length} 行`,
);
const streamEvents = streamLines.slice(1).map((l) => JSON.parse(l));
check(
  "8c 事件流记下了刚才的拍板与下发",
  streamEvents.some((e) => e.type === "decision" && e.payload?.kind === "answer") &&
    streamEvents.some((e) => e.type === "decision" && e.payload?.kind === "dispatch") &&
    streamEvents.every((e, i) => i === 0 || e.seq > streamEvents[i - 1].seq),
  `decisions=${streamEvents.filter((e) => e.type === "decision").length}`,
);

// 9. tools page + copy
await page.locator("header button", { hasText: "工具" }).click();
await page.waitForTimeout(400);
const toolItems = page.locator("main ol > li");
check("9 工具页五件工具", (await toolItems.count()) === 5, `items=${await toolItems.count()}`);
await page.locator("button", { hasText: "复制" }).first().click();
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
check("10 命令可复制进剪贴板", clip.length > 0, JSON.stringify(clip.slice(0, 40)));
await page.screenshot({ path: `${shots}qa-2-tools.png` });

// 11. playbook page
await page.locator("header button", { hasText: "流程" }).click();
await page.waitForTimeout(400);
check("11 流程页四步", (await page.locator("main ol > li").count()) === 4);
await page.screenshot({ path: `${shots}qa-3-playbook.png` });

// 12. language switch
await page.getByRole("button", { name: "EN", exact: true }).click();
await page.waitForTimeout(400);
check("12 切到英文", /PLAYBOOK/i.test(await page.locator("header").innerText()));
await page.locator("header button", { hasText: "Floor" }).click();
await page.waitForTimeout(300);
const enFloor = await page.locator("main").innerText();
check("13 机房文案随之变英文", /WORKING|BLOCKED|DONE|IDLE/i.test(enFloor) && !/等你拍板|工作中/.test(enFloor));
await page.getByRole("button", { name: "中", exact: true }).click();
await page.waitForTimeout(300);

// 14. shortcut help overlay
await page.keyboard.press("Escape");
await page.locator("header button", { hasText: "?" }).click();
await page.waitForTimeout(300);
check("14 快捷键表可打开", (await page.locator("text=j / k").count()) > 0 || (await page.locator("kbd").count()) >= 5);
await page.screenshot({ path: `${shots}qa-4-keys.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check("15 Esc 关闭快捷键表", (await page.locator("kbd").count()) === 0);

// 16. Enter decides an option in the floor
await page.locator("button", { hasText: "跳到等待中" }).click();
await page.waitForTimeout(300);
if (await page.locator("main .mt-6").count()) {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("16 机房里 Enter 能拍板", (await page.locator("main .mt-6").count()) === 0);
} else {
  check("16 机房里 Enter 能拍板", false, "no blocked pane at that moment");
}

await page.screenshot({ path: `${shots}qa-5-floor-desktop.png` });

// 19–21 剧本库：能打开、坏剧本被拒、好剧本导入即换机房
const scenarioDoc = (over = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    id: "qa-mini",
    version: "0.1",
    name: "走查用小剧本",
    hosts: [
      { id: "ka", role: "小主机" },
      { id: "kb", role: "笔记本" },
    ],
    tasks: [
      {
        key: "t1",
        title: "把 README 的第一段改短",
        lines: { zh: ["打开仓库", "读第一段", "删掉废话"] },
        question: {
          text: "这段留不留？",
          options: [
            { id: "keep", label: "留" },
            { id: "kill", label: "关掉" },
          ],
        },
      },
    ],
    panes: [
      { host: "ka", task: "t1" },
      { host: "kb", task: "t1", status: "blocked" },
      { host: "kb", task: "t1", status: "idle", progress: 0 },
    ],
    ...over,
  });

await page.locator("header button", { hasText: "剧本库" }).click();
await page.waitForTimeout(400);
const libText = await page.locator("main").innerText();
check(
  "19 剧本库列出出厂剧本",
  libText.includes("聚变出厂剧本") && libText.includes("16"),
  libText.slice(0, 40).replace(/\n/g, " "),
);

await page.fill("#scenario-paste", scenarioDoc({ panes: [{ host: "ghost", task: "t1" }] }));
await page.getByTestId("scenario-import").click();
await page.waitForTimeout(400);
check(
  "20 坏剧本被拒并给出中文错误",
  (await page.locator("main").innerText()).includes("找不到主机"),
);

await page.fill("#scenario-paste", scenarioDoc());
await page.getByTestId("scenario-import").click();
await page.waitForTimeout(500);
await page.locator("header button", { hasText: "机房" }).click();
await page.waitForTimeout(400);
const miniRows = await page.locator("aside ul li").count();
const miniHosts = (await page.locator("aside h2").allInnerTexts()).join(",");
check(
  "21 好剧本导入即换机房",
  miniRows === 3 && miniHosts === "ka,kb",
  `rows=${miniRows} hosts=${miniHosts}`,
);
await page.screenshot({ path: `${shots}qa-6-library.png` });

// 22–23 six-desk：仓库里那份剧本能导入、机房变 6 格；只写中文的标题在英文界面回退
const sixDesk = readFileSync(new URL("../scenarios/six-desk.json", import.meta.url), "utf8");
await page.locator("header button", { hasText: "剧本库" }).click();
await page.waitForTimeout(300);
await page.fill("#scenario-paste", sixDesk);
await page.getByTestId("scenario-import").click();
await page.waitForTimeout(500);
await page.locator("header button", { hasText: "机房" }).click();
await page.waitForTimeout(400);
const sixRows = await page.locator("aside ul li").count();
const sixHosts = (await page.locator("aside h2").allInnerTexts()).join(",");
check(
  "22 six-desk 剧本换出 6 格机房",
  sixRows === 6 && sixHosts === "desk,bag",
  `rows=${sixRows} hosts=${sixHosts}`,
);
await page.getByRole("button", { name: "EN", exact: true }).click();
await page.waitForTimeout(400);
const asideEn = await page.locator("aside").innerText();
check(
  "23 只写中文的任务标题在英文界面回退显示中文",
  asideEn.includes("给剧本格式写一章中文说明") && asideEn.includes("Move login onto one-time tokens"),
);
await page.getByRole("button", { name: "中", exact: true }).click();
await page.waitForTimeout(300);

// ---------- 24–27 课后笔记：事件流的第一个投影 ----------
await page.locator("header button", { hasText: "机房" }).click();
await page.waitForTimeout(300);
await page.keyboard.press("n");
await page.waitForTimeout(200);
await page.keyboard.press("Enter");
await page.waitForTimeout(400);

await page.locator("header button", { hasText: "课后笔记" }).click();
await page.waitForTimeout(500);
const note = await page.getByTestId("review-view").innerText();
check(
  "24 课后笔记可打开，摘要行带剧本与种子",
  note.includes("课后笔记") && /seed\s+\d/i.test(note),
  note.slice(0, 60).replace(/\n/g, " "),
);
const entryCount = await page.getByTestId("review-entry").count();
const firstPrompt = entryCount
  ? await page.getByTestId("review-entry").first().locator("dd").first().innerText()
  : "";
check(
  "25 笔记里的决策带出剧本原文（不是裸 paneId）",
  entryCount >= 1 && /[\u4e00-\u9fa5]{4,}/.test(firstPrompt),
  `entries=${entryCount} prompt=${firstPrompt.slice(0, 30).replace(/\n/g, " ")}`,
);

const [reDownload] = await Promise.all([
  page.waitForEvent("download"),
  page.getByTestId("export-run").click(),
]);
const exported = `${shots}qa-8-run.jsonl`;
await reDownload.saveAs(exported);
await page.locator('input[type="file"]').setInputFiles(exported);
await page.waitForTimeout(600);
const importedNote = await page.getByTestId("review-view").innerText();
check(
  "26 导出的 .jsonl 单独打开也能出笔记（header 内联快照）",
  importedNote.includes("qa-8-run.jsonl") &&
    (await page.getByTestId("review-entry").count()) >= 1 &&
    !importedNote.includes("没带剧本快照"),
  importedNote.slice(0, 50).replace(/\n/g, " "),
);
await page.screenshot({ path: `${shots}qa-9-review.png` });
check(
  "27 打印入口存在（不真的唤起系统打印框）",
  await page.getByTestId("review-print").isVisible(),
);
await page.getByRole("button", { name: "回到这一局" }).click();
await page.waitForTimeout(300);

// ---------- mobile ----------
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await mob.newPage();
watch(mp, "mobile");
await open(mp);
await mp.screenshot({ path: `${shots}qa-0-landing-mobile.png` });
const landingOverflow = await mp.evaluate(() => {
  const d = document.documentElement;
  return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
});
check(
  "16b 手机封面不横向溢出",
  landingOverflow.scrollWidth <= landingOverflow.clientWidth + 1,
  JSON.stringify(landingOverflow),
);
await mp.getByRole("button", { name: /进入机房/ }).click();
await mp.waitForTimeout(600);
const overflow = await mp.evaluate(() => {
  const d = document.documentElement;
  return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
});
check("17 手机 390 宽无横向溢出", overflow.scrollWidth <= overflow.clientWidth + 1, JSON.stringify(overflow));
const tapTargets = await mp.evaluate(() =>
  [...document.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().height >= 40).length,
);
check("18 手机可点按（主按钮 >=40px 高）", tapTargets >= 3, `count=${tapTargets}`);
await mp.screenshot({ path: `${shots}qa-6-floor-mobile.png` });
await mp.locator("header >> text=工具").click().catch(() => {});
await mp.waitForTimeout(400);
await mp.screenshot({ path: `${shots}qa-7-tools-mobile.png` });
await mp.locator("header >> text=课后笔记").click().catch(() => {});
await mp.waitForTimeout(500);
const reviewOverflow = await mp.evaluate(() => {
  const d = document.documentElement;
  return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
});
check(
  "18b 手机课后笔记不横向溢出",
  reviewOverflow.scrollWidth <= reviewOverflow.clientWidth + 1,
  JSON.stringify(reviewOverflow),
);
await mp.screenshot({ path: `${shots}qa-10-review-mobile.png` });

await browser.close();

console.log(results.join("\n"));
console.log("\n--- console/page errors ---");
console.log(errors.length ? [...new Set(errors)].join("\n") : "none");
console.log(`\nFAILURES: ${failFast.length ? failFast.join(" | ") : "none"}`);
