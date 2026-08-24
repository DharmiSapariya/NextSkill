import streamlit as st

from common import api_get, render_network_graph

st.subheader("Skill network")
st.caption(
    "How the most in-demand skills cluster together across real postings — "
    "the same graph shape as Career Paths, applied to skills instead of roles."
)

limit = st.slider("How many top skills to include", min_value=5, max_value=60, value=30)

resp = api_get("/skills/co-occurrence-graph", params={"limit": limit})
if resp is not None and resp.status_code == 200:
    data = resp.json()
    st.caption(f"{len(data['nodes'])} skills, {len(data['edges'])} co-occurrence edges above threshold.")
    render_network_graph(data["nodes"], data["edges"], size_field="mention_count", weight_field="weight")
elif resp is not None:
    st.error(f"Couldn't load the skill network ({resp.status_code}).")
