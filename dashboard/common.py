"""Shared session-state, API client, and sidebar for every dashboard page.

Streamlit's multipage apps share st.session_state across page navigations,
but each page file runs independently otherwise — so the sidebar (API base
URL, login/signup, account badge) is rendered fresh on every page by calling
render_sidebar() at the top of each one, rather than duplicating the auth
logic in every file.
"""
import requests
import streamlit as st

DEFAULT_API_BASE = "http://localhost:8000"


def init_session_state():
    defaults = {
        "api_base": DEFAULT_API_BASE,
        "access_token": None,
        "user_email": None,
        "user_tier": None,
        "user_is_admin": False,
        "user_skills": [],
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def _auth_headers():
    if st.session_state.access_token:
        return {"Authorization": f"Bearer {st.session_state.access_token}"}
    return {}


def api_get(path, params=None, authed=False, timeout=10):
    try:
        return requests.get(
            f"{st.session_state.api_base}{path}",
            params=params,
            headers=_auth_headers() if authed else {},
            timeout=timeout,
        )
    except requests.exceptions.ConnectionError:
        st.error(f"Couldn't reach the API at {st.session_state.api_base}. Is uvicorn running?")
        return None


def api_post(path, json_body=None, authed=False, files=None, timeout=15):
    try:
        return requests.post(
            f"{st.session_state.api_base}{path}",
            json=json_body,
            files=files,
            headers=_auth_headers() if authed else {},
            timeout=timeout,
        )
    except requests.exceptions.ConnectionError:
        st.error(f"Couldn't reach the API at {st.session_state.api_base}. Is uvicorn running?")
        return None


def api_delete(path, authed=True, timeout=10):
    try:
        return requests.delete(
            f"{st.session_state.api_base}{path}",
            headers=_auth_headers() if authed else {},
            timeout=timeout,
        )
    except requests.exceptions.ConnectionError:
        st.error(f"Couldn't reach the API at {st.session_state.api_base}. Is uvicorn running?")
        return None


def api_put(path, json_body=None, authed=True, timeout=10):
    try:
        return requests.put(
            f"{st.session_state.api_base}{path}",
            json=json_body,
            headers=_auth_headers() if authed else {},
            timeout=timeout,
        )
    except requests.exceptions.ConnectionError:
        st.error(f"Couldn't reach the API at {st.session_state.api_base}. Is uvicorn running?")
        return None


def refresh_profile():
    """Pulls /auth/me and populates tier/is_admin/skills into session state —
    call after login/signup, or whenever a page needs current values (e.g.
    after an admin/tier flag might have changed via manual provisioning)."""
    resp = api_get("/auth/me", authed=True)
    if resp is not None and resp.status_code == 200:
        me = resp.json()
        st.session_state.user_tier = me.get("tier")
        st.session_state.user_is_admin = me.get("is_admin", False)
        st.session_state.user_skills = me.get("skills", [])


def logged_in() -> bool:
    return bool(st.session_state.get("access_token"))


def require_login(message="Log in or sign up in the sidebar first — this needs an account."):
    """Returns True if logged in; otherwise shows a warning and returns False
    so the page can stop rendering the gated part."""
    if not logged_in():
        st.warning(message)
        return False
    return True


def inject_style():
    st.markdown(
        """
        <style>
        .block-container { padding-top: 2.5rem; padding-bottom: 3rem; max-width: 1200px; }
        [data-testid="stMetric"] {
            background: #F7F7FA;
            border: 1px solid #ECECF2;
            border-radius: 12px;
            padding: 1rem 1.1rem;
        }
        [data-testid="stMetricLabel"] { font-weight: 500; opacity: 0.75; }
        div[data-testid="stExpander"] {
            border: 1px solid #ECECF2;
            border-radius: 10px;
        }
        .nextskill-hero {
            background: linear-gradient(135deg, #FFF4F4 0%, #FFFFFF 100%);
            border: 1px solid #FFE1E1;
            border-radius: 16px;
            padding: 1.75rem 2rem;
            margin-bottom: 1.5rem;
        }
        .nextskill-hero h1 { margin: 0 0 0.35rem 0; }
        .nextskill-hero p { margin: 0; opacity: 0.75; font-size: 1.02rem; }
        .nextskill-badge {
            display: inline-block;
            padding: 0.15rem 0.6rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-left: 0.4rem;
        }
        .nextskill-badge-pro { background: #FFF1D6; color: #8A5B00; }
        .nextskill-badge-admin { background: #E6E9FF; color: #2F3BA3; }
        section[data-testid="stSidebar"] { border-right: 1px solid #ECECF2; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def hero(title: str, subtitle: str, icon: str = "🎯"):
    st.markdown(
        f"""
        <div class="nextskill-hero">
            <h1>{icon} {title}</h1>
            <p>{subtitle}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar():
    """Lightweight status widget shown on every page — the actual login/signup
    form lives on its own dedicated page (pages/0_Login.py), not embedded here.
    """
    init_session_state()
    inject_style()

    st.sidebar.title("🎯 NextSkill")
    st.sidebar.caption("Market-aware skill-gap recommendations")
    st.sidebar.divider()

    if st.session_state.access_token:
        badges = ""
        if st.session_state.user_tier == "pro":
            badges += '<span class="nextskill-badge nextskill-badge-pro">PRO</span>'
        if st.session_state.user_is_admin:
            badges += '<span class="nextskill-badge nextskill-badge-admin">ADMIN</span>'
        # Plain <strong>, not markdown **bold** — Streamlit's markdown
        # renderer GFM-autolinks bare email-shaped text even without
        # explicit [text](mailto:...) syntax, which rendered the account
        # email as a blue underlined link for no reason.
        st.sidebar.markdown(
            f'<strong>{st.session_state.user_email}</strong>{badges}', unsafe_allow_html=True
        )
        st.sidebar.caption("Signed in")
        if st.sidebar.button("Log out", use_container_width=True):
            st.session_state.access_token = None
            st.session_state.user_email = None
            st.session_state.user_tier = None
            st.session_state.user_is_admin = False
            st.session_state.user_skills = []
            st.rerun()
    else:
        st.sidebar.info("Not signed in.")
        st.sidebar.page_link("pages/0_Login.py", label="Log in / Sign up", icon="🔑")

    with st.sidebar.expander("Connection settings"):
        st.session_state.api_base = st.text_input("API base URL", value=st.session_state.api_base)
        health = api_get("/health")
        if health is not None:
            if health.status_code == 200:
                st.success("API reachable")
            else:
                st.error(f"API returned {health.status_code}")


def render_network_graph(nodes, edges, size_field, weight_field="weight"):
    """Renders a nodes/edges graph (the shared shape /roles/transition-graph
    and /skills/co-occurrence-graph both return) as a force-directed layout.

    networkx computes the spring layout (pure Python, no system Graphviz
    binary needed); plotly draws it as an interactive scatter/line figure
    Streamlit can render directly via st.plotly_chart. Node size reflects
    size_field (posting_count or mention_count) so more common roles/skills
    stand out; edge width reflects the similarity weight.
    """
    import networkx as nx
    import plotly.graph_objects as go

    if not nodes:
        st.info("No graph data available yet.")
        return

    G = nx.Graph()
    for n in nodes:
        G.add_node(n["id"], size=n.get(size_field, 1))
    for e in edges:
        if e["source"] in G and e["target"] in G:
            G.add_edge(e["source"], e["target"], weight=e.get(weight_field, 0))

    pos = nx.spring_layout(G, seed=42, k=1.2 / max(len(G.nodes) ** 0.5, 1))

    edge_traces = []
    for u, v, data in G.edges(data=True):
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        edge_traces.append(
            go.Scatter(
                x=[x0, x1, None], y=[y0, y1, None],
                mode="lines",
                line=dict(width=max(data["weight"] * 6, 0.5), color="rgba(150,150,150,0.5)"),
                hoverinfo="none",
                showlegend=False,
            )
        )

    node_x = [pos[n][0] for n in G.nodes]
    node_y = [pos[n][1] for n in G.nodes]
    node_sizes = [G.nodes[n]["size"] for n in G.nodes]
    max_size = max(node_sizes) if node_sizes else 1
    scaled_sizes = [12 + 28 * (s / max_size) for s in node_sizes]

    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode="markers+text",
        text=list(G.nodes),
        textposition="top center",
        hovertext=[f"{n}<br>{size_field}: {G.nodes[n]['size']}" for n in G.nodes],
        hoverinfo="text",
        marker=dict(size=scaled_sizes, color="#FF4B4B", line=dict(width=1, color="white")),
        showlegend=False,
    )

    fig = go.Figure(data=edge_traces + [node_trace])
    fig.update_layout(
        showlegend=False,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        margin=dict(l=0, r=0, t=0, b=0),
        height=600,
    )
    st.plotly_chart(fig, use_container_width=True)
