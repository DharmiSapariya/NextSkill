"""Regression coverage for the PostgreSQL migration chain."""
import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

import pytest
import sqlalchemy as sa

from models import DATABASE_URL

BACKEND_DIR = Path(__file__).resolve().parent
PREDECESSOR = "ef8243d65c1c"


@pytest.fixture
def isolated_schema():
    url = sa.make_url(DATABASE_URL)
    if url.get_backend_name() != "postgresql":
        pytest.skip("Migration regression requires PostgreSQL")

    schema = f"migration_test_{uuid4().hex}"
    engine = sa.create_engine(url)
    with engine.begin() as connection:
        connection.execute(sa.schema.CreateSchema(schema))
    test_url = url.update_query_dict({"options": f"-csearch_path={schema}"})
    test_engine = sa.create_engine(test_url)
    try:
        yield test_engine
    finally:
        test_engine.dispose()
        with engine.begin() as connection:
            connection.execute(sa.schema.DropSchema(schema, cascade=True))
        engine.dispose()


def migrate(engine, action, revision):
    env = dict(os.environ, DATABASE_URL=engine.url.render_as_string(hide_password=False))
    result = subprocess.run(
        [sys.executable, "-m", "alembic", action, revision],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("legacy_names", [False, True], ids=["clean", "legacy"])
def test_upgrade_and_round_trip_preserve_data(isolated_schema, legacy_names):
    engine = isolated_schema
    migrate(engine, "upgrade", PREDECESSOR)
    with engine.begin() as connection:
        skill_id = connection.execute(
            sa.text("INSERT INTO skills (name) VALUES ('Python') RETURNING id")
        ).scalar_one()
        job_id = connection.execute(
            sa.text(
                "INSERT INTO jobs (external_id, title, source) "
                "VALUES ('migration-test', 'Backend Developer', 'fixture') RETURNING id"
            )
        ).scalar_one()
        connection.execute(
            sa.text("INSERT INTO job_skills (job_id, skill_id) VALUES (:job_id, :skill_id)"),
            {"job_id": job_id, "skill_id": skill_id},
        )
        if legacy_names:
            for table, current, legacy in [
                ("job_skills", "fk_job_skills_skill_id_skills", "job_skills_skill_id_fkey"),
                ("job_skills", "fk_job_skills_job_id_jobs", "job_skills_job_id_fkey"),
                ("jobs", "uq_jobs_external_id", "jobs_external_id_key"),
            ]:
                connection.execute(sa.text(f"ALTER TABLE {table} RENAME CONSTRAINT {current} TO {legacy}"))

    for action, revision in [
        ("upgrade", "head"),
        ("downgrade", PREDECESSOR),
        ("upgrade", "head"),
    ]:
        migrate(engine, action, revision)
        with engine.connect() as connection:
            saved_link = connection.execute(sa.text("SELECT job_id, skill_id FROM job_skills")).one()
            assert saved_link == (job_id, skill_id)
            assert connection.execute(sa.text("SELECT name FROM skills")).scalar_one() == "Python"
        if action == "upgrade":
            inspector = sa.inspect(engine)
            assert inspector.has_table("applications")
            assert inspector.has_table("certifications")
            foreign_keys = inspector.get_foreign_keys("job_skills")
            assert {key["referred_table"]: key["options"].get("ondelete") for key in foreign_keys} == {
                "jobs": "CASCADE",
                "skills": "CASCADE",
            }
