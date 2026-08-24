import streamlit as st

from common import require_login, api_post

st.subheader("Resume, match score & salary")
st.caption("Upload a resume to auto-fill your skill profile, then see a statistical match score and a predicted salary range — both grounded in real postings, not a guess.")

tab_resume, tab_match, tab_salary = st.tabs(["Upload resume", "Match score", "Salary prediction"])

with tab_resume:
    st.markdown("**Upload a resume (PDF or DOCX, max 5MB)**")
    st.caption("Extracted skills are merged into your saved profile automatically.")
    uploaded = st.file_uploader("Resume file", type=["pdf", "docx"], label_visibility="collapsed")
    if st.button("Extract skills", type="primary"):
        if not require_login():
            pass
        elif uploaded is None:
            st.warning("Choose a file first.")
        else:
            content_type = (
                "application/pdf"
                if uploaded.name.lower().endswith(".pdf")
                else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            resp = api_post(
                "/auth/me/resume",
                authed=True,
                files={"file": (uploaded.name, uploaded.getvalue(), content_type)},
            )
            if resp is not None:
                if resp.status_code == 200:
                    data = resp.json()
                    found = data.get("skills_found_in_resume", [])
                    if found:
                        st.success(f"Found {len(found)} skills: {', '.join(found)}")
                    else:
                        st.info("No taxonomy skills found in this resume.")
                    st.caption(f"Your full saved profile is now: {', '.join(data.get('skills', [])) or '(empty)'}")
                elif resp.status_code == 413:
                    st.error("File too large — max 5MB.")
                elif resp.status_code == 400:
                    st.error(resp.json().get("detail", "Couldn't read this file."))
                else:
                    st.error(f"Unexpected response: {resp.status_code}")

with tab_match:
    st.markdown("**What % of real postings for a role would you already be a strong match for?**")
    skills_input = st.text_input(
        "Your skills (comma-separated) — leave blank to use your saved profile", key="match_skills"
    )
    target_role = st.text_input("Target role", key="match_role", placeholder="backend developer")
    if st.button("Compute match score", type="primary"):
        if not require_login():
            pass
        elif not target_role:
            st.warning("Enter a target role.")
        else:
            body = {"target_role": target_role}
            if skills_input:
                body["skills"] = [s.strip() for s in skills_input.split(",") if s.strip()]
            resp = api_post("/match-score", body, authed=True)
            if resp is not None and resp.status_code == 200:
                data = resp.json()
                if data.get("sample_size") == 0 or data.get("match_pct") is None:
                    st.info(data.get("message", "No postings found for this role yet."))
                else:
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Match", f"{data['match_pct']}%")
                    c2.metric("Avg. skill overlap", f"{data['avg_overlap_pct']}%")
                    c3.metric("Sample size", data["sample_size"])
                    st.caption(f"A posting counts as a match above {data['coverage_threshold_pct']}% skill coverage.")
            elif resp is not None:
                st.error(f"Unexpected response: {resp.status_code}")

with tab_salary:
    st.markdown("**Predicted salary range for a target role, given a skill set**")
    skills_input = st.text_input(
        "Your skills (comma-separated) — leave blank to use your saved profile", key="salary_skills"
    )
    target_role = st.text_input("Target role", key="salary_role", placeholder="data scientist")
    if st.button("Predict salary", type="primary"):
        if not require_login():
            pass
        elif not target_role:
            st.warning("Enter a target role.")
        else:
            body = {"target_role": target_role}
            if skills_input:
                body["skills"] = [s.strip() for s in skills_input.split(",") if s.strip()]
            resp = api_post("/predict-salary", body, authed=True)
            if resp is not None:
                if resp.status_code == 503:
                    st.info("No salary model has been trained yet.")
                elif resp.status_code == 200:
                    data = resp.json()
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Low estimate", f"${data['predicted_salary_low']:,.0f}")
                    c2.metric("Midpoint", f"${data['predicted_salary_midpoint']:,.0f}")
                    c3.metric("High estimate", f"${data['predicted_salary_high']:,.0f}")
                    st.caption(f"Matched role bucket: {data['matched_role_bucket']}")
                else:
                    st.error(f"Unexpected response: {resp.status_code}")
