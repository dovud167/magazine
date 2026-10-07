// ============================================================
// TJWORK — AUTH.JS
// Авторизация, регистрация, Google / Facebook / Apple,
// телефон, выход из аккаунта
// ============================================================

import {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    loginWithSocial,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    handleFirebaseError
} from "./firebase.js";


// ============================================================
// НАСТРОЙКИ
// ============================================================

const ADMIN_EMAIL = "dovud0300@gmail.com";

let currentAuthMode = "login";
let currentAuthMethod = "email";

let confirmationResult = null;
let recaptchaVerifier = null;


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


function showAuthError(message) {

    const errorElement = getElement("authError");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = message || "";
    errorElement.classList.remove("hidden");
}


function clearAuthError() {

    const errorElement = getElement("authError");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = "";
    errorElement.classList.add("hidden");
}


function setButtonLoading(button, loading, normalText) {

    if (!button) {
        return;
    }

    if (loading) {

        button.disabled = true;
        button.dataset.originalText =
            button.textContent;

        button.textContent = "Подождите...";

    } else {

        button.disabled = false;

        button.textContent =
            normalText ||
            button.dataset.originalText ||
            "Войти";
    }
}


// ============================================================
// ОТКРЫТИЕ AUTH MODAL
// ============================================================

export function openAuthModal() {

    const modal = getElement("authModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");

    document.body.classList.add("overflow-hidden");

    clearAuthError();

    updateAuthInterface();
}


export function closeAuthModal() {

    const modal = getElement("authModal");

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");

    document.body.classList.remove("overflow-hidden");

    clearAuthError();
}


// ============================================================
// ПЕРЕКЛЮЧЕНИЕ EMAIL / PHONE
// ============================================================

export function switchAuthMethod(method) {

    currentAuthMethod = method;

    clearAuthError();

    const emailTab = getElement("authTabEmail");
    const phoneTab = getElement("authTabPhone");

    const emailFields = getElement("emailAuthFields");
    const phoneFields = getElement("phoneAuthFields");

    if (method === "phone") {

        if (emailFields) {
            emailFields.classList.add("hidden");
        }

        if (phoneFields) {
            phoneFields.classList.remove("hidden");
        }

        if (emailTab) {
            emailTab.classList.remove("active");
        }

        if (phoneTab) {
            phoneTab.classList.add("active");
        }

    } else {

        if (emailFields) {
            emailFields.classList.remove("hidden");
        }

        if (phoneFields) {
            phoneFields.classList.add("hidden");
        }

        if (emailTab) {
            emailTab.classList.add("active");
        }

        if (phoneTab) {
            phoneTab.classList.remove("active");
        }
    }
}


// ============================================================
// LOGIN / REGISTER MODE
// ============================================================

export function toggleAuthMode() {

    currentAuthMode =
        currentAuthMode === "login"
            ? "register"
            : "login";

    clearAuthError();

    updateAuthInterface();
}


function updateAuthInterface() {

    const title = getElement("authTitle");
    const submitButton = getElement("authSubmitBtn");
    const toggleText = getElement("authToggleText");

    if (currentAuthMode === "register") {

        if (title) {
            title.textContent = "Регистрация";
        }

        if (submitButton) {
            submitButton.textContent = "Зарегистрироваться";
        }

        if (toggleText) {
            toggleText.textContent =
                "Уже есть аккаунт? Войти";
        }

    } else {

        if (title) {
            title.textContent = "Вход";
        }

        if (submitButton) {
            submitButton.textContent = "Войти";
        }

        if (toggleText) {
            toggleText.textContent =
                "Нет аккаунта? Зарегистрироваться";
        }
    }

    switchAuthMethod(currentAuthMethod);
}


// ============================================================
// EMAIL AUTH
// ============================================================

export async function handleAuthEmail() {

    clearAuthError();

    const emailInput = getElement("authEmail");
    const passwordInput = getElement("authPassword");
    const button = getElement("authSubmitBtn");

    const email =
        emailInput?.value.trim() || "";

    const password =
        passwordInput?.value || "";

    if (!email) {

        showAuthError(
            "Введите email."
        );

        return;
    }

    if (!password) {

        showAuthError(
            "Введите пароль."
        );

        return;
    }

    if (password.length < 6) {

        showAuthError(
            "Пароль должен содержать минимум 6 символов."
        );

        return;
    }

    setButtonLoading(
        button,
        true
    );

    try {

        if (currentAuthMode === "register") {

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            showNotificationSafe(
                "Аккаунт успешно создан."
            );

        } else {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            showNotificationSafe(
                "Вы успешно вошли."
            );
        }

        closeAuthModal();

    } catch (error) {

        console.error(
            "Ошибка авторизации:",
            error
        );

        showAuthError(
            handleFirebaseError(error)
        );

    } finally {

        setButtonLoading(
            button,
            false,
            currentAuthMode === "register"
                ? "Зарегистрироваться"
                : "Войти"
        );
    }
}


// ============================================================
// PHONE AUTH
// ============================================================

