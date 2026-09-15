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
import { Button } from "../../_ui/button";
import { Card } from "../../_ui/card";
import { Field, Input, Textarea } from "../../_ui/field";
import { PageHeader } from "../../_ui/page-header";

export default function ContentPage() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [steps, setSteps] = useState<StepsContent>(DEFAULT_STEPS);
  const [finalCta, setFinalCta] = useState<FinalCtaContent>(DEFAULT_FINAL_CTA);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    void fetch("/api/admin/content")
      .then((r) => {
        if (!r.ok) throw new Error("load_failed");
        return r.json();
      })
      .then((d) => {
        const content = d.content ?? {};
        if (content["landing.hero"]) setHero(content["landing.hero"]);
        if (content["landing.steps"]) setSteps(content["landing.steps"]);
        if (content["landing.finalCta"]) setFinalCta(content["landing.finalCta"]);
        setLoaded(true);
      })
      .catch(() => setLoadError(true));
  }, []);

  const save = async (key: string, value: unknown) => {
    setSavedKey(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/content/${key}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) {
        setSaveError({ key, message: "Couldn't save — try again." });
        return;
      }
      setSavedKey(key);
    } catch {
      setSaveError({ key, message: "Couldn't reach the server. Check your connection." });
    }
  };

  if (loadError) return <p className="text-red-600">Couldn&rsquo;t load site content. Reload the page to try again.</p>;
  if (!loaded) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Site content" subtitle="Edits go live on the landing page immediately — no deploy needed." />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-beer-700">Hero</h2>
          <div className="flex flex-col gap-4">
            <Field label="Eyebrow">
              <Input value={hero.eyebrow} onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })} />
            </Field>
            <Field label="Headline">
              <Input value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} />
            </Field>
            <Field label="Headline (emphasized part)">
              <Input value={hero.headlineEm} onChange={(e) => setHero({ ...hero, headlineEm: e.target.value })} />
            </Field>
            <Field label="Body">
              <Textarea value={hero.body} onChange={(e) => setHero({ ...hero, body: e.target.value })} rows={2} />
            </Field>
            <SaveRow onClick={() => void save("landing.hero", hero)} saved={savedKey === "landing.hero"} error={saveError?.key === "landing.hero" ? saveError.message : null} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-beer-700">How it works</h2>
          <div className="flex flex-col gap-4">
            <Field label="Section title">
              <Input value={steps.title} onChange={(e) => setSteps({ ...steps, title: e.target.value })} />
            </Field>
            {steps.steps.map((s, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Step {i + 1}</p>
                <Field label="Title">
                  <Input
                    value={s.title}
                    onChange={(e) => {
                      const next = [...steps.steps];
                      next[i] = { ...next[i]!, title: e.target.value };
                      setSteps({ ...steps, steps: next });
                    }}
                  />
                </Field>
                <Field label="Body">
                  <Textarea
                    rows={2}
                    value={s.body}
                    onChange={(e) => {
                      const next = [...steps.steps];
                      next[i] = { ...next[i]!, body: e.target.value };
                      setSteps({ ...steps, steps: next });
                    }}
                  />
                </Field>
              </div>
            ))}
            <SaveRow onClick={() => void save("landing.steps", steps)} saved={savedKey === "landing.steps"} error={saveError?.key === "landing.steps" ? saveError.message : null} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-beer-700">Final call to action</h2>
          <div className="flex flex-col gap-4">
            <Field label="Eyebrow">
              <Input value={finalCta.eyebrow} onChange={(e) => setFinalCta({ ...finalCta, eyebrow: e.target.value })} />
            </Field>
            <Field label="Headline">
              <Input
                value={finalCta.headline}
                onChange={(e) => setFinalCta({ ...finalCta, headline: e.target.value })}
              />
            </Field>
            <SaveRow onClick={() => void save("landing.finalCta", finalCta)} saved={savedKey === "landing.finalCta"} error={saveError?.key === "landing.finalCta" ? saveError.message : null} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SaveRow({
  onClick,
  saved,
  error,
}: {
  onClick: () => void;
  saved: boolean;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" onClick={onClick}>
        Save
      </Button>
      {saved ? <span className="text-sm text-green-600">Saved.</span> : null}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
