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
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

// Paste the same firebaseConfig object used by your existing dashboard here.

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


// =====================================================
// CONSTANTS
// =====================================================

const ADMIN_UID =
    "xZg7Ox5QGpONp9kkDz1d5gEHjsK2";

const MEMBERS_COLLECTION =
    "members";


// =====================================================
// HELPER
// =====================================================

const $ = (id) =>
    document.getElementById(id);


function openDialog(dialog) {

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }

}


function closeDialog(dialog) {

    if (typeof dialog.close === "function") {
        dialog.close();
    } else {
        dialog.removeAttribute("open");
    }

}


// =====================================================
// ELEMENTS
// =====================================================

const els = {

    access:
        $("accessMessage"),

    app:
        $("databaseApp"),

    body:
        $("memberTableBody"),

    empty:
        $("emptyState"),

    count:
        $("memberCount"),

    filter:
        $("memberTypeFilter"),

    dialog:
        $("memberDialog"),

    form:
        $("memberForm"),

    deleteDialog:
        $("deleteDialog"),

    deleteForm:
        $("deleteForm"),

    formError:
        $("formError"),

    title:
        $("dialogTitle"),

    eyebrow:
        $("dialogEyebrow"),

    deleteMessage:
        $("deleteMessage")

};


// =====================================================
// STATE
// =====================================================

let db;
let auth;

let allMembers = [];

let selectedDeleteId = null;


// =====================================================
// FIREBASE CONFIGURATION CHECK
// =====================================================

const configured = () =>
    !Object
        .values(firebaseConfig)
        .some(
            (v) =>
                v.includes("PASTE_YOUR_EXISTING")
        );


// =====================================================
// ACCESS MESSAGE
// =====================================================

function showAccess(
    message,
    type = ""
) {

    els.access.textContent =
        message;

    els.access.className =
        `access-message ${type}`;
}


// =====================================================
// SAFE HTML
// =====================================================

function safe(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// =====================================================
// LOAD MEMBERS
// =====================================================

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
                    orderBy(
                        "memberIndex"
                    )
                )
            );

        allMembers =
            snapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );

        renderMembers();

        showAccess(
            `${allMembers.length} member record${
                allMembers.length === 1
                    ? ""
                    : "s"
            } loaded from Firestore.`,
            "success"
        );

    } catch (error) {

        console.error(error);

        showAccess(
            "Firestore could not read the members collection. Confirm the Firebase configuration and your Firestore security rules.",
            "error"
        );

    }

}


// =====================================================
// RENDER MEMBERS
// =====================================================

function renderMembers() {

    const filter =
        els.filter.value;

    const visible =
        allMembers.filter(
            (member) =>
                filter === "all" ||
                member.memberType === filter
        );

    els.count.textContent =
        allMembers.length;

    els.body.innerHTML =
        visible
            .map(
                (member) =>
                    `
                    <tr>

                        <td>
                            ${safe(member.memberIndex)}
                        </td>

                        <td>
                            ${safe(member.fullName)}
                        </td>

                        <td>
                            ${safe(member.studentClass)}
                        </td>

                        <td>
                            ${safe(member.section)}
                        </td>

                        <td>
                            ${safe(member.roll)}
                        </td>

                        <td>
                            <span
                                class="status ${
                                    member.memberType ===
                                    "EC member"
                                        ? "ec-member"
                                        : "general-member"
                                }"
                            >
                                ${safe(member.memberType)}
                            </span>
                        </td>

                        <td>
                            ${safe(member.chessRating)}
                        </td>

                        <td>
                            ${safe(member.phone)}
                        </td>

                        <td>
                            ${safe(member.joinedAt)}
                        </td>

                        <td>

                            <div class="row-actions">

                                <button
                                    class="table-action"
                                    type="button"
                                    data-edit="${member.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="table-action delete"
                                    type="button"
                                    data-delete="${member.id}"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                    `
            )
            .join("");

    els.empty.hidden =
        visible.length !== 0;

}


// =====================================================
// OPEN MEMBER FORM
// =====================================================

function openForm(
    member = null
) {

    els.form.reset();

    els.formError.hidden =
        true;

    $("memberId").value =
        member?.id || "";

    els.eyebrow.textContent =
        member
            ? "EDIT RECORD"
            : "NEW RECORD";

    els.title.textContent =
        member
            ? "Update member"
            : "Add member";

    if (member) {

        [
            "fullName",
            "studentClass",
            "section",
            "roll",
            "memberType",
            "chessRating",
            "phone",
            "joinedAt"
        ].forEach(
            (key) =>
                $(key).value =
                    member[key] ?? ""
        );

    }

    openDialog(els.dialog);

}


// =====================================================
// MEMBER PAYLOAD
// =====================================================

