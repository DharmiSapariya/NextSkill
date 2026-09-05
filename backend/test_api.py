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
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["redis"] in {"ok", "disabled", "unavailable"}


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


def test_refresh_requires_auth():
    response = client.post("/auth/refresh")
    assert response.status_code == 401


def test_refresh_issues_a_working_token():
    email = f"refresh-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    response = client.post("/auth/refresh", headers=headers)
    assert response.status_code == 200
    new_token = response.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_refresh_rejects_expired_or_garbage_token():
    response = client.post("/auth/refresh", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


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
    from models import User as UserModel, db_session

    email = f"admin-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    user = db_session.query(UserModel).filter_by(email=email).first()
    user.is_admin = True
    db_session.commit()
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


def test_admin_list_users_requires_auth():
    response = client.get("/admin/users")
    assert response.status_code == 401


def test_admin_list_users_rejects_non_admin_user(auth_headers):
    response = client.get("/admin/users", headers=auth_headers)
    assert response.status_code == 403


def test_admin_list_users_returns_results_and_filters_by_email():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    admin_headers = _make_admin_headers()
    target_email = f"findme-{uuid.uuid4().hex[:12]}@nextskill.dev"
    client.post("/auth/signup", json={"email": target_email, "password": "testpassword123"})

    response = client.get(f"/admin/users?q=findme-&limit=10", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(u["email"] == target_email for u in data["results"])
    match = next(u for u in data["results"] if u["email"] == target_email)
    assert match["tier"] == "free"
    assert match["is_admin"] is False
    assert match["skill_count"] == 0


def test_admin_update_user_requires_auth():
    response = client.put("/admin/users/1", json={"tier": "pro"})
    assert response.status_code == 401


def test_admin_update_user_rejects_non_admin_user(auth_headers):
    response = client.put("/admin/users/1", json={"tier": "pro"}, headers=auth_headers)
    assert response.status_code == 403


def test_admin_update_user_not_found():
    admin_headers = _make_admin_headers()
    response = client.put("/admin/users/999999999", json={"tier": "pro"}, headers=admin_headers)
    assert response.status_code == 404


def test_admin_update_user_grants_pro_tier():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    admin_headers = _make_admin_headers()
    target_email = f"promote-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": target_email, "password": "testpassword123"})
    target_headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    target_id = client.get("/auth/me", headers=target_headers).json()["id"]

    response = client.put(f"/admin/users/{target_id}", json={"tier": "pro"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["tier"] == "pro"

    # Takes effect for the target user's own session immediately, not just the response body.
    me = client.get("/auth/me", headers=target_headers)
    assert me.json()["tier"] == "pro"
    assert me.json()["is_admin"] is False  # untouched — only tier was in the request body


def test_admin_update_user_grants_admin_without_touching_tier():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    admin_headers = _make_admin_headers()
    target_email = f"promote-admin-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": target_email, "password": "testpassword123"})
    target_headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    target_id = client.get("/auth/me", headers=target_headers).json()["id"]

    response = client.put(f"/admin/users/{target_id}", json={"is_admin": True}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_admin"] is True
    assert response.json()["tier"] == "free"  # untouched

    # The newly-promoted admin can now use admin-only endpoints themselves.
    stats = client.get("/admin/stats", headers=target_headers)
    assert stats.status_code == 200


def test_admin_delete_user_requires_auth():
    response = client.request("DELETE", "/admin/users/1")
    assert response.status_code == 401


def test_admin_delete_user_rejects_non_admin_user(auth_headers):
    response = client.request("DELETE", "/admin/users/1", headers=auth_headers)
    assert response.status_code == 403


def test_admin_delete_user_not_found():
    admin_headers = _make_admin_headers()
    response = client.request("DELETE", "/admin/users/999999999", headers=admin_headers)
    assert response.status_code == 404


def test_admin_delete_user_removes_account_and_cascades():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    admin_headers = _make_admin_headers()
    target_email = f"admin-deleted-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": target_email, "password": "testpassword123"})
    target_headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    target_id = client.get("/auth/me", headers=target_headers).json()["id"]

    history_id = _make_history_entry(target_headers, "technical writer")
    token = client.post(f"/auth/me/history/{history_id}/share", headers=target_headers).json()["token"]

    response = client.request("DELETE", f"/admin/users/{target_id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json() == {"status": "user deleted", "id": target_id}

    # No FK violation, and the deleted user's own token stops resolving.
    assert client.get("/auth/me", headers=target_headers).status_code == 401
    # Their shared report is gone too, not orphaned.
    assert client.get(f"/reports/{token}").status_code == 404

    limiter.reset()
    resignup = client.post("/auth/signup", json={"email": target_email, "password": "anotherpassword123"})
    assert resignup.status_code == 200  # the email is free again
    limiter.reset()


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
    from models import Company, Job, db_session

    before = _trend_window()

    company = db_session.query(Company).first()
    later_date = before[2] + timedelta(days=5)  # 5 days past the current window's end
    db_session.add(Job(
        external_id=f"trend-window-test-{uuid.uuid4().hex[:12]}",
        title="Software Engineer",
        company_id=company.id,
        location="Remote",
        description="",
        category="IT Jobs",
        source="test",
        posted_date=later_date,
    ))
    db_session.commit()

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
    from models import User as UserModel, db_session

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
    from models import RecommendationHistory, User as UserModel, db_session

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
    from models import User as UserModel, db_session

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
    assert data["based_on_postings"] > 1
    assert len(data["related_skills"]) <= 5
    related_names = {r["skill"].lower() for r in data["related_skills"]}
    assert "react" not in related_names
    for r in data["related_skills"]:
        assert 0 < r["co_occurrence_pct"] <= 100


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
    assert relevant.json()["total_market_jobs"] > 0
    assert relevant.json()["match_pct"] > irrelevant.json()["match_pct"]


def test_match_score_unknown_role_returns_zero_sample(auth_headers):
    response = client.post(
        "/match-score",
        json={"skills": ["Python"], "target_role": "definitely not a tracked role xyz"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_market_jobs"] == 0
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


def test_nearest_roles_is_cached():
    from cache import cache_get

    response = client.get("/roles/data scientist/nearest?limit=3")
    assert response.status_code == 200
    cached = cache_get("role-nearest:data scientist:3")
    if cached is None:
        pytest.skip("REDIS_URL not set — caching fails open, nothing to assert here")
    assert cached == response.json()["nearest_roles"]


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
    from models import RecommendationHistory, User as UserModel, db_session

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


def test_list_shared_reports_requires_auth():
    response = client.get("/auth/me/shared-reports")
    assert response.status_code == 401


def test_list_shared_reports_returns_only_the_current_users_own():
    email = f"list-shared-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    empty_response = client.get("/auth/me/shared-reports", headers=headers)
    assert empty_response.status_code == 200
    assert empty_response.json()["results"] == []

    history_id = _make_history_entry(headers, "mobile developer")
    token = client.post(f"/auth/me/history/{history_id}/share", headers=headers).json()["token"]

    response = client.get("/auth/me/shared-reports", headers=headers)
    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["token"] == token
    assert results[0]["resolved_role"] == "mobile developer"
    assert results[0]["share_path"] == f"/reports/{token}"

    # Revoking removes it from the list, not just from direct token lookup.
    client.delete(f"/auth/me/history/shared/{token}", headers=headers)
    after_revoke = client.get("/auth/me/shared-reports", headers=headers)
    assert after_revoke.json()["results"] == []


def test_list_shared_reports_is_paginated():
    from api import limiter

    limiter.reset()
    email = f"paginate-shared-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    for role in ["backend developer", "frontend developer", "data analyst"]:
        history_id = _make_history_entry(headers, role)
        client.post(f"/auth/me/history/{history_id}/share", headers=headers)

    page = client.get("/auth/me/shared-reports?limit=2", headers=headers)
    assert page.status_code == 200
    data = page.json()
    assert data["total"] == 3
    assert data["limit"] == 2
    assert len(data["results"]) == 2

    next_page = client.get("/auth/me/shared-reports?limit=2&offset=2", headers=headers)
    assert len(next_page.json()["results"]) == 1
    limiter.reset()


def test_list_shared_reports_rejects_non_positive_limit(auth_headers):
    assert client.get("/auth/me/shared-reports?limit=0", headers=auth_headers).status_code == 422
    assert client.get("/auth/me/shared-reports?limit=-1", headers=auth_headers).status_code == 422


def test_list_shared_reports_does_not_leak_other_users_reports():
    from api import limiter

    limiter.reset()  # this test signs up 2 users — same shared-counter caveat as the rate-limit tests
    owner_email = f"list-owner-{uuid.uuid4().hex[:12]}@nextskill.dev"
    owner_signup = client.post("/auth/signup", json={"email": owner_email, "password": "testpassword123"})
    owner_headers = {"Authorization": f"Bearer {owner_signup.json()['access_token']}"}
    _make_history_entry(owner_headers, "product manager")
    history_id = client.get("/auth/me/history?target_role=product manager&limit=1", headers=owner_headers).json()["results"][0]["id"]
    client.post(f"/auth/me/history/{history_id}/share", headers=owner_headers)

    other_email = f"list-other-{uuid.uuid4().hex[:12]}@nextskill.dev"
    other_signup = client.post("/auth/signup", json={"email": other_email, "password": "testpassword123"})
    other_headers = {"Authorization": f"Bearer {other_signup.json()['access_token']}"}

    response = client.get("/auth/me/shared-reports", headers=other_headers)
    assert response.json()["results"] == []


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


def test_change_password_requires_auth():
    response = client.put("/auth/me/password", json={"current_password": "x", "new_password": "newpassword123"})
    assert response.status_code == 401


def test_change_password_rejects_wrong_current_password():
    from api import limiter

    limiter.reset()
    email = f"pwchange-wrong-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    response = client.put(
        "/auth/me/password",
        json={"current_password": "wrongpassword", "new_password": "newpassword123"},
        headers=headers,
    )
    assert response.status_code == 401

    # The password wasn't touched — the original still logs in fine.
    limiter.reset()
    still_works = client.post("/auth/login", json={"email": email, "password": "testpassword123"})
    assert still_works.status_code == 200
    limiter.reset()


def test_change_password_rejects_new_password_too_short():
    from api import limiter

    limiter.reset()
    email = f"pwchange-short-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    response = client.put(
        "/auth/me/password",
        json={"current_password": "testpassword123", "new_password": "short"},
        headers=headers,
    )
    assert response.status_code == 422
    limiter.reset()


def test_change_password_succeeds_and_old_password_stops_working():
    from api import limiter

    limiter.reset()
    email = f"pwchange-ok-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    response = client.put(
        "/auth/me/password",
        json={"current_password": "testpassword123", "new_password": "brandnewpassword456"},
        headers=headers,
    )
    assert response.status_code == 200

    limiter.reset()
    old_login = client.post("/auth/login", json={"email": email, "password": "testpassword123"})
    assert old_login.status_code == 401

    limiter.reset()
    new_login = client.post("/auth/login", json={"email": email, "password": "brandnewpassword456"})
    assert new_login.status_code == 200
    limiter.reset()


