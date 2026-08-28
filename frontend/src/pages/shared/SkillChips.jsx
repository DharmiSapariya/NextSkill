import { useState } from "react";
import { Plus, X } from "lucide-react";

// Deliberately not a <form> — every caller renders this inside its own
// outer <form>, and HTML doesn't allow forms inside forms; the browser
// silently restructures the DOM around a nested one, which broke a submit
// button elsewhere in practice (caught via Playwright, not by eye).
export default function SkillChips({ skills, onAdd, onRemove }) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const value = draft.trim();
    if (value && !skills.includes(value)) onAdd(value);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span key={skill} className="flex items-center gap-1.5 rounded-full bg-periwinkle/30 px-3 py-1 text-sm text-charcoal">
            {skill}
            <button type="button" onClick={() => onRemove(skill)} aria-label={`Remove ${skill}`}>
              <X className="h-3.5 w-3.5 text-charcoal/50 hover:text-charcoal" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a skill you have"
          className="w-full max-w-xs rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest/40"
        />
        <button
          type="button"
          onClick={submit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-forest/15 text-forest hover:bg-forest/5"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
