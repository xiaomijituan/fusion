import {
  customLines,
  genericQuestion,
  kindLabel,
  ui,
  type AgentStatus,
  type Lang,
} from "@/lib/content";
import { findHost, findTask, type Scenario } from "@/lib/scenario";
import { cn } from "@/lib/cn";
import { counts, useFloor, type Agent } from "@/lib/store";

const statusFill: Record<AgentStatus, string> = {
  working: "bg-working",
  blocked: "bg-blocked",
  done: "bg-done",
  idle: "bg-idle",
};

const statusText: Record<AgentStatus, string> = {
  working: "text-working",
  blocked: "text-blocked",
  done: "text-done",
  idle: "text-idle",
};

function taskTitle(agent: Agent, lang: Lang, scenario: Scenario) {
  if (agent.customTask) return agent.customTask;
  const def = findTask(scenario, agent.taskKey);
  return def ? def.title[lang] : agent.taskKey;
}

function taskLines(agent: Agent, lang: Lang, scenario: Scenario): string[] {
  if (agent.customTask) {
    const head = lang === "zh" ? `接到任务：${agent.customTask}` : `Got task: ${agent.customTask}`;
    return [head, ...customLines[lang]];
  }
  return findTask(scenario, agent.taskKey)?.lines[lang] ?? [];
}

