"""Thin caching layer over Redis for expensive, infrequently-changing endpoints
(trend calculations, the role-transition graph, skill co-occurrence).

Deliberately fails open: if REDIS_URL isn't set, or Redis is unreachable, every
cache_get() returns a miss and cache_set() is a silent no-op. A cache outage
should degrade to "slower" (recompute every request), never to "the API is
down" — caching is a performance layer, not a functional dependency.
"""
import json
import logging
import os
import time
from typing import Any, Optional

import redis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("nextskill.cache")

REDIS_URL = os.getenv("REDIS_URL")
RETRY_INTERVAL_SECONDS = 30  # Re-attempt connecting to Redis every 30s if down

_pool: Optional[redis.ConnectionPool] = None
_client: Optional[redis.Redis] = None
_last_connect_attempt: float = 0.0


def _get_client() -> Optional[redis.Redis]:
    global _client, _pool, _last_connect_attempt

    if _client is not None:
        return _client

    if not REDIS_URL:
        return None

    # Circuit breaker retry delay: do not spam reconnect attempts on every request
    now = time.time()
    if now - _last_connect_attempt < RETRY_INTERVAL_SECONDS:
        return None

    _last_connect_attempt = now
    try:
        if _pool is None:
            _pool = redis.ConnectionPool.from_url(
                REDIS_URL,
                socket_connect_timeout=1,
                socket_timeout=1,
                max_connections=20,
            )
        client = redis.Redis(connection_pool=_pool)
        client.ping()
        _client = client
        logger.info("Successfully connected to Redis cache instance.")
        return _client
    except redis.RedisError as exc:
        logger.warning("Redis connection failed (failing open): %s", exc)
        _client = None
        return None


def cache_get(key: str) -> Optional[Any]:
    """Retrieves and deserializes a JSON value from Redis. Returns None on cache miss or failure."""
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except (redis.RedisError, TypeError, ValueError) as exc:
        logger.debug("Cache read error for key '%s': %s", key, exc)
        return None


def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    """Serializes value to JSON and sets it in Redis with an expiration TTL."""
    client = _get_client()
    if client is None:
        return
    try:
        client.set(key, json.dumps(value), ex=ttl_seconds)
    except redis.RedisError as exc:
        logger.debug("Cache write error for key '%s': %s", key, exc)


def redis_healthy() -> bool:
    """True only if REDIS_URL is configured AND an active ping succeeds right now."""
    if not REDIS_URL:
        return False
    client = _get_client()
    if client is None:
        return False
    try:
        return client.ping()
    except redis.RedisError:
        return False