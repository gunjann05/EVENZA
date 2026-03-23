import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    addDoc,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore.js";

// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
    apiKey: "AIzaSyDJWLjDcCinG5rxb-eQt9xNPu-_6M7pdIc",
    authDomain: "smartcollegeevents.firebaseapp.com",
    projectId: "smartcollegeevents",
    storageBucket: "smartcollegeevents.firebasestorage.app",
    messagingSenderId: "241825324794",
    appId: "1:241825324794:web:156b65362e29dccc543343",
    measurementId: "G-FJBVL5ZWP2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====================== EMAILJS INIT ======================
try {
    if (typeof emailjs !== "undefined" && emailjs.init) {
        // !!! IMPORTANT: Replace with your actual User ID
        emailjs.init("rUYKitjrHdXMP8Bmn"); 
    }
} catch (err) {
    console.warn("EmailJS init failed (optional):", err);
}

// ====================== DOM REFERENCES and GLOBALS ======================
const eventsContainer = document.querySelector(".event-container");
const loadingIndicator = document.getElementById("loadingIndicator"); 
const registerModal = document.getElementById("registerModal");
const adminLoginModal = document.getElementById("adminLoginModal");
const editEventModal = document.getElementById("editEventModal");
const closeEdit = document.getElementById("closeEdit");
const editEventTitle = document.getElementById("editEventTitle");
const editEventDate = document.getElementById("editEventDate");
const editEventLocation = document.getElementById("editEventLocation");
const editEventCategory = document.getElementById("editEventCategory");
const saveEditBtn = document.getElementById("saveEditBtn");
const closeBtns = document.querySelectorAll(".close-btn");
const adminSidebar = document.getElementById("adminSidebar");
const closeAdmin = document.getElementById("closeAdmin");
const addEventBtn = document.getElementById("addEventBtn");
const adminEventsTable = document.getElementById("adminEventsTable");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminEventTitle = document.getElementById("adminEventTitle");
const adminEventDate = document.getElementById("adminEventDate");
const adminEventLocation = document.getElementById("adminEventLocation");
const adminEventCategory = document.getElementById("adminEventCategory");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminID = document.getElementById("adminID");
const adminPass = document.getElementById("adminPass");
const heroAdminBtn = document.getElementById("adminHeroBtn");
const registrationForm = document.getElementById("registrationForm");
const filterButtons = document.querySelectorAll(".filter-btn");
const adminDashboard = document.getElementById("adminDashboard");
const dashBackBtn = document.getElementById("dashBackBtn");
const dashRefreshBtn = document.getElementById("dashRefreshBtn");
const viewAnalyticsBtn = document.getElementById("viewAnalyticsBtn"); 
const feedbackModal = document.getElementById('feedbackModal');
const feedbackForm = document.getElementById('feedbackForm');
const starContainer = document.getElementById('star-rating');
const feedbackRatingInput = document.getElementById('feedbackRating');

// ====================== CATEGORY IMAGE MAP ======================
const CATEGORY_IMAGES = {
    tech: "images/tech.jpg",
    technical: "images/tech.jpg",
    cultural: "images/cultural.jpg",
    culture: "images/cultural.jpg",
    sports: "images/sports.jpg",
    sport: "images/sports.jpg",
    workshop: "images/workshop.jpg",
    general: "images/general.jpg"
};

function getCategoryImage(category) {
    const key = normalizeCategory(category);
    return CATEGORY_IMAGES[key] || CATEGORY_IMAGES.general;
}



// NEW: Location Filter Reference
const locationFilterInput = document.getElementById("locationFilterInput"); 


// Chatbot elements (functions are exposed to window)
const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const chatBody = document.getElementById("chat-body");


// APP STATE and ADMIN CREDENTIALS
let selectedEventId = null; 
let editingEventId = null;  
let activeCategory = "all"; 
let categoryChart = null;   // Chart.js instance for Pie
let monthChart = null;      // Chart.js instance for Bar

const ADMIN_CREDENTIALS = { id: "admin", pass: "admin123" };

// ====================== UTILITIES ======================
function setModalVisible(modalEl, visible) {
    if (!modalEl) return;
    modalEl.style.display = visible ? "flex" : "none";
}

function normalizeCategory(cat) {
    return (cat || "general").toString().toLowerCase();
}

