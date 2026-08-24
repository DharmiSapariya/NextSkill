"""Home page content — registered via st.navigation() in streamlit_app.py,
which also owns st.set_page_config() and the shared sidebar (both must be
called exactly once per run, before st.navigation(...).run())."""
import streamlit as st

from common import hero, logged_in, api_get

hero(
    "NextSkill",
    "Free, transparent, market-aware skill-gap recommendations — backed by real job "
    "posting evidence, not a black-box score.",
)

if not logged_in():
    st.page_link("pages/0_Login.py", label="Log in or sign up to get personalized recommendations", icon="🔑")
    st.write("")

col1, col2, col3 = st.columns(3)
jobs_resp = api_get("/jobs", params={"limit": 1})
with col1:
    if jobs_resp is not None and jobs_resp.status_code == 200:
        st.metric("Real job postings tracked", jobs_resp.json().get("total", "—"))
with col2:
    st.metric("Cost", "Free")
with col3:
    st.metric("Account", st.session_state.user_email if logged_in() else "Guest")

st.write("")
st.subheader("Explore")

FEATURES = [
    ("pages/1_Recommend.py", "🎯", "Recommend", "What to learn next, with real posting evidence."),
    ("pages/2_Explore_Skill.py", "🔎", "Explore a Skill", "Demand trend, lifecycle stage, and related skills."),
    ("pages/3_Career_Paths.py", "🧭", "Career Paths", "The role-transition graph and nearest-role lookup."),
    ("pages/4_Skill_Network.py", "🕸️", "Skill Network", "A co-occurrence graph across in-demand skills."),
    ("pages/5_Resume_and_Salary.py", "📄", "Resume & Salary", "Upload a resume, get a match score and salary prediction."),
    ("pages/6_Jobs.py", "💼", "Jobs", "Browse postings, filterable by role, location, seniority."),
    ("pages/7_Companies.py", "🏢", "Companies", "Top hiring companies by posting volume."),
    ("pages/8_My_Account.py", "👤", "My Account", "History, progress over time, and what's changed."),
    ("pages/9_Admin.py", "🛡️", "Admin", "Aggregate platform stats (admin accounts only)."),
]

for row_start in range(0, len(FEATURES), 3):
    cols = st.columns(3)
    for col, (page, icon, title, desc) in zip(cols, FEATURES[row_start:row_start + 3]):
        with col:
            with st.container(border=True):
                st.markdown(f"### {icon} {title}")
                st.caption(desc)
                st.page_link(page, label="Open →")
