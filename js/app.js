// ============================================================
// TJWORK — APP.JS
// Главный файл приложения
// ============================================================

import {
    auth,
    onAuthStateChanged,
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp
} from "./firebase.js";

import {
    initAuthListener,
    openAuthModal,
    closeAuthModal,
    updateHeaderAuthButton,
    logoutUser
} from "./auth.js";

import {
    initAds,
    loadAds,
    applyFilters,
    openAdDetails
} from "./ads.js";

import {
    initProfile,
    loadCurrentProfile,
    openEditProfileModal,
    closeEditProfileModal,
    saveProfileChanges,
    switchProfileTab
} from "./profile.js";

import {
    initChat,
    sendChatMessage,
    openAdChat,
    openExistingChat,
    closeChat,
    loadUserChats
} from "./chat.js";

import {
    openAdminPage,
    loadAdminProfile,
    loadAdminStats,
    loadAdminUsers,
    loadAdminAds,
    adminBanByEmail,
    startAdminChat,
    isAdmin
} from "./admin.js";


// ============================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================

let currentPage = "home";
let currentMode = "work";


// ============================================================
// DOM
// ============================================================

function $(id) {
    return document.getElementById(id);
}


// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================

window.showNotification = function (message) {

    const stack =
        $("tjworkToastStack");

    if (!stack) {
        console.log("TJWORK:", message);
        return;
    }


    const toast =
        document.createElement("div");

    toast.className =
        "tjwork-toast";


    toast.textContent =
        message;


    stack.appendChild(toast);


    setTimeout(() => {

        toast.classList.add(
            "hide"
        );

        setTimeout(() => {

            if (toast.parentNode) {
                toast.parentNode.removeChild(
                    toast
                );
            }

        }, 300);

    }, 3000);
};


// ============================================================
// ПОДТВЕРЖДЕНИЕ
// ============================================================

window.showTJWorkConfirm = function (
    title,
    text,
    callback
) {

    const overlay =
        $("tjworkConfirmOverlay");

    const titleElement =
        $("tjworkConfirmTitle");

    const textElement =
        $("tjworkConfirmText");

    const okButton =
        $("tjworkConfirmOk");

    const cancelButton =
        $("tjworkConfirmCancel");


    if (!overlay) {

        if (
            window.confirm(
                text || title
            )
        ) {

            if (
                typeof callback ===
                "function"
            ) {
                callback();
            }
        }

        return;
    }


    if (titleElement) {
        titleElement.textContent =
            title || "Подтверждение";
    }


    if (textElement) {
        textElement.textContent =
            text || "";
    }


    overlay.classList.remove(
        "hidden"
    );


    const close =
        () => {

            overlay.classList.add(
                "hidden"
            );

            if (okButton) {
                okButton.onclick = null;
            }

            if (cancelButton) {
                cancelButton.onclick = null;
            }
        };


    if (cancelButton) {

        cancelButton.onclick =
            close;
    }


    if (okButton) {

        okButton.onclick =
            () => {

                close();

                if (
                    typeof callback ===
                    "function"
                ) {
                    callback();
                }
            };
    }
};


// ============================================================
// ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
// ============================================================

window.showPage = function (
    pageName
) {

    const pages = [
        "home",
        "catalog",
        "section-detail",
        "category-detail",
        "useful",
        "help",
        "profile",
        "messages",
        "admin"
    ];


    pages.forEach(
        name => {

            const page =
                $(
                    `page-${name}`
                );

            if (!page) {
                return;
            }


            if (
                name ===
                pageName
            ) {

                page.classList.remove(
                    "hidden"
                );

            } else {

                page.classList.add(
                    "hidden"
                );
            }
        }
    );


    currentPage =
        pageName;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    closeBurgerMenu();


    if (
        pageName ===
        "profile"
    ) {

        loadCurrentProfile();
    }


    if (
        pageName ===
        "messages"
    ) {

        loadUserChats();
    }


    if (
        pageName ===
        "admin"
    ) {

        openAdminPage();
    }
};


// ============================================================
// BURGER MENU
// ============================================================

function closeBurgerMenu() {

    const menu =
        $("burgerMenu");

    if (!menu) {
        return;
    }


    menu.classList.remove(
        "active"
    );

    menu.classList.remove(
        "open"
    );
}


window.toggleBurgerMenu =
    function () {

        const menu =
            $("burgerMenu");

        if (!menu) {
            return;
        }


        menu.classList.toggle(
            "active"
        );

        menu.classList.toggle(
            "open"
        );
    };


// ============================================================
// РЕЖИМЫ: РАБОТА / РАБОТНИК
// ============================================================

