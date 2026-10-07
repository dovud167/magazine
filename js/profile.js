// ============================================================
// TJWORK — PROFILE.JS
// Профиль пользователя, настройки, аватар,
// дата рождения, телефон, описание и публичный профиль
// ============================================================

import {
    db,
    auth,
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL
} from "./firebase.js";


// ============================================================
// НАСТРОЙКИ
// ============================================================

const USERS_COLLECTION = "users";
const PUBLIC_PROFILES_COLLECTION = "publicProfiles";
const ADS_COLLECTION = "ads";

const ADMIN_EMAIL = "dovud0300@gmail.com";

const LOCAL_PROFILE_KEY =
    "tjwork_user_profiles";


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


function getCurrentUser() {
    return auth.currentUser;
}


function showNotificationSafe(message) {

    if (
        typeof window.showNotification ===
        "function"
    ) {
        window.showNotification(message);
    } else {
        console.log("TJWORK:", message);
    }
}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getInitial(name) {

    const text =
        String(name || "П")
            .trim();

    return (
        text.charAt(0)
            .toUpperCase() || "П"
    );
}


// ============================================================
// LOCAL PROFILE
// ============================================================

function getLocalProfiles() {

    try {

        return JSON.parse(
            localStorage.getItem(
                LOCAL_PROFILE_KEY
            ) || "{}"
        );

    } catch (error) {

        console.warn(
            "Ошибка localStorage:",
            error
        );

        return {};
    }
}


function saveLocalProfiles(
    profiles
) {

    try {

        localStorage.setItem(
            LOCAL_PROFILE_KEY,
            JSON.stringify(profiles)
        );

    } catch (error) {

        console.warn(
            "Не удалось сохранить профиль локально:",
            error
        );
    }
}


// ============================================================
// ПОЛУЧЕНИЕ ПРОФИЛЯ
// ============================================================

export async function getUserProfile(
    uid = null
) {

    const user =
        getCurrentUser();

    const userId =
        uid || user?.uid;

    if (!userId) {
        return null;
    }


    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    USERS_COLLECTION,
                    userId
                )
            );

        if (snapshot.exists()) {

            return {
                uid: userId,
                ...snapshot.data()
            };
        }

    } catch (error) {

        console.error(
            "Ошибка получения профиля:",
            error
        );
    }


    const localProfiles =
        getLocalProfiles();

    if (localProfiles[userId]) {

        return {
            uid: userId,
            ...localProfiles[userId]
        };
    }


    return {
        uid: userId,

        nickname:
            user?.displayName ||
            user?.email?.split("@")[0] ||
            "Пользователь",

        email:
            user?.email || "",

        phone:
            user?.phoneNumber || "",

        dob: "",

        bio: "",

        photoURL:
            user?.photoURL || "",

        createdAt: null
    };
}


// ============================================================
// СОЗДАНИЕ / ИНИЦИАЛИЗАЦИЯ ПРОФИЛЯ
// ============================================================

export async function initializeUserAccount(
    user = getCurrentUser()
) {

    if (!user) {
        return null;
    }

    const existing =
        await getUserProfile(
            user.uid
        );


    const profile = {

        uid: user.uid,

        email:
            user.email || "",

        nickname:
            existing?.nickname ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Пользователь",

        phone:
            existing?.phone ||
            user.phoneNumber ||
            "",

        dob:
            existing?.dob || "",

        bio:
            existing?.bio || "",

        photoURL:
            existing?.photoURL ||
            user.photoURL ||
            "",

        createdAt:
            existing?.createdAt ||
            serverTimestamp(),

        updatedAt:
            serverTimestamp()
    };


    await setDoc(
        doc(
            db,
            USERS_COLLECTION,
            user.uid
        ),
        profile,
        {
            merge: true
        }
    );


    const localProfiles =
        getLocalProfiles();

    localProfiles[user.uid] =
        {
            ...localProfiles[user.uid],
            ...profile,
            createdAt: undefined,
            updatedAt: undefined
        };

    saveLocalProfiles(
        localProfiles
    );


    return profile;
}


// ============================================================
// СОХРАНЕНИЕ ПРОФИЛЯ
// ============================================================

