from fastapi.testclient import TestClient
from api import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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


def test_get_job_not_found():
    response = client.get("/jobs/999999999")
    assert response.status_code == 404


def test_top_companies():
    response = client.get("/companies/top?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) <= 3
    # results should be sorted descending by postings
    postings = [c["postings"] for c in data["results"]]
    assert postings == sorted(postings, reverse=True)


def test_trend_for_known_skill():
    response = client.get("/trends/Python")
    assert response.status_code == 200
    data = response.json()
    assert data["skill"] == "Python"
    assert data["total_mentions"] > 0


def test_trend_for_unknown_skill():
    response = client.get("/trends/DefinitelyNotARealSkillXYZ")
    assert response.status_code == 404


def test_recommend_returns_ranked_list():
    response = client.post(
        "/recommend",
        json={"skills": ["Python", "SQL"], "target_role": "data scientist"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_role"] == "data scientist"
    assert len(data["recommendations"]) > 0
    # verify it's sorted descending by demand
    counts = [r["postings_mentioning_it"] for r in data["recommendations"]]
    assert counts == sorted(counts, reverse=True)


def test_recommend_excludes_stated_skills():
    response = client.post(
        "/recommend",
        json={"skills": ["Python"], "target_role": "data scientist"},
    )
    data = response.json()
    recommended_names = {r["skill"].lower() for r in data["recommendations"]}
    assert "python" not in recommended_names


def test_recommend_evidence_includes_real_postings():
    response = client.post(
        "/recommend/evidence",
        json={"skills": ["Python", "SQL"], "target_role": "data scientist"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) > 0
    for rec in data["recommendations"]:
        assert "evidence" in rec
        for item in rec["evidence"]:
            assert "title" in item
            assert "company" in item


def test_related_skills_returns_sensible_results():
    response = client.get("/skills/React/related?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["skill"] == "React"
    assert data["based_on_postings"] > 0
    assert len(data["related_skills"]) <= 5
    # Should never include React itself in its own related list
    related_names = {r["skill"].lower() for r in data["related_skills"]}
    assert "react" not in related_names


def test_related_skills_unknown_skill():
    response = client.get("/skills/DefinitelyNotARealSkillXYZ/related")
    assert response.status_code == 404