/**
 * UPDATED: Applies both Category and Location filtering.
 */
function applyCurrentFilter() {
    const allCards = document.querySelectorAll(".event-card");
    let visibleCount = 0;
    
    // NEW: Get the location search term (normalized)
    const locationTerm = (locationFilterInput?.value || "").trim().toLowerCase(); 

    // Remove previous message
    document.getElementById("noEventsMessage")?.remove();
    
    allCards.forEach(card => {
        const cat = normalizeCategory(card.dataset.category);
        const cardLocation = (card.dataset.location || "unknown").toLowerCase();

        // 1. Check if card meets the category criteria
        const matchesCategory = (activeCategory === "all" || cat === activeCategory);
        
        // 2. Check if card location contains the search term (case-insensitive)
        const matchesLocation = locationTerm === "" || cardLocation.includes(locationTerm);

        // Card must match BOTH criteria
        const shouldBeVisible = matchesCategory && matchesLocation;

        card.style.display = shouldBeVisible ? "block" : "none";
        if (shouldBeVisible) {
            visibleCount++;
        }
    });

    // --- ENHANCEMENT: Empty State Message ---
    if (visibleCount === 0) {
        const message = document.createElement("div");
        message.id = "noEventsMessage";
        message.style.cssText = "text-align: center; width: 100%; color: #666; font-size: 1.2em; padding: 50px 0;";
        
        let messageText;
        if (locationTerm !== "" && activeCategory !== "all") {
             messageText = `No events found matching category "${activeCategory.toUpperCase()}" and location "${locationTerm}".`;
        } else if (locationTerm !== "") {
             messageText = `No events found matching location "${locationTerm}".`;
        } else if (activeCategory !== "all") {
             messageText = `No events found in the "${activeCategory.toUpperCase()}" category. Try another filter!`;
        } else {
             messageText = "<h3>No Upcoming Events Found. Check Back Soon!</h3>";
        }

        message.innerHTML = `<h3>${messageText}</h3>`;
        eventsContainer.appendChild(message);
    }
}

function setActiveFilter(category) {
    activeCategory = normalizeCategory(category);
    filterButtons.forEach(b => {
        const bcat = normalizeCategory(b.dataset.category || "all");
        b.classList.toggle("active", bcat === activeCategory);
    });
    applyCurrentFilter();
}

// --- Utility: parse date string (YYYY-MM-DD) safely ---
function parseYMD(ymd) {
    if (!ymd) return null;
    const [y, m, d] = ymd.split("-").map(x => parseInt(x, 10));
    if (!y || !m || !d) return null;
    return new Date(y, (m - 1), d);
}


