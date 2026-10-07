// ============================================================
// TJWORK — ADMIN.JS
// Админ-панель
// ============================================================

import {
    db,
    auth,
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from "./firebase.js";


// ============================================================
// НАСТРОЙКИ
// ============================================================

const ADMIN_EMAIL = "dovud0300@gmail.com";

const USERS_COLLECTION = "users";
const ADS_COLLECTION = "ads";

let adminUsersUnsubscribe = null;
let adminAdsUnsubscribe = null;


// ============================================================
// ПРОВЕРКА АДМИНА
// ============================================================

export function isAdmin(user = auth.currentUser) {

    if (!user) {
        return false;
    }

    return (
        String(user.email || "")
            .toLowerCase()
            .trim() ===
        ADMIN_EMAIL.toLowerCase()
    );
}


export function requireAdmin() {

    const user =
        auth.currentUser;

    if (!user) {

        if (
            typeof window.openAuthModal ===
            "function"
        ) {
            window.openAuthModal();
        }

        return false;
    }

    if (!isAdmin(user)) {

        showAdminMessage(
            "Доступ разрешён только администратору."
        );

        return false;
    }

    return true;
}


// ============================================================
// УВЕДОМЛЕНИЕ
// ============================================================

function showAdminMessage(message) {

    if (
        typeof window.showNotification ===
        "function"
    ) {
        window.showNotification(message);
    } else {
        alert(message);
    }
}


// ============================================================
// ЭКРАН АДМИНКИ
// ============================================================

export async function openAdminPage() {

    if (!requireAdmin()) {
        return;
    }


    if (
        typeof window.showPage ===
        "function"
    ) {
        window.showPage("admin");
    }


    await loadAdminProfile();
    await loadAdminStats();
    await loadAdminUsers();
    await loadAdminAds();
}


// ============================================================
// ПРОФИЛЬ АДМИНА
// ============================================================

export async function loadAdminProfile() {

    if (!requireAdmin()) {
        return;
    }


    const user =
        auth.currentUser;


    if (!user) {
        return;
    }


    let profile = {};


    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    USERS_COLLECTION,
                    user.uid
                )
            );


        if (snapshot.exists()) {
            profile =
                snapshot.data();
        }

    } catch (error) {

        console.error(
            "Ошибка загрузки профиля админа:",
            error
        );
    }


    const nickname =
        profile.nickname ||
        user.displayName ||
        "Администратор";


    const email =
        user.email ||
        profile.email ||
        ADMIN_EMAIL;


    const dob =
        profile.dob ||
        profile.birthDate ||
        "";


    const bio =
        profile.bio ||
        "Администратор TJWORK";


    setText(
        "adminProfileName",
        nickname
    );

    setText(
        "adminProfileEmail",
        email
    );

    setText(
        "adminProfileDob",
        dob
            ? formatAdminDate(dob)
            : "Не указано"
    );

    setText(
        "adminProfileBio",
        bio
    );


    const initial =
        getInitial(nickname);


    const initialElement =
        document.getElementById(
            "adminProfileInitial"
        );


    if (initialElement) {

        initialElement.textContent =
            initial;
    }


    const avatar =
        document.getElementById(
            "adminProfileAvatar"
        );


    if (avatar) {

        if (profile.photoURL) {

            avatar.innerHTML = `
                <img
                    src="${escapeHtml(
                        profile.photoURL
                    )}"
                    alt="Аватар"
                >
            `;

        } else if (user.photoURL) {

            avatar.innerHTML = `
                <img
                    src="${escapeHtml(
                        user.photoURL
                    )}"
                    alt="Аватар"
                >
            `;

        } else {

            avatar.innerHTML = `
                <span>
                    ${escapeHtml(initial)}
                </span>
            `;
        }
    }


    const badge =
        document.getElementById(
            "adminPublicBadge"
        );


    if (badge) {

        badge.textContent =
            "ADMIN";
    }
}


// ============================================================
// КНОПКА КОНТАКТА С АДМИНОМ
// ============================================================

export function openAdminContact() {

    const phone =
        "+992112504410";


    const url =
        `https://wa.me/${phone.replace(
            /\D/g,
            ""
        )}`;


    window.open(
        url,
        "_blank"
    );
}


// ============================================================
// СТАТИСТИКА
// ============================================================

