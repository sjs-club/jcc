/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =====================================================
   UPCOMING EVENTS
===================================================== */

const eventsGrid = document.getElementById("eventsGrid");


/*
    Convert different possible Firestore date formats
    into a normal JavaScript Date.
*/
function toDate(value) {

    if (!value) {
        return null;
    }

    // Firebase Timestamp
    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    // JavaScript Date
    if (value instanceof Date) {
        return value;
    }

    // ISO string / number
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}


function formatEventStartTime(startAt) {
    if (!startAt) {
        return "Start time has not been announced yet.";
    }

    return startAt.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

/*
    Determine event status from its dates.
*/
function getEventStatus(startAt, endAt, firestoreStatus) {

    // Manually finished events stay finished
    if (firestoreStatus === "finished") {
        return "finished";
    }

    const now = new Date();

    const start = toDate(startAt);
    const end = toDate(endAt);

    if (!start) {
        return "upcoming";
    }

    // Event hasn't started yet
    if (now < start) {
        return "upcoming";
    }

    // Event has started
    // If there is no end date, keep it ongoing
    if (!end) {
        return "ongoing";
    }

    // Event is currently running
    if (now >= start && now < end) {
        return "ongoing";
    }

    // Time passed, but don't automatically hide it
    // if the admin hasn't marked it finished.
    if (firestoreStatus !== "finished") {
        return "ongoing";
    }

    return "finished";
}

function createNoEventsCard() {

    const article = document.createElement("article");

    article.className = "achievement no-events-card reveal";

    article.innerHTML = `
        <div class="achievement-icon no-events-icon">
            ♟
        </div>

        <h3>
            Currently No Events Running
        </h3>

        <p>
            There are no upcoming events or tournaments
            running right now. Keep an eye on this page
            for the next JCC event!
        </p>
    `;

    return article;
}

async function loadUpcomingEvents() {

    if (!eventsGrid) {
        return;
    }

    try {

        const tournamentsRef = collection(db, "tournaments");

        const snapshot = await getDocs(tournamentsRef);

        const events = [];

        snapshot.forEach((doc) => {

            const data = doc.data();

            const startAt = toDate(
                data.startAtMs ??
                data.startAt ??
                data.startDate ??
                data.date
            );

            const endAt = toDate(
                data.endAtMs ??
                data.endAt ??
                data.endDate
            );

            const status = getEventStatus(
                startAt,
                endAt,
                data.status
            );

            if (status === "finished") {
                return;
            }

            events.push({
                id: doc.id,

                title:
                    data.title ??
                    data.name ??
                    "Chess Event",

                description:
                    data.description ??
                    "More information about this event will be announced soon.",

                startAt,
                endAt,

                status,

                tournamentLink:
                    data.tournamentLink ??
                    data.registrationUrl ??
                    data.registerUrl ??
                    data.eventUrl ??
                    data.url ??
                    null,

                registrationUrl:
                    data.registrationUrl ??
                    data.registerUrl ??
                    "#",

                eventUrl:
                    data.eventUrl ??
                    data.url ??
                    data.registrationUrl ??
                    "#",

                isWeekly:
                    data.isWeekly === true ||
                    data.type === "weekly"
            });

        });


        events.sort((a, b) => {

            const aTime =
                a.startAt?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            const bTime =
                b.startAt?.getTime() ??
                Number.MAX_SAFE_INTEGER;

            return aTime - bTime;

        });


        const weeklyEvent =
            events.find(event => event.isWeekly);


        const otherEvents = events
            .filter(event => event !== weeklyEvent)
            .slice(0, 2);


        const cards = [];

if (weeklyEvent) {
    cards.push(
        createWeeklyEventCard(weeklyEvent)
    );
}

otherEvents.forEach(event => {

    cards.push(
        createEventCard(event)
    );

});


        eventsGrid.innerHTML = "";

        if (otherEvents.length === 0 && !weeklyEvent) {

    const noEventsCard = createNoEventsCard();

    eventsGrid.appendChild(noEventsCard);

    if (typeof revealObserver !== "undefined") {
        revealObserver.observe(noEventsCard);
    }

} else {

    cards.forEach(card => {

        eventsGrid.appendChild(card);

        if (typeof revealObserver !== "undefined") {
            card.classList.add("reveal");
            revealObserver.observe(card);
        }

    });

}

    } catch (error) {

        console.error(
            "Could not load upcoming events:",
            error
        );

        eventsGrid.innerHTML = "";

        eventsGrid.appendChild(
            createWeeklyEventCard(null)
        );
    }
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value);
}


