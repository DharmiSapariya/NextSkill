"""Tests for train_salary_model.py's train_model() and salary_predict.py's
model-reload behavior — neither had dedicated tests before, only indirect
coverage through /predict-salary in test_api.py.
"""
import os

import numpy as np

import salary_predict
import train_salary_model


def test_train_model_skips_cleanly_with_insufficient_data(monkeypatch):
    monkeypatch.setattr(
        train_salary_model,
        "build_dataset",
        lambda: (np.zeros((5, 3)), np.zeros(5), ["software engineer"] * 5, ["Python", "SQL", "Docker"]),
    )
    result = train_salary_model.train_model()
    assert result == {"status": "skipped", "reason": "only 5 salary-labeled postings, need at least 30"}


def test_train_model_trains_against_real_seeded_data():
    # The seeded fixture data has well over 30 salary-labeled postings —
    # exercises the real training path, not just the skip branch above.
    result = train_salary_model.train_model()
    assert result["status"] == "trained"
    assert result["trained_on"] > 0
    assert result["tested_on"] > 0
    assert result["mae"] >= 0
    assert os.path.exists(f"{train_salary_model.MODEL_DIR}/salary_model.joblib")


def test_salary_predict_reloads_when_model_file_changes():
    # Retraining used to be pointless for a long-running API process: _load()
    # cached the model on first use and never looked at the file again, so a
    # retrain (from a separate scheduler process) would silently never be
    # picked up until the API process restarted.
    salary_predict._model = None
    salary_predict._features = None
    salary_predict._loaded_mtime = None

    train_salary_model.train_model()  # ensure a real model file exists
    salary_predict._load()
    first_mtime = salary_predict._loaded_mtime
    assert first_mtime is not None
    assert salary_predict._model is not None

    # Simulate a retrain having happened without changing this process's
    # in-memory globals directly — only touch the file's mtime forward, the
    # same observable signal a real retrain from another process would leave.
    model_path = f"{train_salary_model.MODEL_DIR}/salary_model.joblib"
    new_mtime = first_mtime + 10
    os.utime(model_path, (new_mtime, new_mtime))

    load_calls = []
    real_joblib_load = salary_predict.joblib.load

    def counting_load(path):
        load_calls.append(path)
        return real_joblib_load(path)

    salary_predict.joblib.load = counting_load
    try:
        salary_predict._load()
    finally:
        salary_predict.joblib.load = real_joblib_load

    assert len(load_calls) == 1  # confirms a reload actually happened
    assert salary_predict._loaded_mtime == new_mtime


def test_salary_predict_does_not_reload_when_file_unchanged():
    salary_predict._model = None
    salary_predict._features = None
    salary_predict._loaded_mtime = None
    train_salary_model.train_model()
    salary_predict._load()

    load_calls = []
    real_joblib_load = salary_predict.joblib.load

    def counting_load(path):
        load_calls.append(path)
        return real_joblib_load(path)

    salary_predict.joblib.load = counting_load
    try:
        salary_predict._load()  # same mtime as before — should be a no-op
    finally:
        salary_predict.joblib.load = real_joblib_load

    assert len(load_calls) == 0
