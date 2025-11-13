import { Toaster } from "react-hot-toast";
import AppRouter from "./router";

function App() {
  return (
    <div className="min-h-screen bg-surface text-textPrimary">
      <AppRouter />
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </div>
  );
}

export default App;