export async function loadAdminStats() {

    if (!requireAdmin()) {
        return;
    }


    try {

        const usersSnapshot =
            await getDocs(
                collection(
                    db,
                    USERS_COLLECTION
                )
            );


        const adsSnapshot =
            await getDocs(
                collection(
                    db,
                    ADS_COLLECTION
                )
            );


        setText(
            "adminUsersCount",
            usersSnapshot.size
        );


        setText(
            "adminAdsCount",
            adsSnapshot.size
        );


        // Реальный онлайн-счётчик требует
        // отдельной presence-системы.
        // Поэтому не притворяемся, что Firestore
        // магическим образом знает, кто онлайн.

        setText(
            "adminOnlineCount",
            "—"
        );

    } catch (error) {

        console.error(
            "Ошибка статистики:",
            error
        );
    }
}


// ============================================================
// ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ
// ============================================================

export async function loadAdminUsers() {

    if (!requireAdmin()) {
        return;
    }


    const container =
        document.getElementById(
            "adminUsersList"
        );


    if (!container) {
        return;
    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    USERS_COLLECTION
                )
            );


        const users =
            snapshot.docs.map(
                item => ({
                    uid:
                        item.id,

                    ...item.data()
                })
            );


        renderAdminUsers(
            users
        );

    } catch (error) {

        console.error(
            "Ошибка загрузки пользователей:",
            error
        );


        container.innerHTML = `
            <div class="admin-empty-state">
                Не удалось загрузить пользователей.
            </div>
        `;
    }
}


// ============================================================
// ОТОБРАЖЕНИЕ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================

