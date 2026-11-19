
// ======================================
// STUDENT HUB - COMPLETE NOTES SYSTEM
// ======================================

const DB_NAME = "StudentHubNotes";
const STORE_NAME = "notes";

let db = null;

let currentSubject = null;
let currentChapter = null;

const allowedExtensions = [
    "pdf", "jpg", "jpeg", "png", "webp", "gif",
    "doc", "docx", "ppt", "pptx",
    "xls", "xlsx", "txt", "zip"
];

// ======================================
// 1. DATABASE CONNECTION
// ======================================

const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = function(event) {

    const database = event.target.result;

    if (!database.objectStoreNames.contains(STORE_NAME)) {

        database.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true
        });

    }

};

request.onsuccess = function(event) {

    db = event.target.result;

    console.log("Student Hub database connected!");

    displayNotes();

};

request.onerror = function() {

    alert("Unable to connect to Student Hub storage.");

};

// ======================================
// 2. OPEN NOTES LIBRARY
// ======================================

function openNotes() {

    document.querySelector("main").hidden = true;
    document.querySelector("header").hidden = true;

    document.getElementById("notesPage").hidden = false;

    currentSubject = null;
    currentChapter = null;

    document.getElementById("searchNotes").value = "";

    displayNotes();

}

// ======================================
// 3. CLOSE NOTES LIBRARY
// ======================================

function closeNotes() {

    document.getElementById("notesPage").hidden = true;

    document.querySelector("main").hidden = false;
    document.querySelector("header").hidden = false;

}

// ======================================
// 4. UPLOAD MULTIPLE FILES
// ======================================