// ====================== LOAD EVENTS (FIRESTORE -> UI) ======================
async function loadEvents() {
    if (!eventsContainer) return;
    eventsContainer.innerHTML = "";
    
    // --- ENHANCEMENT: Show Loading State ---
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        eventsContainer.appendChild(loadingIndicator);
    }

    try {
        const snap = await getDocs(collection(db, "events"));
        
        // Clear events and the loading indicator
        eventsContainer.innerHTML = ""; 

        snap.forEach(docSnap => {
            const e = docSnap.data();
            const id = docSnap.id;
            const location = e.location || "TBA"; // Get location

            const card = document.createElement("div");
            card.className = "event-card";
            card.dataset.category = normalizeCategory(e.category);
            card.dataset.id = id; 
            // NEW: Add location data attribute for filtering
            card.dataset.location = (location).toLowerCase(); 

            // card.innerHTML = `
            //     <img 
            //         src="${e.image && e.image.trim() !== "" ? e.image : 'https://picsum.photos/400/300?random=' + Math.random()}" 
            //         onerror="this.src='https://picsum.photos/400/300?random=' + Math.random()" 
            //     />
            //     <h2 class="event-title">${e.title || "Untitled Event"}</h2>
            //     <p class="event-date"><strong>Date:</strong> ${e.date || "TBA"}</p>
            //     <p><strong>Location:</strong> ${location}</p>
            //     <p><strong>Category:</strong> ${e.category || "General"}</p>
            //     <button class="register-btn" data-id="${id}">Register</button>
            //     <button class="event-feedback-btn" data-id="${id}" data-title="${e.title}">Give Feedback</button>
            // `;
//             card.innerHTML = `
//     <h2 class="event-title">${e.title || "Untitled Event"}</h2>

//     <p class="event-date">
//         <strong>Date:</strong> ${e.date || "TBA"}
//     </p>

//     <p>
//         <strong>Location:</strong> ${location}
//     </p>

//     <p>
//         <strong>Category:</strong> ${e.category || "General"}
//     </p>

//     <button class="register-btn" data-id="${id}">
//         Register
//     </button>

//     <button 
//         class="event-feedback-btn" 
//         data-id="${id}" 
//         data-title="${e.title || ''}">
//         Give Feedback
//     </button>
// `;
const imageSrc = getCategoryImage(e.category);

card.innerHTML = `
    <img 
        src="${imageSrc}" 
        class="event-img"
        alt="${e.category || 'Event'} poster"
        loading="lazy"
    />

    <h2 class="event-title">${e.title || "Untitled Event"}</h2>

    <p class="event-date">
        <strong>Date:</strong> ${e.date || "TBA"}
    </p>

    <p>
        <strong>Location:</strong> ${location}
    </p>

    <p>
        <strong>Category:</strong> ${e.category || "General"}
    </p>

    <button class="register-btn" data-id="${id}">
        Register
    </button>

    <button 
        class="event-feedback-btn" 
        data-id="${id}" 
        data-title="${e.title || ''}">
        Give Feedback
    </button>
`;




            eventsContainer.appendChild(card);
        });

        // (Re)attach register click handlers 
        document.querySelectorAll(".register-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const card = btn.closest(".event-card");
                selectedEventId = btn.dataset.id;
                
                // Populate modal dataset for EmailJS
                registerModal.dataset.eventTitle = card.querySelector(".event-title")?.innerText || "";
                registerModal.dataset.eventDate = (card.querySelector(".event-date")?.innerText || "").replace(/Date\s*:\s*/i, "");
                registerModal.dataset.eventLocation = (card.querySelector("p:nth-of-type(2)")?.innerText || "").replace(/Location\s*:\s*/i, "");

                setModalVisible(registerModal, true);
            });
        });
        
        // (Re)attach feedback click handlers
        document.querySelectorAll(".event-feedback-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                // Set the event context in the modal
                feedbackModal.dataset.eventId = btn.dataset.id;
                feedbackModal.dataset.eventTitle = btn.dataset.title;
                
                // Update modal title visually
                const titleEl = feedbackModal.querySelector('.modal-content h3');
                if(titleEl) titleEl.innerText = `Feedback for: ${btn.dataset.title}`;

                // Reset form and show 5 stars as default
                feedbackForm.reset();
                feedbackRatingInput.value = 5;
                starContainer.querySelectorAll('.star').forEach(s => s.classList.add('selected'));

                setModalVisible(feedbackModal, true);
            });
        });


        // Re-apply current filter after reload
        applyCurrentFilter();

        // Keep admin table updated if sidebar is open
        if (adminSidebar?.classList.contains("open")) {
            await renderAdminTable();
        }
    } catch (err) {
        console.error("Error loading events:", err);
        // Display a failure message instead of a blank screen
        eventsContainer.innerHTML = '<div style="text-align: center; width: 100%; padding: 50px;"><h3>Failed to load events. Check your network connection and Firebase configuration.</h3></div>';
    }
    
    // --- ENHANCEMENT: Hide Loading State ---
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// ====================== FILTER BUTTONS ======================
filterButtons.forEach(btn => {
    btn.addEventListener("click", () => setActiveFilter(btn.dataset.category || "all"));
});

// NEW: Event Listener for Location Input
if (locationFilterInput) {
    // Use 'input' event for real-time filtering as the user types
    locationFilterInput.addEventListener("input", applyCurrentFilter);
}

