import pandas as pd
import streamlit as st

from common import api_get

st.subheader("Explore a skill")
skill_query = st.text_input("Skill name", placeholder="React", key="skill_explore")

LIFECYCLE_LABELS = {
    "emerging": "🌱 Emerging",
    "growing": "📈 Growing",
    "mature": "🏛️ Mature",
    "declining": "📉 Declining",
    "niche": "🔍 Niche (flat, never widespread)",
    "insufficient_data": "❔ Not enough data yet",
}

if st.button("Look it up"):
    if not skill_query:
        st.warning("Enter a skill name.")
    else:
        trend_resp = api_get(f"/trends/{skill_query}")
        related_resp = api_get(f"/skills/{skill_query}/related")

        col_a, col_b = st.columns(2)

        with col_a:
            st.markdown("**Demand trend**")
            if trend_resp is not None:
                if trend_resp.status_code == 404:
                    st.info(f"No data found for '{skill_query}'.")
                elif trend_resp.status_code == 503:
                    st.info("No posting data ingested yet for the tracked core roles.")
                elif trend_resp.status_code == 200:
                    t = trend_resp.json()
                    lifecycle = t.get("lifecycle", "insufficient_data")
                    st.markdown(f"### {LIFECYCLE_LABELS.get(lifecycle, lifecycle)}")

                    prev, curr = t["previous_period"], t["current_period"]
                    m1, m2, m3 = st.columns(3)
                    m1.metric("Previous period share", f"{prev['share_pct']}%")
                    m2.metric(
                        "Current period share",
                        f"{curr['share_pct']}%",
                        delta=f"{t['change_pct']}%" if t.get("change_pct") is not None else None,
                    )
                    m3.metric("Total mentions ever", t["total_mentions"])

                    st.caption(
                        f"Trend: **{t['trend']}** · window: {t['window_days']} days · "
                        f"{prev['start']} → {curr['end']}"
                    )
                    with st.expander("Methodology"):
                        st.write(t["methodology"])
                        st.caption(t["caveat"])

        with col_b:
            st.markdown("**Commonly appears alongside**")
            if related_resp is not None:
                if related_resp.status_code == 404:
                    st.info(f"No co-occurrence data for '{skill_query}'.")
                elif related_resp.status_code == 200:
                    related_data = related_resp.json()
                    related_list = related_data.get("related_skills", [])
                    if related_list:
                        st.caption(f"Based on {related_data.get('based_on_postings')} postings mentioning '{related_data.get('skill')}'")
                        df = pd.DataFrame(related_list)
                        st.bar_chart(df.set_index("skill")["co_occurrence_pct"], horizontal=True)
                        st.dataframe(df, use_container_width=True)
                    else:
                        st.info("No related skills found yet.")
