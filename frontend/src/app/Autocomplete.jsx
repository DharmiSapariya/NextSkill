import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, X, Search } from "lucide-react";
import { cn } from "../lib/cn";

// ---------------------------------------------------------------------------
// A real typeahead: as soon as the user types, getOptions(query) is called
// (debounced) and matches drop down below the input — arrow keys move the
// active row, Enter selects it, Escape or an outside click closes it.
// getOptions may return an array directly (static/local filtering) or a
// Promise (an API-backed search), so the same component covers both the
// fixed 21-role list and live /skills or /companies lookups.
//
// Everything below the original core loop is additive and optional:
//   - renderOption / getGroup let a caller customize rows or group them
//     without changing how the ~10 existing plain-string call sites work.
//   - recentKey turns on a small "recently picked" list (per browser, per
//     field) shown before the user has typed anything.
//   - Rejected getOptions promises now surface as an inline error instead
//     of silently leaving the dropdown empty (the original had no .catch).
//   - Full combobox ARIA wiring (role, aria-expanded/-activedescendant,
//     listbox/option roles) so it's usable with a screen reader, not just
//     visually.
// None of it changes the default look or behavior for a caller that only
// passes the original props.
// ---------------------------------------------------------------------------

const RECENT_STORAGE_PREFIX = "nextskill:autocomplete:recent:";
const DEFAULT_MAX_RECENT = 5;

function loadRecent(key, max) {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, max) : [];
  } catch {
    return [];
  }
}

function saveRecent(key, list) {
  if (!key) return;
  try {
    localStorage.setItem(RECENT_STORAGE_PREFIX + key, JSON.stringify(list));
  } catch {
    // Private browsing / storage disabled / quota exceeded — recent-picks
    // is a convenience, not a feature anything else depends on, so a
    // failure here should never surface to the user.
  }
}

function pushRecent(key, value, max) {
  if (!key || !value) return [];
  const existing = loadRecent(key, max);
  const deduped = [value, ...existing.filter((v) => v.toLowerCase() !== value.toLowerCase())].slice(0, max);
  saveRecent(key, deduped);
  return deduped;
}

// Splits `text` on the first case-insensitive occurrence of `query` so the
// matched portion can be rendered in bold — pure display, matching is still
// whatever getOptions decided.
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.trim().toLowerCase();
  const start = lower.indexOf(q);
  if (start === -1) return <>{text}</>;
  const end = start + q.length;
  return (
    <>
      {text.slice(0, start)}
      <span className="font-bold text-forest">{text.slice(start, end)}</span>
      {text.slice(end)}
    </>
  );
}

function DefaultOption({ option, query }) {
  return (
    <span className="capitalize">
      <HighlightedText text={option} query={query} />
    </span>
  );
}

