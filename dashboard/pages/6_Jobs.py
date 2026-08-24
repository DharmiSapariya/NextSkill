import pandas as pd
import streamlit as st

from common import api_get

st.subheader("Browse jobs")
st.caption("Real postings, filterable by role, location, and inferred seniority.")

col1, col2, col3 = st.columns(3)
with col1:
    role = st.text_input("Role keyword", placeholder="data scientist")
with col2:
    location = st.text_input("Location keyword", placeholder="Remote")
with col3:
    seniority = st.selectbox("Seniority", ["Any", "junior", "mid", "senior", "unspecified"])

page_size = st.slider("Results per page", min_value=5, max_value=100, value=20)
if "jobs_offset" not in st.session_state:
    st.session_state.jobs_offset = 0

params = {"limit": page_size, "offset": st.session_state.jobs_offset}
if role:
    params["role"] = role
if location:
    params["location"] = location
if seniority != "Any":
    params["seniority"] = seniority

resp = api_get("/jobs", params=params)
if resp is not None and resp.status_code == 200:
    data = resp.json()
    total = data["total"]
    results = data["results"]

    st.caption(f"{total} total matching postings")
    if results:
        df = pd.DataFrame(results)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("No postings match these filters.")

    nav1, nav2, nav3 = st.columns([1, 2, 1])
    with nav1:
        if st.button("← Previous", disabled=st.session_state.jobs_offset == 0):
            st.session_state.jobs_offset = max(0, st.session_state.jobs_offset - page_size)
            st.rerun()
    with nav2:
        showing_from = st.session_state.jobs_offset + 1 if total else 0
        showing_to = min(st.session_state.jobs_offset + page_size, total)
        st.markdown(f"<div style='text-align:center'>Showing {showing_from}-{showing_to} of {total}</div>", unsafe_allow_html=True)
    with nav3:
        if st.button("Next →", disabled=st.session_state.jobs_offset + page_size >= total):
            st.session_state.jobs_offset += page_size
            st.rerun()
elif resp is not None:
    st.error(f"Unexpected response: {resp.status_code}")
