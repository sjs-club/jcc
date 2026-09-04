import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
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
const auth = getAuth(app);
const db = getFirestore(app);


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

const $ = id => document.getElementById(id);

const authGate = $("authGate");
const authError = $("authError");

let currentUser = null;
let events = [];
let unsubscribeEvents = null;
let countdownTimer = null;

let pendingConfirm = null;


/* =====================================================
   SMALL HELPERS
===================================================== */

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}


function showToast(message) {
    const toast = $("toast");

    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}


/* =====================================================
   DATE INPUT HELPER
===================================================== */

function localDateInput(ms = Date.now()) {

    const date = new Date(ms);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =====================================================
   DATETIME CONVERSION

   HTML gives us:
   date = YYYY-MM-DD
   time = HH:MM

   We convert them into milliseconds for Firestore.
===================================================== */

function combineDateTime(dateValue, timeValue) {

    if (!dateValue || !timeValue) {
        return null;
    }

    const [year, month, day] = dateValue.split("-").map(Number);
    const [hours, minutes] = timeValue.split(":").map(Number);

    const date = new Date();

    date.setFullYear(year);
    date.setMonth(month - 1);
    date.setDate(day);

    date.setHours(hours, minutes, 0, 0);

    return date.getTime();
}


/* =====================================================
   DATETIME INPUT VALUES FROM MILLISECONDS
===================================================== */

function dateInputValue(ms) {

    if (!ms) return "";

    const date = new Date(Number(ms));

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function timeInputValue(ms) {

    if (!ms) return "";

    const date = new Date(Number(ms));

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}


/* =====================================================
   NATIVE DATE / TIME PICKER

   Clicking ANYWHERE inside the input opens picker.
===================================================== */

["eventDate", "eventStart", "eventEnd"].forEach(id => {

    const input = $(id);

    if (!input) return;

    input.addEventListener("click", () => {

        if (typeof input.showPicker === "function") {

            try {
                input.showPicker();
            } catch (error) {
                // Browser may already have opened it.
            }
        }
    });

    input.addEventListener("focus", () => {

        if (typeof input.showPicker === "function") {

            try {
                input.showPicker();
            } catch (error) {
                // Ignore browser restrictions.
            }
        }
    });
});


/* =====================================================
   MODALS
===================================================== */

function openModal(id) {

    const modal = $(id);

    if (!modal) {
        console.error(`Modal not found: ${id}`);
        return;
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}


function closeModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".modal.open")) {
        document.body.style.overflow = "";
    }
}


/* Close buttons */

document.querySelectorAll("[data-close]").forEach(button => {

    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });

});


/* Click outside modal */

document.querySelectorAll(".modal").forEach(modal => {

    modal.addEventListener("click", event => {

        if (event.target === modal) {
            closeModal(modal.id);
        }

    });

});


/* Escape key */

document.addEventListener("keydown", event => {

    if (event.key !== "Escape") return;

    document.querySelectorAll(".modal.open").forEach(modal => {
        closeModal(modal.id);
    });

});


/* =====================================================
   MOBILE NAVIGATION
===================================================== */

const menuBtn = $("menuBtn");
const navLinks = $("navLinks");

if (menuBtn && navLinks) {

    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });

}


document.querySelectorAll(".nav-links a").forEach(link => {

    link.addEventListener("click", () => {

        if (navLinks) {
            navLinks.classList.remove("active");
        }

    });

});


/* =====================================================
   AUTHORIZATION
===================================================== */

onAuthStateChanged(auth, user => {

    if (!user) {

        currentUser = null;

        if (authError) {
            authError.style.display = "block";
        }

        setTimeout(() => {
            window.location.replace("admin.html");
        }, 700);

        return;
    }


    currentUser = user;

    if (authGate) {
        authGate.classList.add("hidden");
    }

    startEventListener();

});


/* =====================================================
   FIRESTORE ERROR
===================================================== */

function friendlyFirestoreError(error, action = "save") {

    console.error("Firestore error:", error);

    if (error?.code === "permission-denied") {

        return `Firestore denied this ${action}. Check the Firestore rules for the "tournaments" collection.`;
    }

    if (error?.code === "unauthenticated") {
        return "Your login session has expired. Please log in again.";
    }

    return error?.message || `Could not ${action} tournament data.`;
}


