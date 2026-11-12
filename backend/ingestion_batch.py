"""A provider response as observed by this ingestion run."""
from dataclasses import dataclass
from datetime import datetime
from typing import Any
import json
import os
from tempfile import NamedTemporaryFile


@dataclass
class SourceBatch:
    source: str
    requested_country: str | None
    observed_at: datetime | None
    records: list[Any]
    requests_succeeded: int
    requests_failed: int


def write_snapshot(path, batch):
    directory = os.path.dirname(os.path.abspath(path))
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=directory, delete=False) as handle:
        temporary = handle.name
        try:
            json.dump({
                "source": batch.source,
                "requested_country": batch.requested_country,
                "observed_at": batch.observed_at.isoformat(),
                "requests_succeeded": batch.requests_succeeded,
                "requests_failed": batch.requests_failed,
                "results": batch.records,
            }, handle, ensure_ascii=False)
            handle.close()
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
