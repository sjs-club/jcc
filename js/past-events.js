/* =========================================================
   JOSEPHITE CHESS CLUB — PAST EVENTS
   ========================================================= */


/* =========================================================
   1. FIREBASE IMPORTS
   ========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   2. FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDqU5Zp7o8jDv1o56dgFlbWNtV3ewnuGeE",
    authDomain: "josephite-chess-club.firebaseapp.com",
    projectId: "josephite-chess-club",
    storageBucket: "josephite-chess-club.firebasestorage.app",
    messagingSenderId: "557940982830",
    appId: "1:557940982830:web:ae355ec13c2b35313f0bbf",
    measurementId: "G-T2HLGK6W2L"
};


/* =========================================================
   3. INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


/* =========================================================
   4. DOM
   ========================================================= */

const eventsGrid =
    document.getElementById("pastEventsGrid");


/* =========================================================
   5. HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   6. FORMAT DATE / TIME
   ========================================================= */

function formatDateTime(ms) {

    if (!ms) {
        return "—";
    }

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(
        new Date(Number(ms))
    );
}


/* =========================================================
   7. PLAYER DETAILS
   ========================================================= */

function getPlayerDetails(player) {

    if (!player) {
        return "No entry";
    }

    const details = [];

    if (player.institution) {
        details.push(
            player.institution
        );
    }

    if (player.className) {
        details.push(
            `Class ${player.className}`
        );
    }

    if (player.section) {
        details.push(
            `Section ${player.section}`
        );
    }

    if (player.roll) {
        details.push(
            `Roll ${player.roll}`
        );
    }

    return details.join(" · ");
}


/* =========================================================
   8. CREATE PLAYER ROW
   ========================================================= */

function createPlayerRow(
    position,
    player
) {

    if (!player) {

        return `
            <div class="player-row">

                <div class="player-position">
                    ${position}
                </div>

                <div class="player-data">

                    <span class="player-name">
                        No entry
                    </span>

                    <span class="player-details">
                        —
                    </span>

                </div>

            </div>
        `;
    }


    const name =
        escapeHTML(
            player.name || "—"
        );

    const details =
        escapeHTML(
            getPlayerDetails(player)
        );


    return `
        <div class="player-row">

            <div class="player-position">
                ${position}
            </div>

            <div class="player-data">

                <span class="player-name">
                    ${name}
                </span>

                <span class="player-details">
                    ${details || "—"}
                </span>

            </div>

        </div>
    `;
}


/* =========================================================
   9. CREATE EVENT CARD
   ========================================================= */

function createEventCard(event) {

    const podium =
        event.podium || {};


    const name =
        escapeHTML(
            event.name || "Untitled Event"
        );


    const platform =
        escapeHTML(
            event.platform || "—"
        );


    return `
        <article class="past-event-card">

            <h2 class="event-name">
                ${name}
            </h2>


            <div class="event-info">

                <div class="info-item">

                    <span class="info-label">
                        Start
                    </span>

                    <span class="info-value">
                        ${formatDateTime(event.startAtMs)}
                    </span>

                </div>


                <div class="info-item">

                    <span class="info-label">
                        End
                    </span>

                    <span class="info-value">
                        ${formatDateTime(event.endAtMs)}
                    </span>

                </div>


                <div class="info-item">

                    <span class="info-label">
                        Platform
                    </span>

                    <span class="info-value">
                        ${platform}
                    </span>

                </div>

            </div>


            <div class="podium">

                <span class="podium-title">
                    Results
                </span>


                ${createPlayerRow(
                    "1st",
                    podium.first
                )}


                ${createPlayerRow(
                    "2nd",
                    podium.second
                )}


                ${createPlayerRow(
                    "3rd",
                    podium.third
                )}

            </div>

        </article>
    `;
}


/* =========================================================
   10. LOAD PAST EVENTS
   ========================================================= */

async function loadPastEvents() {

    try {

        eventsGrid.innerHTML = `
            <div class="events-state">
                Loading past events...
            </div>
        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "tournaments"
                )
            );


        const pastEvents = [];


        snapshot.forEach(
            (docSnapshot) => {

                const event =
                    docSnapshot.data();


                /*
                 * Only manually completed
                 * tournaments are shown.
                 */

                if (
                    event.status === "finished"
                ) {

                    pastEvents.push({
                        id: docSnapshot.id,
                        ...event
                    });
                }
            }
        );


        /* =================================================
           Sort newest finished event first
           ================================================= */

        pastEvents.sort(
            (a, b) =>
                Number(
                    b.finishedAtMs ||
                    b.endAtMs ||
                    0
                ) -
                Number(
                    a.finishedAtMs ||
                    a.endAtMs ||
                    0
                )
        );


        /* =================================================
           No events
           ================================================= */

        if (pastEvents.length === 0) {

            eventsGrid.innerHTML = `
                <div class="events-state">
                    No past events yet.
                </div>
            `;

            return;
        }


        /* =================================================
           Render events
           ================================================= */

        eventsGrid.innerHTML =
            pastEvents
                .map(createEventCard)
                .join("");

    }

    catch (error) {

        console.error(
            "Failed to load past events:",
            error
        );


        eventsGrid.innerHTML = `
            <div class="events-state">
                Unable to load past events.
            </div>
        `;
    }
}


/* =========================================================
   11. MOBILE NAVIGATION
   ========================================================= */

const menuButton =
    document.querySelector(".menu-btn");

const navLinks =
    document.querySelector(".nav-links");


if (menuButton && navLinks) {

    menuButton.addEventListener(
        "click",
        () => {

            const isOpen =
                navLinks.classList.toggle(
                    "is-open"
                );


            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        }
    );


    /* Close menu after clicking a link */

    navLinks
        .querySelectorAll("a")
        .forEach(
            (link) => {

                link.addEventListener(
                    "click",
                    () => {

                        navLinks.classList.remove(
                            "is-open"
                        );

                        menuButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                );
            }
        );
}


/* =========================================================
   12. START
   ========================================================= */

loadPastEvents();