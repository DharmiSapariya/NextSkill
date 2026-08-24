import pandas as pd
import streamlit as st

from common import require_login, refresh_profile, api_get

if not require_login("Log in first."):
    st.page_link("pages/0_Login.py", label="Go to Login", icon="🔑")
    st.stop()

refresh_profile()

st.subheader("Admin")

if not st.session_state.user_is_admin:
    st.warning("This account isn't an admin. Admin status is provisioned directly by an operator — there's no self-service upgrade.")
    st.stop()

resp = api_get("/admin/stats", authed=True)
if resp is not None and resp.status_code == 200:
    data = resp.json()

    c1, c2, c3 = st.columns(3)
    c1.metric("Total users", data["total_users"])
    c2.metric("Signups (last 30 days)", data["signups_last_30_days"])
    c3.metric("Shared reports published", data["total_shared_reports"])

    c4, c5, c6 = st.columns(3)
    c4.metric("Total jobs", data["total_jobs"])
    c5.metric("Total companies", data["total_companies"])
    c6.metric("Total skills tracked", data["total_skills"])

    st.metric("Total skill mentions extracted", data["total_skill_mentions"])

    st.write("")
    st.markdown("**Most frequently requested target roles**")
    top_roles = data.get("top_target_roles", [])
    if top_roles:
        df = pd.DataFrame(top_roles)
        st.bar_chart(df.set_index("role")["times_requested"], horizontal=True)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("No /recommend calls recorded yet.")
elif resp is not None and resp.status_code == 403:
    st.error("Server says this account isn't an admin (session state was stale — try refreshing).")
elif resp is not None:
    st.error(f"Unexpected response: {resp.status_code}")
