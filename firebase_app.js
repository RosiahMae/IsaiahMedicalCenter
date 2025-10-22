// filepath: firebase_app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    onSnapshot,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// --- Global Canvas Variables (Mandatory Check) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Initialize Firebase Services (Starts as null) ---
let app = null;
let db = null;
let auth = null;
let userId = null;
let isAuthReady = false; // Flag to ensure we don't try to access Firestore before auth completes

/**
 * Initializes Firebase, authenticates the user, and sets up global service variables.
 */
async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase configuration is missing or empty.");
            return;
        }
        
        // 1. Initialize App and Services
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // OPTIONAL: Set log level for debugging
        // setLogLevel('debug'); 

        // 2. Authentication Flow
        if (initialAuthToken) {
            console.log("Signing in with custom token...");
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            console.log("Signing in anonymously...");
            await signInAnonymously(auth);
        }
        
        // 3. Set Auth State Listener
        // onAuthStateChanged is asynchronous and will run the callback once auth state is determined
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("User authenticated. UID:", userId);
            } else {
                // Should only happen if token sign-in failed, or anonymous failed
                userId = crypto.randomUUID(); // Fallback to a random ID
                console.warn("Authentication failed or user logged out. Using anonymous UUID:", userId);
            }
            
            isAuthReady = true;
            // Now that auth is ready, you can call data fetching functions
            // fetchRealtimeData(); // <--- UNCOMMENT THIS TO START FETCHING DATA
        });

    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
}

// --- Data Fetching Example (Requires auth to be ready) ---

/**
 * Example function to fetch data in real-time.
 * This demonstrates the correct use of collection(db, 'path') after db is initialized.
 * * NOTE: The path MUST follow the secure pattern: 
 * /artifacts/{appId}/users/{userId}/{collectionName} for private data.
 * The function will only execute if isAuthReady is true.
 */
function fetchRealtimeData() {
    if (!isAuthReady || !db || !userId) {
        console.error("Cannot fetch data: Firebase or Auth not ready.");
        return;
    }

    // Build the collection path based on the secure rules
    const collectionName = 'your_items'; // Replace with your actual collection name
    const collectionPath = `/artifacts/${appId}/users/${userId}/${collectionName}`;

    console.log("Listening to collection:", collectionPath);
    
    // The first argument to collection MUST be the Firestore instance (db)
    const itemsCollection = collection(db, collectionPath);
    const q = query(itemsCollection);

    // Set up the real-time listener
    onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            // Check for serialization issues if the data is complex
            const data = doc.data();
            try {
                // If you stored JSON strings, parse them here:
                // data.fieldName = JSON.parse(data.fieldName); 
                items.push({ id: doc.id, ...data });
            } catch (e) {
                console.error("Error parsing document data:", e);
                items.push({ id: doc.id, ...data, error: "Data corrupted" });
            }
        });
        
        console.log("Real-time items updated:", items);
        // You would typically call a function here to update your UI with the 'items' array.
    }, (error) => {
        console.error("Firestore real-time listener failed:", error);
    });
}


// Start the initialization process when the script loads
initializeFirebase();

// --- Export services for use in other modules or in the global scope (if not module) ---
// For use in other <script type="module"> blocks:
export { db, auth, userId, appId, isAuthReady, fetchRealtimeData };

// If you need to access these globally in non-module scripts, 
// you can expose them to the window object after initialization completes.
window.firebase_services = {
    getDb: () => db,
    getAuth: () => auth,
    getUserId: () => userId,
    getAppId: () => appId,
    isReady: () => isAuthReady
};
