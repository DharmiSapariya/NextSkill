import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLoadGate from "./components/AppLoadGate";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./Landing";
import AppShell from "./app/AppShell";
import Overview from "./app/pages/Overview";

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

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