function memberPayload() {

    const recordId =
        $("memberId").value;

    const existingMember =
        allMembers.find(
            (member) =>
                member.id === recordId
        );

    const nextIndex =
        Math.max(
            0,
            ...allMembers.map(
                (member) =>
                    Number(
                        member.memberIndex
                    ) || 0
            )
        ) + 1;


    const numericFields = [
    ["studentClass", "Class"],
    ["roll", "Roll"],
    ["phone", "Phone number"]
];

for (const [id, name] of numericFields) {
    const value = $(id).value.trim();

    if (!/^\d+$/.test(value)) {
        throw new Error(`${name} must contain numbers only.`);
    }
}

const classValue = Number($("studentClass").value);

if (classValue < 3 || classValue > 12) {
    throw new Error("Class must be between 3 and 12.");
}

    const payload = {

        memberIndex:
            existingMember
                ? Number(
                      existingMember.memberIndex
                  )
                : nextIndex,

        fullName:
            $("fullName").value.trim(),

        studentClass:
            $("studentClass").value.trim(),

        section:
            $("section").value.trim(),

        roll:
            $("roll").value.trim(),

        memberType:
            $("memberType").value,

        chessRating:
            $("chessRating").value,

        phone:
            $("phone").value.trim(),

        joinedAt:
            $("joinedAt").value

    };

    if (
        Object
            .values(payload)
            .some(
                (value) =>
                    value === ""
            )
    ) {

        throw new Error(
            "Please complete every field."
        );

    }

    return payload;

}


// =====================================================
// SAVE MEMBER
// =====================================================

async function saveMember(
    event
) {

    event.preventDefault();

    const save =
        $("saveMemberButton");

    try {

        const payload =
            memberPayload();

        const id =
            $("memberId").value;

        save.disabled =
            true;

        save.textContent =
            "Saving…";

        if (id) {

            await updateDoc(
                doc(
                    db,
                    MEMBERS_COLLECTION,
                    id
                ),
                {
                    ...payload,
                    updatedAt:
                        serverTimestamp()
                }
            );

        } else {

            await addDoc(
                collection(
                    db,
                    MEMBERS_COLLECTION
                ),
                {
                    ...payload,
                    createdAt:
                        serverTimestamp(),
                    updatedAt:
                        serverTimestamp()
                }
            );

        }

        closeDialog(els.dialog);

        await loadMembers();

    } catch (error) {

        console.error(error);

        els.formError.textContent =
            error.message.includes(
                "permission"
            )
                ? "Firestore denied this change. Check your deployed admin security rule."
                : error.message;

        els.formError.hidden =
            false;

    } finally {

        save.disabled =
            false;

        save.textContent =
            "Save member";

    }

}


// =====================================================
// DELETE MEMBER
// =====================================================

async function deleteMember(
    event
) {

    event.preventDefault();

    if (!selectedDeleteId)
        return;

    try {

        await deleteDoc(
            doc(
                db,
                MEMBERS_COLLECTION,
                selectedDeleteId
            )
        );

        closeDialog(els.deleteDialog);

        selectedDeleteId =
            null;

        await loadMembers();

    } catch (error) {

        console.error(error);

        showAccess(
            "Firestore denied deletion. Check your deployed admin security rule.",
            "error"
        );

    }

}


// =====================================================
// BIND EVENTS
// =====================================================

function bindEvents() {

    $("addMemberButton")
        .addEventListener(
            "click",
            () =>
                openForm()
        );


    $("refreshButton")
        .addEventListener(
            "click",
            loadMembers
        );


    els.filter
        .addEventListener(
            "change",
            renderMembers
        );


    els.body
        .addEventListener(
            "click",
            (event) => {

                const edit =
                    event.target.dataset.edit;

                const remove =
                    event.target.dataset.delete;


                if (edit) {

                    openForm(
                        allMembers.find(
                            (member) =>
                                member.id ===
                                edit
                        )
                    );

                }


                if (remove) {

                    const member =
                        allMembers.find(
                            (item) =>
                                item.id ===
                                remove
                        );

                    selectedDeleteId =
                        remove;

                    els.deleteMessage.textContent =
                        `This permanently removes ${
                            member?.fullName ||
                            "this member"
                        } from Firestore.`;

                    openDialog(els.deleteDialog);

                }

            }
        );


    els.form
        .addEventListener(
            "submit",
            saveMember
        );


    els.deleteForm
        .addEventListener(
            "submit",
            deleteMember
        );


    [
        [
            "closeDialogButton",
            els.dialog
        ],
        [
            "cancelDialogButton",
            els.dialog
        ],
        [
            "cancelDeleteButton",
            els.deleteDialog
        ]
    ].forEach(
        ([id, dialog]) =>
            $(id).addEventListener(
                "click",
                () =>
                    closeDialog(dialog)
            )
    );


    $("signOutButton")
        .addEventListener(
            "click",
            () =>
                signOut(auth)
        );

}


// =====================================================
// START
// =====================================================

function start() {

    if (!configured()) {

        showAccess(
            "Firebase configuration is missing. Copy your existing firebaseConfig object into member-database.js before using this page.",
            "error"
        );

        return;

    }


    const app =
        getApps().length
            ? getApps()[0]
            : initializeApp(
                  firebaseConfig
              );


    db =
        getFirestore(app);

    auth =
        getAuth(app);


    onAuthStateChanged(
        auth,
        async (user) => {

            if (!user) {

                window.location.href = "admin.html?error=unauthorized";

                return;

            }


            if (
                user.uid !==
                ADMIN_UID
            ) {

                showAccess(
                    "Access denied. This page is restricted to the JCC administrator.",
                    "error"
                );

                return;

            }


            els.app.hidden =
                false;

            bindEvents();

            await loadMembers();

        }
    );

    $("joinedAt").addEventListener("click", function () {
        this.showPicker();
    });

}


// =====================================================
// INITIALIZE
// =====================================================

start();
