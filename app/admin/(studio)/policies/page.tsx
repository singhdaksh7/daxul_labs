"use client";

import React, { useEffect, useState } from "react";
import { SafeMarkdown } from "@/lib/safeMarkdown";
import { Card, Field, inputCls, NoticeBar, Notice, PageHeader, PrimaryButton, readError } from "@/components/admin/content/ui";

type Policy = { slug: string; title: string; content: string };

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [active, setActive] = useState<string>("shipping");
  const [draft, setDraft] = useState<Policy | null>(null);
  const [maxLength, setMaxLength] = useState(50000);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/policies");
      if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
      const j = await res.json();
      setPolicies(j.policies);
      setMaxLength(j.maxLength);
    })();
  }, []);

  useEffect(() => {
    const p = policies.find((x) => x.slug === active);
    setDraft(p ? { ...p } : null);
    setNotice(null);
  }, [active, policies]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setNotice(null);
    const res = await fetch("/api/admin/policies", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) return setNotice({ kind: "error", text: await readError(res) });
    const j = await res.json();
    setPolicies((prev) => prev.map((p) => (p.slug === j.policy.slug ? j.policy : p)));
    setNotice({ kind: "ok", text: j.htmlStripped ? "Saved. Raw HTML was removed from your text." : "Saved." });
  };

  const dirty = draft && policies.find((p) => p.slug === draft.slug) && (draft.title !== policies.find((p) => p.slug === draft.slug)!.title || draft.content !== policies.find((p) => p.slug === draft.slug)!.content);

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle="Markdown subset: # headings, **bold**, *italic*, lists, > quotes, [links](https://...). Raw HTML is stripped on save."
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {policies.map((p) => (
          <button
            key={p.slug}
            onClick={() => setActive(p.slug)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase ${active === p.slug ? "bg-[#C8FF35] text-[#0B0B0C] font-bold" : "bg-[#151515] text-[#B9B9B4] border border-[#242426]"}`}
          >
            {p.slug}
          </button>
        ))}
      </div>

      {draft && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Edit">
            <div className="space-y-4">
              <Field label="Title">
                <input className={inputCls} maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="Content (markdown)" hint={`${draft.content.length.toLocaleString()} / ${maxLength.toLocaleString()} characters`}>
                <textarea
                  className={`${inputCls} font-mono min-h-[360px]`}
                  maxLength={maxLength}
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                />
              </Field>
              <div className="flex items-center gap-3">
                <PrimaryButton onClick={save} disabled={saving || !dirty}>{saving ? "Saving..." : "Save policy"}</PrimaryButton>
                <NoticeBar notice={notice} />
              </div>
            </div>
          </Card>
          <Card title="Live preview (safe render)">
            <h2 className="text-xl font-bold text-[#F3F0E9] mb-4">{draft.title}</h2>
            <SafeMarkdown source={draft.content} className="text-sm text-[#B9B9B4]" />
          </Card>
        </div>
      )}
    </div>
  );
}
