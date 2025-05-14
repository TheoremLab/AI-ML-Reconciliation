import React from "react";
import styles from "./Navbar.module.css";

export const Navbar = () => {

    return (
        <nav className={styles.navbar}>
            <a className={styles.title} href="/">Theromlabs.io </a>
            <div className={styles.menu}>
                <ul className={styles.menuItems}>
                    <li>
                        <a href="#">About</a>
                    </li>
                </ul>
            </div>
        </nav>
    );
};