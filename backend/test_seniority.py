from seniority import infer_seniority


def test_infers_senior_from_common_variants():
    assert infer_seniority("Senior Backend Engineer") == "senior"
    assert infer_seniority("Sr. Data Scientist") == "senior"
    assert infer_seniority("Sr Data Scientist") == "senior"
    assert infer_seniority("Staff Software Engineer") == "senior"
    assert infer_seniority("Principal Engineer") == "senior"
    assert infer_seniority("Lead Frontend Developer") == "senior"
    assert infer_seniority("Solutions Architect") == "senior"


def test_infers_junior_from_common_variants():
    assert infer_seniority("Junior Backend Developer") == "junior"
    assert infer_seniority("Jr. Data Analyst") == "junior"
    assert infer_seniority("Entry Level Software Engineer") == "junior"
    assert infer_seniority("Entry-Level QA Engineer") == "junior"
    assert infer_seniority("Associate Product Manager") == "junior"
    assert infer_seniority("Software Engineering Intern") == "junior"


def test_infers_mid_from_common_variants():
    assert infer_seniority("Mid Level Backend Developer") == "mid"
    assert infer_seniority("Mid-Level Data Scientist") == "mid"


def test_falls_back_to_unspecified_rather_than_guessing():
    assert infer_seniority("Backend Software Engineer") == "unspecified"
    assert infer_seniority("Data Scientist") == "unspecified"
    assert infer_seniority("DevOps Engineer") == "unspecified"


def test_word_boundaries_avoid_false_positives():
    # "Seniority" contains "senior" as a substring but is a different word —
    # without \b word boundaries in the regex this would false-positive.
    assert infer_seniority("Seniority Analyst") == "unspecified"
    assert infer_seniority("Senior Analyst") == "senior"  # the real keyword still matches on its own


def test_is_case_insensitive():
    assert infer_seniority("SENIOR BACKEND ENGINEER") == "senior"
    assert infer_seniority("junior backend engineer") == "junior"