// ====================== REGISTRATION (FIRESTORE + EMAILJS) ======================
if (registrationForm) {
    registrationForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();

        const name = (document.getElementById("userName")?.value || "").trim();
        const email = (document.getElementById("userEmail")?.value || "").trim();
        if (!name || !email) return alert("Please fill all fields");
        
        // Simple email format check
        if (!email.includes('@') || !email.includes('.')) return alert("Please enter a valid email address.");

        const eventTitle = registerModal?.dataset.eventTitle || "";
        const eventDate = registerModal?.dataset.eventDate || "";
        const eventLocation = registerModal?.dataset.eventLocation || "";

        // Temporarily disable button
        const submitBtn = document.getElementById("submitRegistration");
        submitBtn.disabled = true;
        submitBtn.innerText = "Registering...";

        try {
            await addDoc(collection(db, "registrations"), {
                name,
                email,
                eventId: selectedEventId || null,
                eventTitle,
                eventDate,
                eventLocation,
                timestamp: new Date()
            });

            let successMessage = `Registered for "${eventTitle}".`;
            
            if (typeof emailjs !== "undefined" && emailjs.send) {
                try {
                    await emailjs.send("service_kif3vbt", "template_g0zptsm", {
                        name: name, 
                        email: email, 
                        title: eventTitle,
                        message: `User has successfully registered for the event: ${eventTitle} on ${eventDate} at ${eventLocation}.`
                    });
                    successMessage += ` Confirmation sent to ${email}.`;
                } catch (mailErr) {
                    console.error("EmailJS error:", mailErr);
                    successMessage += " (Could not send confirmation email.)";
                }
            }
            alert(successMessage);
            
            setModalVisible(registerModal, false);
            registrationForm.reset();
        } catch (err) {
            console.error("Registration failed:", err);
            alert("Registration failed.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit";
        }
    });
}

// ====================== GLOBAL MODAL CLOSE (X + BACKDROP) ======================
closeBtns.forEach(b => {
    b.addEventListener("click", () => {
        const modal = b.closest(".modal");
        if (modal) modal.style.display = "none";
    });
});

window.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal")) {
        e.target.style.display = "none";
    }
});

// ====================== ADMIN LOGIN (MODAL) ======================
if (heroAdminBtn) {
    heroAdminBtn.addEventListener("click", () => setModalVisible(adminLoginModal, true));
}

if (adminLoginBtn) {
    adminLoginBtn.addEventListener("click", () => {
        // --- ENHANCEMENT: Login Presentation Facade (1-second delay) ---
        adminLoginBtn.disabled = true;
        adminLoginBtn.innerText = "Checking Credentials..."; 

        setTimeout(() => {
            const id = (adminID?.value || "").trim();
            const pass = (adminPass?.value || "").trim();

            adminLoginBtn.disabled = false;
            adminLoginBtn.innerText = "Login"; // Reset button text

            if (id === ADMIN_CREDENTIALS.id && pass === ADMIN_CREDENTIALS.pass) {
                setModalVisible(adminLoginModal, false);
                if (adminID) adminID.value = "";
                if (adminPass) adminPass.value = "";
                openAdminSidebar(); // Open sidebar first
            } else {
                alert("Invalid credentials");
            }
        }, 1000); 
    });
}

// ====================== ADMIN SIDEBAR OPEN/CLOSE/ANALYTICS ======================
function openAdminSidebar() {
    if (!adminSidebar) return;
    adminSidebar.classList.add("open");
    adminSidebar.setAttribute("aria-hidden", "false");
    renderAdminTable();
}

function closeAdminSidebar() {
    if (!adminSidebar) return;
    adminSidebar.classList.remove("open");
    adminSidebar.setAttribute("aria-hidden", "true");
}

function openAdminDashboardAfterLogin() {
    closeAdminSidebar();
    showDashboard();
}

if (closeAdmin) closeAdmin.addEventListener("click", closeAdminSidebar);
if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", () => {
    closeAdminSidebar();
    alert("Logged out.");
});

if (viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', openAdminDashboardAfterLogin);
}


// ====================== ADMIN: ADD EVENT ======================
if (addEventBtn) {
    addEventBtn.addEventListener("click", async () => {
        const title = (adminEventTitle?.value || "").trim();
        const date = adminEventDate?.value || "";
        const location = (adminEventLocation?.value || "").trim();
        const category = adminEventCategory?.value || "general";

        if (!title || !date || !location) return alert("Fill all fields");
        
        addEventBtn.disabled = true;

        try {
            await addDoc(collection(db, "events"), { title, date, location, category });

            if (adminEventTitle) adminEventTitle.value = "";
            if (adminEventDate) adminEventDate.value = "";
            if (adminEventLocation) adminEventLocation.value = "";

            await loadEvents();
            await renderAdminTable();
            alert("Event added");
        } catch (err) {
            console.error("Failed to add event:", err);
            alert("Failed to add event.");
        } finally {
            addEventBtn.disabled = false;
        }
    });
}

