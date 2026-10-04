import { playbook, ui } from "@/lib/content";
import { useFloor } from "@/lib/store";

export function PlaybookView() {
  const lang = useFloor((s) => s.lang);
  const setView = useFloor((s) => s.setView);
  const t = ui[lang];
  const steps = playbook[lang];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <p className="font-mono text-xs tracking-widest text-subtle uppercase">{t.playKicker}</p>
      <h1 className="mt-2 font-sans text-3xl font-medium tracking-tight sm:text-4xl">
        {t.playTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{t.playLead}</p>

      <ol className="mt-10 space-y-0">
        {steps.map((step) => (
          <li
            key={step.n}
            className="relative grid grid-cols-[3.5rem_1fr] gap-4 border-l border-border py-6 pl-6 sm:grid-cols-[4.5rem_1fr]"
          >
            <span className="absolute -left-px top-8 h-2 w-2 -translate-x-1/2 rounded-full bg-accent" />
            <span className="font-mono text-sm tabular-nums text-subtle">{step.n}</span>
            <div>
              <h2 className="font-sans text-xl font-medium tracking-tight">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <blockquote className="mt-8 border-t border-border pt-8">
        <p className="font-sans text-2xl font-medium tracking-tight italic sm:text-3xl">
          {t.quoteLead}
        </p>
        <p className="mt-2 font-sans text-3xl font-medium tracking-tight sm:text-4xl">{t.quote}</p>
      </blockquote>

      <button
        type="button"
        onClick={() => setView("floor")}
        className="mt-10 min-h-11 rounded-md bg-accent px-4 font-mono text-sm font-medium text-accent-fg hover:opacity-90"
      >
        {t.seeFloor}
      </button>
      <p className="mt-8 font-mono text-xs text-subtle">{t.footer}</p>
    </div>
  );
}
