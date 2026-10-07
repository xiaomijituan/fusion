import assert from "node:assert/strict";
import { test } from "node:test";
import { inlineIntoHtml } from "./inline-single-file.mjs";

const html =
  '<!doctype html><html><head><link rel="stylesheet" href="./assets/style.css"></head>' +
  '<body><script type="module" src="./assets/app.js"></script></body></html>';

test("one document, no siblings: css and js both land inside the html", () => {
  const out = inlineIntoHtml(html, { css: "body{color:red}", js: "console.log(1)" });
  assert.ok(out.includes("<style>\nbody{color:red}\n</style>"));
  assert.ok(out.includes('<script type="module">\nconsole.log(1)\n</script>'));
  assert.ok(!out.includes("./assets/"));
});

// The bug this file exists for: String.replace treats $' and $` in a replacement *string* as
// "splice in part of this document". Minified code is full of them.
test("dollar sequences in the payload stay literal", () => {
  const tricky = 'var a = "$\'"; var b = "$`"; var c = "$&";';
  const out = inlineIntoHtml(html, { css: "x{}", js: tricky });
  assert.ok(out.includes('var a = "$\'"'), "前向引用被替换成了文档内容");
  assert.ok(out.includes('var b = "$`"'), "后向引用被替换成了文档内容");
  assert.ok(out.includes('var c = "$&"'), "$& 被替换成了整段匹配");
  assert.equal(out.match(/<!doctype html>/g).length, 1, "文档被自己复制进了脚本里");
});

test("the naive string replacement corrupts the same input (negative control)", () => {
  const tricky = 'var a = "$\'";';
  const naive = html.replace(/<script[^>]*><\/script>/, tricky);
  assert.ok(
    !naive.includes('var a = "$\'"'),
    "naive 版本应当被污染——如果它没被污染，上面的测试是空的",
  );
  assert.ok(naive.includes("</html>"), "被 splice 进来的应该是文档尾部");
});

test("a closing script tag inside the payload cannot close the inline script early", () => {
  const out = inlineIntoHtml(html, { css: "x{}", js: 'console.log("</script>");' });
  assert.equal(out.split("</script>").length - 1, 1, "文档里应当只剩一个真正的闭合标签");
  assert.ok(out.includes("<\\/script>"));
});

test("missing hooks fail loudly instead of shipping a half-built document", () => {
  assert.throws(
    () => inlineIntoHtml("<body><script></script></body>", { css: "a", js: "b" }),
    /样式表/,
  );
  assert.throws(
    () =>
      inlineIntoHtml('<head><link rel="stylesheet" href="a.css"></head>', { css: "a", js: "b" }),
    /script/,
  );
});

test("a second sibling reference left behind is refused", () => {
  const withExtra = html.replace("</body>", '<script src="./assets/chunk-2.js"></script></body>');
  assert.throws(() => inlineIntoHtml(withExtra, { css: "a", js: "b" }), /还引用着同目录文件/);
});