export async function saveUserProfile(
    profileData
) {

    const user =
        getCurrentUser();

    if (!user) {

        throw new Error(
            "Необходимо войти в аккаунт."
        );
    }


    const current =
        await getUserProfile(
            user.uid
        );


    const profile = {

        uid: user.uid,

        email:
            user.email || "",

        nickname:
            profileData.nickname ??
            current?.nickname ??
            "Пользователь",

        dob:
            profileData.dob ??
            current?.dob ??
            "",

        phone:
            profileData.phone ??
            current?.phone ??
            "",

        bio:
            profileData.bio ??
            current?.bio ??
            "",

        photoURL:
            profileData.photoURL ??
            current?.photoURL ??
            user.photoURL ??
            "",

        updatedAt:
            serverTimestamp()
    };


    await setDoc(
        doc(
            db,
            USERS_COLLECTION,
            user.uid
        ),
        profile,
        {
            merge: true
        }
    );


    const localProfiles =
        getLocalProfiles();

    localProfiles[user.uid] =
        {
            ...localProfiles[user.uid],
            ...profile,
            updatedAt: undefined
        };

    saveLocalProfiles(
        localProfiles
    );


    await updatePublicProfile(
        user.uid,
        profile
    );


    renderProfileData(
        profile
    );


    return profile;
}


// ============================================================
// СОХРАНЕНИЕ ПРОФИЛЯ ИЗ ФОРМЫ
// ============================================================

export async function saveProfileChanges() {

    const nickname =
        getElement(
            "editNicknameInput"
        )?.value.trim() || "";

    const dob =
        getElement(
            "editDobInput"
        )?.value || "";

    const bio =
        getElement(
            "editBioInput"
        )?.value.trim() || "";

    const phone =
        getElement(
            "editPhoneInput"
        )?.value.trim() || "";


    if (!nickname) {

        showNotificationSafe(
            "Введите имя или никнейм."
        );

        return;
    }


    try {

        await saveUserProfile({

            nickname,

            dob,

            bio,

            phone
        });


        closeEditProfileModal();

        showNotificationSafe(
            "Профиль сохранён."
        );

    } catch (error) {

        console.error(
            "Ошибка сохранения профиля:",
            error
        );

        showNotificationSafe(
            error.message ||
            "Не удалось сохранить профиль."
        );
    }
}


// ============================================================
// ОТКРЫТЬ РЕДАКТИРОВАНИЕ
// ============================================================

export async function openEditProfileModal() {

    const user =
        getCurrentUser();

    if (!user) {

        if (
            typeof window.openAuthModal ===
            "function"
        ) {
            window.openAuthModal();
        }

        return;
    }


    const profile =
        await getUserProfile(
            user.uid
        );


    const nicknameInput =
        getElement(
            "editNicknameInput"
        );

    const dobInput =
        getElement(
            "editDobInput"
        );

    const bioInput =
        getElement(
            "editBioInput"
        );

    const phoneInput =
        getElement(
            "editPhoneInput"
        );


    if (nicknameInput) {
        nicknameInput.value =
            profile?.nickname || "";
    }

    if (dobInput) {
        dobInput.value =
            profile?.dob || "";
    }

    if (bioInput) {
        bioInput.value =
            profile?.bio || "";
    }

    if (phoneInput) {
        phoneInput.value =
            profile?.phone || "";
    }


    const modal =
        getElement(
            "editProfileModal"
        );

    if (modal) {
        modal.classList.remove(
            "hidden"
        );
    }
}


// ============================================================
// ЗАКРЫТЬ РЕДАКТИРОВАНИЕ
// ============================================================