/* =====================================================
   FIRESTORE LISTENER
===================================================== */

function startEventListener() {

    if (!currentUser) return;


    if (unsubscribeEvents) {
        unsubscribeEvents();
    }


    unsubscribeEvents = onSnapshot(
        collection(db, "tournaments"),

        snapshot => {

            events = snapshot.docs.map(documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));


            events.sort((a, b) => {

                return Number(a.startAtMs || 0)
                    - Number(b.startAtMs || 0);

            });


            render();

        },

        error => {

            console.error(
                "Firestore read error:",
                error
            );

            showToast(
                friendlyFirestoreError(
                    error,
                    "load"
                )
            );

        }
    );

}


/* =====================================================
   EVENT STATUS
===================================================== */

function eventStatus(event) {

    if (event.status === "finished") {
        return "finished";
    }


    const now = Date.now();

    const start = Number(event.startAtMs || 0);
    const end = Number(event.endAtMs || 0);


    if (now < start) {
        return "upcoming";
    }


    if (now >= start && now < end) {
        return "ongoing";
    }


    /*
       If approximate end time passed but admin
       hasn't manually completed it, keep it ongoing.
    */

    return "ongoing";
}


/* =====================================================
   DATE / TIME FORMATTING
===================================================== */

function formatDate(ms) {

    if (!ms) return "—";

    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(new Date(Number(ms)));

}


function formatTime(ms) {

    if (!ms) return "—";

    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(Number(ms)));

}


function formatDateTime(ms) {

    if (!ms) return "—";

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(Number(ms)));

}


/* =====================================================
   COUNTDOWN
===================================================== */

function countdown(ms) {

    const diff = Number(ms) - Date.now();


    if (diff <= 0) {
        return "Starting now";
    }


    const totalMinutes = Math.floor(diff / 60000);

    const days = Math.floor(totalMinutes / 1440);

    const hours = Math.floor(
        (totalMinutes % 1440) / 60
    );

    const mins = totalMinutes % 60;


    const parts = [];


    if (days) {

        parts.push(
            `${days} ${days === 1 ? "day" : "days"}`
        );

    }


    if (hours) {

        parts.push(
            `${hours} ${hours === 1 ? "hour" : "hours"}`
        );

    }


    parts.push(
        `${mins} ${mins === 1 ? "min" : "mins"}`
    );


    return parts.join(" ");
}


/* =====================================================
   ELAPSED TIME
===================================================== */

function elapsedTime(ms) {

    const diff = Date.now() - Number(ms || 0);

    if (diff <= 0) {
        return "Starting now";
    }

    const totalMinutes = Math.floor(diff / 60000);

    const days = Math.floor(totalMinutes / 1440);

    const hours = Math.floor(
        (totalMinutes % 1440) / 60
    );

    const mins = totalMinutes % 60;

    const parts = [];

    if (days) {
        parts.push(
            `${days} ${days === 1 ? "day" : "days"}`
        );
    }

    if (hours) {
        parts.push(
            `${hours} ${hours === 1 ? "hour" : "hours"}`
        );
    }

    if (mins || parts.length === 0) {
        parts.push(
            `${mins} ${mins === 1 ? "min" : "mins"}`
        );
    }

    return parts.join(" ");
}


/* =====================================================
   STATUS HTML
===================================================== */

function statusHtml(status) {

    const label =
        status === "upcoming"
            ? "Upcoming"
            : status === "ongoing"
                ? "Ongoing"
                : "Finished";


    return `
        <span class="status ${status}">
            <span class="status-dot"></span>
            ${label}
        </span>
    `;
}


/* =====================================================
   MAIN RENDER
===================================================== */

