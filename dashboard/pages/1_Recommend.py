import pandas as pd
import streamlit as st

from common import require_login, api_post, api_get

st.subheader("What should I learn next?")
st.caption("Ranked by real posting demand for your target role — not a black-box score.")

col1, col2 = st.columns([2, 1])
with col1:
    skills_input = st.text_input(
        "Your current skills (comma-separated) — leave blank to use your saved profile",
        placeholder="Python, SQL, Excel",
    )
with col2:
    target_role = st.text_input("Target role", placeholder="data scientist")

show_evidence = st.checkbox("Show posting evidence for each recommendation", value=True)

if st.button("Get recommendations", type="primary"):
    if not require_login():
        pass
    elif not target_role:
        st.warning("Enter a target role.")
    else:
        user_skills = [s.strip() for s in skills_input.split(",") if s.strip()] if skills_input else None
        endpoint = "/recommend/evidence" if show_evidence else "/recommend"
        body = {"target_role": target_role}
        if user_skills is not None:
            body["skills"] = user_skills
        resp = api_post(endpoint, body, authed=True)

        if resp is not None:
            if resp.status_code in (401, 403):
                st.error("Not authenticated — please log in again.")
            elif resp.status_code == 429:
                st.error("429 Too Many Requests — you've hit the rate limit (10/min). Wait a moment.")
            elif resp.status_code != 200:
                st.error(f"Unexpected response: {resp.status_code} — {resp.text}")
            else:
                data = resp.json()
                recs = data.get("recommendations", [])
                role_resolution = data.get("role_resolution", {})
                resolved_role = role_resolution.get("resolved", target_role)

                if role_resolution.get("matched_semantically"):
                    st.caption(f"Resolved \"{target_role}\" → **{resolved_role}**")

                if data.get("tier"):
                    st.caption(f"Account tier: **{data['tier']}**" + (" — upgrade for deeper evidence per recommendation." if data["tier"] == "free" else ""))

                if not recs:
                    st.info("No gap skills found — try a broader role keyword.")
                else:
                    st.success(f"Top skills to close the gap for **{target_role}**")
                    df = pd.DataFrame(recs)
                    if "postings_mentioning_it" in df.columns:
                        st.bar_chart(df.set_index("skill")["postings_mentioning_it"], horizontal=True)
                    st.dataframe(df.drop(columns=["evidence"], errors="ignore"), use_container_width=True)

                    if show_evidence:
                        for rec in recs:
                            evidence = rec.get("evidence")
                            if evidence:
                                with st.expander(f"Evidence for '{rec.get('skill')}' ({len(evidence)} postings)"):
                                    for e in evidence:
                                        st.write(f"**{e.get('title')}** — {e.get('company')} ({e.get('location')})")

                st.divider()
                st.markdown("**Share this report**")
                st.caption("Publishes a link anyone can view without logging in — you can revoke it any time from My Account.")
                if st.button("Get a shareable link for this result"):
                    history_resp = api_get(
                        "/auth/me/history",
                        params={"target_role": resolved_role, "limit": 1},
                        authed=True,
                    )
                    if history_resp is not None and history_resp.status_code == 200:
                        entries = history_resp.json().get("results", [])
                        if entries:
                            share_resp = api_post(f"/auth/me/history/{entries[0]['id']}/share", authed=True)
                            if share_resp is not None and share_resp.status_code == 200:
                                share_path = share_resp.json()["share_path"]
                                full_url = f"{st.session_state.api_base}{share_path}"
                                st.success("Link created:")
                                st.code(full_url)
                            else:
                                st.error("Couldn't create a share link.")
                        else:
                            st.error("Couldn't find the recommendation entry to share.")
