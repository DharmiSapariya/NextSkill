const SOURCE_LABELS = {
  adzuna: "Adzuna",
  remoteok: "Remote OK",
  demo: "Demo fixtures",
  seed: "Test fixtures",
};

export function sourceLabel(source) {
  return Object.hasOwn(SOURCE_LABELS, source) ? SOURCE_LABELS[source] : source || "Source unavailable";
}

export function postingDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }) : "Unavailable";
}
