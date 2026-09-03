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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