document.getElementById("noteFile").addEventListener("change", function() {

    const files = Array.from(this.files);

    if (files.length === 0) return;

    if (!db) {

        alert("Storage is loading. Please try again.");

        this.value = "";

        return;

    }

    const subject = document.getElementById("subjectSelect").value;

    const chapter = document.getElementById("chapterInput")
        .value.trim() || "General";

    const validFiles = files.filter(file => {

        const extension = file.name.split(".").pop().toLowerCase();

        return allowedExtensions.includes(extension);

    });

    if (validFiles.length !== files.length) {

        alert("Some unsupported files were skipped.");

    }

    if (validFiles.length === 0) {

        this.value = "";

        return;

    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    validFiles.forEach(file => {

        store.add({

            name: file.name,

            subject: subject,

            chapter: chapter,

            type: file.type,

            file: file,

            size: file.size,

            date: new Date().toLocaleDateString()

        });

    });

    transaction.oncomplete = function() {

        alert(validFiles.length + " file(s) uploaded successfully!");

        document.getElementById("chapterInput").value = "";

        currentSubject = subject;

        currentChapter = chapter;

        displayNotes();

    };

    transaction.onerror = function() {

        alert("Upload failed. Check your browser storage.");

    };

    this.value = "";

});

// ======================================
// 5. DISPLAY NOTES AND FOLDERS
// ======================================

function displayNotes() {

    if (!db) return;

    const list = document.getElementById("notesList");

    const search = document.getElementById("searchNotes")
        .value.trim().toLowerCase();

    const transaction = db.transaction(STORE_NAME, "readonly");

    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = function() {

        list.innerHTML = "";

        const allNotes = request.result;

        // SEARCH

        if (search) {

            createBreadcrumb();

            const results = allNotes.filter(note => {

                return (

                    note.name.toLowerCase().includes(search) ||

                    note.subject.toLowerCase().includes(search) ||

                    (note.chapter || "General")
                        .toLowerCase().includes(search)

                );

            });

            if (results.length === 0) {

                list.innerHTML = "<p>No matching notes found.</p>";

                return;

            }

            results.forEach(note => {

                createNoteCard(note, list);

            });

            return;

        }

        // SHOW BREADCRUMB

        createBreadcrumb();

        // EMPTY LIBRARY

        if (allNotes.length === 0) {

            list.innerHTML =
                "<p>No notes found. Upload your first notes!</p>";

            return;

        }

        // LEVEL 1: SUBJECT FOLDERS

        if (!currentSubject) {

            const subjects = [...new Set(

                allNotes.map(note => note.subject)

            )].sort();

            subjects.forEach(subject => {

                const subjectNotes = allNotes.filter(

                    note => note.subject === subject

                );

                createFolder(

                    list,

                    "📁",

                    subject,

                    subjectNotes.length + " files",

                    function() {

                        currentSubject = subject;

                        currentChapter = null;

                        displayNotes();

                    }

                );

            });

            return;

        }

        // LEVEL 2: CHAPTER FOLDERS

        if (!currentChapter) {

            const subjectNotes = allNotes.filter(

                note => note.subject === currentSubject

            );

            const chapters = [...new Set(

                subjectNotes.map(note => note.chapter || "General")

            )].sort();

            if (chapters.length === 0) {

                list.innerHTML = "<p>No chapters found.</p>";

                return;

            }

            chapters.forEach(chapter => {

                const chapterNotes = subjectNotes.filter(

                    note => (note.chapter || "General") === chapter

                );

                createFolder(

                    list,

                    "📂",

                    chapter,

                    chapterNotes.length + " files",

                    function() {

                        currentChapter = chapter;

                        displayNotes();

                    }

                );

            });

            return;

        }

        // LEVEL 3: DISPLAY FILES

        const chapterNotes = allNotes.filter(note =>

            note.subject === currentSubject &&

            (note.chapter || "General") === currentChapter

        );

        if (chapterNotes.length === 0) {

            list.innerHTML = "<p>This folder is empty.</p>";

            return;

        }

        chapterNotes.forEach(note => {

            createNoteCard(note, list);

        });

    };

    request.onerror = function() {

        list.innerHTML = "<p>Unable to load notes.</p>";

    };

}

// ======================================
// 6. CREATE FOLDER CARDS
// ======================================

function createFolder(container, icon, name, description, action) {

    const folder = document.createElement("div");

    folder.className = "folder-card";

    const folderIcon = document.createElement("div");

    folderIcon.className = "folder-icon";

    folderIcon.textContent = icon;

    const title = document.createElement("h3");

    title.textContent = name;

    const info = document.createElement("p");

    info.textContent = description;

    folder.append(

        folderIcon,

        title,

        info

    );

    folder.addEventListener("click", action);

    container.appendChild(folder);

}

// ======================================
// 7. BREADCRUMB NAVIGATION
// ======================================

function createBreadcrumb() {

    const breadcrumb = document.getElementById("folderBreadcrumb");

    breadcrumb.innerHTML = "";

    addBreadcrumbButton(

        breadcrumb,

        "🏠 Home",

        function() {

            currentSubject = null;

            currentChapter = null;

            displayNotes();

        }

    );

    if (currentSubject) {

        addSeparator(breadcrumb);

        addBreadcrumbButton(

            breadcrumb,

            currentSubject,

            function() {

                currentChapter = null;

                displayNotes();

            }

        );

    }

    if (currentChapter) {

        addSeparator(breadcrumb);

        const current = document.createElement("span");

        current.textContent = currentChapter;

        breadcrumb.appendChild(current);

    }

}

function addBreadcrumbButton(container, text, action) {

    const button = document.createElement("button");

    button.textContent = text;

    button.addEventListener("click", action);

    container.appendChild(button);

}

function addSeparator(container) {

    const separator = document.createElement("span");

    separator.textContent = "›";

    container.appendChild(separator);

}

// ======================================
// 8. CREATE NOTE CARDS
// ======================================

function createNoteCard(note, container) {

    const item = document.createElement("div");

    item.className = "note-item";

    const title = document.createElement("h4");

    title.textContent = "📄 " + note.name;

    const info = document.createElement("p");

    info.textContent =

        note.subject + " • " +

        (note.chapter || "General") + " • " +

        note.date + " • " +

        formatSize(note.size);

    // VIEW BUTTON

    
// VIEW BUTTON

const view = document.createElement("button");

view.textContent = "View";

view.onclick = function() {

    const type = note.type || "";

    if (type !== "application/pdf" &&
        !note.name.toLowerCase().endsWith(".pdf")) {

        if (type.startsWith("image/")) {

            const imageUrl = URL.createObjectURL(note.file);

            const newWindow = window.open(imageUrl, "_blank");

            if (!newWindow) {
                URL.revokeObjectURL(imageUrl);
                alert("Please allow pop-ups to view images.");
                return;
            }

            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);

        } else {

            alert("This file cannot be previewed. Please download it.");

        }

        return;
    }

    openPDFReader(note.file);

};


    // DOWNLOAD BUTTON

    const download = document.createElement("button");

    download.textContent = "Download";

    download.onclick = function() {

        const url = URL.createObjectURL(note.file);

        const link = document.createElement("a");

        link.href = url;

        link.download = note.name;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(function() {

            URL.revokeObjectURL(url);

        }, 1000);

    };

    // DELETE BUTTON

    const remove = document.createElement("button");

    remove.textContent = "Delete";

    remove.onclick = function() {

        deleteNote(note.id);

    };

    item.append(

        title,

        info,

        view,

        download,

        remove

    );

    container.appendChild(item);

}

