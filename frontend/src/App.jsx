import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLoadGate from "./components/AppLoadGate";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./Landing";
import AppShell from "./app/AppShell";
import Overview from "./app/pages/Overview";
import Login from "./app/pages/Login";
import Signup from "./app/pages/Signup";
import SkillGapReport from "./app/pages/SkillGapReport";
import ResumeUpload from "./app/pages/ResumeUpload";
import MatchSalary from "./app/pages/MatchSalary";
import Jobs from "./app/pages/Jobs";
import JobDetail from "./app/pages/JobDetail";
import SavedJobs from "./app/pages/SavedJobs";
import Trends from "./app/pages/Trends";
import Skills from "./app/pages/Skills";
import RoleGraph from "./app/pages/RoleGraph";
import SkillGraph from "./app/pages/SkillGraph";
import Companies from "./app/pages/Companies";
import History from "./app/pages/History";
import SharedReport from "./app/pages/SharedReport";
import Settings from "./app/pages/Settings";
import AdminStats from "./app/pages/AdminStats";
import AdminUsers from "./app/pages/AdminUsers";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <AppLoadGate>
                <Landing />
              </AppLoadGate>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reports/:token" element={<SharedReport />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="report" element={<SkillGapReport />} />
            <Route path="resume" element={<ResumeUpload />} />
            <Route path="match" element={<MatchSalary />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="saved-jobs" element={<SavedJobs />} />
            <Route path="trends" element={<Trends />} />
            <Route path="skills" element={<Skills />} />
            <Route path="roles" element={<RoleGraph />} />
            <Route path="skill-graph" element={<SkillGraph />} />
            <Route path="companies" element={<Companies />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminStats />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