function render() {

    const active = events.filter(
        event => eventStatus(event) !== "finished"
    );


    const past = events.filter(
        event => eventStatus(event) === "finished"
    );


    if ($("upcomingCount")) {

        $("upcomingCount").textContent =
            active.filter(
                event =>
                    eventStatus(event) === "upcoming"
            ).length;

    }


    if ($("ongoingCount")) {

        $("ongoingCount").textContent =
            active.filter(
                event =>
                    eventStatus(event) === "ongoing"
            ).length;

    }


    if ($("pastCount")) {
        $("pastCount").textContent = past.length;
    }


    if ($("totalCount")) {
        $("totalCount").textContent = events.length;
    }


    active.sort(
        (a, b) =>
            Number(a.startAtMs || 0) -
            Number(b.startAtMs || 0)
    );


    past.sort(
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


    renderList(
        "upcomingList",
        active,
        false
    );


    renderList(
        "pastList",
        past,
        true
    );
}


/* =====================================================
   EVENT LIST
===================================================== */

function renderList(
    targetId,
    list,
    isPast
) {

    const target = $(targetId);

    if (!target) return;


    if (!list.length) {

        target.innerHTML = `
            <div class="empty">
                ${
                    isPast
                        ? "No completed events yet."
                        : "No upcoming events. Create one above."
                }
            </div>
        `;

        return;
    }


    target.innerHTML = list.map(event => {

        const status = eventStatus(event);


        let countdownText;


        if (status === "upcoming") {

            countdownText =
                `Starts in <strong>${escapeHtml(
                    countdown(event.startAtMs)
                )}</strong>`;

        } else if (status === "ongoing") {

            countdownText =
                `Started <strong>${escapeHtml(
                    elapsedTime(event.startAtMs)
                )}</strong> ago`;

        } else {

            countdownText =
                `Finished ${escapeHtml(
                    formatDate(
                        event.finishedAtMs ||
                        event.endAtMs
                    )
                )}`;

        }


        return `
            <article class="event-card">

                <div class="event-main">

                    <div class="event-top">

                        <span class="event-type">
                            ${escapeHtml(
                                event.typeLabel ||
                                "Weekly Tournament"
                            )}
                        </span>

                        ${statusHtml(status)}

                    </div>


                    <h3>
                        ${escapeHtml(
                            event.name ||
                            "Untitled Tournament"
                        )}
                    </h3>


                    <div class="event-meta">

                        <span>
                            📅
                            ${escapeHtml(
                                formatDate(
                                    event.startAtMs
                                )
                            )}
                        </span>

                        <span>
                            ⏰
                            ${escapeHtml(
                                formatTime(
                                    event.startAtMs
                                )
                            )}
                            —
                            ${escapeHtml(
                                formatTime(
                                    event.endAtMs
                                )
                            )}
                        </span>

                        <span>
                            ♟
                            ${escapeHtml(
                                event.platform ||
                                "—"
                            )}
                        </span>

                    </div>


                    <div class="event-countdown">
                        ${countdownText}
                    </div>

                </div>


                <div class="event-actions">

                    <button
                        class="btn"
                        type="button"
                        data-action="details"
                        data-id="${escapeHtml(event.id)}"
                    >
                        Details
                    </button>


                    ${
                        !isPast
                            ? `
                                <button
                                    class="btn"
                                    type="button"
                                    data-action="edit"
                                    data-id="${escapeHtml(event.id)}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn success"
                                    type="button"
                                    data-action="complete"
                                    data-id="${escapeHtml(event.id)}"
                                >
                                    Complete
                                </button>

                                <button
                                    class="btn danger"
                                    type="button"
                                    data-action="delete"
                                    data-id="${escapeHtml(event.id)}"
                                >
                                    Delete
                                </button>
                            `
                            : `
                                <button
                                    class="btn danger"
                                    type="button"
                                    data-action="delete"
                                    data-id="${escapeHtml(event.id)}"
                                >
                                    Delete
                                </button>
                            `
                    }

                </div>

            </article>
        `;

    }).join("");
}


/* =====================================================
   WEEKLY TOURNAMENT BUTTON
===================================================== */

const weeklyBtn = $("weeklyBtn");

if (weeklyBtn) {

    weeklyBtn.addEventListener("click", event => {

        event.preventDefault();

        openCreate();

    });

}


/* =====================================================
   CREATE EVENT PANEL
===================================================== */

function openCreate() {

    const form = $("eventForm");
    const modal = $("eventModal");

    if (!form || !modal) {

        console.error(
            "Create modal elements are missing."
        );

        return;
    }


    form.reset();


    if ($("editingId")) {
        $("editingId").value = "";
    }


    if ($("eventModalTitle")) {
        $("eventModalTitle").textContent =
            "Create Weekly Tournament";
    }


    if ($("saveEventBtn")) {
        $("saveEventBtn").textContent =
            "Save tournament";
    }


    if ($("eventDate")) {
        $("eventDate").min =
            localDateInput(Date.now());
    }


    if ($("otherPlatformWrap")) {
        $("otherPlatformWrap").style.display =
            "none";
    }


    openModal("eventModal");
}


/* =====================================================
   PLATFORM SELECT
===================================================== */

const platformInput = $("eventPlatform");

if (platformInput) {

    platformInput.addEventListener("change", () => {

        if (!$("otherPlatformWrap")) return;


        if (platformInput.value === "Other") {

            $("otherPlatformWrap").style.display =
                "block";

        } else {

            $("otherPlatformWrap").style.display =
                "none";

            if ($("otherPlatform")) {
                $("otherPlatform").value = "";
            }

        }

    });

}


/* =====================================================
   READ EVENT FORM
===================================================== */

function readEventForm() {

    const name =
        $("eventName")?.value.trim() || "";


    const date =
        $("eventDate")?.value || "";


    const startTime =
        $("eventStart")?.value || "";


    const endTime =
        $("eventEnd")?.value || "";


    const platformSelect =
        $("eventPlatform")?.value || "";


    const otherPlatform =
        $("otherPlatform")?.value.trim() || "";


    const platform =
        platformSelect === "Other"
            ? otherPlatform
            : platformSelect;


    const location =
        $("eventLocation")?.value.trim() || "";


    const organizer =
        $("eventOrganizer")?.value.trim() || "";


    const format =
        $("eventFormat")?.value.trim() || "";


    const expectedParticipantsRaw =
        $("eventExpectedParticipants")?.value.trim() || "";

    const tournamentLink =
        $("eventLink")?.value.trim() || "";

    const notes =
        $("eventNotes")?.value.trim() || "";


    /* Required fields */

    if (!name) {
        showToast("Please enter the tournament name.");
        $("eventName")?.focus();
        return null;
    }


    if (!date) {
        showToast("Please select the event date.");
        $("eventDate")?.focus();
        return null;
    }


    if (!startTime) {
        showToast("Please select the event start time.");
        $("eventStart")?.focus();
        return null;
    }


    if (!endTime) {
        showToast("Please select the approximate ending time.");
        $("eventEnd")?.focus();
        return null;
    }


    if (!platform) {
        showToast("Please select the platform.");
        $("eventPlatform")?.focus();
        return null;
    }


    const startAtMs =
        combineDateTime(
            date,
            startTime
        );


    const endAtMs =
        combineDateTime(
            date,
            endTime
        );


    if (!startAtMs || !endAtMs) {

        showToast(
            "Please enter a valid date and time."
        );

        return null;
    }


    if (endAtMs <= startAtMs) {

        showToast(
            "Ending time must be after the starting time."
        );

        return null;
    }


    let expectedParticipants = null;


    if (expectedParticipantsRaw) {

        expectedParticipants =
            Number(
                expectedParticipantsRaw
            );


        if (
            !Number.isFinite(
                expectedParticipants
            ) ||
            expectedParticipants < 0
        ) {

            showToast(
                "Expected participants must be a valid number."
            );

            return null;
        }

    }


return {

        name,

        type: "weekly",

        typeLabel: "Weekly Tournament",

        date,

        startTime,

        endTime,

        startAtMs,

        endAtMs,

        platform,

        platformSelection:
            platformSelect,

        location,

        organizer,

        format,

        expectedParticipants,

        tournamentLink,

        notes

    };
}


/* =====================================================
   SAVE / EDIT EVENT
===================================================== */

const eventForm = $("eventForm");

if (eventForm) {

    eventForm.addEventListener(
        "submit",
        async event => {

            /*
                VERY IMPORTANT:
                This stops the browser from refreshing
                the page when the form is submitted.
            */

            event.preventDefault();
            event.stopPropagation();


            if (!currentUser) {

                showToast(
                    "You are not authenticated."
                );

                return;
            }


            const data =
                readEventForm();


            if (!data) return;


            const editingId =
                $("editingId")?.value.trim() || "";


            /*
                Editing:
                Ask confirmation first.
            */

            if (editingId) {

                const existingEvent =
                    events.find(
                        item =>
                            item.id === editingId
                    );


                if (!existingEvent) {

                    showToast(
                        "Could not find this tournament."
                    );

                    return;
                }


                pendingConfirm = {

                    title: "Save changes?",

                    subtitle:
                        "Update tournament",

                    text:
                        `Save the changes made to “${existingEvent.name}”?`,

                    confirmText:
                        "Save changes",

                    danger: false,

                    handler:
                        async () => {

                            await updateDoc(
                                doc(
                                    db,
                                    "tournaments",
                                    editingId
                                ),
                                {

                                    ...data,

                                    updatedAt:
                                        serverTimestamp(),

                                    updatedBy:
                                        currentUser.uid

                                }
                            );


                            closeModal(
                                "confirmModal"
                            );

                            closeModal(
                                "eventModal"
                            );


                            showToast(
                                "Tournament updated successfully."
                            );

                        }

                };


                showConfirm();

                return;
            }


            /*
                Creating a new event:
                Ask confirmation first.
            */

            pendingConfirm = {

                title:
                    "Create tournament?",

                subtitle:
                    "Confirm event",

                text:
                    `Create “${data.name}” as a Weekly Tournament on ${formatDate(data.startAtMs)} at ${formatTime(data.startAtMs)}?`,

                confirmText:
                    "Create event",

                danger: false,

                handler:
                    async () => {

                        const firestoreData = {

                            ...data,

                            status: "scheduled",

                            createdAt:
                                serverTimestamp(),

                            createdBy:
                                currentUser.uid,

                            updatedAt:
                                serverTimestamp(),

                            updatedBy:
                                currentUser.uid

                        };


                        await addDoc(
                            collection(
                                db,
                                "tournaments"
                            ),
                            firestoreData
                        );


                        closeModal(
                            "confirmModal"
                        );

                        closeModal(
                            "eventModal"
                        );


                        showToast(
                            "Weekly tournament created successfully."
                        );

                    }

            };


            showConfirm();

        }
    );

}


/* =====================================================
   EDIT EVENT
===================================================== */

function openEdit(event) {

    if (!event) return;


    closeModal("detailsModal");


    if ($("editingId")) {
        $("editingId").value = event.id;
    }


    if ($("eventModalTitle")) {

        $("eventModalTitle").textContent =
            "Edit Weekly Tournament";

    }


    if ($("saveEventBtn")) {

        $("saveEventBtn").textContent =
            "Save changes";

    }


    if ($("eventName")) {
        $("eventName").value =
            event.name || "";
    }


    if ($("eventDate")) {

        $("eventDate").value =
            dateInputValue(
                event.startAtMs
            );

        $("eventDate").min = "";

    }


    if ($("eventStart")) {

        $("eventStart").value =
            timeInputValue(
                event.startAtMs
            );

    }


    if ($("eventEnd")) {

        $("eventEnd").value =
            timeInputValue(
                event.endAtMs
            );

    }


    if ($("eventPlatform")) {

        const savedSelection =
            event.platformSelection ||
            event.platform ||
            "";


        const optionExists =
            Array.from(
                $("eventPlatform").options
            ).some(
                option =>
                    option.value ===
                    savedSelection
            );


        if (optionExists) {

            $("eventPlatform").value =
                savedSelection;

        } else {

            $("eventPlatform").value =
                "Other";

            if ($("otherPlatform")) {

                $("otherPlatform").value =
                    event.platform || "";

            }

            if ($("otherPlatformWrap")) {

                $("otherPlatformWrap").style.display =
                    "block";

            }

        }

    }


    if ($("eventLocation")) {

        $("eventLocation").value =
            event.location || "";

    }


    if ($("eventOrganizer")) {

        $("eventOrganizer").value =
            event.organizer || "";

    }


    if ($("eventFormat")) {

        $("eventFormat").value =
            event.format || "";

    }


    if ($("eventExpectedParticipants")) {

        $("eventExpectedParticipants").value =
            event.expectedParticipants ??
            "";

    }

    if ($("eventLink")) {

        $("eventLink").value = event.tournamentLink || "";

    }


    if ($("eventNotes")) {

        $("eventNotes").value =
            event.notes || "";

    }


    openModal("eventModal");
}


/* =====================================================
   EVENT ACTION BUTTONS
===================================================== */

document.addEventListener(
    "click",
    event => {

        const actionButton =
            event.target.closest(
                "[data-action]"
            );


        if (!actionButton) return;


        const eventId =
            actionButton.dataset.id;


        const foundEvent =
            events.find(
                item =>
                    item.id === eventId
            );


        if (!foundEvent) return;


        switch (
            actionButton.dataset.action
        ) {

            case "details":
                showDetails(foundEvent);
                break;


            case "edit":
                openEdit(foundEvent);
                break;


            case "complete":
                openComplete(foundEvent);
                break;


            case "delete":
                confirmDelete(foundEvent);
                break;

        }

    }
);


/* =====================================================
   DETAILS
===================================================== */

function showDetails(event) {

    const status =
        eventStatus(event);


    if ($("detailsTitle")) {

        $("detailsTitle").textContent =
            event.name ||
            "Event details";

    }


    if ($("detailsSubtitle")) {

        $("detailsSubtitle").innerHTML =
            `${escapeHtml(
                event.typeLabel ||
                "Weekly Tournament"
            )} · ${statusHtml(status)}`;

    }


    const podium =
        event.podium || {};


    const positions = [

        ["1st", podium.first],

        ["2nd", podium.second],

        ["3rd", podium.third]

    ];


    if ($("detailsBody")) {

        $("detailsBody").innerHTML = `

            <div class="detail-grid">

                <div class="detail-item">
                    <div class="k">Event date</div>
                    <div class="v">
                        ${escapeHtml(
                            formatDate(
                                event.startAtMs
                            )
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Schedule</div>
                    <div class="v">
                        ${escapeHtml(
                            formatTime(
                                event.startAtMs
                            )
                        )}
                        —
                        ${escapeHtml(
                            formatTime(
                                event.endAtMs
                            )
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Started</div>
                    <div class="v">
                        ${escapeHtml(
                            formatDateTime(
                                event.startedAtMs ||
                                event.startAtMs
                            )
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Finished</div>
                    <div class="v">
                        ${
                            event.finishedAtMs
                                ? escapeHtml(
                                    formatDateTime(
                                        event.finishedAtMs
                                    )
                                )
                                : "Not finished"
                        }
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Platform</div>
                    <div class="v">
                        ${escapeHtml(
                            event.platform ||
                            "—"
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Venue / room</div>
                    <div class="v">
                        ${escapeHtml(
                            event.location ||
                            "—"
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Organizer</div>
                    <div class="v">
                        ${escapeHtml(
                            event.organizer ||
                            "—"
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Format</div>
                    <div class="v">
                        ${escapeHtml(
                            event.format ||
                            "—"
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">
                        Expected participants
                    </div>

                    <div class="v">
                        ${escapeHtml(
                            event.expectedParticipants ??
                            "—"
                        )}
                    </div>
                </div>


                <div class="detail-item">
                    <div class="k">Countdown</div>

                    <div class="v">

                        ${
                            status === "upcoming"

                                ? escapeHtml(
                                    countdown(
                                        event.startAtMs
                                    )
                                )

                                : status === "ongoing"

                                    ? "Event is live"

                                    : "Completed"
                        }

                    </div>
                </div>

                <div class="detail-item">
                    <div class="k">Tournament link</div>
                        <div class="v">
                            ${
                                event.tournamentLink
                                ? `<a
                                href="${escapeHtml(event.tournamentLink)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="color:inherit;text-decoration:underline;"
                                >
                                    Open tournament
                                </a>`
                                : "Not added yet"
                            }
                        </div>
                </div>

            </div>


            ${
                event.notes
                    ? `
                        <div
                            class="detail-item"
                            style="margin-bottom:18px;"
                        >
                            <div class="k">
                                Notes
                            </div>

                            <div class="v">
                                ${escapeHtml(
                                    event.notes
                                )}
                            </div>
                        </div>
                    `
                    : ""
            }


            <h3
                style="
                    font-size:1rem;
                    margin:0 0 10px;
                "
            >
                Podium
            </h3>


            <div class="podium-wrap">

                <table>

                    <thead>

                        <tr>
                            <th>Position</th>
                            <th>Name</th>
                            <th>Institution</th>
                            <th>Class</th>
                            <th>Section</th>
                            <th>Roll</th>
                        </tr>

                    </thead>


                    <tbody>

                        ${
                            positions.map(
                                ([position, player]) => `

                                    <tr>

                                        <td class="position">
                                            ${position}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                player?.name ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                player?.institution ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                player?.className ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                player?.section ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                player?.roll ||
                                                "—"
                                            )}
                                        </td>

                                    </tr>

                                `
                            ).join("")
                        }

                    </tbody>

                </table>

            </div>

        `;

    }


    if ($("detailsActions")) {

        $("detailsActions").innerHTML =

            status === "finished"

                ? `
                    <button
                        class="btn danger"
                        type="button"
                        data-detail-action="delete"
                        data-id="${escapeHtml(event.id)}"
                    >
                        Delete event
                    </button>
                `

                : `
                    <button
                        class="btn"
                        type="button"
                        data-detail-action="edit"
                        data-id="${escapeHtml(event.id)}"
                    >
                        Edit
                    </button>

                    <button
                        class="btn success"
                        type="button"
                        data-detail-action="complete"
                        data-id="${escapeHtml(event.id)}"
                    >
                        Mark as complete
                    </button>

                    <button
                        class="btn danger"
                        type="button"
                        data-detail-action="delete"
                        data-id="${escapeHtml(event.id)}"
                    >
                        Delete
                    </button>
                `;

    }


    openModal("detailsModal");
}