export function FloorView() {
  const lang = useFloor((s) => s.lang);
  const scenario = useFloor((s) => s.scenario);
  const agents = useFloor((s) => s.agents);
  const selectedId = useFloor((s) => s.selectedId);
  const select = useFloor((s) => s.select);
  const jumpBlocked = useFloor((s) => s.jumpBlocked);
  const flash = useFloor((s) => s.flash);
  const t = ui[lang];
  const c = counts(agents);
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-6">
        <Stat n={c.total} label={t.agents} />
        <Stat n={scenario.hosts.length} label={t.hostsLabel} />
        <Stat n={c.blocked} label={t.blocked} hot={c.blocked > 0} />
        <button
          type="button"
          onClick={jumpBlocked}
          className="ml-auto min-h-11 rounded-md border border-border bg-elevated px-3 font-mono text-xs text-fg hover:border-accent"
        >
          {c.blocked ? t.jumpBlocked : t.noneBlocked}
        </button>
      </div>

      <div className="floor-grid grid min-h-0 flex-1 lg:grid-cols-12">
        <aside className="min-h-0 overflow-y-auto border-b border-border lg:col-span-4 lg:border-r lg:border-b-0 xl:col-span-3">
          <div className="grid grid-cols-5 gap-1 p-3 sm:hidden">
            {agents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => select(a.id)}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-sm border",
                  a.id === selectedId ? "border-accent" : "border-border",
                  flash === a.id ? "ring-1 ring-accent" : "",
                )}
                aria-label={`${a.hostId} ${a.kind} ${t.status[a.status]}`}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    statusFill[a.status],
                    a.status === "working" || a.status === "blocked" ? "animate-pulse-dot" : "",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="hidden sm:block">
            {scenario.hosts.map((host) => {
              const group = agents.filter((a) => a.hostId === host.id);
              return (
                <section key={host.id} className="border-b border-border px-3 py-3 last:border-b-0">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h2 className="font-mono text-xs tracking-wide text-fg">{host.id}</h2>
                    <span className="font-mono text-xs text-subtle">{host.role[lang]}</span>
                  </div>
                  <ul className="space-y-1">
                    {group.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => select(a.id)}
                          className={cn(
                            "flex w-full min-h-11 items-center gap-2 rounded-sm px-2 text-left",
                            a.id === selectedId ? "bg-elevated" : "hover:bg-surface",
                            flash === a.id ? "ring-1 ring-accent" : "",
                          )}
                        >
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              statusFill[a.status],
                              a.status === "working" || a.status === "blocked"
                                ? "animate-pulse-dot"
                                : "",
                            )}
                          />
                          <span className="w-16 shrink-0 font-mono text-xs text-muted">
                            {a.kind}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg">
                            {taskTitle(a, lang, scenario)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-80 flex-1 flex-col lg:min-h-0 lg:col-span-8 xl:col-span-9">
          {selected ? <TerminalPane agent={selected} lang={lang} /> : null}
        </section>
      </div>
    </div>
  );
}

function Stat({ n, label, hot }: { n: number; label: string; hot?: boolean }) {
  return (
    <p className="font-mono text-xs tabular-nums text-muted">
      <span className={cn("text-fg", hot ? "text-blocked" : "")}>{n}</span> {label}
    </p>
  );
}

function TerminalPane({ agent, lang }: { agent: Agent; lang: Lang }) {
  const t = ui[lang];
  const scenario = useFloor((s) => s.scenario);
  const answer = useFloor((s) => s.answer);
  const dispatchText = useFloor((s) => s.dispatchText);
  const setDispatch = useFloor((s) => s.setDispatch);
  const runDispatch = useFloor((s) => s.runDispatch);
  const host = findHost(scenario, agent.hostId);
  const def = findTask(scenario, agent.taskKey);
  const lines = taskLines(agent, lang, scenario);
  const shown = lines.slice(0, agent.revealed);
  const q = agent.customTask ? genericQuestion : def?.question;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <span className="font-mono text-xs text-subtle">{t.attach}</span>
        <span className="font-mono text-xs text-fg">{agent.hostId}</span>
        <span className="font-mono text-xs text-subtle">
          {t.pane} {agent.pane}
        </span>
        <span className="font-mono text-xs text-muted">{kindLabel[agent.kind]}</span>
        <span
          className={cn(
            "ml-auto font-mono text-xs uppercase tracking-wide",
            statusText[agent.status],
          )}
        >
          {t.status[agent.status]}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto bg-surface px-4 py-4 font-mono text-xs leading-relaxed sm:px-6">
        <div className="term-scan absolute inset-0" />
        <p className="relative mb-3 text-subtle">
          {host?.id}:{agent.pane} · {agent.customTask ? t.adhocProject : (def?.project ?? "task")} ·{" "}
          {taskTitle(agent, lang, scenario)}
        </p>
        {agent.status === "idle" && shown.length === 0 ? (
          <p className="relative text-muted">{t.emptyTerm}</p>
        ) : (
          <ul className="relative space-y-1.5">
            {shown.map((line, i) => (
              <li key={`${agent.id}-${i}`} className="text-fg">
                <span className="text-subtle">▸ </span>
                {line}
              </li>
            ))}
            {agent.status === "working" ? (
              <li className="text-working">
                <span className="inline-block h-3 w-1.5 translate-y-0.5 bg-working animate-caret" />
              </li>
            ) : null}
            {agent.status === "done" ? <li className="pt-2 text-done">{t.doneTerm}</li> : null}
          </ul>
        )}

        {agent.status === "blocked" && q ? (
          <div className="relative mt-6 rounded-md border border-border bg-elevated p-4">
            <p className="mb-3 text-xs tracking-wide text-blocked uppercase">{t.answer}</p>
            <p className="mb-4 font-sans text-sm leading-relaxed text-fg">{q.text[lang]}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => answer(agent.id, opt.id)}
                  className={cn(
                    "min-h-11 rounded-md px-3 font-mono text-xs",
                    opt.id === "kill"
                      ? "border border-border text-muted hover:text-fg"
                      : "bg-accent text-accent-fg hover:opacity-90",
                  )}
                >
                  {opt.label[lang]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <form
        className="flex gap-2 border-t border-border p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          runDispatch();
        }}
      >
        <input
          id="dispatch"
          value={dispatchText}
          onChange={(e) => setDispatch(e.target.value)}
          placeholder={t.dispatchPh}
          className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-elevated px-3 font-mono text-sm text-fg outline-none placeholder:text-subtle focus:border-accent"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-md bg-accent px-4 font-mono text-sm font-medium text-accent-fg hover:opacity-90"
        >
          {t.dispatch}
        </button>
      </form>
      <p className="hidden px-4 pb-3 font-mono text-xs text-subtle sm:block">{t.keys}</p>
    </div>
  );
}
