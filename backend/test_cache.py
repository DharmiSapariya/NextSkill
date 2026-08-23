"""Tests for cache.py — the Redis layer wired into /trends, /roles/transition-graph,
and /skills/{skill}/related.

These need a real REDIS_URL (same as CI and local dev per README) to exercise the
actual get/set/TTL/malformed-data paths; the fail-open behavior when Redis is
unavailable is tested separately by monkeypatching _get_client directly rather
than by tearing down the real connection mid-suite.
"""
import time
import uuid

import pytest

import cache

requires_redis = pytest.mark.skipif(
    not cache.REDIS_URL, reason="REDIS_URL not set — fail-open behavior is covered separately"
)


def _unique_key() -> str:
    return f"cache-test:{uuid.uuid4().hex[:12]}"


@requires_redis
def test_set_then_get_roundtrips_json():
    key = _unique_key()
    value = {"skill": "Docker", "count": 42, "nested": [1, 2, 3]}
    cache.cache_set(key, value, ttl_seconds=60)
    assert cache.cache_get(key) == value


@requires_redis
def test_get_miss_returns_none_for_unknown_key():
    assert cache.cache_get(_unique_key()) is None


@requires_redis
def test_set_respects_ttl_expiry():
    key = _unique_key()
    cache.cache_set(key, {"expires": "soon"}, ttl_seconds=1)
    assert cache.cache_get(key) == {"expires": "soon"}
    time.sleep(1.5)
    assert cache.cache_get(key) is None


@requires_redis
def test_get_returns_none_for_malformed_json():
    client = cache._get_client()
    key = _unique_key()
    client.set(key, "not valid json{{{", ex=60)
    assert cache.cache_get(key) is None


def test_cache_get_fails_open_when_client_unavailable(monkeypatch):
    monkeypatch.setattr(cache, "_get_client", lambda: None)
    assert cache.cache_get(_unique_key()) is None


def test_cache_set_fails_open_when_client_unavailable(monkeypatch):
    monkeypatch.setattr(cache, "_get_client", lambda: None)
    # Should not raise even though there's nowhere to write.
    cache.cache_set(_unique_key(), {"anything": True}, ttl_seconds=60)


def test_cache_get_fails_open_on_redis_error(monkeypatch):
    class _BrokenClient:
        def get(self, key):
            raise cache.redis.RedisError("connection reset")

    monkeypatch.setattr(cache, "_get_client", lambda: _BrokenClient())
    assert cache.cache_get(_unique_key()) is None


def test_cache_set_fails_open_on_redis_error(monkeypatch):
    class _BrokenClient:
        def set(self, key, value, ex=None):
            raise cache.redis.RedisError("connection reset")

    monkeypatch.setattr(cache, "_get_client", lambda: _BrokenClient())
    cache.cache_set(_unique_key(), {"anything": True}, ttl_seconds=60)
