/**
 * Fold one built CSS file and one built JS file into a single HTML document.
 *
 * Why this exists as its own module: the first version used `String.replace` with a
 * replacement *string*, and minified JS is full of `$'` and `` $` `` — which String.replace
 * treats as "insert part of this very document". The output was a normal-sized HTML file whose
 * script was silently spliced with its own source text. Only opening it in a browser showed that.
 */

const LINK_TAG = /<link\b[^>]*\brel=["']?stylesheet["']?[^>]*>/i;
const MODULE_SCRIPT_TAG = /<script\b[^>]*\btype=["']?module["']?[^>]*>\s*<\/script>/i;
const LEFTOVER_REF = /<script\b[^>]*\ssrc=|<link\b[^>]*\brel=["']?stylesheet["']?/i;

export function inlineIntoHtml(html, { css, js }) {
  if (!LINK_TAG.test(html))
    throw new Error("没有可替换的样式表 link 标签 / no stylesheet link tag");
  if (!MODULE_SCRIPT_TAG.test(html))
    throw new Error("没有可替换的模块 script 标签 / no module script tag");

  const style = `<style>\n${css}\n</style>`;
  // A literal </script> would close the inline tag early; \/ is the same character to JS.
  const code = `<script type="module">\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`;

  // Function replacements: `$` sequences in the payload stay literal.
  const out = html.replace(LINK_TAG, () => style).replace(MODULE_SCRIPT_TAG, () => code);

  const leftover = out.match(LEFTOVER_REF);
  if (leftover) throw new Error(`内联后还引用着同目录文件：${leftover[0]}`);
  return out;
}
