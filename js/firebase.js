// ============================================================
// TJWORK — FIREBASE.JS
// Firebase initialization and shared Firebase services
// ============================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    FacebookAuthProvider,
    OAuthProvider,
    signInWithPopup,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyABIlZDxpHBUtSbYYaf_wMIDxNtbM2i2Po",
    authDomain: "rabota-tj.firebaseapp.com",
    projectId: "rabota-tj",
    storageBucket: "rabota-tj.firebasestorage.app",
    messagingSenderId: "208860953928",
    appId: "1:208860953928:web:975bccc89bc0bf32bac77d",
    measurementId: "G-12YKSNPWS4"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


// ============================================================
// AUTH PROVIDERS
// ============================================================

const googleProvider = new GoogleAuthProvider();

const facebookProvider = new FacebookAuthProvider();

const appleProvider = new OAuthProvider("apple.com");


// ============================================================
// EXPORT FIREBASE CORE
// ============================================================

export {
    app,
    auth,
    db,
    storage,

    googleProvider,
    facebookProvider,
    appleProvider
};


// ============================================================
// EXPORT AUTH FUNCTIONS
// ============================================================

export {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,

    updatePassword,

    EmailAuthProvider,
    reauthenticateWithCredential,

    RecaptchaVerifier,
    signInWithPhoneNumber
};


// ============================================================
// EXPORT FIRESTORE FUNCTIONS
// ============================================================

export {
    collection,
    doc,

    setDoc,
    getDoc,
    getDocs,

    updateDoc,
    deleteDoc,

    onSnapshot,

    query,
    where,
    orderBy,
    limit,

    serverTimestamp
};


// ============================================================
// EXPORT STORAGE FUNCTIONS
// ============================================================

export {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};


// ============================================================
// SOCIAL LOGIN
// ============================================================

export async function loginWithSocial(providerName) {

    let provider;

    switch (providerName) {

        case "google":
            provider = googleProvider;
            break;

        case "facebook":
            provider = facebookProvider;
            break;

        case "apple":
            provider = appleProvider;
            break;

        default:
            throw new Error(
                "Неизвестный способ входа: " + providerName
            );
    }

    try {

        const result = await signInWithPopup(
            auth,
            provider
        );

        return result;

    } catch (error) {

        console.error(
            "Ошибка социальной авторизации:",
            error
        );

        throw error;
    }
}


// ============================================================
// FIREBASE HELPERS
// ============================================================

export function getCurrentUser() {
    return auth.currentUser;
}


export function isUserLoggedIn() {
    return !!auth.currentUser;
}


export function getUserUid() {

    return auth.currentUser
        ? auth.currentUser.uid
        : null;
}


export function getUserEmail() {

    return auth.currentUser
        ? auth.currentUser.email
        : null;
}


// ============================================================
// AUTH STATE LISTENER
// ============================================================

export function listenAuthState(callback) {

    return onAuthStateChanged(
        auth,
        callback
    );
}


// ============================================================
// LOGOUT
// ============================================================

export async function logoutFirebase() {

    try {

        await signOut(auth);

        return true;

    } catch (error) {

        console.error(
            "Ошибка выхода:",
            error
        );

        throw error;
    }
}


// ============================================================
// FIRESTORE COLLECTION HELPERS
// ============================================================

export function getCollection(name) {

    return collection(
        db,
        name
    );
}


export function getDocument(
    collectionName,
    documentId
) {

    return doc(
        db,
        collectionName,
        documentId
    );
}


// ============================================================
// STORAGE HELPERS
// ============================================================

export async function uploadFile(
    file,
    path
) {

    if (!file) {
        throw new Error("Файл не выбран.");
    }

    const storageRef = ref(
        storage,
        path
    );

    const snapshot = await uploadBytes(
        storageRef,
        file
    );

    return await getDownloadURL(
        snapshot.ref
    );
}


