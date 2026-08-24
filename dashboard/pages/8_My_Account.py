import pandas as pd
import streamlit as st

from common import require_login, refresh_profile, api_get, api_put, api_delete

if not require_login("Log in to see your account."):
    st.page_link("pages/0_Login.py", label="Go to Login", icon="🔑")
    st.stop()

refresh_profile()

st.subheader("My account")
badges = []
if st.session_state.user_tier:
    badges.append(st.session_state.user_tier.upper())
if st.session_state.user_is_admin:
    badges.append("ADMIN")
st.caption(f"{st.session_state.user_email} · {' · '.join(badges) if badges else 'free'}")

tab_profile, tab_history, tab_progress, tab_digest, tab_shares = st.tabs(
    ["Skill profile", "History", "Progress", "What's changed", "Shared links"]
)

with tab_profile:
    st.markdown("**Saved skills**")
    st.caption("Used as the default for Recommend, Match Score, and Salary Prediction when you don't type skills explicitly.")
    current = ", ".join(st.session_state.user_skills)
    new_skills = st.text_area("Skills (comma-separated)", value=current, height=100)
    if st.button("Save skills", type="primary"):
        skills_list = [s.strip() for s in new_skills.split(",") if s.strip()]
        resp = api_put("/auth/me/skills", {"skills": skills_list})
        if resp is not None and resp.status_code == 200:
            st.session_state.user_skills = resp.json().get("skills", [])
            st.success("Saved.")
        elif resp is not None:
            st.error(f"Couldn't save ({resp.status_code}).")

with tab_history:
    role_filter = st.text_input("Filter by target role (optional)", key="history_role_filter")
    params = {"limit": 50}
    if role_filter:
        params["target_role"] = role_filter
    resp = api_get("/auth/me/history", params=params, authed=True)
    if resp is not None and resp.status_code == 200:
        entries = resp.json().get("results", [])
        if not entries:
            st.info("No recorded runs yet — use Recommend to build history.")
        for e in entries:
            with st.expander(f"{e['resolved_role']} — {e['created_at'][:19].replace('T', ' ')}"):
                st.write(f"Skills at the time: {', '.join(e['skills_at_time']) or '—'}")
                st.write(f"Target role as typed: {e['target_role']}")
                if e.get("recommendations"):
                    st.dataframe(pd.DataFrame(e["recommendations"]).drop(columns=["evidence"], errors="ignore"), use_container_width=True)

with tab_progress:
    progress_role = st.text_input("Target role to compare oldest vs. newest run for", key="progress_role")
    if st.button("Check progress"):
        if not progress_role:
            st.warning("Enter a target role.")
        else:
            resp = api_get("/auth/me/history/progress", params={"target_role": progress_role}, authed=True)
            if resp is not None and resp.status_code == 200:
                data = resp.json()
                if data.get("runs_recorded", 0) < 2:
                    st.info(data.get("message", "Not enough recorded runs yet."))
                else:
                    st.caption(f"{data['first_run_at'][:19].replace('T', ' ')} → {data['latest_run_at'][:19].replace('T', ' ')}")
                    c1, c2, c3 = st.columns(3)
                    with c1:
                        st.markdown("**✅ Skills closed**")
                        st.write(", ".join(data["skills_closed"]) or "—")
                    with c2:
                        st.markdown("**⏳ Still open**")
                        st.write(", ".join(data["skills_still_open"]) or "—")
                    with c3:
                        st.markdown("**🆕 New gaps**")
                        st.write(", ".join(data["new_gaps"]) or "—")

with tab_digest:
    st.caption("What's changed in your top gap skill since your last recorded run, per tracked role.")
    if st.button("Check what's new"):
        resp = api_get("/auth/me/digest", authed=True)
        if resp is not None and resp.status_code == 200:
            data = resp.json()
            changes = data.get("changes", [])
            if not changes:
                st.info(data.get("message", "Nothing's changed."))
            for c in changes:
                st.markdown(
                    f"**{c['resolved_role']}**: top gap skill changed from "
                    f"*{c['previous_top_gap_skill']}* → *{c['current_top_gap_skill']}*"
                )
                st.caption(f"{c['previous_run_at'][:19].replace('T', ' ')} → {c['latest_run_at'][:19].replace('T', ' ')}")

with tab_shares:
    st.caption("Links you've published from Recommend — anyone with the link can view without logging in.")
    resp = api_get("/auth/me/shared-reports", authed=True)
    if resp is not None and resp.status_code == 200:
        shares = resp.json().get("results", [])
        if not shares:
            st.info("You haven't shared anything yet.")
        for s in shares:
            with st.container(border=True):
                c1, c2 = st.columns([4, 1])
                with c1:
                    st.write(f"**{s['resolved_role']}** — shared {s['shared_at'][:19].replace('T', ' ')}")
                    st.code(f"{st.session_state.api_base}{s['share_path']}")
                with c2:
                    if st.button("Revoke", key=f"revoke_{s['token']}"):
                        del_resp = api_delete(f"/auth/me/history/shared/{s['token']}")
                        if del_resp is not None and del_resp.status_code == 200:
                            st.success("Revoked.")
                            st.rerun()
