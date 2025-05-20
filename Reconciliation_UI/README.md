# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# Notes on how to run the Application

For Windows users, to use npm you'll need to run: 
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
as admin in the terminal. 
This may require you to open VSCode as admin to get admin level shells. This allows npm to run as a script which Windows normally blocks, this will only persist for your current terminal and needs to be re-run on each subsequent terminal. 
The command to permanently disable this safeguard is dangerous and will not be pasted here. 

To run the backend server, that is currently used for username and password verification, run 
node server.js
from the 
AI-ML-Reconciliation\Reconciliation_UI\backend directory. 

To run the frontend, from the main Reconciliation_UI directory run: 
npm run dev

# Notes on localStorage usage
Currently the files uploaded to the app use the browser's localStorage, this will need to be replaced with a proper backend later on. The limit on how much we can upload varies from browser instance to browser instance. 

A script that can check for your localStorage limit: 
(function checkLocalStorageLimit() {
  const testKey = 'localStorageTest';
  const oneKB = 'x'.repeat(1024); // 1KB chunk
  let data = '';
  let kb = 0;

  try {
    while (true) {
      data += oneKB;
      console.log(`currently at ${kb} KB`);
      localStorage.setItem(testKey, data);
      kb++;
    }
  } catch (e) {
    console.log(`💾 localStorage limit reached at ~${kb} KB`);
    localStorage.removeItem(testKey);
  }
})();

The command for clearing localStorage: 
localStorage.clear();

A script for checking current localStorage usage: 
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    total += (localStorage[key].length + key.length) * 2; // 2 bytes per char
  }
}
console.log(`Current usage: ${(total / 1024).toFixed(2)} KB`);

