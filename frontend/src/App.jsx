import AppLoadGate from "./components/AppLoadGate";
import Landing from "./Landing";

function App() {
  return (
    <AppLoadGate>
      <Landing />
    </AppLoadGate>
  );
}

export default App;
