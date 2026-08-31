"""Alembic environment configuration module.

Supports sync and async database engines, automatic metadata diff detection,
and cross-database batch migration rendering.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, MetaData
from alembic import context

# Make the root backend package importable regardless of CWD
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Base, DATABASE_URL  # noqa: E402

# Alembic Config object providing access to alembic.ini values
config = context.config

# Escape percentage signs to prevent configparser interpolation errors on complex passwords
escaped_db_url = DATABASE_URL.replace("%", "%%")
config.set_main_option("sqlalchemy.url", escaped_db_url)

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ensure explicit naming conventions for index/foreign key constraints across all DB backends
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

target_metadata = Base.metadata
target_metadata.naming_convention = NAMING_CONVENTION


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with a URL without instantiating a full Engine instance.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Detect column type changes (e.g., String(50) -> String(100))
        compare_server_default=True,
        render_as_batch=True,  # Enables ALTER TABLE compatibility for SQLite
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and associates a live connection context.
    """
    configuration = config.get_section(config.config_ini_section, {})
    
    # Handle async drivers if specified in DATABASE_URL
    if DATABASE_URL.startswith(("postgresql+asyncpg", "sqlite+aiosqlite")):
        import asyncio
        from sqlalchemy.ext.asyncio import async_engine_from_config

        connectable = async_engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        async def run_async_migrations():
            async with connectable.connect() as connection:
                await connection.run_sync(do_run_migrations)
            await connectable.dispose()

        def do_run_migrations(connection):
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
                render_as_batch=True,
            )
            with context.begin_transaction():
                context.run_migrations()

        asyncio.run(run_async_migrations())

    else:
        # Standard synchronous database connection path
        connectable = engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
                render_as_batch=True,
            )

            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()