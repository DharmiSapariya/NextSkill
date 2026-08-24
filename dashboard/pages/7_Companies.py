import pandas as pd
import streamlit as st

from common import api_get

st.subheader("Top hiring companies")
st.caption("Ranked by real posting volume.")

limit = st.slider("How many to show", min_value=5, max_value=50, value=10)

resp = api_get("/companies/top", params={"limit": limit})
if resp is not None and resp.status_code == 200:
    results = resp.json().get("results", [])
    if results:
        df = pd.DataFrame(results)
        st.bar_chart(df.set_index("company")["postings"], horizontal=True)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("No company data available yet.")
elif resp is not None:
    st.error(f"Unexpected response: {resp.status_code}")
