import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

// A real typeahead: as soon as the user types, getOptions(query) is called
// (debounced) and matches drop down below the input — arrow keys move the
// active row, Enter selects it, Escape or an outside click closes it.
// getOptions may return an array directly (static/local filtering) or a
// Promise (an API-backed search), so the same component covers both the
// fixed 21-role list and live /skills or /companies lookups.
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
}) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runQuery = (query) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    Promise.resolve(getOptions(query)).then((results) => {
      if (requestId !== requestIdRef.current) return; // a newer keystroke already superseded this
      setOptions(results || []);
      setOpen((results || []).length > 0);
      setActiveIndex(-1);
      setLoading(false);
    });
  };

  const handleInputChange = (e) => {
    const next = e.target.value;
    onChange(next);
    clearTimeout(debounceRef.current);
    if (next.trim().length < minChars) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runQuery(next), debounceMs);
  };

  const selectOption = (option) => {
    onChange(option);
    onSelect?.(option);
    setOpen(false);
    setOptions([]);
  };

  const handleKeyDown = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectOption(options[activeIndex]);
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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label && <span className="mb-1.5 block text-xs font-semibold text-forest/70">{label}</span>}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleFieldKeyDown}
        onFocus={() => value.trim().length >= minChars && options.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-xl border border-forest/15 bg-white px-4 text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus:border-forest/40",
          inputClassName
        )}
      />

      {open && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-xl border border-forest/10 bg-white py-1.5 shadow-[0_16px_32px_-12px_rgba(20,38,28,0.35)]">
          {options.map((option, i) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-sm capitalize text-forest transition-colors",
                  i === activeIndex ? "bg-forest/8" : "hover:bg-forest/5"
                )}
              >
                {option}
              </button>
            </li>
          ))}
          {loading && options.length === 0 && (
            <li className="px-4 py-2 text-xs text-forest/40">Searching…</li>
          )}
        </ul>
      )}
    </div>
  );
}
