"""Add source observations and ingestion run history."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "72bd093f61a0"
down_revision = "38072fd31c90"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("jobs", sa.Column("geography", sa.String(32)))
    op.add_column("jobs", sa.Column("market_city", sa.String(100)))
    op.add_column("jobs", sa.Column("experience_band", sa.String(24)))
    op.add_column("jobs", sa.Column("identity_fingerprint", sa.String(64)))
    op.create_index("ix_jobs_geography", "jobs", ["geography"])
    op.create_unique_constraint("uq_jobs_identity_fingerprint", "jobs", ["identity_fingerprint"])
    op.create_table(
        "job_observations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("job_id", sa.Integer, sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_job_id", sa.String(200), nullable=False),
        sa.Column("requested_country", sa.String(2)),
        sa.Column("source_url", sa.Text),
        sa.Column("location_evidence", JSONB),
        sa.Column("contract_type", sa.String(50)),
        sa.Column("contract_time", sa.String(50)),
        sa.Column("posted_date", sa.Date),
        sa.Column("first_collected_at", sa.DateTime(timezone=True)),
        sa.Column("last_observed_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("source", "source_job_id", name="uq_job_observations_source_id"),
    )
    op.create_index("ix_job_observations_job_id", "job_observations", ["job_id"])
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("requested_country", sa.String(2)),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("metrics", JSONB, nullable=False),
    )
    op.create_index("ix_ingestion_runs_source_status_finished", "ingestion_runs", ["source", "status", "finished_at"])


def downgrade():
    op.drop_table("ingestion_runs")
    op.drop_table("job_observations")
    op.drop_constraint("uq_jobs_identity_fingerprint", "jobs", type_="unique")
    op.drop_index("ix_jobs_geography", table_name="jobs")
    for column in ("identity_fingerprint", "experience_band", "market_city", "geography"):
        op.drop_column("jobs", column)