/* =====================================================
   DETAILS ACTIONS
===================================================== */

const detailsActions = $("detailsActions");

if (detailsActions) {

    detailsActions.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-detail-action]"
                );


            if (!button) return;


            const foundEvent =
                events.find(
                    item =>
                        item.id ===
                        button.dataset.id
                );


            if (!foundEvent) return;


            closeModal(
                "detailsModal"
            );


            switch (
                button.dataset.detailAction
            ) {

                case "edit":
                    openEdit(foundEvent);
                    break;


                case "complete":
                    openComplete(foundEvent);
                    break;


                case "delete":
                    confirmDelete(foundEvent);
                    break;

            }

        }
    );

}


/* =====================================================
   COMPLETE EVENT
===================================================== */

function openComplete(event) {

    const completeForm =
        $("completeForm");


    if (!completeForm) {
        console.error("completeForm not found.");
        return;
    }


    completeForm.reset();


    if ($("completeId")) {
        $("completeId").value =
            event.id;
    }


    openModal(
        "completeModal"
    );
}


/* =====================================================
   READ PLAYER
===================================================== */

function readPlayer(prefix) {

    const nameInput =
        $(`${prefix}Name`);


    const name =
        nameInput?.value.trim() || "";


    if (!name) {
        return null;
    }


    return {

        name,

        institution:
            $(`${prefix}Institution`)
                ?.value.trim() || "",

        className:
            $(`${prefix}Class`)
                ?.value.trim() || "",

        section:
            $(`${prefix}Section`)
                ?.value.trim() || "",

        roll:
            $(`${prefix}Roll`)
                ?.value.trim() || ""

    };

}


