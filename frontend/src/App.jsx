import { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./Landing";
import AppShell from "./app/AppShell";
import Login from "./app/pages/Login";
import Signup from "./app/pages/Signup";

import RouteContent from "./app/RouteContent";

const Overview = lazy(() => import("./app/pages/Overview"));
const SkillGapReport = lazy(() => import("./app/pages/SkillGapReport"));
const ResumeUpload = lazy(() => import("./app/pages/ResumeUpload"));
const MatchSalary = lazy(() => import("./app/pages/MatchSalary"));
const Jobs = lazy(() => import("./app/pages/Jobs"));
const JobDetail = lazy(() => import("./app/pages/JobDetail"));
const SavedJobs = lazy(() => import("./app/pages/SavedJobs"));
const Trends = lazy(() => import("./app/pages/Trends"));
const Skills = lazy(() => import("./app/pages/Skills"));
const RoleGraph = lazy(() => import("./app/pages/RoleGraph"));
const SkillGraph = lazy(() => import("./app/pages/SkillGraph"));
const Companies = lazy(() => import("./app/pages/Companies"));
const History = lazy(() => import("./app/pages/History"));
const SharedReport = lazy(() => import("./app/pages/SharedReport"));
const Settings = lazy(() => import("./app/pages/Settings"));
const AdminStats = lazy(() => import("./app/pages/AdminStats"));
const AdminUsers = lazy(() => import("./app/pages/AdminUsers"));

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reports/:token" element={<RouteContent><SharedReport /></RouteContent>} />

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
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
