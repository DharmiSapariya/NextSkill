import io
import uuid

import pytest
from docx import Document
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)


def _build_test_resume_docx(skills_text: str) -> bytes:
    document = Document()
    document.add_paragraph("Jane Doe — Software Engineer")
    document.add_paragraph(skills_text)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


@pytest.fixture(scope="module")
def auth_headers():
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    response = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_signup_and_login():
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    assert signup.status_code == 200
    assert "access_token" in signup.json()

    login = client.post("/auth/login", json={"email": email, "password": "testpassword123"})
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_signup_duplicate_email_rejected():
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    response = client.post("/auth/signup", json={"email": email, "password": "anotherpassword"})
    assert response.status_code == 409


def test_signup_rejects_password_too_short():
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    response = client.post("/auth/signup", json={"email": email, "password": "short"})
    assert response.status_code == 422


def test_signup_rejects_password_too_long():
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    response = client.post("/auth/signup", json={"email": email, "password": "x" * 73})
    assert response.status_code == 422


def test_login_wrong_password_rejected():
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    response = client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
    assert response.status_code == 401


def test_login_is_rate_limited():
    from api import limiter

    limiter.reset()  # start from a clean slate — other tests share this same in-memory counter
    email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
    client.post("/auth/signup", json={"email": email, "password": "testpassword123"})

    for _ in range(5):
        response = client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
        assert response.status_code == 401

    response = client.post("/auth/login", json={"email": email, "password": "wrongpassword"})
    assert response.status_code == 429
    limiter.reset()  # leave a clean slate for tests that run after this one


def test_signup_is_rate_limited():
    from api import limiter

    limiter.reset()
    for _ in range(5):
        email = f"test-{uuid.uuid4().hex[:12]}@nextskill.dev"
        response = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
        assert response.status_code == 200

    response = client.post(
        "/auth/signup",
        json={"email": f"test-{uuid.uuid4().hex[:12]}@nextskill.dev", "password": "testpassword123"},
    )
    assert response.status_code == 429
    limiter.reset()


def test_me_requires_auth():
    response = client.get("/auth/me")
    assert response.status_code == 401  # no Authorization header at all