window.setMode =
    function (mode) {

        currentMode =
            mode;


        const workButton =
            $("modeWorkBtn");

        const workerButton =
            $("modeWorkerBtn");


        if (workButton) {

            workButton.classList.toggle(
                "active",
                mode === "work"
            );
        }


        if (workerButton) {

            workerButton.classList.toggle(
                "active",
                mode === "worker"
            );
        }


        const badge =
            $("bannerBadge");

        const title =
            $("bannerTitle");

        const desc =
            $("bannerDesc");


        if (mode === "worker") {

            if (badge) {
                badge.textContent =
                    "ИЩЕТЕ РАБОТУ?";
            }

            if (title) {
                title.textContent =
                    "Найдите работу в Таджикистане";
            }

            if (desc) {
                desc.textContent =
                    "Выбирайте подходящие вакансии и связывайтесь с работодателями.";
            }

        } else {

            if (badge) {
                badge.textContent =
                    "НУЖЕН РАБОТНИК?";
            }

            if (title) {
                title.textContent =
                    "Найдите подходящего специалиста";
            }

            if (desc) {
                desc.textContent =
                    "Разместите объявление и найдите исполнителя для вашей задачи.";
            }
        }


        if (
            typeof window.applyFilters ===
            "function"
        ) {
            window.applyFilters();
        }
    };


window.setModalMode =
    function (mode) {

        const workButton =
            $("modalModeWorkBtn");

        const workerButton =
            $("modalModeWorkerBtn");


        if (workButton) {

            workButton.classList.toggle(
                "active",
                mode === "work"
            );
        }


        if (workerButton) {

            workerButton.classList.toggle(
                "active",
                mode === "worker"
            );
        }
    };


// ============================================================
// СОЗДАНИЕ ОБЪЯВЛЕНИЯ
// ============================================================

window.openCreateModal =
    function () {

        const user =
            auth.currentUser;


        if (!user) {

            showNotification(
                "Сначала войдите в аккаунт."
            );

            openAuthModal();

            return;
        }


        const modal =
            $("createModal");


        if (!modal) {
            return;
        }


        modal.classList.remove(
            "hidden"
        );


        if (
            typeof window.setModalMode ===
            "function"
        ) {
            window.setModalMode(
                currentMode
            );
        }
    };


window.closeCreateModal =
    function () {

        const modal =
            $("createModal");

        if (modal) {

            modal.classList.add(
                "hidden"
            );
        }
    };


// ============================================================
// ФИЛЬТРЫ
// ============================================================

window.applyFilters =
    applyFilters;


window.resetFilters =
    function () {

        const ids = [
            "searchInput",
            "typeSelect",
            "sectionSelect",
            "catSelect",
            "subjectSelect",
            "regionProv",
            "regionDist",
            "regionVill"
        ];


        ids.forEach(
            id => {

                const element =
                    $(id);

                if (element) {
                    element.value = "";
                }
            }
        );


        applyFilters();
    };


// ============================================================
// ПРОФИЛЬ
// ============================================================

window.openEditProfileModal =
    openEditProfileModal;

window.closeEditProfileModal =
    closeEditProfileModal;

window.saveProfileChanges =
    saveProfileChanges;

window.switchProfileTab =
    switchProfileTab;


// ============================================================
// ВЫХОД
// ============================================================

window.handleLogout =
    async function () {

        try {

            await logoutUser();

            showNotification(
                "Вы вышли из аккаунта."
            );


            window.showPage(
                "home"
            );

        } catch (error) {

            console.error(
                "Ошибка выхода:",
                error
            );

            showNotification(
                "Не удалось выйти из аккаунта."
            );
        }
    };


// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================

window.openAuthModal =
    openAuthModal;

window.closeAuthModal =
    closeAuthModal;


// ============================================================
// ЧАТ
// ============================================================

window.sendChatMessage =
    sendChatMessage;

window.openAdChat =
    openAdChat;

window.openExistingChat =
    openExistingChat;

window.closeChat =
    closeChat;


// ============================================================
// АДМИНКА
// ============================================================

window.openAdminPage =
    openAdminPage;

window.adminBanByEmail =
    adminBanByEmail;

window.startAdminChat =
    startAdminChat;


// ============================================================
// ЯЗЫК
// ============================================================

window.changeLanguage =
    function (language) {

        localStorage.setItem(
            "tjwork_language",
            language
        );


        const label =
            $("langLabel");


        if (label) {

            label.textContent =
                language === "tj"
                    ? "Тоҷикӣ"
                    : "Русский";
        }


        showNotification(
            language === "tj"
                ? "Тоҷикӣ интихоб шуд."
                : "Выбран русский язык."
        );
    };


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function updateNavigation() {

    const user =
        auth.currentUser;


    const chatLinks = [
        $("headerChatLink"),
        $("burgerChatLink")
    ];


    const adminLinks = [
        $("headerAdminLink"),
        $("burgerAdminLink")
    ];


    chatLinks.forEach(
        element => {

            if (!element) {
                return;
            }


            if (user) {

                element.classList.remove(
                    "hidden"
                );

            } else {

                element.classList.add(
                    "hidden"
                );
            }
        }
    );


    adminLinks.forEach(
        element => {

            if (!element) {
                return;
            }


            if (
                user &&
                isAdmin(user)
            ) {

                element.classList.remove(
                    "hidden"
                );

            } else {

                element.classList.add(
                    "hidden"
                );
            }
        }
    );
}


