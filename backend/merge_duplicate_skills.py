from models import Skill, JobSkill, session


def merge_duplicate_skills() -> int:
    """Merges case-variant duplicate skills (e.g. 'python' and 'Python') into
    one canonical row, keeping the first-created one. Safe to run repeatedly —
    a no-op once there's nothing left to merge."""
    all_skills = session.query(Skill).all()

    groups = {}
    for skill in all_skills:
        key = skill.name.lower()
        groups.setdefault(key, []).append(skill)

    merged_count = 0
    for key, skills in groups.items():
        if len(skills) <= 1:
            continue

        primary = skills[0]
        for duplicate in skills[1:]:
            job_skills = session.query(JobSkill).filter_by(skill_id=duplicate.id).all()
            for js in job_skills:
                exists = session.query(JobSkill).filter_by(job_id=js.job_id, skill_id=primary.id).first()
                if not exists:
                    js.skill_id = primary.id
                else:
                    session.delete(js)
            session.delete(duplicate)
            merged_count += 1

    session.commit()
    print(f"Merged {merged_count} duplicate skill entries")
    return merged_count


if __name__ == "__main__":
    merge_duplicate_skills()
