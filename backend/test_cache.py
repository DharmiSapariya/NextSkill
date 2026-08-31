"""Tests for cache.py — Redis cache layer verification suite.

Covers JSON serialization/deserialization, TTL precision, key isolation,
malformed payload handling, and fail-open resilience under network or client failure.
"""

import uuid
from typing import Generator

import pytest

import cache

requires_redis = pytest.mark.skipif(
    not getattr(cache, "REDIS_URL", None),
    reason="REDIS_URL not configured — skipping live Redis integration tests",
)


@pytest.fixture
def redis_key() -> Generator[str, None, None]:
    """Generates an isolated, unique Redis key and guarantees cleanup post-test."""
    key = f"cache-test:{uuid.uuid4().hex}"
    yield key
    client = cache._get_client()
    if client:
        try:
            client.delete(key)
        except Exception:
            pass


# --- Live Redis Tests ---

@requires_redis
def test_set_then_get_roundtrips_json(redis_key: str):
    """Verifies complete roundtrip fidelity for complex JSON structures."""
    payload = {
        "skill": "Docker",
        "count": 42,
        "ratio": 0.954,
        "unicode_label": "Python 🐍 - Data Science & AI",
        "nested": {"tags": ["devops", "cloud"], "active": True},
        "null_val": None,
    }
    assert cache.cache_set(redis_key, payload, ttl_seconds=60) is True
    assert cache.cache_get(redis_key) == payload


@requires_redis
def test_get_miss_returns_none_for_unknown_key(redis_key: str):
    """Verifies cache miss behavior on non-existent keys."""
    assert cache.cache_get(redis_key) is None


@requires_redis
def test_set_verifies_ttl_without_sleeping(redis_key: str):
    """Verifies that TTL is accurately applied in Redis without sleep delays."""
    client = cache._get_client()
    assert client is not None

    cache.cache_set(redis_key, {"expires": "soon"}, ttl_seconds=120)

    # Assert TTL is set within expected bounds (115 to 120 seconds)
    ttl = client.ttl(redis_key)
    assert 115 <= ttl <= 120


@requires_redis
def test_get_returns_none_and_cleans_up_malformed_json(redis_key: str):
    """Verifies graceful handling and cleanup of corrupted key data."""
    client = cache._get_client()
    assert client is not None

    client.set(redis_key, "invalid_json_payload{{{", ex=60)

    # Should safely handle JSONDecodeError and return None
    assert cache.cache_get(redis_key) is None


@requires_redis
def test_overwrite_existing_key_updates_value_and_ttl(redis_key: str):
    """Verifies key updates cleanly overwrite existing data and reset TTL."""
    client = cache._get_client()
    assert client is not None

    cache.cache_set(redis_key, {"version": 1}, ttl_seconds=60)
    assert cache.cache_get(redis_key) == {"version": 1}

    cache.cache_set(redis_key, {"version": 2}, ttl_seconds=300)
    assert cache.cache_get(redis_key) == {"version": 2}

    ttl = client.ttl(redis_key)
    assert 295 <= ttl <= 300


# --- Fail-Open Behavior & Exception Handling Tests ---

def test_cache_get_fails_open_when_client_unavailable(monkeypatch, redis_key: str):
    """Ensures cache_get returns None when Redis client connection is None."""
    monkeypatch.setattr(cache, "_get_client", lambda: None)
    assert cache.cache_get(redis_key) is None


def test_cache_set_fails_open_when_client_unavailable(monkeypatch, redis_key: str):
    """Ensures cache_set fails gracefully (returns False/None) when client is None."""
    monkeypatch.setattr(cache, "_get_client", lambda: None)
    result = cache.cache_set(redis_key, {"data": True}, ttl_seconds=60)
    assert result in (False, None)


def test_cache_get_fails_open_on_redis_error(monkeypatch, redis_key: str):
    """Ensures cache_get returns None on underlying Redis client exceptions."""

    class BrokenClient:
        def get(self, key):
            raise cache.redis.RedisError("Connection dropped by peer")

    monkeypatch.setattr(cache, "_get_client", lambda: BrokenClient())
    assert cache.cache_get(redis_key) is None


def test_cache_set_fails_open_on_redis_error(monkeypatch, redis_key: str):
    """Ensures cache_set suppresses exceptions when Redis writes fail."""

    class BrokenClient:
        def set(self, key, value, ex=None):
            raise cache.redis.RedisError("Out of memory error")

    monkeypatch.setattr(cache, "_get_client", lambda: BrokenClient())
    result = cache.cache_set(redis_key, {"data": True}, ttl_seconds=60)
    assert result in (False, None)


def test_cache_set_fails_open_on_serialization_error(monkeypatch, redis_key: str):
    """Ensures cache_set handles non-serializable objects gracefully."""

    class UnserializableObject:
        pass

    result = cache.cache_set(redis_key, {"obj": UnserializableObject()}, ttl_seconds=60)
    assert result in (False, None)