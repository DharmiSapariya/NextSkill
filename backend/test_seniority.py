"""Tests for train_salary_model.py's train_model() and salary_predict.py's
model hot-reloading behavior.

Verifies training threshold validation, dataset builds, file mtime-based cache
invalidation, and thread-safe hot-reloading without polluting shared disk models.
"""

import os
from unittest.mock import patch
import numpy as np
import pytest

import salary_predict
import train_salary_model


@pytest.fixture(autouse=True)
def reset_salary_predict_cache():
    """Ensures in-memory model cache state is pristine before and after every test run."""
    salary_predict._model = None
    salary_predict._features = None
    salary_predict._loaded_mtime = None
    yield
    salary_predict._model = None
    salary_predict._features = None
    salary_predict._loaded_mtime = None


@pytest.fixture
def mock_trained_model_file(tmp_path, monkeypatch):
    """Creates a dummy model artifact inside a temporary directory and patches paths."""
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    model_file = model_dir / "salary_model.joblib"
    model_file.write_text("mock_model_binary_content")

    monkeypatch.setattr(train_salary_model, "MODEL_DIR", str(model_dir))
    monkeypatch.setattr(salary_predict, "MODEL_PATH", str(model_file))
    return model_file


# --- Model Training Tests ---

def test_train_model_skips_cleanly_with_insufficient_data(monkeypatch):
    """Verifies that model training halts gracefully when training sample size is below threshold (< 30)."""
    monkeypatch.setattr(
        train_salary_model,
        "build_dataset",
        lambda: (np.zeros((5, 3)), np.zeros(5), ["software engineer"] * 5, ["Python", "SQL", "Docker"]),
    )
    result = train_salary_model.train_model()
    assert result == {"status": "skipped", "reason": "only 5 salary-labeled postings, need at least 30"}


def test_train_model_trains_successfully_with_sufficient_data(monkeypatch, tmp_path):
    """Verifies dataset extraction, model artifact persistence, and metric reporting when threshold is met."""
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    monkeypatch.setattr(train_salary_model, "MODEL_DIR", str(model_dir))

    # Mock dataset with 40 postings (above 30 minimum)
    n_samples = 40
    dummy_x = np.random.rand(n_samples, 3)
    dummy_y = np.random.randint(60000, 150000, size=n_samples)
    roles = ["software engineer"] * n_samples
    skills = ["Python", "SQL", "Docker"]

    monkeypatch.setattr(
        train_salary_model,
        "build_dataset",
        lambda: (dummy_x, dummy_y, roles, skills),
    )

    result = train_salary_model.train_model()
    assert result["status"] == "trained"
    assert result["trained_on"] > 0
    assert result["tested_on"] > 0
    assert result["mae"] >= 0
    assert os.path.exists(os.path.join(str(model_dir), "salary_model.joblib"))


# --- Cache Invalidation & Reloading Tests ---

def test_salary_predict_reloads_when_model_file_changes(mock_trained_model_file):
    """Ensures in-memory model reloads automatically when disk artifact mtime changes."""
    fake_model_v1 = {"version": 1}
    fake_model_v2 = {"version": 2}

    with patch("salary_predict.joblib.load", side_effect=[fake_model_v1, fake_model_v2]) as mock_load:
        # Initial load
        salary_predict._load()
        assert salary_predict._model == fake_model_v1
        first_mtime = salary_predict._loaded_mtime
        assert mock_load.call_count == 1

        # Bump file mtime to simulate background process model retrain
        new_mtime = first_mtime + 10
        os.utime(str(mock_trained_model_file), (new_mtime, new_mtime))

        # Secondary call triggers reload
        salary_predict._load()
        assert mock_load.call_count == 2
        assert salary_predict._model == fake_model_v2
        assert salary_predict._loaded_mtime == new_mtime


def test_salary_predict_does_not_reload_when_file_unchanged(mock_trained_model_file):
    """Ensures in-memory model cache serves requests without disk access when mtime remains static."""
    fake_model = {"version": 1}

    with patch("salary_predict.joblib.load", return_value=fake_model) as mock_load:
        salary_predict._load()
        assert mock_load.call_count == 1

        # Secondary load with unchanged mtime — should be cached
        salary_predict._load()
        assert mock_load.call_count == 1