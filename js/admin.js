import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =====================================================
   FIREBASE CONFIG
===================================================== */

const firebaseConfig = {

    apiKey: "AIzaSyDqU5Zp7o8jDv1o56dgFlbWNtV3ewnuGeE",

    authDomain:
        "josephite-chess-club.firebaseapp.com",

    projectId:
        "josephite-chess-club",

    storageBucket:
        "josephite-chess-club.firebasestorage.app",

    messagingSenderId:
        "557940982830",

    appId:
        "1:557940982830:web:ae355ec13c2b35313f0bbf",

    measurementId:
        "G-T2HLGK6W2L"
};


/* =====================================================
   INITIALIZE FIREBASE
===================================================== */

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);


/* =====================================================
   ELEMENTS
===================================================== */

const loginForm =
    document.getElementById("loginForm");

const usernameInput =
    document.getElementById("username");

const passwordInput =
    document.getElementById("password");

const passwordToggle =
    document.getElementById("passwordToggle");

const errorMessage =
    document.getElementById("errorMessage");

const loginButton =
    document.getElementById("loginButton");

/* =====================================================
   CHECK EXISTING LOGIN
===================================================== */

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            window.location.href =
                "admin-dash.html";

        }

    }
);


/* =====================================================
   LOGIN PAGE MESSAGES
===================================================== */

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const errorType =
    urlParams.get("error");


if (errorType === "unauthorized") {

    errorMessage.textContent =
        "Access denied. This account is not authorized to access the JCC Admin Panel.";

    errorMessage.classList.add("show");

}


else if (errorType === "timeout") {

    errorMessage.textContent =
        "Your session has expired due to 45 minutes of inactivity. Please log in again.";

    errorMessage.classList.add("show");

}


else if (errorType === "logout") {

    errorMessage.textContent =
        "You have been successfully logged out.";

    errorMessage.classList.add("show");

}


/*
   Remove the error parameter from the URL
   so refreshing the page doesn't show the
   same message again.
*/

if (errorType) {

    window.history.replaceState(
        {},
        document.title,
        "admin.html"
    );

}

/* =====================================================
   PASSWORD VISIBILITY
===================================================== */

passwordToggle.addEventListener(
    "click",
    () => {

        const passwordIsHidden =
            passwordInput.type === "password";


        if (passwordIsHidden) {

            passwordInput.type = "text";

            passwordToggle.classList.add(
                "visible"
            );

            passwordToggle.setAttribute(
                "aria-label",
                "Hide password"
            );

        } else {

            passwordInput.type = "password";

            passwordToggle.classList.remove(
                "visible"
            );

            passwordToggle.setAttribute(
                "aria-label",
                "Show password"
            );

        }

    }
);


/* =====================================================
   FIREBASE LOGIN
===================================================== */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            usernameInput.value.trim();

        const password =
            passwordInput.value;


        errorMessage.classList.remove(
            "show"
        );


        loginButton.disabled = true;

        loginButton.textContent =
            "Signing in...";


        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            /*
             * Login successful.
             */

            window.location.href =
                "admin-dash.html";


        } catch (error) {

            console.error(
                "Firebase authentication error:",
                error
            );


            errorMessage.textContent =
                "Incorrect email or password.";

            errorMessage.classList.add(
                "show"
            );


            passwordInput.value = "";

            passwordInput.focus();


            loginButton.disabled = false;

            loginButton.textContent =
                "Login to JCC";

        }

    }
);


/* =====================================================
   REMOVE ERROR WHILE TYPING
===================================================== */

usernameInput.addEventListener(
    "input",
    () => {

        errorMessage.classList.remove(
            "show"
        );

    }
);


passwordInput.addEventListener(
    "input",
    () => {

        errorMessage.classList.remove(
            "show"
        );

    }
);