/* =====================================================
   WEEKLY TOURNAMENT CARD
===================================================== */

/* =====================================================
   WEEKLY TOURNAMENT CARD
===================================================== */

function createWeeklyEventCard(event) {

    const article = document.createElement("article");

    article.className = "achievement reveal";


    const clubLink =
        "https://www.chess.com/club/josephite-chess-club-jcc/join/1d34ed?utm_campaign=club_invite_link&utm_source=chesscom&utm_medium=copy";


    let status = event?.status ?? "upcoming";

    let title =
        event?.title ??
        "Weekly Chess Tournament";


    // Get the tournament link from whichever field exists
    const tournamentLink =
        event?.tournamentLink ??
        event?.eventUrl ??
        event?.registrationUrl ??
        event?.registerUrl ??
        event?.url ??
        null;


    let buttonText = "Join Our Club";

    let buttonHref = clubLink;

    let buttonClass = "join-club-btn join";

    let description =
        "The event link will given here. till then u can join our club";


    /* =====================================================
       UPCOMING + TOURNAMENT LINK
    ===================================================== */

    if (
        status === "upcoming" &&
        tournamentLink
    ) {

        buttonText = "Register for the Event";

        buttonHref = tournamentLink;

        buttonClass = "join-club-btn upcoming";

        description = `Online Tournament Regestraion Is Open. Expected to start on ${formatEventStartTime(event.startAt)}. Register Now To fight!`;

    }


    /* =====================================================
       ONGOING + TOURNAMENT LINK
    ===================================================== */

    else if (
        status === "ongoing" &&
        tournamentLink
    ) {

        buttonText = "View Tournament";

        buttonHref = tournamentLink;

        buttonClass = "join-club-btn ongoing";

        description = `Online Chess Tournament is live. Started on: ${formatEventStartTime(event.startAt)}. Registration is over. You can still see the fight.`;

    }


    /* =====================================================
       NO LINK / DEFAULT
    ===================================================== */

    else {

        buttonText = "Join Our Club";

        buttonHref = clubLink;

        buttonClass = "join-club-btn join";

        description =
            `Rapid Online Chess Tournament is expected to start on: ${formatEventStartTime(event.startAt)}. The event link will given here. Till then you can join our club.`;

    }


    article.innerHTML = `
        <div class="achievement-icon">
            ♟
        </div>

        <h3>
            ${escapeHTML(title)}
        </h3>

        <p>
            ${escapeHTML(description)}
        </p>

        <a
            href="${escapeAttribute(buttonHref)}"
            class="${buttonClass}"
            target="_blank"
            rel="noopener noreferrer"
        >
            <span>${escapeHTML(buttonText)}</span>
            <span class="join-arrow" aria-hidden="true">↗</span>
        </a>
    `;

    return article;
}


/* =====================================================
   NORMAL EVENT CARD
===================================================== */

