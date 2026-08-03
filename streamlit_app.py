"""
NextSkill Dashboard — Streamlit frontend for the NextSkill API.

Run with:
    streamlit run streamlit_app.py

Assumes the FastAPI backend is running locally (default: http://localhost:8000)
and that NEXTSKILL_API_KEY is available (either pasted into the sidebar, or
set as an environment variable before launching streamlit).
"""

import os
import requests
import streamlit as st
import pandas as pd

st.set_page_config(page_title="NextSkill", page_icon="🎯", layout="wide")

# ---------------------------------------------------------------------------
# Sidebar: connection + auth
# ---------------------------------------------------------------------------
st.sidebar.title("NextSkill")
st.sidebar.caption("Market-aware skill-gap recommendations")

api_base = st.sidebar.text_input("API base URL", value="http://localhost:8000")
api_key = st.sidebar.text_input(
    "X-API-Key",
    value=os.environ.get("NEXTSKILL_API_KEY", ""),
    type="password",
    help="Required for /recommend and /recommend/evidence. Reads NEXTSKILL_API_KEY env var by default.",
)

st.sidebar.divider()
st.sidebar.caption(
    "Health, jobs, trends, and company data are open endpoints — no key needed."
)


def api_get(path, params=None):
    try:
        r = requests.get(f"{api_base}{path}", params=params, timeout=10)
        return r
    except requests.exceptions.ConnectionError:
        st.error(f"Couldn't reach the API at {api_base}. Is uvicorn running?")
        return None


def api_post_authed(path, json_body):
    try:
        r = requests.post(
            f"{api_base}{path}",
            json=json_body,
            headers={"X-API-Key": api_key},
            timeout=15,
        )
        return r
    except requests.exceptions.ConnectionError:
        st.error(f"Couldn't reach the API at {api_base}. Is uvicorn running?")
        return None


# ---------------------------------------------------------------------------
# Health check banner
# ---------------------------------------------------------------------------
health = api_get("/health")
if health is not None:
    if health.status_code == 200:
        st.sidebar.success("API reachable")
    else:
        st.sidebar.error(f"API returned {health.status_code}")

st.title("🎯 NextSkill")
st.caption(
    "Free, transparent, market-aware skill-gap recommendations — "
    "backed by real job posting evidence, not a black-box score."
)

tab_recommend, tab_explore, tab_companies = st.tabs(
    ["Skill Gap Recommender", "Explore a Skill", "Top Hiring Companies"]
)

# ---------------------------------------------------------------------------
# Tab 1: Recommendation engine (the core product)
# ---------------------------------------------------------------------------
with tab_recommend:
    st.subheader("What should I learn next?")

    col1, col2 = st.columns([2, 1])
    with col1:
        skills_input = st.text_input(
            "Your current skills (comma-separated)",
            placeholder="Python, SQL, Excel",
        )
    with col2:
        target_role = st.text_input("Target role", placeholder="data scientist")

    show_evidence = st.checkbox("Show posting evidence for each recommendation", value=True)

    if st.button("Get recommendations", type="primary"):
        if not api_key:
            st.warning("Paste your X-API-Key in the sidebar first — this endpoint is protected.")
        elif not skills_input or not target_role:
            st.warning("Fill in both your current skills and a target role.")
        else:
            user_skills = [s.strip() for s in skills_input.split(",") if s.strip()]
            endpoint = "/recommend/evidence" if show_evidence else "/recommend"
            resp = api_post_authed(endpoint, {"skills": user_skills, "target_role": target_role})

            if resp is not None:
                if resp.status_code == 401:
                    st.error("401 Unauthorized — check your API key.")
                elif resp.status_code == 429:
                    st.error("429 Too Many Requests — you've hit the rate limit (10/min). Wait a moment.")
                elif resp.status_code != 200:
                    st.error(f"Unexpected response: {resp.status_code} — {resp.text}")
                else:
                    data = resp.json()
                    recs = data.get("recommendations", [])
                    if not recs:
                        st.info("No gap skills found — try a broader role keyword.")
                    else:
                        st.success(f"Top skills to close the gap for **{target_role}**")
                        df = pd.DataFrame(recs)
                        if "postings_mentioning_it" in df.columns:
                            st.bar_chart(
                                df.set_index("skill")["postings_mentioning_it"],
                                horizontal=True,
                            )
                        st.dataframe(df, use_container_width=True)

                        if show_evidence:
                            for rec in recs:
                                evidence = rec.get("evidence") or rec.get("example_postings")
                                if evidence:
                                    with st.expander(f"Evidence for '{rec.get('skill')}'"):
                                        for e in evidence:
                                            st.write(f"**{e.get('title')}** — {e.get('company')} ({e.get('location')})")

# ---------------------------------------------------------------------------
# Tab 2: Explore a single skill — trend + co-occurrence
# ---------------------------------------------------------------------------
with tab_explore:
    st.subheader("Explore a skill")
    skill_query = st.text_input("Skill name", placeholder="React", key="skill_explore")

    if st.button("Look it up"):
        if not skill_query:
            st.warning("Enter a skill name.")
        else:
            trend_resp = api_get(f"/trends/{skill_query}")
            related_resp = api_get(f"/skills/{skill_query}/related")

            col_a, col_b = st.columns(2)

            with col_a:
                st.markdown("**Demand snapshot**")
                if trend_resp is not None:
                    if trend_resp.status_code == 404:
                        st.info(f"No data found for '{skill_query}'.")
                    elif trend_resp.status_code == 200:
                        st.json(trend_resp.json())

            with col_b:
                st.markdown("**Commonly appears alongside**")
                if related_resp is not None:
                    if related_resp.status_code == 404:
                        st.info(f"No co-occurrence data for '{skill_query}'.")
                    elif related_resp.status_code == 200:
                        related_data = related_resp.json()
                        related_list = related_data.get("related") or related_data.get("results")
                        if related_list:
                            st.dataframe(pd.DataFrame(related_list), use_container_width=True)
                        else:
                            st.json(related_data)

# ---------------------------------------------------------------------------
# Tab 3: Top hiring companies
# ---------------------------------------------------------------------------
with tab_companies:
    st.subheader("Top hiring companies")
    limit = st.slider("How many to show", min_value=5, max_value=50, value=10)

    resp = api_get("/companies/top", params={"limit": limit})
    if resp is not None and resp.status_code == 200:
        results = resp.json().get("results", [])
        if results:
            df = pd.DataFrame(results)
            st.bar_chart(df.set_index("company")["postings"], horizontal=True)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No company data available yet.")