export function closeEditProfileModal() {

    const modal =
        getElement(
            "editProfileModal"
        );

    if (modal) {
        modal.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// ОТОБРАЖЕНИЕ ПРОФИЛЯ
// ============================================================

export function renderProfileData(
    profile
) {

    if (!profile) {
        return;
    }


    const nickname =
        profile.nickname ||
        "Пользователь";


    const avatarInitial =
        getElement(
            "profileAvatarInitial"
        );

    const avatarImage =
        getElement(
            "profileAvatarImg"
        );


    if (avatarInitial) {

        avatarInitial.textContent =
            getInitial(
                nickname
            );
    }


    if (avatarImage) {

        if (profile.photoURL) {

            avatarImage.src =
                profile.photoURL;

            avatarImage.classList.remove(
                "hidden"
            );

            if (avatarInitial) {
                avatarInitial.classList.add(
                    "hidden"
                );
            }

        } else {

            avatarImage.removeAttribute(
                "src"
            );

            avatarImage.classList.add(
                "hidden"
            );

            if (avatarInitial) {
                avatarInitial.classList.remove(
                    "hidden"
                );
            }
        }
    }


    const emailTitle =
        getElement(
            "profileUserEmailTitle"
        );

    const nicknameTitle =
        getElement(
            "profileNicknameTitle"
        );

    const dob =
        getElement(
            "profileDisplayDob"
        );

    const phone =
        getElement(
            "profileDisplayPhone"
        );

    const bio =
        getElement(
            "profileDisplayBio"
        );


    if (emailTitle) {
        emailTitle.textContent =
            profile.email || "";
    }

    if (nicknameTitle) {
        nicknameTitle.textContent =
            nickname;
    }

    if (dob) {
        dob.textContent =
            profile.dob ||
            "Не указано";
    }

    if (phone) {
        phone.textContent =
            profile.phone ||
            "Не указан";
    }

    if (bio) {
        bio.textContent =
            profile.bio ||
            "Описание отсутствует.";
    }


    // Настройки

    const settingsEmail =
        getElement(
            "settingsEmailInput"
        );

    const settingsPhone =
        getElement(
            "settingsPhoneInput"
        );

    if (settingsEmail) {
        settingsEmail.value =
            profile.email || "";
    }

    if (settingsPhone) {
        settingsPhone.value =
            profile.phone || "";
    }
}


// ============================================================
// ЗАГРУЗКА ПРОФИЛЯ
// ============================================================

export async function loadCurrentProfile() {

    const user =
        getCurrentUser();

    if (!user) {
        return null;
    }


    const profile =
        await getUserProfile(
            user.uid
        );


    renderProfileData(
        profile
    );


    await loadUserAdsCount(
        user.uid
    );


    return profile;
}


// ============================================================
// КОЛИЧЕСТВО ОБЪЯВЛЕНИЙ ПОЛЬЗОВАТЕЛЯ
// ============================================================

async function loadUserAdsCount(
    uid
) {

    if (!uid) {
        return;
    }


    try {

        const snapshot =
            await getDocsSafe(
                collection(
                    db,
                    ADS_COLLECTION
                )
            );


        const count =
            snapshot.filter(
                ad =>
                    ad.authorUid === uid
            ).length;


        const stat =
            getElement(
                "statAdsCount"
            );

        const tabCount =
            getElement(
                "tabAdsCountNum"
            );

        if (stat) {
            stat.textContent =
                count;
        }

        if (tabCount) {
            tabCount.textContent =
                count;
        }

    } catch (error) {

        console.warn(
            "Не удалось получить количество объявлений:",
            error
        );
    }
}


async function getDocsSafe(
    collectionRef
) {

    const snapshot =
        await import(
            "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
        )
            .then(
                module =>
                    module.getDocs(
                        collectionRef
                    )
            );

    return snapshot.docs.map(
        item => ({
            id: item.id,
            ...item.data()
        })
    );
}


// ============================================================
// ЗАГРУЗКА АВАТАРА
// ============================================================

export async function handleAvatarUpload(
    event
) {

    const file =
        event?.target?.files?.[0];

    if (!file) {
        return;
    }


    const user =
        getCurrentUser();

    if (!user) {

        showNotificationSafe(
            "Сначала войдите в аккаунт."
        );

        return;
    }


    if (!file.type.startsWith("image/")) {

        showNotificationSafe(
            "Можно загрузить только изображение."
        );

        return;
    }


    if (
        file.size >
        5 * 1024 * 1024
    ) {

        showNotificationSafe(
            "Размер изображения не должен превышать 5 МБ."
        );

        return;
    }


    try {

        showNotificationSafe(
            "Загрузка аватара..."
        );


        const storageRef =
            ref(
                window.firebaseStorage,
                `avatars/${user.uid}/${Date.now()}_${file.name}`
            );


        await uploadBytes(
            storageRef,
            file
        );


        const photoURL =
            await getDownloadURL(
                storageRef
            );


        await saveUserProfile({
            photoURL
        });


        showNotificationSafe(
            "Аватар обновлён."
        );


    } catch (error) {

        console.error(
            "Ошибка загрузки аватара:",
            error
        );

        showNotificationSafe(
            "Не удалось загрузить аватар."
        );
    }
}


// ============================================================
// ПУБЛИЧНЫЙ ПРОФИЛЬ
// ============================================================

async function updatePublicProfile(
    uid,
    profile
) {

    if (!uid) {
        return;
    }


    try {

        await setDoc(
            doc(
                db,
                PUBLIC_PROFILES_COLLECTION,
                uid
            ),
            {
                uid,

                nickname:
                    profile.nickname ||
                    "Пользователь",

                bio:
                    profile.bio || "",

                dob:
                    profile.dob || "",

                phone:
                    profile.phone || "",

                photoURL:
                    profile.photoURL || "",

                email:
                    profile.email || "",

                updatedAt:
                    serverTimestamp()
            },
            {
                merge: true
            }
        );

    } catch (error) {

        console.warn(
            "Ошибка публичного профиля:",
            error
        );
    }
}


// ============================================================
// ПОЛУЧЕНИЕ ПУБЛИЧНОГО ПРОФИЛЯ
// ============================================================

export async function getPublicProfile(
    uid
) {

    if (!uid) {
        return null;
    }


    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    PUBLIC_PROFILES_COLLECTION,
                    uid
                )
            );


        if (!snapshot.exists()) {
            return null;
        }


        return {
            uid,
            ...snapshot.data()
        };

    } catch (error) {

        console.error(
            "Ошибка получения публичного профиля:",
            error
        );

        return null;
    }
}