def test_delete_account_requires_auth():
    response = client.request("DELETE", "/auth/me", json={"password": "x"})
    assert response.status_code == 401


def test_delete_account_rejects_wrong_password():
    email = f"delete-wrong-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    response = client.request("DELETE", "/auth/me", json={"password": "wrongpassword"}, headers=headers)
    assert response.status_code == 401

    # Still there — /auth/me still resolves with the same token.
    assert client.get("/auth/me", headers=headers).status_code == 200


def test_delete_account_removes_user_and_cascades_history_and_shared_reports():
    from api import limiter

    limiter.reset()
    email = f"delete-ok-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    history_id = _make_history_entry(headers, "site reliability engineer")
    token = client.post(f"/auth/me/history/{history_id}/share", headers=headers).json()["token"]
    assert client.get(f"/reports/{token}").status_code == 200

    response = client.request("DELETE", "/auth/me", json={"password": "testpassword123"}, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "account deleted"}

    # The token is dead now — no FK violation on startup, and /auth/me for
    # the deleted user's own (still structurally valid) JWT is rejected.
    assert client.get("/auth/me", headers=headers).status_code == 401

    # The shared report referencing this user is gone too, not orphaned.
    assert client.get(f"/reports/{token}").status_code == 404

    # The email is free again — deleting really removed the row, not just flagged it.
    limiter.reset()
    resignup = client.post("/auth/signup", json={"email": email, "password": "anotherpassword123"})
    assert resignup.status_code == 200
    limiter.reset()