/* =====================================================
   COMPLETE FORM
===================================================== */

const completeForm =
    $("completeForm");


if (completeForm) {

    completeForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();
            event.stopPropagation();


            if (!currentUser) {

                showToast(
                    "You are not authenticated."
                );

                return;
            }


            const first =
                readPlayer("first");


            if (!first?.name) {

                showToast(
                    "1st place player's name is required."
                );

                return;
            }


            const second =
                readPlayer("second");


            const third =
                readPlayer("third");


            const id =
                $("completeId")?.value;


            const foundEvent =
                events.find(
                    item =>
                        item.id === id
                );


            if (!foundEvent) {

                showToast(
                    "Could not find this tournament."
                );

                return;
            }


            pendingConfirm = {

                title:
                    "Mark event as complete?",

                subtitle:
                    "Finish tournament",

                text:
                    `This will move “${foundEvent.name}” to Past Events and permanently save the podium information.`,

                confirmText:
                    "Finish event",

                danger: false,


                handler:
                    async () => {

                        await updateDoc(

                            doc(
                                db,
                                "tournaments",
                                id
                            ),

                            {

                                status:
                                    "finished",

                                finishedAtMs:
                                    Date.now(),

                                finishedAt:
                                    serverTimestamp(),

                                podium: {

                                    first,

                                    second,

                                    third

                                },

                                updatedAt:
                                    serverTimestamp(),

                                updatedBy:
                                    currentUser.uid

                            }

                        );


                        closeModal(
                            "confirmModal"
                        );

                        closeModal(
                            "completeModal"
                        );


                        showToast(
                            "Event marked as complete."
                        );

                    }

            };


            showConfirm();

        }
    );

}


