import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

const Login = () => {
  const navigate = useNavigate();

  // State for input values
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // New: Track login error

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();

    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      setErrorMessage(""); // clear previous error
      navigate("/dashboard"); // Replace with your next page
    } else {
      setErrorMessage(data.message); // New: Set error to display under inputs
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginBox}>
        <img src="/assets/LoginIcon/user.png" alt="User Icon" className={styles.logo} />
        <form className={styles.form} onSubmit={handleLogin}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMessage && (
            <p className={styles.errorMessage}>{errorMessage}</p> // New: error display
          )}

          <button type="submit">Login</button>
        </form>

        <p className={styles.signupPrompt}>
          Don’t have an account?{" "}
          <span onClick={() => navigate("/signup")}>Sign up</span>
        </p>
      </div>
    </div>
  );
};

export default Login;