def test_me_and_skills_update(auth_headers):
    me = client.get("/auth/me", headers=auth_headers)
    assert me.status_code == 200
    assert me.json()["skills"] == []
    assert me.json()["tier"] == "free"
    assert me.json()["is_admin"] is False

    updated = client.put("/auth/me/skills", json={"skills": ["Python", "SQL"]}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["skills"] == ["Python", "SQL"]

    me_again = client.get("/auth/me", headers=auth_headers)
    assert me_again.json()["skills"] == ["Python", "SQL"]


def test_list_jobs_returns_results():
    response = client.get("/jobs?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) <= 5
    assert data["total"] > 0


def test_list_jobs_filters_by_role():
    response = client.get("/jobs?role=data scientist&limit=5")
    assert response.status_code == 200
    data = response.json()
    for job in data["results"]:
        assert "data" in job["title"].lower() or "scientist" in job["title"].lower()


def test_list_jobs_includes_seniority_label():
    response = client.get("/jobs?limit=5")
    assert response.status_code == 200
    for job in response.json()["results"]:
        assert job["seniority"] in ("junior", "mid", "senior", "unspecified")


def test_list_jobs_filters_by_seniority():
    response = client.get("/jobs?seniority=senior&limit=100")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0  # seed data includes "Senior Data Scientist"
    for job in data["results"]:
        assert job["seniority"] == "senior"


def test_list_jobs_seniority_buckets_partition_the_full_set():
    # The query-level filter and the per-job label are built from the same
    # SENIORITY_PATTERNS — confirm they actually agree with each other by
    # checking the four buckets add up to the unfiltered total exactly.
    total = client.get("/jobs?limit=1").json()["total"]
    bucket_sum = sum(
        client.get(f"/jobs?seniority={level}&limit=1").json()["total"]
        for level in ("junior", "mid", "senior", "unspecified")
    )
    assert bucket_sum == total


def test_list_jobs_rejects_invalid_seniority_value():
    response = client.get("/jobs?seniority=not-a-real-level")
    assert response.status_code == 422


def test_get_job_not_found():
    response = client.get("/jobs/999999999")
    assert response.status_code == 404


def test_list_jobs_rejects_non_positive_limit():
    # limit=-1 used to reach SQLAlchemy's .limit() unvalidated and crash with
    # a raw psycopg2 "LIMIT must not be negative" 500 instead of a clean 422.
    assert client.get("/jobs?limit=-1").status_code == 422
    assert client.get("/jobs?limit=0").status_code == 422


def test_limit_validation_applies_to_every_paginated_endpoint(auth_headers):
    # Same missing ge=1 bug existed on every other `limit` query param in the
    # API, not just /jobs — confirm all of them are actually fixed.
    for path in [
        "/companies/top?limit=-1",
        "/skills/Python/related?limit=-1",
        "/roles/backend%20developer/nearest?limit=-1",
        "/auth/me/history?limit=-1",
    ]:
        response = client.get(path, headers=auth_headers)
        assert response.status_code == 422, f"{path} returned {response.status_code}, expected 422"


def test_top_companies():
    response = client.get("/companies/top?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) <= 3
    postings = [c["postings"] for c in data["results"]]
    assert postings == sorted(postings, reverse=True)


def _make_admin_headers():
    # No self-service way to become an admin by design — tests provision one
    # directly, the same way a real deployment would (a manual DB update).
    from models import User as UserModel, session

    email = f"admin-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    user = session.query(UserModel).filter_by(email=email).first()
    user.is_admin = True
    session.commit()
    return {"Authorization": f"Bearer {signup.json()['access_token']}"}


def test_admin_stats_requires_auth():
    response = client.get("/admin/stats")
    assert response.status_code == 401


def test_admin_stats_rejects_non_admin_user(auth_headers):
    response = client.get("/admin/stats", headers=auth_headers)
    assert response.status_code == 403


def test_admin_stats_returns_aggregate_numbers():
    admin_headers = _make_admin_headers()
    response = client.get("/admin/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_users"] > 0
    assert data["signups_last_30_days"] > 0  # the admin user we just created counts
    assert data["total_jobs"] > 0
    assert data["total_skills"] > 0
    assert isinstance(data["top_target_roles"], list)


def test_trend_for_known_skill():
    response = client.get("/trends/Python")
    assert response.status_code == 200
    data = response.json()
    assert data["skill"] == "Python"
    assert data["total_mentions"] > 0
    assert "previous_period" in data and "current_period" in data
    assert data["current_period"]["start"] < data["current_period"]["end"]
    assert data["previous_period"]["end"] == data["current_period"]["start"]


def test_trend_window_advances_with_new_data():
    # The window used to be hardcoded to June/July 2026 — it never moved
    # even as new postings were ingested. Confirm it actually tracks the
    # latest ingested core-role posting instead of a fixed calendar date.
    from datetime import timedelta

    from api import _trend_window
    from models import Company, Job, session

    before = _trend_window()

    company = session.query(Company).first()
    later_date = before[2] + timedelta(days=5)  # 5 days past the current window's end
    session.add(Job(
        external_id=f"trend-window-test-{uuid.uuid4().hex[:12]}",
        title="Software Engineer",
        company_id=company.id,
        location="Remote",
        description="",
        category="IT Jobs",
        source="test",
        posted_date=later_date,
    ))
    session.commit()

    after = _trend_window()
    assert after[2] == later_date + timedelta(days=1)
    assert after[2] > before[2]


def test_classify_trend_covers_all_four_directions():
    from api import _classify_trend

    assert _classify_trend(0, 0) == (None, "flat")
    assert _classify_trend(0, 5.0) == (None, "new")
    assert _classify_trend(10.0, 10.5) == (5.0, "flat")  # +5% is within the +-15% flat band
    assert _classify_trend(10.0, 20.0) == (100.0, "rising")
    assert _classify_trend(20.0, 5.0) == (-75.0, "falling")


def test_classify_lifecycle_covers_all_six_outcomes():
    from api import _classify_lifecycle, _classify_trend

    def lifecycle(previous_share, current_share):
        _, direction = _classify_trend(previous_share, current_share)
        return _classify_lifecycle(previous_share, current_share, direction)

    assert lifecycle(0, 0) == "insufficient_data"
    assert lifecycle(0, 1.0) == "emerging"  # brand new, share doesn't matter yet
    assert lifecycle(1.0, 2.5) == "emerging"  # rising, still under the 5% widespread threshold
    assert lifecycle(10.0, 20.0) == "growing"  # rising, already widespread
    assert lifecycle(20.0, 21.0) == "mature"  # flat, widespread
    assert lifecycle(1.0, 1.1) == "niche"  # flat, never widespread
    assert lifecycle(20.0, 5.0) == "declining"  # falling regardless of share


def test_trend_includes_lifecycle_label():
    response = client.get("/trends/Python")
    assert response.status_code == 200
    data = response.json()
    assert data["lifecycle"] in {"insufficient_data", "declining", "emerging", "growing", "mature", "niche"}


def test_trend_for_unknown_skill():
    response = client.get("/trends/DefinitelyNotARealSkillXYZ")
    assert response.status_code == 404


def test_recommend_requires_auth():
    response = client.post(
        "/recommend",
        json={"skills": ["Python"], "target_role": "data scientist"},
    )
    assert response.status_code == 401  # no Authorization header at all


def test_recommend_returns_ranked_list(auth_headers):
    response = client.post(
        "/recommend",
        json={"skills": ["Python", "SQL"], "target_role": "data scientist"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_role"] == "data scientist"
    assert len(data["recommendations"]) > 0
    counts = [r["postings_mentioning_it"] for r in data["recommendations"]]
    assert counts == sorted(counts, reverse=True)


def test_recommend_excludes_stated_skills(auth_headers):
    response = client.post(
        "/recommend",
        json={"skills": ["Python"], "target_role": "data scientist"},
        headers=auth_headers,
    )
    data = response.json()
    recommended_names = {r["skill"].lower() for r in data["recommendations"]}
    assert "python" not in recommended_names


def test_recommend_falls_back_to_saved_skill_profile(auth_headers):
    client.put("/auth/me/skills", json={"skills": ["Python", "SQL"]}, headers=auth_headers)
    response = client.post(
        "/recommend",
        json={"target_role": "data scientist"},  # no skills in the body
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["your_skills"] == ["Python", "SQL"]


def test_recommend_evidence_includes_real_postings(auth_headers):
    response = client.post(
        "/recommend/evidence",
        json={"skills": ["Python", "SQL"], "target_role": "data scientist"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) > 0
    for rec in data["recommendations"]:
        assert "evidence" in rec
        for item in rec["evidence"]:
            assert "title" in item
            assert "company" in item


def test_recommend_evidence_respects_tier_limit():
    from models import User as UserModel, session as db_session

    email = f"evidence-tier-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    # 10 real "Python" + "data scientist" postings exist in the seeded data —
    # enough to actually prove a 3 vs 10 cap difference, not just "both
    # happen to be under some coincidentally small number."
    free_response = client.post("/recommend/evidence", json={"skills": [], "target_role": "data scientist"}, headers=headers)
    assert free_response.status_code == 200
    free_data = free_response.json()
    assert free_data["tier"] == "free"
    python_rec = next(r for r in free_data["recommendations"] if r["skill"] == "Python")
    assert len(python_rec["evidence"]) <= 3

    # No self-service upgrade endpoint by design — provisioned directly, same
    # pattern as is_admin.
    user = db_session.query(UserModel).filter_by(email=email).first()
    user.tier = "pro"
    db_session.commit()

    pro_response = client.post("/recommend/evidence", json={"skills": [], "target_role": "data scientist"}, headers=headers)
    pro_data = pro_response.json()
    assert pro_data["tier"] == "pro"
    python_rec_pro = next(r for r in pro_data["recommendations"] if r["skill"] == "Python")
    assert len(python_rec_pro["evidence"]) > 3  # proves the cap actually differs, not coincidence


def test_history_limit_capped_for_free_tier_but_not_pro():
    from models import RecommendationHistory, User as UserModel, session as db_session

    email = f"history-tier-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    user = db_session.query(UserModel).filter_by(email=email).first()

    # Insert 25 history rows directly — proving the limit-capping logic
    # itself doesn't need 25 real rate-limited /recommend calls to test.
    for i in range(25):
        db_session.add(RecommendationHistory(
            user_id=user.id,
            target_role="backend developer",
            resolved_role="backend developer",
            skills_at_time=[],
            recommendations=[],
        ))
    db_session.commit()

    free_response = client.get("/auth/me/history?limit=100", headers=headers)
    assert len(free_response.json()["results"]) == 20  # capped, even though 25 exist and 100 was requested

    user.tier = "pro"
    db_session.commit()

    pro_response = client.get("/auth/me/history?limit=100", headers=headers)
    assert len(pro_response.json()["results"]) == 25  # not capped — all 25 come back


def test_me_reflects_tier_and_admin_status_after_provisioning():
    # Before this, a user upgraded to pro (or granted admin) had no way to
    # see that via the API at all — only indirectly, e.g. by noticing
    # /recommend/evidence started returning more evidence than before.
    from models import User as UserModel, session as db_session

    email = f"me-tier-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    assert client.get("/auth/me", headers=headers).json()["tier"] == "free"

    user = db_session.query(UserModel).filter_by(email=email).first()
    user.tier = "pro"
    user.is_admin = True
    db_session.commit()

    me = client.get("/auth/me", headers=headers).json()
    assert me["tier"] == "pro"
    assert me["is_admin"] is True


def test_related_skills_returns_sensible_results():
    response = client.get("/skills/React/related?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["skill"] == "React"
    assert data["based_on_postings"] > 0
    assert len(data["related_skills"]) <= 5
    related_names = {r["skill"].lower() for r in data["related_skills"]}
    assert "react" not in related_names


def test_related_skills_unknown_skill():
    response = client.get("/skills/DefinitelyNotARealSkillXYZ/related")
    assert response.status_code == 404


def test_resume_upload_requires_auth():
    resume_bytes = _build_test_resume_docx("Skills: Python, SQL")
    response = client.post(
        "/auth/me/resume",
        files={"file": ("resume.docx", resume_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 401


def test_resume_upload_extracts_and_merges_skills(auth_headers):
    resume_bytes = _build_test_resume_docx("Skills: Python, TensorFlow, Docker, Kubernetes, AWS")
    response = client.post(
        "/auth/me/resume",
        files={"file": ("resume.docx", resume_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "Python" in data["skills_found_in_resume"]
    assert "TensorFlow" in data["skills_found_in_resume"]
    assert set(data["skills_found_in_resume"]).issubset(set(data["skills"]))


def test_resume_upload_rejects_unsupported_format(auth_headers):
    response = client.post(
        "/auth/me/resume",
        files={"file": ("resume.txt", b"Skills: Python", "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_resume_upload_rejects_unreadable_content_instead_of_silently_finding_nothing(auth_headers):
    # Before this, an empty/near-empty extraction (the real symptom of a
    # scanned/image-based PDF, which pdfplumber can't read at all) looked
    # identical to "a real resume that genuinely has no taxonomy skills" —
    # a silent 200 with skills_found_in_resume: []. Now it's a clear 400.
    empty_resume = _build_test_resume_docx("")
    response = client.post(
        "/auth/me/resume",
        files={"file": ("resume.docx", empty_resume, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "couldn't extract" in response.json()["detail"].lower()


def test_resume_upload_rejects_oversized_file(auth_headers):
    from api import MAX_RESUME_SIZE_BYTES

    oversized = b"a" * (MAX_RESUME_SIZE_BYTES + 1)
    response = client.post(
        "/auth/me/resume",
        files={"file": ("resume.docx", oversized, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=auth_headers,
    )
    assert response.status_code == 413


def test_match_score_requires_auth():
    response = client.post("/match-score", json={"target_role": "data scientist"})
    assert response.status_code == 401


def test_match_score_higher_for_relevant_skills(auth_headers):
    relevant = client.post(
        "/match-score",
        json={"skills": ["Python", "SQL", "Pandas"], "target_role": "data scientist"},
        headers=auth_headers,
    )
    irrelevant = client.post(
        "/match-score",
        json={"skills": ["React", "CSS"], "target_role": "data scientist"},
        headers=auth_headers,
    )
    assert relevant.status_code == 200
    assert irrelevant.status_code == 200
    assert relevant.json()["sample_size"] > 0
    assert relevant.json()["match_pct"] > irrelevant.json()["match_pct"]


def test_match_score_unknown_role_returns_zero_sample(auth_headers):
    response = client.post(
        "/match-score",
        json={"skills": ["Python"], "target_role": "definitely not a tracked role xyz"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sample_size"] == 0
    assert data["match_pct"] is None


def test_predict_salary_requires_auth():
    response = client.post("/predict-salary", json={"target_role": "data scientist"})
    assert response.status_code == 401


def test_predict_salary_returns_a_range(auth_headers):
    response = client.post(
        "/predict-salary",
        json={"skills": ["Python", "TensorFlow", "PyTorch", "Docker"], "target_role": "machine learning engineer"},
        headers=auth_headers,
    )
    # CI trains the model before running tests (see train_salary_model.py); locally, if no
    # model has been trained yet, this correctly returns 503 instead of crashing.
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        data = response.json()
        assert data["predicted_salary_low"] <= data["predicted_salary_midpoint"] <= data["predicted_salary_high"]


def test_transition_graph_returns_nodes_and_edges():
    response = client.get("/roles/transition-graph")
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) > 0
    assert all({"id", "label", "posting_count"} <= node.keys() for node in data["nodes"])
    assert all({"source", "target", "weight"} <= edge.keys() for edge in data["edges"])


def test_skill_co_occurrence_graph_returns_nodes_and_edges():
    response = client.get("/skills/co-occurrence-graph")
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) > 0
    assert all({"id", "label", "mention_count"} <= node.keys() for node in data["nodes"])
    assert all({"source", "target", "weight", "shared_posting_count"} <= edge.keys() for edge in data["edges"])


def test_skill_co_occurrence_graph_respects_limit():
    response = client.get("/skills/co-occurrence-graph?limit=5")
    assert response.status_code == 200
    assert len(response.json()["nodes"]) <= 5


def test_nearest_roles_for_known_role():
    response = client.get("/roles/data scientist/nearest?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["nearest_roles"]) <= 3
    for entry in data["nearest_roles"]:
        assert "skills_you_would_need" in entry


def test_nearest_roles_for_untracked_role():
    response = client.get("/roles/underwater basket weaver/nearest")
    assert response.status_code == 404


def test_history_requires_auth():
    response = client.get("/auth/me/history")
    assert response.status_code == 401


def test_history_empty_for_new_user(auth_headers):
    response = client.get("/auth/me/history", headers=auth_headers)
    assert response.status_code == 200
    # auth_headers is module-scoped and may have made /recommend calls in
    # earlier tests, so just check the shape, not emptiness.
    assert "results" in response.json()


def test_recommend_call_gets_recorded_in_history(auth_headers):
    before = len(client.get("/auth/me/history?target_role=data scientist", headers=auth_headers).json()["results"])

    client.post(
        "/recommend",
        json={"skills": ["Python", "SQL"], "target_role": "data scientist"},
        headers=auth_headers,
    )

    after_response = client.get("/auth/me/history?target_role=data scientist", headers=auth_headers)
    assert after_response.status_code == 200
    after = after_response.json()["results"]
    assert len(after) == before + 1
    latest = after[0]  # most recent first
    assert latest["target_role"] == "data scientist"
    assert latest["skills_at_time"] == ["Python", "SQL"]
    assert "recommendations" in latest
    assert "created_at" in latest


def test_history_filters_by_role(auth_headers):
    client.post("/recommend", json={"skills": ["Python"], "target_role": "backend developer"}, headers=auth_headers)
    response = client.get("/auth/me/history?target_role=backend developer", headers=auth_headers)
    assert response.status_code == 200
    for entry in response.json()["results"]:
        assert entry["resolved_role"] == "backend developer"


def test_progress_requires_at_least_two_runs(auth_headers):
    email_specific_role = "cybersecurity analyst"  # a role this test's user hasn't called yet
    response = client.get(f"/auth/me/history/progress?target_role={email_specific_role}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["runs_recorded"] == 0
    assert "message" in data


def test_progress_shows_closed_and_open_gaps(auth_headers):
    target_role = "devops engineer"

    # First run: missing Docker and Kubernetes.
    client.put("/auth/me/skills", json={"skills": ["Linux"]}, headers=auth_headers)
    client.post("/recommend", json={"target_role": target_role}, headers=auth_headers)

    # Second run: picked up Docker in the meantime.
    client.put("/auth/me/skills", json={"skills": ["Linux", "Docker"]}, headers=auth_headers)
    client.post("/recommend", json={"target_role": target_role}, headers=auth_headers)

    response = client.get(f"/auth/me/history/progress?target_role={target_role}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["runs_recorded"] == 2
    assert "Docker" in data["skills_closed"]
    assert "docker" not in [s.lower() for s in data["skills_still_open"]]  # shouldn't show up in both


def test_digest_requires_auth():
    response = client.get("/auth/me/digest")
    assert response.status_code == 401


def test_digest_reports_no_change_for_new_user():
    # A brand-new user has zero history for a role nobody's touched yet —
    # nothing to report, not an error, an honest "nothing changed."
    from api import limiter

    limiter.reset()  # shared /auth/signup counter — same caveat as the rate-limit tests
    email = f"digest-empty-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    response = client.get("/auth/me/digest", headers=headers)
    assert response.status_code == 200
    assert response.json()["changes"] == []
    assert "message" in response.json()


def test_digest_reports_a_real_top_skill_change():
    from datetime import datetime, timezone
    from api import limiter
    from models import RecommendationHistory, User as UserModel, session as db_session

    limiter.reset()  # shared /auth/signup counter — same caveat as the rate-limit tests
    email = f"digest-change-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    user = db_session.query(UserModel).filter_by(email=email).first()

    # Explicit, strictly increasing timestamps rather than relying on
    # back-to-back datetime.now() calls to not tie at the microsecond level.
    db_session.add(RecommendationHistory(
        user_id=user.id, target_role="data scientist", resolved_role="data scientist",
        skills_at_time=[], recommendations=[{"skill": "Python", "mentions": 10}],
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    ))
    db_session.add(RecommendationHistory(
        user_id=user.id, target_role="data scientist", resolved_role="data scientist",
        skills_at_time=[], recommendations=[{"skill": "SQL", "mentions": 8}],
        created_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
    ))
    db_session.commit()

    response = client.get("/auth/me/digest", headers=headers)
    assert response.status_code == 200
    changes = response.json()["changes"]
    assert len(changes) == 1
    assert changes[0]["resolved_role"] == "data scientist"
    assert changes[0]["previous_top_gap_skill"] == "Python"
    assert changes[0]["current_top_gap_skill"] == "SQL"


def _make_history_entry(headers, target_role):
    client.post("/recommend", json={"skills": ["Python"], "target_role": target_role}, headers=headers)
    entries = client.get(f"/auth/me/history?target_role={target_role}", headers=headers).json()["results"]
    return entries[0]["id"]  # most recent first


def test_share_requires_auth():
    response = client.post("/auth/me/history/1/share")
    assert response.status_code == 401


def test_share_rejects_nonexistent_history_id(auth_headers):
    response = client.post("/auth/me/history/999999999/share", headers=auth_headers)
    assert response.status_code == 404


def test_share_creates_a_publicly_viewable_report(auth_headers):
    history_id = _make_history_entry(auth_headers, "product manager")

    share_response = client.post(f"/auth/me/history/{history_id}/share", headers=auth_headers)
    assert share_response.status_code == 200
    token = share_response.json()["token"]

    # No Authorization header at all — this is the whole point.
    public_response = client.get(f"/reports/{token}")
    assert public_response.status_code == 200
    data = public_response.json()
    assert data["resolved_role"] == "product manager"
    assert data["skills_at_time"] == ["Python"]
    assert "recommendations" in data
    assert "shared_at" in data


def test_get_shared_report_for_unknown_token_is_404():
    response = client.get("/reports/this-token-does-not-exist")
    assert response.status_code == 404


def test_users_cannot_share_each_others_history():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    owner_email = f"share-owner-{uuid.uuid4().hex[:12]}@nextskill.dev"
    owner_signup = client.post("/auth/signup", json={"email": owner_email, "password": "testpassword123"})
    owner_headers = {"Authorization": f"Bearer {owner_signup.json()['access_token']}"}
    history_id = _make_history_entry(owner_headers, "ui ux designer")

    intruder_email = f"share-intruder-{uuid.uuid4().hex[:12]}@nextskill.dev"
    intruder_signup = client.post("/auth/signup", json={"email": intruder_email, "password": "testpassword123"})
    intruder_headers = {"Authorization": f"Bearer {intruder_signup.json()['access_token']}"}

    response = client.post(f"/auth/me/history/{history_id}/share", headers=intruder_headers)
    assert response.status_code == 404  # not "someone else's, forbidden" — doesn't leak that it exists


def test_owner_can_revoke_a_shared_report():
    email = f"revoke-owner-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    history_id = _make_history_entry(headers, "cloud engineer")

    token = client.post(f"/auth/me/history/{history_id}/share", headers=headers).json()["token"]
    assert client.get(f"/reports/{token}").status_code == 200

    revoke_response = client.delete(f"/auth/me/history/shared/{token}", headers=headers)
    assert revoke_response.status_code == 200
    assert revoke_response.json() == {"revoked": True}

    assert client.get(f"/reports/{token}").status_code == 404


def test_revoke_requires_auth():
    response = client.delete("/auth/me/history/shared/some-token")
    assert response.status_code == 401


def test_non_owner_cannot_revoke_someone_elses_shared_report():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    owner_email = f"revoke-target-{uuid.uuid4().hex[:12]}@nextskill.dev"
    owner_signup = client.post("/auth/signup", json={"email": owner_email, "password": "testpassword123"})
    owner_headers = {"Authorization": f"Bearer {owner_signup.json()['access_token']}"}
    history_id = _make_history_entry(owner_headers, "database administrator")
    token = client.post(f"/auth/me/history/{history_id}/share", headers=owner_headers).json()["token"]

    intruder_email = f"revoke-intruder-{uuid.uuid4().hex[:12]}@nextskill.dev"
    intruder_signup = client.post("/auth/signup", json={"email": intruder_email, "password": "testpassword123"})
    intruder_headers = {"Authorization": f"Bearer {intruder_signup.json()['access_token']}"}

    response = client.delete(f"/auth/me/history/shared/{token}", headers=intruder_headers)
    assert response.status_code == 404

    # Confirm it's still live — the failed revoke attempt from a non-owner didn't delete it.
    assert client.get(f"/reports/{token}").status_code == 200
