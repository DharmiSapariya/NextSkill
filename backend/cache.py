"""Thin caching layer over Redis for expensive, infrequently-changing endpoints
(trend calculations, the role-transition graph, skill co-occurrence).

Deliberately fails open: if REDIS_URL isn't set, or Redis is unreachable, every
cache_get() returns a miss and cache_set() is a silent no-op. A cache outage
should degrade to "slower" (recompute every request), never to "the API is
down" — caching is a performance layer, not a functional dependency.
"""
import json
import os

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

_client = None
_client_initialized = False


def _get_client():
    global _client, _client_initialized
    if _client_initialized:
        return _client
    _client_initialized = True
    if not REDIS_URL:
        return None
    try:
        client = redis.from_url(REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
        client.ping()
        _client = client
    except redis.RedisError:
        _client = None
    return _client


def cache_get(key: str):
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
    except redis.RedisError:
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


def cache_set(key: str, value, ttl_seconds: int):
    client = _get_client()
    if client is None:
        return
    try:
        client.set(key, json.dumps(value), ex=ttl_seconds)
    except redis.RedisError:
        pass