// ====================== ADMIN: TABLE (DELETE + EDIT MODAL) ======================
async function renderAdminTable() {
    if (!adminEventsTable) return;
    adminEventsTable.innerHTML = "";

    try {
        const snap = await getDocs(collection(db, "events"));
        snap.forEach(docSnap => {
            const e = docSnap.data();
            const id = docSnap.id;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${e.title || ""}</td>
                <td>${e.date || ""}</td>
                <td>${e.category || ""}</td>
                <td>
                    <button class="action-btn edit" data-id="${id}">Edit</button>
                    <button class="action-btn delete" data-id="${id}">Delete</button>
                </td>
            `;
            adminEventsTable.appendChild(tr);
        });

        // DELETE
        adminEventsTable.querySelectorAll(".delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                if (!confirm("Delete this event?")) return;
                try {
                    await deleteDoc(doc(db, "events", id));
                    await loadEvents();
                    await renderAdminTable();
                } catch (err) {
                    console.error(err);
                    alert("Delete failed");
                }
            });
        });

        // EDIT (open modal with existing values)
        adminEventsTable.querySelectorAll(".edit").forEach(btn => {
            btn.addEventListener("click", async () => {
                editingEventId = btn.dataset.id;
                try {
                    const docRef = doc(db, "events", editingEventId);
                    const snap = await getDoc(docRef);
                    const data = snap.data() || {};

                    if (editEventTitle) editEventTitle.value = data.title || "";
                    if (editEventDate) editEventDate.value = data.date || "";
                    if (editEventLocation) editEventLocation.value = data.location || "";
                    if (editEventCategory) editEventCategory.value = data.category || "general";

                    setModalVisible(editEventModal, true);
                } catch (err) {
                    console.error("Load event for edit failed:", err);
                    alert("Could not load event details.");
                }
            });
        });

    } catch (err) {
        console.error("renderAdminTable error:", err);
    }
}

// ====================== SAVE EDITED EVENT (MODAL) ======================
if (saveEditBtn) {
    saveEditBtn.addEventListener("click", async () => {
        if (!editingEventId) return alert("No event selected.");

        const newTitle = (editEventTitle?.value || "").trim();
        const newDate = (editEventDate?.value || "").trim();
        const newLocation = (editEventLocation?.value || "").trim();
        const newCategory = (editEventCategory?.value || "general").trim();

        if (!newTitle || !newDate || !newLocation) return alert("Please fill all fields.");

        saveEditBtn.disabled = true;
        
        try {
            await updateDoc(doc(db, "events", editingEventId), {
                title: newTitle,
                date: newDate,
                location: newLocation,
                category: newCategory
            });

            setModalVisible(editEventModal, false);
            editingEventId = null;

            await loadEvents();
            await renderAdminTable();
            alert("Event updated successfully!");
        } catch (err) {
            console.error("Update failed:", err);
            alert("Failed to update event.");
        } finally {
            saveEditBtn.disabled = false;
        }
    });
}

// Close edit modal (X)
if (closeEdit) closeEdit.addEventListener("click", () => setModalVisible(editEventModal, false));

// ====================== AUTO REFRESH (ADMIN VIEW) ======================
setInterval(() => {
    if (adminSidebar?.classList.contains("open")) {
        renderAdminTable();
    }
}, 8000);

// ====================== CHATBOT (Functions exposed globally for HTML inline onclicks) ======================
function toggleChat() {
    if (!chatWindow) return;
    chatWindow.style.display = (chatWindow.style.display === "flex") ? "none" : "flex";
}
window.toggleChat = toggleChat;

function sendMessage() {
    if (!userInput || !chatBody) return;
    const text = userInput.value.trim();
    if (!text) return;

    const userMsg = document.createElement("div");
    userMsg.className = "user-message";
    userMsg.innerText = text;
    chatBody.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.className = "bot-message";

    if (/register/i.test(text)) botMsg.innerText = "Click the Register button on any event card to sign up.";
    else if (/(today|event|events)/i.test(text)) botMsg.innerText = "Look at the event list above — use filters (Tech/Culture/Sports/Arts) or the location search to find your event.";
    else botMsg.innerText = "Ask about events (date/location) or how to register — I’m here to help.";

    chatBody.appendChild(botMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    userInput.value = "";
}
window.sendMessage = sendMessage;

function suggestQuestion(text) {
    if (!userInput) return;
    userInput.value = text;
    sendMessage();
}
window.suggestQuestion = suggestQuestion;




// ====================== FEEDBACK LOGIC (STAR RATING + FIRESTORE SUBMISSION) ======================

// --- Star Rating Logic (Updated to use setModalVisible and removed redundant selector) ---
if (starContainer && feedbackRatingInput) {
    // Set initial state (5 stars selected by default on page load)
    feedbackRatingInput.value = 5;
    starContainer.querySelectorAll('.star').forEach(star => {
        star.classList.add('selected');

        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            feedbackRatingInput.value = rating;
            
            // Update visual selection
            starContainer.querySelectorAll('.star').forEach(s => {
                s.classList.toggle('selected', parseInt(s.getAttribute('data-rating')) <= rating);
            });
        });
    });
}


// --- Feedback Submission Logic (FIRESTORE FIRST, then EmailJS) ---
if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const eventId = feedbackModal.dataset.eventId;
        const eventTitle = feedbackModal.dataset.eventTitle;

        // Get form inputs
        const name = document.getElementById('feedbackName').value || 'Anonymous';
        const email = document.getElementById('feedbackEmail').value || 'No Email Provided';
        const rating = parseInt(feedbackRatingInput.value) || 0;
        const comments = document.getElementById('feedbackComments').value.trim();

        if (!eventId) return alert("Error: Event context lost. Please close and re-open the feedback form.");
        if (rating === 0) return alert("Please provide a star rating.");
        
        const submitBtn = document.getElementById('submitFeedbackBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting...";

        try {
            // 1. Save to Firestore 'feedback' collection
            await addDoc(collection(db, "feedback"), {
                eventId,
                eventTitle,
                name,
                email,
                rating,
                comments: comments || "N/A",
                timestamp: new Date()
            });

            let successMessage = `Feedback for "${eventTitle}" successfully submitted!`;
            
            // 2. Optional: Send notification via EmailJS (requires correct IDs)
            if (typeof emailjs !== "undefined" && emailjs.send) {
                const serviceID = "YOUR_FEEDBACK_SERVICE_ID"; // **CHANGE THIS**
                const templateID = "YOUR_FEEDBACK_TEMPLATE_ID"; // **CHANGE THIS**
                const adminEmail = "YOUR_ADMIN_EMAIL@example.com"; // **CHANGE THIS (Your main mail)**

                const templateParams = {
                    from_name: name,
                    from_email: email,
                    event_title: eventTitle,
                    user_rating: rating,
                    user_comments: comments,
                    to_email: adminEmail 
                };
                
                try {
                     // await emailjs.send(serviceID, templateID, templateParams);
                     // successMessage += " Admin notified.";
                } catch (mailErr) {
                    console.error("Feedback EmailJS error (Notification failed):", mailErr);
                }
            }

            alert(successMessage);

        } catch (err) {
            console.error("Feedback submission failed:", err);
            alert("Feedback submission failed. Please try again.");
        } finally {
            // Reset and close
            feedbackForm.reset();
            setModalVisible(feedbackModal, false);
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Feedback";
        }
    });
}

// ====================== ADMIN DASHBOARD (ANALYTICS) ======================
function showDashboard() {
    if (adminDashboard) adminDashboard.classList.remove("hidden");
    const topRow = document.querySelector(".top-row");

    // Hide user-facing elements
    if (eventsContainer) eventsContainer.style.display = "none";
    if (topRow) topRow.style.display = "none"; 
    
    // Ensure dashboard is visible
    if (adminDashboard) adminDashboard.setAttribute("aria-hidden", "false");
    
    loadDashboardStats();
}

function hideDashboard() {
    if (adminDashboard) adminDashboard.classList.add("hidden");
    const topRow = document.querySelector(".top-row");
    
    // Show user-facing elements
    if (eventsContainer) eventsContainer.style.display = "grid";
    if (topRow) topRow.style.display = "flex";
    
    // Ensure sidebar is accessible
    if (adminSidebar) adminSidebar.style.display = "flex"; 
    if (adminDashboard) adminDashboard.setAttribute("aria-hidden", "true");
}

if (dashBackBtn) dashBackBtn.addEventListener("click", hideDashboard);
if (dashRefreshBtn) dashRefreshBtn.addEventListener("click", loadDashboardStats);

// --- Main: load KPIs + charts ---
async function loadDashboardStats() {
    try {
        const [eventsSnap, regsSnap, feedbackSnap] = await Promise.all([
            getDocs(collection(db, "events")),
            getDocs(collection(db, "registrations")),
            getDocs(collection(db, "feedback")) // Fetch feedback data
        ]);

        const events = [];
        eventsSnap.forEach(s => events.push({ id: s.id, ...s.data() }));
        const regs = [];
        regsSnap.forEach(s => regs.push({ id: s.id, ...s.data() }));
        const feedback = []; // Array for feedback docs
        feedbackSnap.forEach(s => feedback.push({ id: s.id, ...s.data() }));


        // KPIs
        const totalEvents = events.length;
        const totalRegs = regs.length;

        const totalFeedback = feedback.length; // New KPI
        const avgRating = totalFeedback > 0 
            ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedback).toFixed(1)
            : 'N/A'; // New KPI

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = events.filter(e => {
            const dt = parseYMD(e.date);
            return dt && dt >= today;
        }).length;

        const byCat = {};
        events.forEach(e => {
            const c = (e.category || "general").toLowerCase();
            byCat[c] = (byCat[c] || 0) + 1;
        });

        let topCat = "—";
        let topCount = 0;
        Object.entries(byCat).forEach(([c, n]) => {
            if (n > topCount) { topCount = n; topCat = c; }
        });

        // Update KPI DOM (UPDATED)
        document.getElementById("kpiTotalEvents").innerText = String(totalEvents);
        document.getElementById("kpiUpcomingEvents").innerText = String(upcoming);
        document.getElementById("kpiRegistrations").innerText = String(totalRegs);
        
        // Use feedback data for a KPI slot
        document.getElementById("kpiTopCategory").innerText = avgRating; // Show Avg Rating
        const kpiTopCategoryLabel = document.getElementById("kpiTopCategoryLabel");
        if(kpiTopCategoryLabel) kpiTopCategoryLabel.innerText = "Avg. Rating";


        // Draw charts using Chart.js
        drawCategoryPie(byCat);
        drawMonthlyBar(events);

    } catch (err) {
        console.error("Dashboard stats load failed:", err);
    }
}

// --- Chart 1: Pie (Category) - Chart.js Implementation ---
function drawCategoryPie(byCat) {
    const canvas = document.getElementById("pieCategory");
    if (!canvas) return;

    if (categoryChart) { categoryChart.destroy(); }

    const labels = Object.keys(byCat).map(c => c.toUpperCase());
    const dataValues = Object.values(byCat);

    categoryChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    'rgba(0, 180, 216, 0.8)', // Cyan
                    'rgba(0, 119, 182, 0.8)', // Blue
                    'rgba(255, 214, 10, 0.8)', // Yellow
                    'rgba(239, 68, 68, 0.8)',  // Red
                    'rgba(138, 92, 246, 0.8)' // Purple
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { color: '#000', font: { size: 12 } } 
                },
                title: { display: false } 
            },
            // CRITICAL FIX: Add layout padding to push chart up, making room for legend
            layout: { 
                padding: { 
                    bottom: 20 // Pushes the chart up 20px, ensuring the legend is visible
                }
            }
        }
    });
}

// --- Chart 2: Bar (Monthly) - Chart.js Implementation ---
function drawMonthlyBar(events) {
    const canvas = document.getElementById("barMonth");
    if (!canvas) return;

    if (monthChart) { monthChart.destroy(); }

    const counts = {};
    events.forEach(e => {
        const dt = parseYMD(e.date);
        if (!dt) return;
        const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        counts[k] = (counts[k] || 0) + 1;
    });

    const keys = Object.keys(counts).sort();
    const dataValues = keys.map(k => counts[k]);
    const labels = keys.map(k => {
        const parts = k.split('-');
        return `${parts[1]}/${parts[0]}`; 
    });

    monthChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Events',
                data: dataValues,
                backgroundColor: 'rgba(0, 180, 216, 0.7)',
                borderColor: 'rgba(0, 119, 182, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#333' } },
                x: { ticks: { color: '#333' } }
            }
        }
    });
}

// ====================== BOOTSTRAP ======================
loadEvents();
