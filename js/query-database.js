import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* Paste the same firebaseConfig object used by your existing dashboard here. */

const firebaseConfig = {
    apiKey:
        "AIzaSyDqU5Zp7o8jDv1o56dgFlbWNtV3ewnuGeE",

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


const ADMIN_UID =
    "xZg7Ox5QGpONp9kkDz1d5gEHjsK2";

const MEMBERS_COLLECTION =
    "members";

const $ = id =>
    document.getElementById(id);


const els = {
    access: $("accessMessage"),
    app: $("queryApp"),
    body: $("memberTableBody"),
    empty: $("emptyState"),
    count: $("resultCount"),
    searchField: $("searchField"),
    searchInput: $("searchInput"),
    sortField: $("sortField"),
    sortOrder: $("sortOrder")
};


let db,
    auth,
    members = [];


const configured = () =>
    !Object.values(firebaseConfig)
        .some(value =>
            value.includes("PASTE_YOUR_EXISTING")
        );


function showAccess(message, type = "") {
    els.access.textContent = message;
    els.access.className = `access-message ${type}`;
}


function safe(value) {
    const node = document.createElement("div");

    node.textContent = value ?? "";

    return node.innerHTML;
}


function compare(a, b, field) {
    const first = a[field] ?? "";
    const second = b[field] ?? "";

    if (field === "memberIndex")
        return Number(first) - Number(second);

    return String(first).localeCompare(
        String(second),
        undefined,
        {
            numeric: true,
            sensitivity: "base"
        }
    );
}


function render() {
    const field = els.searchField.value;

    const term =
        els.searchInput.value
            .trim()
            .toLowerCase();

    const direction =
        els.sortOrder.value === "asc"
            ? 1
            : -1;

    const visible =
        members
            .filter(
                member =>
                    !term ||
                    String(member[field] ?? "")
                        .toLowerCase()
                        .includes(term)
            )
            .sort(
                (a, b) =>
                    compare(
                        a,
                        b,
                        els.sortField.value
                    ) * direction
            );

    els.count.textContent = visible.length;

    els.body.innerHTML =
        visible
            .map(
                member =>
                    `<tr>
                        <td>${safe(member.memberIndex)}</td>
                        <td>${safe(member.fullName)}</td>
                        <td>${safe(member.studentClass)}</td>
                        <td>${safe(member.section)}</td>
                        <td>${safe(member.roll)}</td>
                        <td>
                            <span class="member-type ${
                                member.memberType === "EC member"
                                    ? "ec-member"
                                    : ""
                            }">
                                ${safe(member.memberType)}
                            </span>
                        </td>
                        <td>${safe(member.chessRating)}</td>
                        <td>${safe(member.phone)}</td>
                        <td>${safe(member.joinedAt)}</td>
                    </tr>`
            )
            .join("");

    els.empty.hidden =
        visible.length !== 0;
}


async function loadMembers() {
    showAccess(
        "Loading members…",
        "success"
    );

    try {
        const snapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        MEMBERS_COLLECTION
                    ),
                    orderBy("memberIndex")
                )
            );

        members =
            snapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            );

        render();

        showAccess(
            `${members.length} member record${
                members.length === 1
                    ? ""
                    : "s"
            } available to query.`,
            "success"
        );

    } catch (error) {
        console.error(error);

        showAccess(
            "Firestore could not read the members collection. Confirm your Firebase configuration and Firestore security rules.",
            "error"
        );
    }
}


function bindEvents() {
    [
        els.searchField,
        els.searchInput,
        els.sortField,
        els.sortOrder
    ].forEach(element =>
        element.addEventListener(
            element === els.searchInput
                ? "input"
                : "change",
            render
        )
    );

    $("refreshButton")
        .addEventListener(
            "click",
            loadMembers
        );

    $("signOutButton")
        .addEventListener(
            "click",
            () => signOut(auth)
        );
}


function start() {
    if (!configured()) {
        showAccess(
            "Firebase configuration is missing. Copy your existing firebaseConfig object into query-database.js before using this page.",
            "error"
        );

        return;
    }

    const app =
        getApps().length
            ? getApps()[0]
            : initializeApp(firebaseConfig);

    db = getFirestore(app);
    auth = getAuth(app);

    onAuthStateChanged(
        auth,
        async user => {
            if (!user) {
                window.location.href = "admin.html?error=unauthorized";

                return;
            }

            if (user.uid !== ADMIN_UID) {
                showAccess(
                    "Access denied. This page is restricted to the JCC administrator.",
                    "error"
                );

                return;
            }

            els.app.hidden = false;

            bindEvents();

            await loadMembers();
        }
    );
}


start();