import { useLocation } from "react-router-dom";
import styles from "./App.module.css";
import { Navbar } from "./components/Navbar/Navbar";
import { Landing } from "./components/Landing/Landing";
import Login from "./components/Login/Login";
import Signup from "./components/Signup/Signup";
import Chat from "./components/Chat/chat";
import { Routes, Route } from "react-router-dom";

function App() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/dashboard";

  return (
    <div className={styles.App}>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Chat />} />
      </Routes>
    </div>
  );
}

export default App;