// ======================================
// 9. DELETE NOTES
// ======================================

function deleteNote(id) {

    if (!confirm("Are you sure you want to delete this note?")) {

        return;

    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = function() {

        displayNotes();

    };

    transaction.onerror = function() {

        alert("Unable to delete this file.");

    };

}

// ======================================
// 10. SEARCH NOTES
// ======================================

document.getElementById("searchNotes").addEventListener(

    "input",

    function() {

        displayNotes();

    }

);

// ======================================
// 11. FILE SIZE
// ======================================

function formatSize(bytes) {

    if (!bytes) return "0 KB";

    if (bytes < 1024 * 1024) {

        return (bytes / 1024).toFixed(1) + " KB";

    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";

}


// ======================================
// BUILT-IN PDF READER
// ======================================

let activePDFUrl = null;

function openPDFReader(file) {

    const reader = document.getElementById("pdfReader");

    const frame = document.getElementById("pdfFrame");

    // Close any previously opened PDF

    if (activePDFUrl) {
        URL.revokeObjectURL(activePDFUrl);
    }

    // Create PDF URL

    activePDFUrl = URL.createObjectURL(file);

    // Load PDF inside Student Hub

    frame.src = activePDFUrl;

    // Display reader

    reader.hidden = false;

}

function closePDFReader() {

    const reader = document.getElementById("pdfReader");

    const frame = document.getElementById("pdfFrame");

    reader.hidden = true;

    frame.src = "about:blank";

    if (activePDFUrl) {

        URL.revokeObjectURL(activePDFUrl);

        activePDFUrl = null;

    }

}

// PERSONALIZED DASHBOARD GREETING

function updateDashboardGreeting() {
    const greeting = document.getElementById("dashboardGreeting");

    if (!greeting) return;

    try {
        const profile = JSON.parse(
            localStorage.getItem("StudentHubProfile")
        );

        if (profile && profile.name) {
            greeting.textContent = `Hello, ${profile.name}! 👋`;
        }
    } catch (error) {
        console.error("Could not load profile greeting:", error);
    }
}

updateDashboardGreeting();

// AUTOMATIC DASHBOARD PROGRESS

function updateDailyGoal() {
    const fill = document.getElementById("dailyGoalFill");
    const text = document.getElementById("dailyGoalText");

    if (!fill || !text) return;

    function getData(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }

    const subjects = getData("StudentHubSubjects");
    const planner = getData("StudentHubPlanner");
    const todos = getData("StudentHubTodos");
    const exams = getData("StudentHubExams");

    const total =
        subjects.length +
        planner.length +
        todos.length +
        exams.length;

    const completed =
        subjects.filter(item => item.completed).length +
        planner.filter(item => item.completed).length +
        todos.filter(item => item.completed).length +
        exams.filter(item => item.prepared).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    fill.style.width = percentage + "%";
    text.textContent = `Daily study goal · ${percentage}%`;
}

updateDailyGoal();




// ======================================
// END OF STUDENT HUB NOTES SYSTEM
// ======================================