def test_match_score_is_rate_limited():
    # /match-score, /predict-salary, and /auth/me/resume were unlimited
    # despite being authenticated compute-heavy endpoints — a single
    # compromised/leaked token could otherwise hammer the salary model or
    # resume parser with no throttle at all. Same 10/minute as /recommend.
    from api import limiter

    limiter.reset()
    email = f"ratelimit-match-{uuid.uuid4().hex[:12]}@nextskill.dev"
    signup = client.post("/auth/signup", json={"email": email, "password": "testpassword123"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    limiter.reset()  # the signup call above shares the same per-IP counter

    for _ in range(10):
        response = client.post(
            "/match-score", json={"skills": ["Python"], "target_role": "data scientist"}, headers=headers
        )
        assert response.status_code == 200

    response = client.post(
        "/match-score", json={"skills": ["Python"], "target_role": "data scientist"}, headers=headers
    )
    assert response.status_code == 429
    limiter.reset()


def test_list_skills_returns_results():
    response = client.get("/skills?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) <= 5
    assert data["total"] > 0
    mentions = [s["mention_count"] for s in data["results"]]
    assert mentions == sorted(mentions, reverse=True)


def test_list_skills_filters_by_query():
    response = client.get("/skills?q=python&limit=20")
    assert response.status_code == 200
    for skill in response.json()["results"]:
        assert "python" in skill["name"].lower()


def test_list_skills_rejects_non_positive_limit():
    assert client.get("/skills?limit=0").status_code == 422
    assert client.get("/skills?limit=-1").status_code == 422


def test_list_companies_returns_results():
    response = client.get("/companies?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) <= 5
    assert data["total"] > 0
    postings = [c["postings"] for c in data["results"]]
    assert postings == sorted(postings, reverse=True)


def test_list_companies_filters_by_query():
    known = client.get("/companies?limit=1").json()["results"][0]["company"]
    keyword = known[:4]
    response = client.get(f"/companies?q={keyword}&limit=50")
    assert response.status_code == 200
    for company in response.json()["results"]:
        assert keyword.lower() in company["company"].lower()


def test_list_companies_pagination_is_consistent_with_total():
    total = client.get("/companies?limit=1").json()["total"]
    all_companies = client.get(f"/companies?limit={min(total, 100)}").json()["results"]
    assert len({c["company"] for c in all_companies}) == len(all_companies)  # no duplicates across the page


def test_list_companies_rejects_non_positive_limit():
    assert client.get("/companies?limit=0").status_code == 422
    assert client.get("/companies?limit=-1").status_code == 422


def test_health_reports_database_and_redis_fields():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"status", "database", "redis"}


# --- Applications (job tracker) ---------------------------------------


def test_create_application_requires_auth():
    response = client.post("/applications", json={"company_name": "Acme", "job_title": "Engineer"})
    assert response.status_code == 401


def test_create_application_defaults_to_saved_status(auth_headers):
    response = client.post(
        "/applications",
        json={"company_name": "Globex", "job_title": "Backend Developer"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "saved"
    assert body["company_name"] == "Globex"
    assert body["job_title"] == "Backend Developer"
    assert body["job_id"] is None


def test_create_application_rejects_nonexistent_job_id(auth_headers):
    response = client.post(
        "/applications",
        json={"company_name": "Globex", "job_title": "Backend Developer", "job_id": 999999999},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_list_applications_filters_by_status(auth_headers):
    client.post(
        "/applications",
        json={"company_name": "Filter Co", "job_title": "Role A", "status": "interviewing"},
        headers=auth_headers,
    )
    response = client.get("/applications?status=interviewing", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert all(r["status"] == "interviewing" for r in body["results"])


def test_update_application_changes_status_and_notes(auth_headers):
    created = client.post(
        "/applications",
        json={"company_name": "Update Co", "job_title": "Role B"},
        headers=auth_headers,
    ).json()

    response = client.patch(
        f"/applications/{created['id']}",
        json={"status": "applied", "notes": "Submitted via referral"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "applied"
    assert body["notes"] == "Submitted via referral"


def test_update_application_not_found(auth_headers):
    response = client.patch("/applications/999999999", json={"status": "applied"}, headers=auth_headers)
    assert response.status_code == 404


def test_applications_board_groups_by_status(auth_headers):
    client.post(
        "/applications",
        json={"company_name": "Board Co", "job_title": "Role C", "status": "offer"},
        headers=auth_headers,
    )
    response = client.get("/applications/board", headers=auth_headers)
    assert response.status_code == 200
    board = response.json()["board"]
    assert set(board.keys()) == {"saved", "applied", "interviewing", "offer", "rejected", "withdrawn"}
    assert any(a["company_name"] == "Board Co" for a in board["offer"])


def test_delete_application_removes_it(auth_headers):
    created = client.post(
        "/applications",
        json={"company_name": "Delete Co", "job_title": "Role D"},
        headers=auth_headers,
    ).json()

    delete_response = client.delete(f"/applications/{created['id']}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True

    second_delete = client.delete(f"/applications/{created['id']}", headers=auth_headers)
    assert second_delete.status_code == 404


def test_users_cannot_modify_each_others_applications():
    from api import limiter

    limiter.reset()
    owner_email = f"app-owner-{uuid.uuid4().hex[:12]}@nextskill.dev"
    owner_headers = {
        "Authorization": f"Bearer {client.post('/auth/signup', json={'email': owner_email, 'password': 'testpassword123'}).json()['access_token']}"
    }
    created = client.post(
        "/applications",
        json={"company_name": "Private Co", "job_title": "Role E"},
        headers=owner_headers,
    ).json()

    intruder_email = f"app-intruder-{uuid.uuid4().hex[:12]}@nextskill.dev"
    intruder_headers = {
        "Authorization": f"Bearer {client.post('/auth/signup', json={'email': intruder_email, 'password': 'testpassword123'}).json()['access_token']}"
    }
    response = client.patch(
        f"/applications/{created['id']}", json={"status": "applied"}, headers=intruder_headers
    )
    assert response.status_code == 404


# --- Certifications ------------------------------------------------------


def test_add_certification_requires_auth():
    response = client.post("/auth/me/certifications", json={"name": "AWS Certified Solutions Architect"})
    assert response.status_code == 401


def test_add_and_list_certifications(auth_headers):
    create_response = client.post(
        "/auth/me/certifications",
        json={
            "name": "AWS Certified Solutions Architect",
            "issuing_organization": "Amazon Web Services",
            "issue_date": "2025-01-15",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 200, create_response.text
    body = create_response.json()
    assert body["name"] == "AWS Certified Solutions Architect"
    assert body["issuing_organization"] == "Amazon Web Services"

    list_response = client.get("/auth/me/certifications", headers=auth_headers)
    assert list_response.status_code == 200
    names = [c["name"] for c in list_response.json()["results"]]
    assert "AWS Certified Solutions Architect" in names


def test_delete_certification_removes_it(auth_headers):
    created = client.post(
        "/auth/me/certifications",
        json={"name": "Certified Kubernetes Administrator"},
        headers=auth_headers,
    ).json()

    delete_response = client.delete(f"/auth/me/certifications/{created['id']}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True

    second_delete = client.delete(f"/auth/me/certifications/{created['id']}", headers=auth_headers)
    assert second_delete.status_code == 404


# --- Learning resources ---------------------------------------------------


def test_skill_learning_resources_for_known_skill():
    response = client.get("/skills/Python/resources")
    assert response.status_code == 200
    body = response.json()
    assert body["skill"] == "Python"
    assert len(body["resources"]) >= 3
    assert all(r["url"].startswith("https://") for r in body["resources"])


def test_skill_learning_resources_for_unknown_skill_still_returns_search_links():
    response = client.get("/skills/SomeSkillNotInTheDatabase/resources")
    assert response.status_code == 200
    body = response.json()
    assert body["skill"] == "SomeSkillNotInTheDatabase"
    assert len(body["resources"]) >= 3


# --- Career plan ------------------------------------------------------


def test_career_plan_requires_auth():
    response = client.get("/career-plan?target_role=software engineer")
    assert response.status_code == 401


def test_career_plan_returns_gaps_with_resources_and_adjacent_roles(auth_headers):
    response = client.get("/career-plan?target_role=software engineer", headers=auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["role_resolution"]["resolved"] == "software engineer"
    assert "skill_gaps" in body
    assert "adjacent_roles" in body
    if body["skill_gaps"]:
        first_gap = body["skill_gaps"][0]
        assert "resources" in first_gap
        assert len(first_gap["resources"]) >= 1
