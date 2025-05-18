import React  from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Landing.module.css";

export const Landing = () => {
    const navigate = useNavigate();
    
    return (
        <section className={styles.landingSection}>
            <div className={styles.content}>
                <h1>Welcome to <br/> Reconciliation.ai</h1>
                <p>AI-Driven Accuracy and Efficiency for Modern Finance Teams</p>
                <button className={styles.ctaButton} onClick={() => navigate("/login")}>
                    Login/Sign Up
                </button>
            </div>
        </section>

    );
};