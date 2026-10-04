import { useState } from "react";
import { tools, ui } from "@/lib/content";
import { useFloor } from "@/lib/store";

export function ToolsView() {
  const lang = useFloor((s) => s.lang);
  const setView = useFloor((s) => s.setView);
  const t = ui[lang];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <p className="font-mono text-xs tracking-widest text-subtle uppercase">{t.toolsKicker}</p>
      <h1 className="mt-2 font-sans text-3xl font-medium tracking-tight sm:text-4xl">
        {t.toolsTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        {t.toolsLead}
      </p>

      <ol className="mt-10 space-y-12">
        {tools.map((tool, i) => {
          const copy = tool[lang];
          return (
            <li key={tool.id} className="border-t border-border pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-sans text-2xl font-medium tracking-tight">
                  <span className="mr-3 font-mono text-sm text-subtle">0{i + 1}</span>
                  {tool.name}
                </h2>
                <a
                  href={tool.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-accent hover:underline"
                >
                  {tool.href.replace(/^https?:\/\//, "")}
                </a>
              </div>
              <p className="mt-3 font-sans text-base italic text-fg">{copy.one}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">{copy.what}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{copy.why}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{copy.how}</p>
              <ul className="mt-5 space-y-2">
                {copy.cmds.map((row) => (
                  <Cmd
                    key={row.cmd}
                    label={row.label}
                    cmd={row.cmd}
                    copiedLabel={t.copied}
                    copyLabel={t.copy}
                  />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => setView("floor")}
        className="mt-12 min-h-11 rounded-md bg-accent px-4 font-mono text-sm font-medium text-accent-fg hover:opacity-90"
      >
        {t.seeFloor}
      </button>
    </div>
  );
}

function Cmd({
  label,
  cmd,
  copiedLabel,
  copyLabel,
}: {
  label: string;
  cmd: string;
  copiedLabel: string;
  copyLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-24 shrink-0 font-mono text-xs text-subtle">{label}</span>
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs text-fg">{cmd}</code>
      <button
        type="button"
        className="min-h-11 shrink-0 self-end font-mono text-xs text-accent hover:underline sm:self-auto"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(cmd);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </li>
  );
}