/* =====================================================
   DELETE EVENT
===================================================== */

function confirmDelete(event) {

    pendingConfirm = {

        title:
            "Delete event?",

        subtitle:
            "This cannot be undone",

        text:
            `Delete “${event.name}” permanently from Firestore? All event and podium data for this event will be removed.`,

        confirmText:
            "Delete event",

        danger:
            true,


        handler:
            async () => {

                await deleteDoc(
                    doc(
                        db,
                        "tournaments",
                        event.id
                    )
                );


                closeModal(
                    "confirmModal"
                );

                closeModal(
                    "detailsModal"
                );


                showToast(
                    "Event deleted."
                );

            }

    };


    showConfirm();
}


/* =====================================================
   CONFIRMATION MODAL
===================================================== */

function showConfirm() {

    if (!pendingConfirm) return;


    if ($("confirmTitle")) {

        $("confirmTitle").textContent =
            pendingConfirm.title;

    }


    if ($("confirmSubtitle")) {

        $("confirmSubtitle").textContent =
            pendingConfirm.subtitle;

    }


    if ($("confirmText")) {

        $("confirmText").textContent =
            pendingConfirm.text;

    }


    const button =
        $("confirmActionBtn");


    if (!button) {
        console.error(
            "confirmActionBtn not found."
        );
        return;
    }


    button.textContent =
        pendingConfirm.confirmText;


    button.className =
        `btn ${
            pendingConfirm.danger
                ? "danger"
                : "primary"
        }`;


    openModal(
        "confirmModal"
    );

}


