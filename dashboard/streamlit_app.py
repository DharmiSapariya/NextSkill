"""
NextSkill Dashboard — Streamlit frontend for the NextSkill API.

Run with:
    streamlit run streamlit_app.py

Assumes the FastAPI backend is running locally (default: http://localhost:8000).

This file is the app shell only: page config, the shared sidebar (rendered
once here, persists across every page since Streamlit re-runs this script
top-to-bottom on every navigation), and the explicit page registry via
st.navigation()/st.Page() — the modern multipage API, used instead of bare
pages/ folder auto-discovery because st.page_link/st.switch_page need a
page to be explicitly registered to resolve reliably.
"""
import streamlit as st

from common import render_sidebar

st.set_page_config(page_title="NextSkill", page_icon="🎯", layout="wide")

# Pages must be registered via st.navigation() BEFORE render_sidebar() runs —
# st.sidebar.page_link() needs the target page already registered to resolve
# its URL, or it raises KeyError: 'url_pathname'. Confirmed this ordering
# matters by hitting that exact error with render_sidebar() called first.
pages = st.navigation(
    [
        st.Page("pages/_home_content.py", title="Home", icon="🏠", default=True, url_path="home"),
        st.Page("pages/0_Login.py", title="Login", icon="🔑", url_path="login"),
        st.Page("pages/1_Recommend.py", title="Recommend", icon="🎯", url_path="recommend"),
        st.Page("pages/2_Explore_Skill.py", title="Explore a Skill", icon="🔎", url_path="explore"),
        st.Page("pages/3_Career_Paths.py", title="Career Paths", icon="🧭", url_path="career-paths"),
        st.Page("pages/4_Skill_Network.py", title="Skill Network", icon="🕸️", url_path="skill-network"),
        st.Page("pages/5_Resume_and_Salary.py", title="Resume & Salary", icon="📄", url_path="resume-salary"),
        st.Page("pages/6_Jobs.py", title="Jobs", icon="💼", url_path="jobs"),
        st.Page("pages/7_Companies.py", title="Companies", icon="🏢", url_path="companies"),
        st.Page("pages/8_My_Account.py", title="My Account", icon="👤", url_path="account"),
        st.Page("pages/9_Admin.py", title="Admin", icon="🛡️", url_path="admin"),
    ]
)
render_sidebar()
pages.run()