// ============================================================
// ОТКРЫТИЕ ПРОФИЛЯ
// ============================================================

export async function openProfile(
    uid = null
) {

    const user =
        getCurrentUser();

    const targetUid =
        uid || user?.uid;


    if (!targetUid) {

        if (
            typeof window.openAuthModal ===
            "function"
        ) {
            window.openAuthModal();
        }

        return;
    }


    if (
        targetUid ===
        user?.uid
    ) {

        const profile =
            await getUserProfile(
                targetUid
            );

        renderProfileData(
            profile
        );
    }


    if (
        typeof window.showPage ===
        "function"
    ) {
        window.showPage(
            "profile"
        );
    }
}


// ============================================================
// ОЧИСТКА ПРОФИЛЯ
// ============================================================

export function clearCurrentProfile() {

    const ids = [
        "profileUserEmailTitle",
        "profileNicknameTitle",
        "profileDisplayDob",
        "profileDisplayPhone",
        "profileDisplayBio"
    ];


    ids.forEach(
        id => {

            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    "";
            }
        }
    );


    const initial =
        getElement(
            "profileAvatarInitial"
        );

    const image =
        getElement(
            "profileAvatarImg"
        );


    if (initial) {
        initial.textContent = "П";
        initial.classList.remove(
            "hidden"
        );
    }

    if (image) {
        image.removeAttribute(
            "src"
        );

        image.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// ВКЛАДКИ ПРОФИЛЯ
// ============================================================

export function switchProfileTab(
    tab
) {

    const tabs = [
        "ads",
        "reviews",
        "settings"
    ];


    tabs.forEach(
        name => {

            const content =
                getElement(
                    `profileTab${capitalize(name)}`
                );

            const button =
                getElement(
                    `tabBtn${capitalize(name)}`
                );


            if (content) {

                if (name === tab) {
                    content.classList.remove(
                        "hidden"
                    );
                } else {
                    content.classList.add(
                        "hidden"
                    );
                }
            }


            if (button) {

                if (name === tab) {
                    button.classList.add(
                        "active"
                    );
                } else {
                    button.classList.remove(
                        "active"
                    );
                }
            }
        }
    );
}


function capitalize(
    value
) {

    return value.charAt(0).toUpperCase() +
        value.slice(1);
}


// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

export async function initProfile() {

    const user =
        getCurrentUser();

    if (user) {

        try {

            await initializeUserAccount(
                user
            );

            await loadCurrentProfile();

        } catch (error) {

            console.error(
                "Ошибка инициализации профиля:",
                error
            );
        }
    }


    const avatarInput =
        getElement(
            "avatarFileInput"
        );

    if (avatarInput) {

        avatarInput.addEventListener(
            "change",
            handleAvatarUpload
        );
    }


    console.log(
        "TJWORK Profile module загружен."
    );
}


// ============================================================
// GLOBAL FUNCTIONS
// Совместимость с onclick="" в index.html
// ============================================================

window.openProfile =
    openProfile;

window.openEditProfileModal =
    openEditProfileModal;

window.closeEditProfileModal =
    closeEditProfileModal;

window.saveProfileChanges =
    saveProfileChanges;

window.handleAvatarUpload =
    handleAvatarUpload;

window.switchProfileTab =
    switchProfileTab;

window.getUserProfile =
    getUserProfile;

window.getPublicProfile =
    getPublicProfile;

window.initializeUserAccount =
    initializeUserAccount;

window.renderProfileData =
    renderProfileData;

window.loadCurrentProfile =
    loadCurrentProfile;

window.clearCurrentProfile =
    clearCurrentProfile;

window.initProfile =
    initProfile;