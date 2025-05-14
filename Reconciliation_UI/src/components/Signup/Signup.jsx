import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Signup.module.css";

const Login = () => {
  const navigate = useNavigate();
  
  return (
    <div className={styles.signupPage}>
      <div className={styles.signupBox}>
        <img src="/assets/Signup/add-friend.png" alt="User Icon" className={styles.logo}/>
        <form className={styles.form}>
          <label htmlFor="username">Username</label>
          <input type="text" id="username" placeholder="Choose a username" />

          <label htmlFor="password">Password</label>
          <input type="password" id="password" placeholder="Choose a password" />

          <button type="submit">Sign-Up</button>
        </form>

        <p className={styles.loginPrompt}>
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
};

export default Login;