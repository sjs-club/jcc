/* =====================================================
   FIREBASE IMPORTS
===================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    getCountFromServer,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* =====================================================
   FIREBASE CONFIG
===================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyDqU5Zp7o8jDv1o56dgFlbWNtV3ewnuGeE",
    authDomain: "josephite-chess-club.firebaseapp.com",
    projectId: "josephite-chess-club",
    storageBucket: "josephite-chess-club.firebasestorage.app",
    messagingSenderId: "557940982830",
    appId: "1:557940982830:web:ae355ec13c2b35313f0bbf",
    measurementId: "G-T2HLGK6W2L"
};

const ADMIN_UID = "xZg7Ox5QGpONp9kkDz1d5gEHjsK2";
const MEMBERS_COLLECTION = "members";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =====================================================
   ELEMENTS
===================================================== */
const loading = document.getElementById("loading");
const adminEmail = document.getElementById("adminEmail");
const logoutButton = document.getElementById("logoutButton");

function findStatValue(label) {
    const cards = [...document.querySelectorAll(".stat-card")];
    const card = cards.find(
        (item) =>
            item.querySelector("small")?.textContent.trim() === label
    );

    return card?.querySelector("strong");
}

const generalMembersCount = findStatValue("Total General Members");
const ecMembersCount = findStatValue("Total EC Members");
const totalTournamentCount = findStatValue("Total Tournament");
const upcomingEventsCount = findStatValue("Upcoming Events");
const upcomingTournamentName =
    document.getElementById("upcomingTournamentName");

/* =====================================================
   MEMBER COUNTS
===================================================== */
async function loadMemberCounts() {
    try {
        const members = collection(db, MEMBERS_COLLECTION);

        const [generalSnapshot, ecSnapshot] = await Promise.all([
            getCountFromServer(
                query(
                    members,
                    where("memberType", "==", "General member")
                )
            ),
            getCountFromServer(
                query(
                    members,
                    where("memberType", "==", "EC member")
                )
            )
        ]);

        if (generalMembersCount) {
            generalMembersCount.textContent =
                generalSnapshot.data().count;
        }

        if (ecMembersCount) {
            ecMembersCount.textContent =
                ecSnapshot.data().count;
        }
    } catch (error) {
        console.error("Could not load member counts:", error);

        if (generalMembersCount) generalMembersCount.textContent = "—";
        if (ecMembersCount) ecMembersCount.textContent = "—";
    }
}

async function loadTournamentCounts() {
    try {
        const tournaments = collection(db, "tournaments");

        const totalTournamentSnapshot =
            await getCountFromServer(tournaments);

        if (totalTournamentCount) {
            totalTournamentCount.textContent =
                totalTournamentSnapshot.data().count;
        }

        // Find the closest upcoming tournament
        const upcomingQuery = query(
            tournaments,
            where("startAtMs", ">=", Date.now()),
            orderBy("startAtMs", "asc"),
            limit(1)
        );

        const upcomingSnapshot =
            await getDocs(upcomingQuery);

        if (upcomingTournamentName) {

            if (upcomingSnapshot.empty) {

                upcomingTournamentName.textContent =
                    "No upcoming tournament";

            } else {

                const tournament =
                    upcomingSnapshot.docs[0].data();

                upcomingTournamentName.textContent =
                    tournament.name || "Untitled Tournament";
            }
        }

    } catch (error) {
        console.error(
            "Could not load tournament counts:",
            error
        );

        if (totalTournamentCount) {
            totalTournamentCount.textContent = "—";
        }

        if (upcomingTournamentName) {
            upcomingTournamentName.textContent = "—";
        }
    }
}

/* =====================================================
   INACTIVITY SETTINGS
===================================================== */
const INACTIVITY_LIMIT = 45 * 60 * 1000;
const LAST_ACTIVITY_KEY = "jcc_admin_last_activity";
const SIGNOUT_REASON_KEY = "jcc_admin_signout_reason";
let inactivityTimer = null;

function updateLastActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

async function logoutDueToInactivity() {
    clearTimeout(inactivityTimer);
    sessionStorage.setItem(SIGNOUT_REASON_KEY, "timeout");
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    try {
        await signOut(auth);
    } catch (error) {
        console.error("Inactive session logout error:", error);
    }

    window.location.href = "admin.html?error=timeout";
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    updateLastActivity();
    inactivityTimer = setTimeout(
        logoutDueToInactivity,
        INACTIVITY_LIMIT
    );
}

function checkPreviousActivity() {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

    if (!lastActivity) {
        updateLastActivity();
        return true;
    }

    return Date.now() - Number(lastActivity) < INACTIVITY_LIMIT;
}

function startInactivityMonitoring() {
    if (!checkPreviousActivity()) {
        logoutDueToInactivity();
        return;
    }

    const lastActivity = Number(
        localStorage.getItem(LAST_ACTIVITY_KEY)
    );

    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(
        logoutDueToInactivity,
        INACTIVITY_LIMIT - (Date.now() - lastActivity)
    );
}

[
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "click"
].forEach((event) => {
    document.addEventListener(event, resetInactivityTimer);
});

/* =====================================================
   AUTHENTICATION GUARD
===================================================== */
onAuthStateChanged(auth, async (user) => {
    const signoutReason = sessionStorage.getItem(SIGNOUT_REASON_KEY);

    if (!user) {
        clearTimeout(inactivityTimer);

        if (signoutReason === "timeout") {
            sessionStorage.removeItem(SIGNOUT_REASON_KEY);
            window.location.href = "admin.html?error=timeout";
            return;
        }

        if (signoutReason === "logout") {
            sessionStorage.removeItem(SIGNOUT_REASON_KEY);
            window.location.href = "admin.html?error=logout";
            return;
        }

        localStorage.removeItem(LAST_ACTIVITY_KEY);
        window.location.href = "admin.html?error=unauthorized";
        return;
    }

    if (user.uid !== ADMIN_UID) {
        clearTimeout(inactivityTimer);
        localStorage.removeItem(LAST_ACTIVITY_KEY);

        try {
            await signOut(auth);
        } catch (error) {
            console.error("Unauthorized logout error:", error);
        }

        window.location.href = "admin.html?error=unauthorized";
        return;
    }

    adminEmail.textContent = user.email || "Administrator";
    startInactivityMonitoring();

    await loadMemberCounts();
    await loadTournamentCounts();

    loading.classList.add("hidden");
});

/* =====================================================
   MANUAL LOGOUT
===================================================== */
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";
    clearTimeout(inactivityTimer);
    sessionStorage.setItem(SIGNOUT_REASON_KEY, "logout");
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    try {
        await signOut(auth);
        window.location.href = "admin.html?error=logout";
    } catch (error) {
        console.error("Logout error:", error);
        sessionStorage.removeItem(SIGNOUT_REASON_KEY);
        logoutButton.disabled = false;
        logoutButton.textContent = "Logout";
    }
});

/* =====================================================
   DASHBOARD ACTIONS
===================================================== */
document.getElementById("managePlayers").addEventListener("click", () => {
    window.location.href = "member-database.html";
});

document.getElementById("manageTournaments").addEventListener("click", () => {
    window.location.href = "query-database.html";
});

document.getElementById("manageMatches").addEventListener("click", () => {
    window.location.href = "manage-tournament.html";
});

document.getElementById("websiteSettings").addEventListener("click", () => {
    alert("Website settings will be added here.");
});