/* =====================================================
   CONFIRM ACTION
===================================================== */

const confirmActionBtn =
    $("confirmActionBtn");


if (confirmActionBtn) {

    confirmActionBtn.addEventListener(
        "click",
        async () => {

            if (!pendingConfirm?.handler) {
                return;
            }


            const button =
                confirmActionBtn;


            button.disabled = true;

            button.textContent =
                "Working...";


            try {

                await pendingConfirm.handler();

                pendingConfirm = null;

            } catch (error) {

                console.error(
                    "Firestore operation error:",
                    error
                );


                showToast(
                    friendlyFirestoreError(
                        error,
                        "save"
                    )
                );

            } finally {

                button.disabled = false;


                if (pendingConfirm) {

                    button.textContent =
                        pendingConfirm.confirmText;

                }

            }

        }
    );

}


/* =====================================================
   OPTIONAL SIGN OUT
===================================================== */

const signOutBtn =
    $("signOutBtn");


if (signOutBtn) {

    signOutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

            } catch (error) {

                console.error(
                    "Sign out error:",
                    error
                );

                showToast(
                    "Could not sign out."
                );

            }

        }
    );

}


/* =====================================================
   AUTOMATIC STATUS UPDATE

   scheduled → ongoing

   finished is NEVER changed automatically.
===================================================== */

