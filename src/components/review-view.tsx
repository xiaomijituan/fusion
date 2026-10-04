import { useMemo, useRef, useState } from "react";
import { ui } from "@/lib/content";
import { serializeRun } from "@/lib/event-stream";
import { buildReview, parseRun, type ReviewDoc } from "@/lib/review";
import { useFloor } from "@/lib/store";

/**
 * The event stream's first projection (ADR-0002): this view only reads the stream and
 * lays it out. It never stores anything and never recomputes the simulation.
 */
export function ReviewView() {
  const lang = useFloor((s) => s.lang);
  const scenario = useFloor((s) => s.scenario);
  const entered = useFloor((s) => s.entered);
  const t = ui[lang].review;
  const [imported, setImported] = useState<{ name: string; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // A note is a snapshot: it is laid out when you open it, not re-flowed under your feet
  // while the floor keeps ticking — a printed page must not disagree with itself.
  const view = useMemo(() => {
    const text = imported?.text ?? (entered ? serializeRun() : "");
    if (!text.trim()) return null;
    const parsed = parseRun(text);
    if (!parsed.ok) return { errors: parsed.errors, doc: null as ReviewDoc | null };
    return { errors: [] as string[], doc: buildReview(parsed, imported ? null : scenario, lang) };
  }, [imported, entered, scenario, lang]);

  return (
    <section data-testid="review-view" className="review flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-sans text-2xl font-medium tracking-tight">{t.title}</h2>
          <div className="ml-auto flex items-center gap-2 print:hidden">
            <input
              ref={fileRef}
              type="file"
              accept=".jsonl,.ndjson,application/x-ndjson,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImported({ name: file.name, text: await file.text() });
              }}
            />
            <button
              type="button"
              data-testid="review-open"
              onClick={() => fileRef.current?.click()}
              className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs uppercase text-muted hover:text-fg"
            >
              {t.open}
            </button>
            {imported ? (
              <button
                type="button"
                onClick={() => setImported(null)}
                className="rounded-sm border border-border px-3 py-1.5 font-mono text-xs uppercase text-muted hover:text-fg"
              >
                {t.current}
              </button>
            ) : null}
            <button
              type="button"
              data-testid="review-print"
              onClick={() => window.print()}
              className="rounded-sm bg-elevated px-3 py-1.5 font-mono text-xs uppercase text-fg"
            >
              {t.print}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.lead}</p>
        {imported ? (
          <p className="mt-2 font-mono text-[11px] text-subtle">{imported.name}</p>
        ) : null}

        {!view ? (
          <p className="mt-8 font-mono text-sm text-subtle">{t.empty}</p>
        ) : view.errors.length ? (
          <ul data-testid="review-error" className="mt-6 space-y-1 font-mono text-sm text-danger">
            {view.errors.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : view.doc ? (
          <Body doc={view.doc} />
        ) : null}
      </div>
    </section>
  );

  function Body({ doc }: { doc: ReviewDoc }) {
    return (
      <>
        <p className="mt-6 font-mono text-[11px] tracking-wide text-subtle">
          {doc.header.scenario.name} · {doc.header.scenario.version} · seed {doc.header.seed} ·{" "}
          {doc.entries.length} {t.decisions} · {doc.ambient} {t.ambient} · {doc.ticks} {t.ticks} ·{" "}
          {(doc.durationMs / 1000).toFixed(1)}s{doc.end ? ` · ${doc.end.reason}` : ""}
        </p>
        {!doc.known ? (
          <p className="mt-3 rounded-md border border-border bg-elevated p-3 text-sm text-muted">
            {t.unknown}
          </p>
        ) : null}
        {doc.entries.length === 0 ? (
          <p className="mt-8 font-mono text-sm text-subtle">{t.empty}</p>
        ) : (
          <ol className="mt-6 space-y-4">
            {doc.entries.map((entry) => (
              <li
                key={entry.seq}
                data-testid="review-entry"
                className="rounded-md border border-border bg-surface p-4"
              >
                <div className="flex items-baseline gap-3 font-mono text-[11px] text-subtle">
                  <span>{entry.paneId}</span>
                  <span className="rounded-xs border border-border px-1.5 py-0.5 text-accent">
                    {t.kinds[entry.kind]}
                  </span>
                  <span className="ml-auto">n={entry.n}</span>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] tracking-wide text-subtle uppercase">
                      {entry.kind === "dispatch" ? t.choice : t.prompt}
                    </dt>
                    <dd className="mt-0.5 text-fg">
                      {entry.kind === "dispatch"
                        ? (entry.prompt ?? entry.optionId)
                        : (entry.prompt ?? entry.paneId)}
                    </dd>
                  </div>
                  {entry.kind === "dispatch" ? null : (
                    <div>
                      <dt className="text-[11px] tracking-wide text-subtle uppercase">
                        {t.choice}
                      </dt>
                      <dd className="mt-0.5 text-fg">
                        {entry.optionLabel ?? entry.optionId}
                        {entry.taskTitle ? (
                          <span className="ml-2 text-subtle">{entry.taskTitle}</span>
                        ) : null}
                      </dd>
                    </div>
                  )}
                  {entry.caused.length ? (
                    <div>
                      <dt className="text-[11px] tracking-wide text-subtle uppercase">{t.after}</dt>
                      <dd className="mt-0.5 font-mono text-xs text-muted">
                        {entry.caused.map((c) => `${c.from}→${c.to}`).join(" · ")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ol>
        )}
      </>
    );
  }
}
