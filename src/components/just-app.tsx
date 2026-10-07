import { useEffect, useState } from "react";
import { ui } from "@/lib/content";
import { findTask } from "@/lib/scenario";
import { exportRun } from "@/lib/event-stream";
import { startTicker, useFloor } from "@/lib/store";
import { INJECT_MESSAGE_TYPE, buildInjectionResult, readInjection } from "@/lib/scenario-injection";
import { FloorView } from "@/components/floor-view";
import { LibraryView } from "@/components/library-view";
import { ToolsView } from "@/components/tools-view";
import { PlaybookView } from "@/components/playbook-view";
import { ReviewView } from "@/components/review-view";
import { StarField } from "@/components/star-field";
import { cn } from "@/lib/cn";

export function JustApp() {
  const [ready, setReady] = useState(false);
  const entered = useFloor((s) => s.entered);
  const view = useFloor((s) => s.view);
  const lang = useFloor((s) => s.lang);
  const helpOpen = useFloor((s) => s.helpOpen);
  const setHelp = useFloor((s) => s.setHelp);
  const setView = useFloor((s) => s.setView);
  const selectDelta = useFloor((s) => s.selectDelta);
  const jumpBlocked = useFloor((s) => s.jumpBlocked);
  const enter = useFloor((s) => s.enter);

  useEffect(() => {
    setReady(true);
    startTicker();
  }, []);

  // A handbook chapter page can hand us a scenario (ADR-0008). This is deliberately not a
  // second trust channel: the accepted text goes through the same importScenario() as pasting,
  // so it meets the same whitelist and the same size cap, and the host gets our real verdict back.
  useEffect(() => {
    const issueLine = (issue: { path: string; zh: string }) =>
      issue.path ? `${issue.path}: ${issue.zh}` : issue.zh;
    const reply = (ok: boolean, errors: string[], warnings: string[], origin: string) => {
      if (window.parent === window) return; // nowhere to answer: we are not embedded
      window.parent.postMessage(
        buildInjectionResult(ok, errors, warnings),
        origin && origin !== "null" ? origin : "*",
      );
    };
    const onMessage = (event: MessageEvent) => {
      const decision = readInjection(event.data, {
        embedded: window.parent !== window,
        fromParent: event.source === window.parent,
      });
      if (decision.accept) {
        const result = useFloor.getState().importScenario(decision.text);
        reply(
          result.ok,
          result.ok ? [] : result.errors.map(issueLine),
          // A load can succeed with warnings — "已替换同名剧本" among them. Without this the host
          // page would overwrite a stored scenario and hear nothing but ok back.
          result.ok ? result.warnings.map(issueLine) : [],
          event.origin,
        );
        return;
      }
      const body = event.data as { type?: unknown } | null;
      const ours = !!body && typeof body === "object" && body.type === INJECT_MESSAGE_TYPE;
      // Answer a failed load request with the real reason — but only to the parent that asked,
      // so a stranger frame sending this type cannot make us talk to the host page about it.
      if (ours && event.source === window.parent) reply(false, [decision.reason], [], event.origin);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        if (!typing) {
          e.preventDefault();
          setHelp(!useFloor.getState().helpOpen);
        }
        return;
      }
      if (e.key === "Escape") {
        setHelp(false);
        return;
      }
      if (typing) return;
      if (!useFloor.getState().entered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          enter();
        }
        return;
      }
      if (e.key === "1") setView("floor");
      if (e.key === "2") setView("tools");
      if (e.key === "3") setView("playbook");
      if (e.key === "4") setView("library");
      if (e.key === "5") setView("review");
      if (e.key === "Enter" && helpOpen) {
        setHelp(false);
        return;
      }
      if (e.key === "Enter") {
        const st = useFloor.getState();
        if (st.view === "floor") {
          const agent = st.agents.find((a) => a.id === st.selectedId);
          const options = agent
            ? findTask(st.scenario, agent.taskKey)?.question.options
            : undefined;
          if (agent && agent.status === "blocked" && options) {
            e.preventDefault();
            const choice = options.find((o) => o.id !== "kill") ?? options[0];
            if (choice) st.answer(agent.id, choice.id);
          }
        }
        return;
      }
      if (e.key === "j") selectDelta(1);
      if (e.key === "k") selectDelta(-1);
      if (e.key === "n") jumpBlocked();
      if (e.key === "d") {
        e.preventDefault();
        setView("floor");
        document.getElementById("dispatch")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter, helpOpen, jumpBlocked, selectDelta, setHelp, setView]);

  if (!ready) {
    return <div className="min-h-dvh bg-bg" />;
  }

  const t = ui[lang];

  return (
    <div className="min-h-dvh bg-bg text-fg">
      {!entered ? (
        <Landing />
      ) : (
        <div
          className={cn(
            "flex min-h-dvh flex-col",
            view === "floor" && "lg:h-dvh lg:overflow-hidden",
          )}
        >
          <Header />
          <main className="flex min-h-0 flex-1 flex-col">
            {view === "floor" ? <FloorView /> : null}
            {view === "tools" ? <ToolsView /> : null}
            {view === "playbook" ? <PlaybookView /> : null}
            {view === "library" ? <LibraryView /> : null}
            {view === "review" ? <ReviewView /> : null}
          </main>
        </div>
      )}
      {helpOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-4 sm:items-center"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-elevated p-5 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-sans text-xl font-medium tracking-tight">{t.keysTitle}</h2>
              <button
                type="button"
                className="text-xs text-muted hover:text-fg"
                onClick={() => setHelp(false)}
              >
                {t.keysClose}
              </button>
            </div>
            <ul className="space-y-2 font-mono text-sm">
              {t.help.map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-4">
                  <kbd className="rounded-xs border border-border bg-surface px-2 py-1 text-accent">
                    {k}
                  </kbd>
                  <span className="text-muted">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Landing() {
  const lang = useFloor((s) => s.lang);
  const setLang = useFloor((s) => s.setLang);
  const enter = useFloor((s) => s.enter);
  const t = ui[lang];

  return (
    <div className="relative flex min-h-dvh flex-col px-5 py-6 sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <StarField />
      </div>
      <div className="pointer-events-none absolute inset-0 lg:hidden">
        <StarField variant="corner" />
      </div>
      <div className="relative z-10 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-muted uppercase">{t.tag}</span>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 py-12 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-accent uppercase">
            {t.heroKicker}
          </p>
          <h1 className="mt-5 font-sans text-7xl leading-[0.95] font-semibold tracking-tight sm:text-8xl">
            {t.heroBrand}
          </h1>
          <p className="mt-4 font-sans text-3xl font-semibold tracking-[0.34em] sm:text-4xl">
            {t.heroZh}
          </p>
          <p className="mt-9 font-sans text-xl italic text-accent sm:text-2xl">{t.slogan}</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{t.credit}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={enter}
              className="rounded-md bg-accent px-5 py-3 font-mono text-sm font-medium text-accent-fg transition-transform duration-150 hover:opacity-90 active:scale-[0.98]"
            >
              {t.enter}
            </button>
            <span className="font-mono text-xs text-subtle">{t.quoteBy}</span>
          </div>
        </div>
      </div>
      <p className="relative z-10 font-mono text-[11px] text-subtle">{t.footer}</p>
    </div>
  );
}

function Header() {
  const lang = useFloor((s) => s.lang);
  const setLang = useFloor((s) => s.setLang);
  const view = useFloor((s) => s.view);
  const setView = useFloor((s) => s.setView);
  const setHelp = useFloor((s) => s.setHelp);
  const t = ui[lang];
  const items = [
    { id: "floor" as const, label: t.navFloor },
    { id: "tools" as const, label: t.navTools },
    { id: "playbook" as const, label: t.navPlaybook },
    { id: "library" as const, label: t.navLibrary },
    { id: "review" as const, label: t.navReview },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setView("floor")}
          className="shrink-0 font-sans text-base font-medium tracking-tight"
        >
          {t.app}
        </button>
        <nav className="order-last -mx-1 flex w-full basis-full snap-x items-center gap-1 overflow-x-auto px-1 pb-0.5 sm:order-none sm:ml-6 sm:w-auto sm:basis-auto sm:justify-end sm:gap-2 sm:overflow-visible sm:px-0">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "shrink-0 rounded-sm px-3 py-2 font-mono text-xs tracking-wide whitespace-nowrap uppercase",
                view === item.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ExportRunButton />
          <button
            type="button"
            onClick={() => setHelp(true)}
            className="hidden rounded-sm px-2 py-2 font-mono text-xs text-subtle hover:text-fg sm:block"
            aria-label={t.keysTitle}
          >
            ?
          </button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      </div>
    </header>
  );
}

function ExportRunButton() {
  const lang = useFloor((s) => s.lang);
  const t = ui[lang];
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      data-testid="export-run"
      onClick={() => {
        if (!exportRun()) return;
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      }}
      className="shrink-0 rounded-sm border border-border px-3 py-2 font-mono text-xs whitespace-nowrap uppercase tracking-wide text-muted hover:text-fg"
    >
      {saved ? t.exported : t.exportRun}
    </button>
  );
}

function LangToggle({ lang, setLang }: { lang: "en" | "zh"; setLang: (l: "en" | "zh") => void }) {
  return (
    <div className="flex rounded-sm border border-border p-0.5 font-mono text-[11px]">
      <button
        type="button"
        onClick={() => setLang("zh")}
        className={cn(
          "rounded-xs px-2 py-1",
          lang === "zh" ? "bg-elevated text-fg" : "text-subtle",
        )}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "rounded-xs px-2 py-1",
          lang === "en" ? "bg-elevated text-fg" : "text-subtle",
        )}
      >
        EN
      </button>
    </div>
  );
}