export default function Autocomplete({
  value,
  onChange,
  onSelect,
  onEnter,
  getOptions,
  placeholder,
  label,
  minChars = 1,
  debounceMs = 150,
  className,
  inputClassName,
  // --- additive, all optional, all backward-compatible ---
  renderOption,
  getGroup,
  recentKey,
  maxRecent = DEFAULT_MAX_RECENT,
  noResultsText = "No matches found",
  clearable = true,
  disabled = false,
  autoFocus = false,
  onError,
}) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(() => loadRecent(recentKey, maxRecent));

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const listboxId = useId();

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cancel any in-flight debounce/request bookkeeping on unmount so a slow
  // response can't call setState after the field is gone.
  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      requestIdRef.current += 1;
    },
    []
  );

  const runQuery = (query) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setFetchError(null);
    Promise.resolve(getOptions(query))
      .then((results) => {
        if (requestId !== requestIdRef.current) return; // a newer keystroke already superseded this
        setOptions(results || []);
        setOpen(true);
        setActiveIndex(-1);
        setLoading(false);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setOptions([]);
        setOpen(true);
        setActiveIndex(-1);
        setLoading(false);
        const message = err?.message || "Couldn't load suggestions";
        setFetchError(message);
        onError?.(err);
      });
  };

  const handleInputChange = (e) => {
    const next = e.target.value;
    onChange(next);
    clearTimeout(debounceRef.current);
    setFetchError(null);
    if (next.trim().length < minChars) {
      setOptions([]);
      // Still open (if focused) so a recent-picks list or a "type more"
      // hint can show instead of the dropdown just vanishing.
      setOpen(focused && (recentKey ? recent.length > 0 : false) ? true : false);
      return;
    }
    debounceRef.current = setTimeout(() => runQuery(next), debounceMs);
  };

  const selectOption = (option) => {
    onChange(option);
    onSelect?.(option);
    if (recentKey) setRecent(pushRecent(recentKey, option, maxRecent));
    setOpen(false);
    setOptions([]);
    setFetchError(null);
  };

  const clearValue = () => {
    onChange("");
    setOptions([]);
    setFetchError(null);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const activeList = value.trim().length >= minChars ? options : recentKey ? recent : [];

  const handleKeyDown = (e) => {
    if (!open || activeList.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % activeList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + activeList.length) % activeList.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(activeList.length - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectOption(activeList[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleFieldKeyDown = (e) => {
    if (e.key === "Enter" && !(open && activeIndex >= 0) && onEnter) {
      e.preventDefault();
      onEnter();
      return;
    }
    handleKeyDown(e);
  };

  const handleFocus = () => {
    setFocused(true);
    if (value.trim().length >= minChars && options.length > 0) setOpen(true);
    else if (value.trim().length === 0 && recentKey && recent.length > 0) setOpen(true);
  };

  const showRecent = value.trim().length === 0 && recentKey && recent.length > 0 && open;
  const belowMinChars = value.trim().length > 0 && value.trim().length < minChars && minChars > 1;
  const showNoResults =
    open && !loading && !fetchError && !showRecent && !belowMinChars && value.trim().length >= minChars && options.length === 0;

  const groupedOptions = useMemo(() => {
    if (!getGroup || options.length === 0) return null;
    const map = new Map();
    options.forEach((opt, idx) => {
      const g = getGroup(opt) || "";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push({ option: opt, index: idx });
    });
    return Array.from(map.entries());
  }, [options, getGroup]);

  const renderRow = (option, index) => {
    const isActive = index === activeIndex;
    const optionId = `${listboxId}-option-${index}`;
    return (
      <li key={option} role="presentation">
        <button
          type="button"
          id={optionId}
          role="option"
          aria-selected={isActive}
          onMouseEnter={() => setActiveIndex(index)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectOption(option)}
          className={cn(
            "flex w-full items-center px-4 py-2 text-left text-sm text-forest transition-colors",
            isActive ? "bg-forest/8" : "hover:bg-forest/5"
          )}
        >
          {renderOption ? renderOption(option, { isActive, query: value }) : <DefaultOption option={option} query={value} />}
        </button>
      </li>
    );
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-forest/70" id={`${listboxId}-label`}>
          {label}
        </span>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-labelledby={label ? `${listboxId}-label` : undefined}
          value={value}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleFieldKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className={cn(
            "h-11 w-full rounded-xl border border-forest/15 bg-white px-4 text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus:border-forest/40 disabled:cursor-not-allowed disabled:bg-forest/5 disabled:text-forest/40",
            (loading || (clearable && value)) && "pr-10",
            inputClassName
          )}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-forest/40" />
        )}
        {!loading && clearable && value && !disabled && (
          <button
            type="button"
            onClick={clearValue}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Clear"
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-forest/35 transition-colors hover:bg-forest/8 hover:text-forest/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-xl border border-forest/10 bg-white py-1.5 shadow-[0_16px_32px_-12px_rgba(20,38,28,0.35)]"
        >
          {showRecent && (
            <>
              <li className="flex items-center gap-1.5 px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-forest/35">
                <Search className="h-3 w-3" /> Recent
              </li>
              {recent.map((option, i) => renderRow(option, i))}
            </>
          )}

          {!showRecent && belowMinChars && (
            <li className="px-4 py-2 text-xs text-forest/40">
              Type at least {minChars} characters
            </li>
          )}

          {!showRecent && !belowMinChars && groupedOptions && (
            <>
              {groupedOptions.map(([group, rows]) => (
                <div key={group || "__ungrouped"}>
                  {group && (
                    <li className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-forest/35 first:pt-1">
                      {group}
                    </li>
                  )}
                  {rows.map(({ option, index }) => renderRow(option, index))}
                </div>
              ))}
            </>
          )}

          {!showRecent && !belowMinChars && !groupedOptions && options.map((option, i) => renderRow(option, i))}

          {loading && options.length === 0 && !showRecent && (
            <li className="flex items-center gap-2 px-4 py-2 text-xs text-forest/40">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching…
            </li>
          )}

          {fetchError && (
            <li className="px-4 py-2 text-xs font-medium text-red-600">{fetchError}</li>
          )}

          {showNoResults && <li className="px-4 py-2 text-xs text-forest/40">{noResultsText}</li>}
        </ul>
      )}
    </div>
  );
}