function initializeRecaptcha() {

    if (recaptchaVerifier) {
        return recaptchaVerifier;
    }

    const container =
        getElement("recaptcha-container");

    if (!container) {
        throw new Error(
            "Не найден recaptcha-container."
        );
    }

    recaptchaVerifier =
        new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
                size: "invisible",
                callback: () => {
                    console.log(
                        "reCAPTCHA успешно пройден."
                    );
                },
                "expired-callback": () => {
                    console.log(
                        "reCAPTCHA истёк."
                    );

                    recaptchaVerifier = null;
                }
            }
        );

    return recaptchaVerifier;
}


export async function sendPhoneVerificationCode() {

    clearAuthError();

    const phoneInput =
        getElement("authPhoneInput");

    const phone =
        phoneInput?.value.trim() || "";

    if (!phone) {

        showAuthError(
            "Введите номер телефона."
        );

        return;
    }

    try {

        const verifier =
            initializeRecaptcha();

        confirmationResult =
            await signInWithPhoneNumber(
                auth,
                phone,
                verifier
            );

        const smsContainer =
            getElement("smsCodeContainer");

        if (smsContainer) {
            smsContainer.classList.remove("hidden");
        }

        showNotificationSafe(
            "Код отправлен на ваш телефон."
        );

    } catch (error) {

        console.error(
            "Ошибка отправки SMS:",
            error
        );

        showAuthError(
            handleFirebaseError(error)
        );

        if (recaptchaVerifier) {

            try {
                recaptchaVerifier.clear();
            } catch (e) {
                console.warn(e);
            }

            recaptchaVerifier = null;
        }
    }
}


// ============================================================
// ПОДТВЕРЖДЕНИЕ SMS
// ============================================================

export async function verifyPhoneCode() {

    clearAuthError();

    const codeInput =
        getElement("authSmsCode");

    const code =
        codeInput?.value.trim() || "";

    if (!confirmationResult) {

        showAuthError(
            "Сначала запросите код подтверждения."
        );

        return;
    }

    if (!code) {

        showAuthError(
            "Введите код из SMS."
        );

        return;
    }

    try {

        await confirmationResult.confirm(
            code
        );

        showNotificationSafe(
            "Телефон успешно подтверждён."
        );

        closeAuthModal();

        confirmationResult = null;

    } catch (error) {

        console.error(
            "Ошибка подтверждения SMS:",
            error
        );

        showAuthError(
            handleFirebaseError(error)
        );
    }
}


// ============================================================
// SOCIAL LOGIN
// ============================================================

export async function handleSocialLogin(
    providerName
) {

    clearAuthError();

    try {

        await loginWithSocial(
            providerName
        );

        showNotificationSafe(
            "Вы успешно вошли."
        );

        closeAuthModal();

    } catch (error) {

        console.error(
            "Ошибка социальной авторизации:",
            error
        );

        showAuthError(
            handleFirebaseError(error)
        );
    }
}


// ============================================================
// LOGOUT
// ============================================================

export async function logoutUser() {

    try {

        await signOut(auth);

        showNotificationSafe(
            "Вы вышли из аккаунта."
        );

        closeAuthModal();

        if (
            typeof window.showPage ===
            "function"
        ) {
            window.showPage("home");
        }

    } catch (error) {

        console.error(
            "Ошибка выхода:",
            error
        );

        showAuthError(
            handleFirebaseError(error)
        );
    }
}


// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================

export function getCurrentAuthUser() {
    return auth.currentUser;
}


export function isAuthenticated() {
    return !!auth.currentUser;
}


// ============================================================
// HEADER AUTH BUTTON
// ============================================================

export function updateHeaderAuthButton(
    user = auth.currentUser
) {

    const container =
        getElement("headerAuthBtnContainer");

    if (!container) {
        return;
    }

    if (user) {

        container.innerHTML = `
            <button
                type="button"
                onclick="openProfile()"
                class="tj-header-auth-btn"
            >
                Профиль
            </button>
        `;

    } else {

        container.innerHTML = `
            <button
                type="button"
                onclick="openAuthModal()"
                class="tj-header-auth-btn"
            >
                Войти
            </button>
        `;
    }
}


// ============================================================
// AUTH STATE
// ============================================================

export function initAuthListener(
    callback
) {

    return onAuthStateChanged(
        auth,
        async (user) => {

            updateHeaderAuthButton(
                user
            );

            if (typeof callback === "function") {
                await callback(user);
            }
        }
    );
}


// ============================================================
// УВЕДОМЛЕНИЕ
// ============================================================

function showNotificationSafe(
    message
) {

    if (
        typeof window.showNotification ===
        "function"
    ) {

        window.showNotification(
            message
        );

        return;
    }

    console.log(
        "TJWORK:",
        message
    );
}


// ============================================================
// GLOBAL FUNCTIONS
// Совместимость с onclick="" в index.html
// ============================================================

window.openAuthModal =
    openAuthModal;

window.closeAuthModal =
    closeAuthModal;

window.handleAuthEmail =
    handleAuthEmail;

window.switchAuthMethod =
    switchAuthMethod;

window.sendPhoneVerificationCode =
    sendPhoneVerificationCode;

window.verifyPhoneCode =
    verifyPhoneCode;

window.toggleAuthMode =
    toggleAuthMode;

window.loginWithSocial =
    handleSocialLogin;

window.handleLogout =
    logoutUser;

window.updateHeaderAuthButton =
    updateHeaderAuthButton;


// ============================================================
// START
// ============================================================

console.log(
    "TJWORK Auth module загружен."
);