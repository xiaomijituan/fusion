import { useRef, useState } from "react";
import { ui } from "@/lib/content";
import { shippedScenario, useFloor } from "@/lib/store";
import type { ScenarioIssue } from "@/lib/scenario";
import { cn } from "@/lib/cn";

function IssueRow({ issue }: { issue: ScenarioIssue }) {
  return (
    <li className="text-xs leading-relaxed">
      {issue.path ? <code className="text-subtle">{issue.path}</code> : null}{" "}
      <span className={issue.level === "error" ? "text-blocked" : "text-done"}>
        {issue.level === "error" ? "✕" : "⚠"}
      </span>{" "}
      <span className="text-fg">{issue.zh}</span>
      <span className="block pl-6 text-muted">{issue.en}</span>
      {issue.suggest ? (
        <span className="block pl-6 text-accent">
          ↳ {issue.suggest.zh} / {issue.suggest.en}
        </span>
      ) : null}
    </li>
  );
}

export function LibraryView() {
  const lang = useFloor((s) => s.lang);
  const scenario = useFloor((s) => s.scenario);
  const scenarios = useFloor((s) => s.scenarios);
  const importScenario = useFloor((s) => s.importScenario);
  const removeStored = useFloor((s) => s.removeStored);
  const loadScenario = useFloor((s) => s.loadScenario);
  const setView = useFloor((s) => s.setView);
  const t = ui[lang];
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<ScenarioIssue[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (raw: string) => {
    if (!raw.trim()) return;
    const result = importScenario(raw);
    if (result.ok) {
      setIssues(result.warnings);
      setNote(result.warnings.length ? t.libWarn : t.libOk);
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setIssues(result.errors);
    setNote(t.libFail);
  };

  const rows = [
    { scenario: shippedScenario, shipped: true },
    ...scenarios.map((s) => ({ scenario: s, shipped: false })),
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
      <p className="font-mono text-xs tracking-widest text-subtle uppercase">{t.libTitle}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t.libLead}</p>

      <div className="mt-6 rounded-md border border-border bg-elevated p-4">
        <textarea
          id="scenario-paste"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.libPaste}
          spellCheck={false}
          className="h-36 w-full resize-y rounded-sm border border-border bg-surface p-3 font-mono text-xs text-fg outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="scenario-import"
            onClick={() => submit(text)}
            className="min-h-11 rounded-md bg-accent px-4 font-mono text-sm font-medium text-accent-fg hover:opacity-90"
          >
            {t.libImport}
          </button>
          <label className="min-h-11 flex items-center rounded-md border border-border px-3 font-mono text-xs text-muted hover:text-fg">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                submit(await file.text());
              }}
            />
            {t.libFile}
          </label>
          {note ? (
            <span className={cn("font-mono text-xs", issues.length ? "text-blocked" : "text-done")}>
              {note}
            </span>
          ) : null}
        </div>
        {issues.length ? (
          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            {issues.map((issue, i) => (
              <IssueRow key={`${issue.code}-${issue.path}-${i}`} issue={issue} />
            ))}
          </ul>
        ) : null}
      </div>

      <h2 className="mt-10 font-mono text-xs tracking-widest text-subtle uppercase">
        {t.libStored}
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map(({ scenario: s, shipped }) => {
          const active = s.id === scenario.id;
          return (
            <li
              key={s.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3",
                active ? "bg-elevated" : "bg-surface",
              )}
            >
              <span className="font-mono text-sm text-fg">{s.name[lang]}</span>
              <span className="font-mono text-xs text-subtle">{s.id}</span>
              <span className="font-mono text-xs text-muted">
                {s.panes.length} {t.agents} · {s.hosts.length} {t.hostsLabel} · v{s.version}
                {shipped ? ` · ${t.libShipped}` : ""}
              </span>
              <span className="ml-auto flex items-center gap-2">
                {active ? (
                  <span className="font-mono text-xs text-done">{t.libInUse}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      loadScenario(s);
                      setView("floor");
                    }}
                    className="min-h-11 rounded-md border border-border px-3 font-mono text-xs text-fg hover:border-accent"
                  >
                    {t.libUse}
                  </button>
                )}
                {shipped ? null : (
                  <button
                    type="button"
                    onClick={() => removeStored(s.id)}
                    className="min-h-11 rounded-md px-3 font-mono text-xs text-muted hover:text-fg"
                  >
                    {t.libDelete}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {scenarios.length === 0 ? (
        <p className="mt-3 font-mono text-xs text-subtle">{t.libEmpty}</p>
      ) : null}
    </div>
  );
}
