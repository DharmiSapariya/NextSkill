import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import RequireAuth from "./lib/RequireAuth";
import Layout from "./Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Recommend from "./pages/Recommend";
import ExploreSkill from "./pages/ExploreSkill";
import CareerPaths from "./pages/CareerPaths";
import SkillNetwork from "./pages/SkillNetwork";
import ResumeSalary from "./pages/ResumeSalary";
import Jobs from "./pages/Jobs";
import Companies from "./pages/Companies";
import MyAccount from "./pages/MyAccount";
import Admin from "./pages/Admin";
import NextSkillIntro from "./intro/NextSkillIntro";

const INTRO_SEEN_KEY = "nextskill_intro_seen";

export default function App() {
  // The intro is an entry experience, not a per-navigation transition — it
  // shows once per browser session (sessionStorage, not localStorage: a
  // fresh tab/session gets it again, a route change within the same
  // session never does). Clear sessionStorage to re-trigger it while
  // iterating on the animation itself.
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem(INTRO_SEEN_KEY));

  function handleIntroComplete() {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setShowIntro(false);
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="recommend" element={<Recommend />} />
            <Route path="explore-skill" element={<ExploreSkill />} />
            <Route path="career-paths" element={<CareerPaths />} />
            <Route path="skill-network" element={<SkillNetwork />} />
            <Route path="resume-salary" element={<ResumeSalary />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="companies" element={<Companies />} />
            <Route
              path="account"
              element={
                <RequireAuth>
                  <MyAccount />
                </RequireAuth>
              }
            />
            <Route
              path="admin"
              element={
                <RequireAuth adminOnly>
                  <Admin />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
        {/* Overlay, not a swap — the app is already mounted underneath so
            the intro's exit is a literal reveal, not a page transition. */}
        {showIntro && <NextSkillIntro onComplete={handleIntroComplete} />}
      </BrowserRouter>
    </AuthProvider>
  );
}
