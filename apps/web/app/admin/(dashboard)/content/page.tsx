"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_FINAL_CTA,
  DEFAULT_HERO,
  DEFAULT_STEPS,
  type FinalCtaContent,
  type HeroContent,
  type StepsContent,
} from "../../../_landing/content-defaults";

export default function ContentPage() {
  const [loaded, setLoaded] = useState(false);
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [steps, setSteps] = useState<StepsContent>(DEFAULT_STEPS);
  const [finalCta, setFinalCta] = useState<FinalCtaContent>(DEFAULT_FINAL_CTA);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/content")
      .then((r) => r.json())
      .then((d) => {
        const content = d.content ?? {};
        if (content["landing.hero"]) setHero(content["landing.hero"]);
        if (content["landing.steps"]) setSteps(content["landing.steps"]);
        if (content["landing.finalCta"]) setFinalCta(content["landing.finalCta"]);
        setLoaded(true);
      });
  }, []);

  const save = async (key: string, value: unknown) => {
    setSavedKey(null);
    await fetch(`/api/admin/content/${key}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSavedKey(key);
  };

  if (!loaded) return <p className="text-beer-100/60">Loading…</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <h1 className="font-display text-3xl uppercase tracking-wide text-white">Site content</h1>
      <p className="-mt-6 text-sm text-beer-100/50">
        Edits go live on the landing page immediately — no deploy needed.
      </p>

      <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-stout-800 p-5">
        <h2 className="font-display text-xl uppercase text-beer-500">Hero</h2>
        <Field label="Eyebrow" value={hero.eyebrow} onChange={(v) => setHero({ ...hero, eyebrow: v })} />
        <Field
          label="Headline"
          value={hero.headline}
          onChange={(v) => setHero({ ...hero, headline: v })}
        />
        <Field
          label="Headline (emphasized part)"
          value={hero.headlineEm}
          onChange={(v) => setHero({ ...hero, headlineEm: v })}
        />
        <Field label="Body" value={hero.body} onChange={(v) => setHero({ ...hero, body: v })} multiline />
        <SaveButton onClick={() => void save("landing.hero", hero)} saved={savedKey === "landing.hero"} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-stout-800 p-5">
        <h2 className="font-display text-xl uppercase text-beer-500">How it works</h2>
        <Field
          label="Section title"
          value={steps.title}
          onChange={(v) => setSteps({ ...steps, title: v })}
        />
        {steps.steps.map((s, i) => (
          <div key={i} className="rounded-lg border border-white/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-beer-100/50">
              Step {i + 1}
            </p>
            <Field
              label="Title"
              value={s.title}
              onChange={(v) => {
                const next = [...steps.steps];
                next[i] = { ...next[i]!, title: v };
                setSteps({ ...steps, steps: next });
              }}
            />
            <Field
              label="Body"
              value={s.body}
              onChange={(v) => {
                const next = [...steps.steps];
                next[i] = { ...next[i]!, body: v };
                setSteps({ ...steps, steps: next });
              }}
              multiline
            />
          </div>
        ))}
        <SaveButton onClick={() => void save("landing.steps", steps)} saved={savedKey === "landing.steps"} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-stout-800 p-5">
        <h2 className="font-display text-xl uppercase text-beer-500">Final call to action</h2>
        <Field
          label="Eyebrow"
          value={finalCta.eyebrow}
          onChange={(v) => setFinalCta({ ...finalCta, eyebrow: v })}
        />
        <Field
          label="Headline"
          value={finalCta.headline}
          onChange={(v) => setFinalCta({ ...finalCta, headline: v })}
        />
        <SaveButton
          onClick={() => void save("landing.finalCta", finalCta)}
          saved={savedKey === "landing.finalCta"}
        />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-beer-100/50">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2 text-beer-100 outline-none focus:border-beer-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2 text-beer-100 outline-none focus:border-beer-500"
        />
      )}
    </label>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        className="self-start rounded-lg bg-beer-500 px-4 py-2 text-sm font-semibold text-stout-900"
      >
        Save
      </button>
      {saved ? <span className="text-sm text-live">Saved.</span> : null}
    </div>
  );
}