async function updateEventStatuses() {

    if (!currentUser) return;

    const now = Date.now();

    for (const event of events) {

        // Only automatically change scheduled events
        if (event.status !== "scheduled") {
            continue;
        }

        const start = Number(event.startAtMs || 0);

        // Event has started
        if (start && now >= start) {

            try {

                await updateDoc(
                    doc(
                        db,
                        "tournaments",
                        event.id
                    ),
                    {
                        status: "ongoing",

                        startedAtMs: start,

                        updatedAt: serverTimestamp(),

                        updatedBy: currentUser.uid
                    }
                );

                console.log(
                    `Event "${event.name}" is now ongoing.`
                );

            } catch (error) {

                console.error(
                    `Could not update "${event.name}" status:`,
                    error
                );

            }
        }
    }
}

/* =====================================================
   LIVE REFRESH

   Updates:
   - Upcoming → Ongoing
   - Countdown
   - Elapsed time
   - Counters
===================================================== */

function startCountdownRefresh() {

    clearInterval(
        countdownTimer
    );


    countdownTimer =
        setInterval(async () => {

            if (!currentUser) return;

            await updateEventStatuses();

            render();

        }, 30000);

}


updateEventStatuses();
startCountdownRefresh();


/* =====================================================
   INITIAL RENDER
===================================================== */

render();