function createEventCard(event) {

    const article = document.createElement("article");

    article.className = "achievement reveal";


    const clubLink =
        "https://www.chess.com/club/josephite-chess-club-jcc/join/1d34ed?utm_campaign=club_invite_link&utm_source=chesscom&utm_medium=copy";


    // Get the tournament link from whichever field exists
    const tournamentLink =
        event?.tournamentLink ??
        event?.eventUrl ??
        event?.registrationUrl ??
        event?.registerUrl ??
        event?.url ??
        null;


    let buttonText = "Join Our Club";

    let buttonHref = clubLink;

    let buttonClass = "join-club-btn join";

    let description =
        "The event link will given here. till then u can join our club";


    /* =====================================================
       UPCOMING + TOURNAMENT LINK
    ===================================================== */

    if (
        event?.status === "upcoming" &&
        tournamentLink
    ) {

        buttonText = "Register for the Event";

        buttonHref = tournamentLink;

        buttonClass = "join-club-btn upcoming";

        description =
            "Register for the event.";

    }


    /* =====================================================
       ONGOING + TOURNAMENT LINK
    ===================================================== */

    else if (
        event?.status === "ongoing" &&
        tournamentLink
    ) {

        buttonText = "View Tournament";

        buttonHref = tournamentLink;

        buttonClass = "join-club-btn ongoing";

        description =
            "Event is live. View tournament.";

    }


    /* =====================================================
       NO LINK / DEFAULT
    ===================================================== */

    else {

        buttonText = "Join Our Club";

        buttonHref = clubLink;

        buttonClass = "join-club-btn join";

        description =
            "The event link will given here. till then u can join our club";

    }


    article.innerHTML = `
        <div class="achievement-icon">
            🏆
        </div>

        <h3>
            ${escapeHTML(event?.title ?? "Chess Event")}
        </h3>

        <p>
            ${escapeHTML(description)}
        </p>

        <a
            href="${escapeAttribute(buttonHref)}"
            class="${buttonClass}"
            target="_blank"
            rel="noopener noreferrer"
        >
            <span>${escapeHTML(buttonText)}</span>
            <span class="join-arrow" aria-hidden="true">↗</span>
        </a>
    `;

    return article;
}


/* =====================================================
   BACKGROUND IMAGE PRELOADER
===================================================== */

const jccImages = [
    "images/alfi.png",
    "images/BKR.jpg",
    "images/BM.jpg",
    "images/chief-moderator.jpg",
    "images/gowrab.jpg",
    "images/jisan.jpg",
    "images/logo.png",
    "images/MAI.jpg",
    "images/MFU.png",
    "images/MMH.jpg",
    "images/nirjhor.jpg",
    "images/president.jpg",
    "images/purno.jpg"
];

function preloadImages(images) {
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
            preloadImages(jccImages);
        });
    } else {
        setTimeout(() => {
            preloadImages(jccImages);
        }, 1500);
    }
});

/* =====================================================
   JOIN OPTIONS MODAL
===================================================== */

const joinModal = document.getElementById("joinModal");
const joinModalTrigger = document.querySelector(".join-modal-trigger");
const joinModalCloseControls = document.querySelectorAll("[data-close-join-modal]");

if (joinModal && joinModalTrigger) {
    const closeJoinModal = () => {
        joinModal.classList.remove("is-open");
        joinModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("join-modal-open");
        joinModalTrigger.focus();
    };

    joinModalTrigger.addEventListener("click", () => {
        joinModal.classList.add("is-open");
        joinModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("join-modal-open");
        joinModal.querySelector(".join-modal-close").focus();
    });

    joinModalCloseControls.forEach(control => {
        control.addEventListener("click", closeJoinModal);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && joinModal.classList.contains("is-open")) {
            closeJoinModal();
        }
    });
}