// ============================================================
// АВТОРИЗАЦИЯ: СОСТОЯНИЕ
// ============================================================

function startAuthStateListener() {

    onAuthStateChanged(
        auth,
        async user => {

            updateHeaderAuthButton();

            updateNavigation();


            if (user) {

                try {

                    await loadCurrentProfile();

                } catch (error) {

                    console.error(
                        "Ошибка загрузки профиля:",
                        error
                    );
                }


                try {

                    await loadUserChats();

                } catch (error) {

                    console.error(
                        "Ошибка загрузки чатов:",
                        error
                    );
                }


                if (
                    isAdmin(user)
                ) {

                    console.log(
                        "TJWORK: администратор вошёл."
                    );
                }

            } else {

                updateNavigation();
            }
        }
    );
}


// ============================================================
// ОБРАБОТКА КЛАВИАТУРЫ
// ============================================================

function initKeyboardHandlers() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeAuthModal();

                closeCreateModal();

                closeEditProfileModal();

                closeBurgerMenu();
            }
        }
    );
}


// ============================================================
// ОБРАБОТКА КЛИКА ПО ВНЕШНЕЙ ОБЛАСТИ
// ============================================================

function initModalHandlers() {

    document.addEventListener(
        "click",
        event => {

            const createModal =
                $("createModal");


            if (
                createModal &&
                event.target ===
                createModal
            ) {

                closeCreateModal();
            }


            const authModal =
                $("authModal");


            if (
                authModal &&
                event.target ===
                authModal
            ) {

                closeAuthModal();
            }


            const editModal =
                $("editProfileModal");


            if (
                editModal &&
                event.target ===
                editModal
            ) {

                closeEditProfileModal();
            }
        }
    );
}


// ============================================================
// ССЫЛКИ HEADER
// ============================================================

function initHeaderNavigation() {

    const chatLink =
        $("headerChatLink");


    if (chatLink) {

        chatLink.addEventListener(
            "click",
            event => {

                event.preventDefault();

                if (
                    !auth.currentUser
                ) {

                    openAuthModal();

                    return;
                }

                window.showPage(
                    "messages"
                );
            }
        );
    }


    const burgerChat =
        $("burgerChatLink");


    if (burgerChat) {

        burgerChat.addEventListener(
            "click",
            event => {

                event.preventDefault();

                if (
                    !auth.currentUser
                ) {

                    openAuthModal();

                    return;
                }

                window.showPage(
                    "messages"
                );
            }
        );
    }


    const adminLink =
        $("headerAdminLink");


    if (adminLink) {

        adminLink.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openAdminPage();
            }
        );
    }


    const burgerAdmin =
        $("burgerAdminLink");


    if (burgerAdmin) {

        burgerAdmin.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openAdminPage();
            }
        );
    }
}


// ============================================================
// ПОИСК ENTER
// ============================================================

function initSearch() {

    const search =
        $("searchInput");


    if (!search) {
        return;
    }


    search.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                applyFilters();
            }
        }
    );
}


// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

async function initApp() {

    console.log(
        "TJWORK запускается..."
    );


    // --------------------------------------------------------
    // Базовые модули
    // --------------------------------------------------------

    try {
        initAuthListener();
    } catch (error) {
        console.error(
            "Ошибка auth.js:",
            error
        );
    }


    try {
        initAds();
    } catch (error) {
        console.error(
            "Ошибка ads.js:",
            error
        );
    }


    try {
        initProfile();
    } catch (error) {
        console.error(
            "Ошибка profile.js:",
            error
        );
    }


    try {
        initChat();
    } catch (error) {
        console.error(
            "Ошибка chat.js:",
            error
        );
    }


    // --------------------------------------------------------
    // UI
    // --------------------------------------------------------

    initKeyboardHandlers();

    initModalHandlers();

    initHeaderNavigation();

    initSearch();

    startAuthStateListener();


    // --------------------------------------------------------
    // Главная страница
    // --------------------------------------------------------

    window.showPage(
        "home"
    );


    window.setMode(
        "work"
    );


    // --------------------------------------------------------
    // Загрузка объявлений
    // --------------------------------------------------------

    try {

        await loadAds();

    } catch (error) {

        console.error(
            "Ошибка загрузки объявлений:",
            error
        );
    }


    // --------------------------------------------------------
    // Язык
    // --------------------------------------------------------

    const savedLanguage =
        localStorage.getItem(
            "tjwork_language"
        );


    if (savedLanguage) {

        const label =
            $("langLabel");

        if (label) {

            label.textContent =
                savedLanguage === "tj"
                    ? "Тоҷикӣ"
                    : "Русский";
        }
    }


    // --------------------------------------------------------
    // Готово
    // --------------------------------------------------------

    console.log(
        "TJWORK полностью загружен."
    );
}


// ============================================================
// ЗАПУСК
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initApp,
        {
            once: true
        }
    );

} else {

    initApp();
}