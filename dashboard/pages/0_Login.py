import streamlit as st

from common import hero, api_post, refresh_profile, logged_in

if logged_in():
    hero("You're signed in", f"Signed in as {st.session_state.user_email}.", icon="✅")
    st.page_link("pages/8_My_Account.py", label="Go to My Account", icon="👤")
    st.page_link("pages/_home_content.py", label="Back to Home", icon="🏠")
    st.stop()

hero("Log in or sign up", "One free account — no credit card, no trial clock.", icon="🔑")

tab_login, tab_signup = st.tabs(["Log in", "Sign up"])

with tab_login:
    with st.form("login_form"):
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_password")
        submitted = st.form_submit_button("Log in", type="primary", use_container_width=True)
    if submitted:
        resp = api_post("/auth/login", {"email": email, "password": password})
        if resp is not None:
            if resp.status_code == 200:
                st.session_state.access_token = resp.json()["access_token"]
                st.session_state.user_email = email
                refresh_profile()
                st.success("Logged in!")
                st.rerun()
            elif resp.status_code == 429:
                st.error("Too many attempts — wait a moment and try again.")
            else:
                st.error(resp.json().get("detail", f"Log in failed ({resp.status_code})"))

with tab_signup:
    with st.form("signup_form"):
        email = st.text_input("Email", key="signup_email")
        password = st.text_input("Password (8-72 characters)", type="password", key="signup_password")
        submitted = st.form_submit_button("Sign up", type="primary", use_container_width=True)
    if submitted:
        resp = api_post("/auth/signup", {"email": email, "password": password})
        if resp is not None:
            if resp.status_code == 200:
                st.session_state.access_token = resp.json()["access_token"]
                st.session_state.user_email = email
                refresh_profile()
                st.success("Account created!")
                st.rerun()
            elif resp.status_code == 409:
                st.error("An account with this email already exists — try logging in instead.")
            elif resp.status_code == 422:
                st.error("Password must be 8-72 characters, and email must look like a real email.")
            elif resp.status_code == 429:
                st.error("Too many attempts — wait a moment and try again.")
            else:
                st.error(resp.json().get("detail", f"Sign up failed ({resp.status_code})"))