export async function deleteFile(path) {

    if (!path) {
        return;
    }

    try {

        const fileRef = ref(
            storage,
            path
        );

        await deleteObject(
            fileRef
        );

    } catch (error) {

        console.warn(
            "Не удалось удалить файл:",
            error
        );
    }
}


// ============================================================
// FIREBASE ERROR HANDLER
// ============================================================

export function handleFirebaseError(error) {

    console.error(
        "Firebase error:",
        error
    );

    if (!error) {
        return "Произошла неизвестная ошибка.";
    }

    switch (error.code) {

        case "auth/email-already-in-use":
            return "Этот email уже используется.";

        case "auth/invalid-email":
            return "Неверный формат email.";

        case "auth/invalid-credential":
            return "Неверный email или пароль.";

        case "auth/wrong-password":
            return "Неверный пароль.";

        case "auth/user-not-found":
            return "Пользователь не найден.";

        case "auth/weak-password":
            return "Пароль слишком слабый.";

        case "auth/popup-closed-by-user":
            return "Окно входа было закрыто.";

        case "auth/popup-blocked":
            return "Браузер заблокировал окно входа.";

        case "auth/cancelled-popup-request":
            return "Запрос входа был отменён.";

        case "auth/network-request-failed":
            return "Проблема с интернет-соединением.";

        case "auth/too-many-requests":
            return "Слишком много попыток. Попробуйте позже.";

        case "auth/invalid-phone-number":
            return "Неверный номер телефона.";

        case "auth/missing-phone-number":
            return "Введите номер телефона.";

        case "auth/invalid-verification-code":
            return "Неверный код подтверждения.";

        case "auth/code-expired":
            return "Срок действия кода истёк.";

        case "permission-denied":
            return "Недостаточно прав доступа.";

        case "failed-precondition":
            return "Firebase требует дополнительной настройки.";

        default:
            return error.message ||
                "Произошла ошибка Firebase.";
    }
}


// ============================================================
// GLOBAL REFERENCES
// Совместимость с существующим TJWORK-кодом
// ============================================================

window.firebaseApp = app;

window.firebaseAuth = auth;

window.firebaseDb = db;

window.firebaseStorage = storage;

window.googleProvider = googleProvider;

window.facebookProvider = facebookProvider;

window.appleProvider = appleProvider;


// ============================================================
// OLD TJWORK FIREBASE ALIASES
// Совместимость со старым кодом сайта
// ============================================================

window.fbCollection = collection;
window.fbDoc = doc;

window.fbSetDoc = setDoc;
window.fbGetDoc = getDoc;
window.fbGetDocs = getDocs;

window.fbUpdateDoc = updateDoc;
window.fbDeleteDoc = deleteDoc;

window.fbOnSnapshot = onSnapshot;

window.fbQuery = query;
window.fbWhere = where;
window.fbOrderBy = orderBy;
window.fbLimit = limit;

window.fbServerTimestamp = serverTimestamp;


// ============================================================
// OLD AUTH ALIASES
// ============================================================

window.fbSignIn = signInWithEmailAndPassword;
window.fbSignUp = createUserWithEmailAndPassword;
window.fbSignOut = signOut;
window.fbOnStateChanged = onAuthStateChanged;

window.updatePasswordFirebase = updatePassword;

window.reauthenticateWithCredential =
    reauthenticateWithCredential;

window.EmailAuthProvider =
    EmailAuthProvider;

window.RecaptchaVerifier =
    RecaptchaVerifier;

window.signInWithPhoneNumber =
    signInWithPhoneNumber;

window.loginWithSocial =
    loginWithSocial;


// ============================================================
// STORAGE GLOBAL HELPERS
// ============================================================

window.uploadTJWorkFile = uploadFile;

window.deleteTJWorkFile = deleteFile;


// ============================================================
// READY MESSAGE
// ============================================================

console.log(
    "TJWORK Firebase успешно инициализирован."
);