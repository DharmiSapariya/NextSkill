import pandas as pd
import streamlit as st

from common import api_get, render_network_graph

st.subheader("Career paths")
st.caption(
    "Which roles are realistically one skill-gap away versus three — built from real skill "
    "co-occurrence across tracked roles, not a survey."
)

tab_graph, tab_nearest = st.tabs(["Transition graph", "Nearest roles to a target"])

with tab_graph:
    resp = api_get("/roles/transition-graph")
    if resp is not None and resp.status_code == 200:
        data = resp.json()
        st.caption(f"{len(data['nodes'])} tracked roles, {len(data['edges'])} similarity edges above threshold.")
        render_network_graph(data["nodes"], data["edges"], size_field="posting_count")
    elif resp is not None:
        st.error(f"Couldn't load the transition graph ({resp.status_code}).")

with tab_nearest:
    role = st.text_input("A role you're in (or interested in)", placeholder="backend developer")
    limit = st.slider("How many nearest roles", min_value=1, max_value=20, value=5)

    if st.button("Find nearest roles"):
        if not role:
            st.warning("Enter a role.")
        else:
            resp = api_get(f"/roles/{role}/nearest", params={"limit": limit})
            if resp is not None:
                if resp.status_code == 404:
                    st.error(resp.json().get("detail", "Not a tracked role."))
                elif resp.status_code == 200:
                    data = resp.json()
                    role_resolution = data.get("role_resolution", {})
                    if role_resolution.get("matched_semantically"):
                        st.caption(f"Resolved \"{role}\" → **{role_resolution.get('resolved')}**")

                    nearest = data.get("nearest_roles", [])
                    if not nearest:
                        st.info("No nearby roles found yet.")
                    for entry in nearest:
                        with st.expander(f"{entry['role']} — {entry['similarity'] * 100:.1f}% skill overlap"):
                            c1, c2 = st.columns(2)
                            with c1:
                                st.markdown("**Skills you already have**")
                                st.write(", ".join(entry["skills_you_have"]) or "—")
                            with c2:
                                st.markdown("**Skills you'd need**")
                                st.write(", ".join(entry["skills_you_would_need"]) or "—")