export function renderAdminUsers(
    users = []
) {

    const container =
        document.getElementById(
            "adminUsersList"
        );


    if (!container) {
        return;
    }


    if (!users.length) {

        container.innerHTML = `
            <div class="admin-empty-state">
                Пользователей пока нет.
            </div>
        `;

        return;
    }


    container.innerHTML =
        users.map(
            user => {

                const nickname =
                    user.nickname ||
                    user.displayName ||
                    "Пользователь";


                const email =
                    user.email ||
                    "Email не указан";


                const banned =
                    isUserBanned(user);


                return `
                    <div
                        class="admin-user-card"
                        data-user-id="${escapeHtml(
                            user.uid
                        )}"
                    >

                        <div class="admin-user-avatar">
                            ${
                                user.photoURL
                                    ? `
                                        <img
                                            src="${escapeHtml(
                                                user.photoURL
                                            )}"
                                            alt=""
                                        >
                                      `
                                    : `
                                        ${escapeHtml(
                                            getInitial(
                                                nickname
                                            )
                                        )}
                                      `
                            }
                        </div>

                        <div class="admin-user-info">

                            <strong>
                                ${escapeHtml(
                                    nickname
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    email
                                )}
                            </span>

                            <small>
                                ${
                                    banned
                                        ? "🚫 Заблокирован"
                                        : "🟢 Активен"
                                }
                            </small>

                        </div>

                        <div class="admin-user-actions">

                            ${
                                banned
                                    ? `
                                        <button
                                            type="button"
                                            onclick="adminUnbanUser('${escapeHtml(
                                                user.uid
                                            )}')"
                                        >
                                            Разблокировать
                                        </button>
                                      `
                                    : `
                                        <button
                                            type="button"
                                            onclick="adminBanUser('${escapeHtml(
                                                user.uid
                                            )}')"
                                        >
                                            Заблокировать
                                        </button>
                                      `
                            }

                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


// ============================================================
// ПРОВЕРКА БЛОКИРОВКИ
// ============================================================

function isUserBanned(user) {

    if (user.banned === true) {
        return true;
    }


    if (
        user.banUntil &&
        typeof user.banUntil.toDate ===
        "function"
    ) {

        return (
            user.banUntil
                .toDate()
                .getTime() > Date.now()
        );
    }


    return false;
}


// ============================================================
// БЛОКИРОВКА ПО UID
// ============================================================

export async function banUser(
    uid,
    duration = "permanent"
) {

    if (!requireAdmin()) {
        return;
    }


    if (!uid) {
        return;
    }


    if (
        uid ===
        auth.currentUser?.uid
    ) {

        showAdminMessage(
            "Нельзя заблокировать собственный аккаунт."
        );

        return;
    }


    try {

        const data = {
            banned: true,
            banDuration:
                duration,
            bannedAt:
                serverTimestamp()
        };


        if (
            duration !==
            "permanent"
        ) {

            const hours =
                Number(duration);


            if (
                Number.isFinite(hours) &&
                hours > 0
            ) {

                const until =
                    new Date(
                        Date.now() +
                        hours *
                        60 *
                        60 *
                        1000
                    );


                data.banUntil =
                    until;
            }
        }


        await updateDoc(
            doc(
                db,
                USERS_COLLECTION,
                uid
            ),
            data
        );


        showAdminMessage(
            duration === "permanent"
                ? "Пользователь заблокирован навсегда."
                : `Пользователь заблокирован на ${duration} ч.`
        );


        await loadAdminUsers();

    } catch (error) {

        console.error(
            "Ошибка блокировки:",
            error
        );

        showAdminMessage(
            "Не удалось заблокировать пользователя."
        );
    }
}


// ============================================================
// РАЗБЛОКИРОВКА
// ============================================================

export async function unbanUser(
    uid
) {

    if (!requireAdmin()) {
        return;
    }


    if (!uid) {
        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                USERS_COLLECTION,
                uid
            ),
            {
                banned:
                    false,

                banDuration:
                    null,

                banUntil:
                    null,

                unbannedAt:
                    serverTimestamp()
            }
        );


        showAdminMessage(
            "Пользователь разблокирован."
        );


        await loadAdminUsers();

    } catch (error) {

        console.error(
            "Ошибка разблокировки:",
            error
        );

        showAdminMessage(
            "Не удалось разблокировать пользователя."
        );
    }
}


// ============================================================
// БЛОКИРОВКА ПО EMAIL
// Используется текущим HTML
// ============================================================

export async function adminBanByEmail() {

    if (!requireAdmin()) {
        return;
    }


    const emailInput =
        document.getElementById(
            "adminBanEmail"
        );


    const durationInput =
        document.getElementById(
            "adminBanDuration"
        );


    if (!emailInput) {
        return;
    }


    const email =
        emailInput.value
            .trim()
            .toLowerCase();


    if (!email) {

        showAdminMessage(
            "Введите email пользователя."
        );

        return;
    }


    try {

        const usersQuery =
            query(
                collection(
                    db,
                    USERS_COLLECTION
                ),
                where(
                    "email",
                    "==",
                    email
                )
            );


        const snapshot =
            await getDocs(
                usersQuery
            );


        if (
            snapshot.empty
        ) {

            showAdminMessage(
                "Пользователь с таким email не найден."
            );

            return;
        }


        const userDoc =
            snapshot.docs[0];


        let duration =
            "permanent";


        if (durationInput) {

            const value =
                durationInput.value
                    .trim();


            if (
                value &&
                value !==
                "permanent"
            ) {
                duration =
                    Number(value);
            }
        }


        await banUser(
            userDoc.id,
            duration
        );


        emailInput.value = "";

    } catch (error) {

        console.error(
            "Ошибка блокировки по email:",
            error
        );

        showAdminMessage(
            "Не удалось выполнить блокировку."
        );
    }
}


// ============================================================
// ЗАГРУЗКА ОБЪЯВЛЕНИЙ
// ============================================================

export async function loadAdminAds() {

    if (!requireAdmin()) {
        return;
    }


    const container =
        document.getElementById(
            "adminAdsList"
        );


    if (!container) {
        return;
    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    ADS_COLLECTION
                )
            );


        const ads =
            snapshot.docs.map(
                item => ({
                    id:
                        item.id,

                    ...item.data()
                })
            );


        renderAdminAds(
            ads
        );

    } catch (error) {

        console.error(
            "Ошибка загрузки объявлений:",
            error
        );


        container.innerHTML = `
            <div class="admin-empty-state">
                Не удалось загрузить объявления.
            </div>
        `;
    }
}


// ============================================================
// ОТОБРАЖЕНИЕ ОБЪЯВЛЕНИЙ
// ============================================================

export function renderAdminAds(
    ads = []
) {

    const container =
        document.getElementById(
            "adminAdsList"
        );


    if (!container) {
        return;
    }


    if (!ads.length) {

        container.innerHTML = `
            <div class="admin-empty-state">
                Объявлений пока нет.
            </div>
        `;

        return;
    }


    container.innerHTML =
        ads.map(
            ad => {

                return `
                    <div
                        class="admin-ad-card"
                        data-ad-id="${escapeHtml(
                            ad.id
                        )}"
                    >

                        <div class="admin-ad-info">

                            <strong>
                                ${escapeHtml(
                                    ad.title ||
                                    "Без названия"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    ad.authorNickname ||
                                    ad.authorEmail ||
                                    "Пользователь"
                                )}
                            </span>

                            <small>
                                ${escapeHtml(
                                    ad.section ||
                                    ""
                                )}
                                ${
                                    ad.category
                                        ? " • " +
                                          escapeHtml(
                                              ad.category
                                          )
                                        : ""
                                }
                            </small>

                        </div>

                        <button
                            type="button"
                            onclick="adminDeleteAd('${escapeHtml(
                                ad.id
                            )}')"
                        >
                            Удалить
                        </button>

                    </div>
                `;
            }
        )
        .join("");
}


// ============================================================
// УДАЛЕНИЕ ОБЪЯВЛЕНИЯ
// ============================================================

export async function deleteAdminAd(
    adId
) {

    if (!requireAdmin()) {
        return;
    }


    if (!adId) {
        return;
    }


    const confirmed =
        window.confirm(
            "Удалить это объявление?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                ADS_COLLECTION,
                adId
            )
        );


        showAdminMessage(
            "Объявление удалено."
        );


        await loadAdminAds();
        await loadAdminStats();

    } catch (error) {

        console.error(
            "Ошибка удаления объявления:",
            error
        );

        showAdminMessage(
            "Не удалось удалить объявление."
        );
    }
}


// ============================================================
// ЧАТ С ПОЛЬЗОВАТЕЛЕМ
// ============================================================

export async function startAdminChat(
    uid
) {

    if (!requireAdmin()) {
        return;
    }


    if (!uid) {
        return;
    }


    try {

        const userSnapshot =
            await getDoc(
                doc(
                    db,
                    USERS_COLLECTION,
                    uid
                )
            );


        if (!userSnapshot.exists()) {

            showAdminMessage(
                "Пользователь не найден."
            );

            return;
        }


        const userData =
            userSnapshot.data();


        if (
            typeof window.createChat !==
            "function"
        ) {

            showAdminMessage(
                "Модуль чата ещё не загружен."
            );

            return;
        }


        const chatId =
            await window.createChat(
                "admin",
                uid,
                userData.nickname ||
                userData.email ||
                "Пользователь",
                "Связь с администрацией"
            );


        if (
            typeof window.openExistingChat ===
            "function"
        ) {

            await window.openExistingChat(
                chatId
            );
        }

    } catch (error) {

        console.error(
            "Ошибка открытия админ-чата:",
            error
        );

        showAdminMessage(
            "Не удалось открыть чат."
        );
    }
}


// ============================================================
// ОБНОВЛЕНИЕ АДМИНКИ
// ============================================================

export async function refreshAdminPanel() {

    if (!requireAdmin()) {
        return;
    }


    await Promise.all([
        loadAdminProfile(),
        loadAdminStats(),
        loadAdminUsers(),
        loadAdminAds()
    ]);
}


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent =
            value;
    }
}


function getInitial(
    name
) {

    const value =
        String(
            name ||
            "A"
        ).trim();


    return (
        value.charAt(0)
            .toUpperCase() ||
        "A"
    );
}


function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function formatAdminDate(
    value
) {

    if (!value) {
        return "Не указано";
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value
            .toDate()
            .toLocaleDateString(
                "ru-RU"
            );
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }


    return date.toLocaleDateString(
        "ru-RU"
    );
}


// ============================================================
// GLOBAL FUNCTIONS
// Совместимость с index.html
// ============================================================

window.isAdmin =
    isAdmin;

window.openAdminPage =
    openAdminPage;

window.loadAdminProfile =
    loadAdminProfile;

window.loadAdminStats =
    loadAdminStats;

window.loadAdminUsers =
    loadAdminUsers;

window.loadAdminAds =
    loadAdminAds;

window.renderAdminUsers =
    renderAdminUsers;

window.renderAdminAds =
    renderAdminAds;

window.adminBanByEmail =
    adminBanByEmail;

window.adminBanUser =
    banUser;

window.adminUnbanUser =
    unbanUser;

window.adminDeleteAd =
    deleteAdminAd;

window.startAdminChat =
    startAdminChat;

window.openAdminContact =
    openAdminContact;

window.refreshAdminPanel =
    refreshAdminPanel;


console.log(
    "TJWORK Admin module загружен."
);