/* =====================================================
           TYPEWRITER
        ===================================================== */

        const words = [

            "Strategists",
            "Competitors",
            "Chess Players",
            "Josephites",
            "'The JCC'"

        ];


        const typingText =
            document.getElementById(
                "typingText"
            );


        let wordIndex = 0;

        let charIndex = 0;

        let deleting = false;


        function typeWriter() {


            const word =
                words[wordIndex];


            if (!deleting) {


                typingText.textContent =
                    word.substring(

                        0,

                        charIndex + 1

                    );


                charIndex++;


                if (
                    charIndex ===
                    word.length
                ) {


                    deleting = true;


                    setTimeout(

                        typeWriter,

                        1500

                    );


                    return;

                }

            }


            else {


                typingText.textContent =
                    word.substring(

                        0,

                        charIndex - 1

                    );


                charIndex--;


                if (
                    charIndex === 0
                ) {


                    deleting = false;


                    wordIndex =

                        (wordIndex + 1)
                        %
                        words.length;

                }

            }


            setTimeout(

                typeWriter,

                deleting
                    ? 50
                    : 100

            );

        }


        typeWriter();


        /* =====================================================
           MOBILE NAVIGATION
        ===================================================== */

        const menuBtn =
            document.getElementById(
                "menuBtn"
            );


        const navLinks =
            document.getElementById(
                "navLinks"
            );


        menuBtn.addEventListener(

            "click",

            () => {

                const isOpen =
                    navLinks.classList.toggle(
                        "active"
                    );


                menuBtn.setAttribute(

                    "aria-expanded",

                    isOpen
                        ? "true"
                        : "false"

                );

            }

        );


        /* Close menu after clicking */

        document
            .querySelectorAll(
                ".nav-links a"
            )
            .forEach(

                link => {

                    link.addEventListener(

                        "click",

                        () => {

                            navLinks.classList.remove(
                                "active"
                            );


                            menuBtn.setAttribute(

                                "aria-expanded",

                                "false"

                            );

                        }

                    );

                }

            );


        /* =====================================================
           SCROLL REVEAL
        ===================================================== */

        const revealElements =

            document.querySelectorAll(
                ".reveal"
            );


        const revealObserver =

            new IntersectionObserver(

                entries => {

                    entries.forEach(

                        entry => {


                            if (
                                entry.isIntersecting
                            ) {


                                entry.target.classList.add(
                                    "show"
                                );

                            }


                            else {


                                entry.target.classList.remove(
                                    "show"
                                );

                            }

                        }

                    );

                },


                {

                    threshold: 0.15

                }

            );


        revealElements.forEach(

            element => {

                revealObserver.observe(
                    element
                );

            }

        );


        /* =====================================================
           COUNTER ANIMATION
        ===================================================== */

        const counters =

            document.querySelectorAll(
                "[data-target]"
            );


        const counterStates =
            new WeakMap();


        function animateCounter(
            counter
        ) {


            const target =

                Number(
                    counter.dataset.target
                );


            const duration =
                1200;


            const startTime =
                performance.now();


            counterStates.set(

                counter,

                true

            );


            function updateCounter(
                currentTime
            ) {


                if (
                    counterStates.get(
                        counter
                    )
                    !==
                    true
                ) {

                    return;

                }


                const elapsed =

                    currentTime -
                    startTime;


                const progress =

                    Math.min(

                        elapsed /
                        duration,

                        1

                    );


                const easedProgress =

                    1 -
                    Math.pow(

                        1 -
                        progress,

                        3

                    );


                const currentValue =

                    Math.floor(

                        target *
                        easedProgress

                    );


                counter.textContent =

                    currentValue + "+";


                if (
                    progress < 1
                ) {


                    requestAnimationFrame(
                        updateCounter
                    );

                }


                else {


                    counter.textContent =
                        target + "+";


                    counterStates.set(

                        counter,

                        false

                    );

                }

            }


            requestAnimationFrame(
                updateCounter
            );

        }


        const counterObserver =

            new IntersectionObserver(

                entries => {


                    entries.forEach(

                        entry => {


                            const counter =
                                entry.target;


                            if (
                                entry.isIntersecting
                            ) {


                                if (

                                    counterStates.get(
                                        counter
                                    )
                                    !==
                                    true

                                ) {


                                    counter.textContent =
                                        "0";


                                    animateCounter(
                                        counter
                                    );

                                }

                            }


                            else {


                                counterStates.set(

                                    counter,

                                    false

                                );


                                counter.textContent =
                                    "0";

                            }

                        }

                    );

                },


                {

                    threshold: 0.5

                }

            );


        counters.forEach(

            counter => {

                counterObserver.observe(
                    counter
                );

            }

        );


 /* =====================================================
LOAD FIREBASE EVENTS
===================================================== */

loadUpcomingEvents();
