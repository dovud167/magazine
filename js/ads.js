// ============================================================
// TJWORK — ADS.JS
// Объявления: создание, загрузка, поиск, фильтры,
// просмотр, редактирование и удаление
// ============================================================

import {
    db,
    auth,
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
    serverTimestamp
} from "./firebase.js";


// ============================================================
// НАСТРОЙКИ
// ============================================================

const ADS_COLLECTION = "ads";

let adsData = [];
let adsListener = null;


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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


function getCurrentUser() {
    return auth.currentUser;
}


// ============================================================
// СОЗДАНИЕ ID
// ============================================================

function generateAdId() {

    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );
}


// ============================================================
// ПОЛУЧЕНИЕ ДАННЫХ ФОРМЫ
// ============================================================

function getCreateFormData() {

    const user = getCurrentUser();

    if (!user) {
        throw new Error(
            "Для публикации объявления необходимо войти в аккаунт."
        );
    }

    const title =
        getElement("newTitle")?.value.trim() || "";

    const description =
        getElement("newDesc")?.value.trim() || "";

    const type =
        getElement("newType")?.value || "";

    const section =
        getElement("newSection")?.value || "";

    const category =
        getElement("newCat")?.value || "";

    const subject =
        getElement("newSubject")?.value || "";

    const province =
        getElement("modalProv")?.value || "";

    const district =
        getElement("modalDist")?.value || "";

    const village =
        getElement("modalVill")?.value || "";

    const price =
        getElement("newPriceNum")?.value || "";

    const currency =
        getElement("newCurrency")?.value || "TJS";

    const phone =
        getElement("newPhone")?.value.trim() || "";

    if (!title) {
        throw new Error(
            "Введите название объявления."
        );
    }

    if (!description) {
        throw new Error(
            "Введите описание объявления."
        );
    }

    if (!type) {
        throw new Error(
            "Выберите тип объявления."
        );
    }

    if (!section) {
        throw new Error(
            "Выберите раздел."
        );
    }

    if (!category) {
        throw new Error(
            "Выберите категорию."
        );
    }

    return {
        title,
        description,
        type,
        section,
        category,
        subject,
        province,
        district,
        village,
        price: price ? Number(price) : null,
        currency,
        phone
    };
}


// ============================================================
// СОЗДАНИЕ ОБЪЯВЛЕНИЯ
// ============================================================

export async function createAd(data = null) {

    const user = getCurrentUser();

    if (!user) {
        throw new Error(
            "Необходимо войти в аккаунт."
        );
    }

    const formData =
        data || getCreateFormData();

    const adId =
        generateAdId();

    const ad = {

        id: adId,

        title:
            formData.title || "",

        description:
            formData.description || "",

        type:
            formData.type || "",

        section:
            formData.section || "",

        category:
            formData.category || "",

        subject:
            formData.subject || "",

        province:
            formData.province || "",

        district:
            formData.district || "",

        village:
            formData.village || "",

        price:
            formData.price ?? null,

        currency:
            formData.currency || "TJS",

        phone:
            formData.phone || "",

        authorUid:
            user.uid,

        authorEmail:
            user.email || "",

        authorNickname:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Пользователь",

        authorPhoto:
            user.photoURL || "",

        status:
            "active",

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp()
    };

    await setDoc(
        doc(
            db,
            ADS_COLLECTION,
            adId
        ),
        ad
    );

    return {
        ...ad,
        id: adId
    };
}


// ============================================================
// SUBMIT NEW AD
// ============================================================

export async function submitNewAd() {

    const errorElement =
        getElement("createError");

    if (errorElement) {
        errorElement.textContent = "";
        errorElement.classList.add("hidden");
    }

    try {

        await createAd();

        showNotificationSafe(
            "Объявление успешно опубликовано."
        );

        closeCreateModalSafe();

        await loadAds();

        if (
            typeof window.showPage ===
            "function"
        ) {
            window.showPage("home");
        }

    } catch (error) {

        console.error(
            "Ошибка создания объявления:",
            error
        );

        const message =
            error.message ||
            "Не удалось создать объявление.";

        if (errorElement) {

            errorElement.textContent =
                message;

            errorElement.classList.remove(
                "hidden"
            );

        } else {

            showNotificationSafe(
                message
            );
        }
    }
}


// ============================================================
// ЗАГРУЗКА ОБЪЯВЛЕНИЙ
// ============================================================

export async function loadAds() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    ADS_COLLECTION
                )
            );

        adsData = snapshot.docs.map(
            item => ({
                id: item.id,
                ...item.data()
            })
        );

        adsData.sort(
            (a, b) => {
                const aTime =
                    a.createdAt?.seconds ||
                    0;

                const bTime =
                    b.createdAt?.seconds ||
                    0;

                return bTime - aTime;
            }
        );

        renderAds(
            adsData
        );

        return adsData;

    } catch (error) {

        console.error(
            "Ошибка загрузки объявлений:",
            error
        );

        showNotificationSafe(
            "Не удалось загрузить объявления."
        );

        return [];
    }
}


// ============================================================
// REALTIME LISTENER
// ============================================================

export function startAdsRealtimeListener() {

    if (adsListener) {
        return adsListener;
    }

    const adsRef =
        collection(
            db,
            ADS_COLLECTION
        );

    adsListener =
        onSnapshot(
            adsRef,
            snapshot => {

                adsData =
                    snapshot.docs.map(
                        item => ({
                            id: item.id,
                            ...item.data()
                        })
                    );

                adsData.sort(
                    (a, b) => {

                        const aTime =
                            a.createdAt?.seconds ||
                            0;

                        const bTime =
                            b.createdAt?.seconds ||
                            0;

                        return bTime - aTime;
                    }
                );

                renderAds(
                    adsData
                );
            },
            error => {

                console.error(
                    "Ошибка realtime объявлений:",
                    error
                );
            }
        );

    return adsListener;
}


// ============================================================
// ПОЛУЧИТЬ ОДНО ОБЪЯВЛЕНИЕ
// ============================================================

export async function getAd(adId) {

    if (!adId) {
        return null;
    }

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    ADS_COLLECTION,
                    adId
                )
            );

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data()
        };

    } catch (error) {

        console.error(
            "Ошибка получения объявления:",
            error
        );

        return null;
    }
}


// ============================================================
// ОБНОВЛЕНИЕ ОБЪЯВЛЕНИЯ
// ============================================================

export async function updateAd(
    adId,
    updates
) {

    if (!adId) {
        throw new Error(
            "Не указан ID объявления."
        );
    }

    const user =
        getCurrentUser();

    if (!user) {
        throw new Error(
            "Необходимо войти в аккаунт."
        );
    }

    const ad =
        await getAd(adId);

    if (!ad) {
        throw new Error(
            "Объявление не найдено."
        );
    }

    if (
        ad.authorUid !== user.uid &&
        user.email !==
            "dovud0300@gmail.com"
    ) {
        throw new Error(
            "У вас нет прав для изменения этого объявления."
        );
    }

    await updateDoc(
        doc(
            db,
            ADS_COLLECTION,
            adId
        ),
        {
            ...updates,
            updatedAt:
                serverTimestamp()
        }
    );

    showNotificationSafe(
        "Объявление обновлено."
    );

    return true;
}


// ============================================================
// УДАЛЕНИЕ ОБЪЯВЛЕНИЯ
// ============================================================

export async function deleteAd(
    adId
) {

    if (!adId) {
        return false;
    }

    const user =
        getCurrentUser();

    if (!user) {
        throw new Error(
            "Необходимо войти в аккаунт."
        );
    }

    const ad =
        await getAd(adId);

    if (!ad) {
        throw new Error(
            "Объявление не найдено."
        );
    }

    const isAdmin =
        user.email ===
        "dovud0300@gmail.com";

    if (
        ad.authorUid !== user.uid &&
        !isAdmin
    ) {
        throw new Error(
            "У вас нет прав для удаления этого объявления."
        );
    }

    await deleteDoc(
        doc(
            db,
            ADS_COLLECTION,
            adId
        )
    );

    showNotificationSafe(
        "Объявление удалено."
    );

    return true;
}


// ============================================================
// ПОИСК
// ============================================================

export function searchAds(
    searchText
) {

    const text =
        String(searchText || "")
            .trim()
            .toLowerCase();

    if (!text) {
        return [...adsData];
    }

    return adsData.filter(
        ad => {

            const searchable = [
                ad.title,
                ad.description,
                ad.category,
                ad.section,
                ad.subject,
                ad.province,
                ad.district,
                ad.village,
                ad.authorNickname
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
                text
            );
        }
    );
}


// ============================================================
// ФИЛЬТР ПО КАТЕГОРИИ
// ============================================================

export function filterAdsByCategory(
    category
) {

    if (!category) {
        return [...adsData];
    }

    return adsData.filter(
        ad =>
            ad.category === category
    );
}


// ============================================================
// ФИЛЬТР ПО РЕГИОНУ
// ============================================================

export function filterAdsByLocation(
    province,
    district,
    village
) {

    return adsData.filter(
        ad => {

            if (
                province &&
                ad.province !== province
            ) {
                return false;
            }

            if (
                district &&
                ad.district !== district
            ) {
                return false;
            }

            if (
                village &&
                ad.village !== village
            ) {
                return false;
            }

            return true;
        }
    );
}


// ============================================================
// ФИЛЬТР ПО ТИПУ
// ============================================================

export function filterAdsByJobType(
    type
) {

    if (!type) {
        return [...adsData];
    }

    return adsData.filter(
        ad =>
            ad.type === type
    );
}


// ============================================================
// СБРОС ФИЛЬТРОВ
// ============================================================

export function resetAdsFilters() {

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

    ids.forEach(id => {

        const element =
            getElement(id);

        if (element) {
            element.value = "";
        }
    });

    renderAds(
        adsData
    );
}


// ============================================================
// ПРИМЕНЕНИЕ ФИЛЬТРОВ
// ============================================================

export function applyFilters() {

    let result =
        [...adsData];

    const search =
        getElement("searchInput")
            ?.value
            .trim()
            .toLowerCase() || "";

    const type =
        getElement("typeSelect")
            ?.value || "";

    const section =
        getElement("sectionSelect")
            ?.value || "";

    const category =
        getElement("catSelect")
            ?.value || "";

    const subject =
        getElement("subjectSelect")
            ?.value || "";

    const province =
        getElement("regionProv")
            ?.value || "";

    const district =
        getElement("regionDist")
            ?.value || "";

    const village =
        getElement("regionVill")
            ?.value || "";


    if (search) {

        result =
            result.filter(
                ad => {

                    const text = [
                        ad.title,
                        ad.description,
                        ad.category,
                        ad.section,
                        ad.subject,
                        ad.authorNickname
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    return text.includes(
                        search
                    );
                }
            );
    }


    if (type) {

        result =
            result.filter(
                ad =>
                    ad.type === type
            );
    }


    if (section) {

        result =
            result.filter(
                ad =>
                    ad.section === section
            );
    }


    if (category) {

        result =
            result.filter(
                ad =>
                    ad.category === category
            );
    }


    if (subject) {

        result =
            result.filter(
                ad =>
                    ad.subject === subject
            );
    }


    if (province) {

        result =
            result.filter(
                ad =>
                    ad.province === province
            );
    }


    if (district) {

        result =
            result.filter(
                ad =>
                    ad.district === district
            );
    }


    if (village) {

        result =
            result.filter(
                ad =>
                    ad.village === village
            );
    }


    renderAds(
        result
    );

    return result;
}


// ============================================================
// ОТОБРАЖЕНИЕ ОБЪЯВЛЕНИЙ
// ============================================================

export function renderAds(
    ads = []
) {

    const container =
        getElement("adsList");

    if (!container) {
        return;
    }

    if (!ads.length) {

        container.innerHTML = `
            <div class="tj-empty-state">
                <div class="tj-empty-icon">📭</div>
                <div class="tj-empty-title">
                    Объявлений пока нет
                </div>
                <div class="tj-empty-text">
                    Попробуйте изменить фильтры
                    или создайте первое объявление.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML =
        ads.map(
            ad => {

                const price =
                    ad.price !== null &&
                    ad.price !== undefined &&
                    ad.price !== ""
                        ? `${escapeHtml(ad.price)} ${escapeHtml(ad.currency || "TJS")}`
                        : "Цена не указана";

                const location = [
                    ad.province,
                    ad.district,
                    ad.village
                ]
                    .filter(Boolean)
                    .join(", ");


                return `
                    <article
                        class="tj-ad-card"
                        data-ad-id="${escapeHtml(ad.id)}"
                    >

                        <div class="tj-ad-card-top">

                            <div class="tj-ad-type">
                                ${escapeHtml(
                                    ad.type || "Объявление"
                                )}
                            </div>

                            <div class="tj-ad-price">
                                ${price}
                            </div>

                        </div>


                        <h3 class="tj-ad-title">
                            ${escapeHtml(
                                ad.title
                            )}
                        </h3>


                        <p class="tj-ad-description">
                            ${escapeHtml(
                                ad.description
                            )}
                        </p>


                        <div class="tj-ad-meta">

                            ${
                                ad.category
                                    ? `
                                    <span>
                                        📂
                                        ${escapeHtml(
                                            ad.category
                                        )}
                                    </span>
                                    `
                                    : ""
                            }

                            ${
                                location
                                    ? `
                                    <span>
                                        📍
                                        ${escapeHtml(
                                            location
                                        )}
                                    </span>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="tj-ad-author">

                            <div class="tj-ad-author-avatar">

                                ${
                                    ad.authorPhoto
                                        ? `
                                            <img
                                                src="${escapeHtml(
                                                    ad.authorPhoto
                                                )}"
                                                alt=""
                                                onerror="this.style.display='none'"
                                            >
                                          `
                                        : `
                                            <span>
                                                ${escapeHtml(
                                                    (
                                                        ad.authorNickname ||
                                                        "П"
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()
                                                )}
                                            </span>
                                          `
                                }

                            </div>


                            <div class="tj-ad-author-info">

                                <strong>
                                    ${escapeHtml(
                                        ad.authorNickname ||
                                        "Пользователь"
                                    )}
                                </strong>

                                ${
                                    ad.subject
                                        ? `
                                            <small>
                                                ${escapeHtml(
                                                    ad.subject
                                                )}
                                            </small>
                                          `
                                        : ""
                                }

                            </div>

                        </div>


                        <div class="tj-ad-actions">

                            <button
                                type="button"
                                onclick="openAdDetails('${escapeHtml(ad.id)}')"
                                class="tj-ad-view-btn"
                            >
                                Подробнее
                            </button>


                            ${
                                getCurrentUser() &&
                                getCurrentUser().uid !==
                                    ad.authorUid
                                    ? `
                                        <button
                                            type="button"
                                            onclick="openAdChat('${escapeHtml(ad.id)}')"
                                            class="tj-ad-chat-btn"
                                        >
                                            💬
                                        </button>
                                      `
                                    : ""
                            }

                        </div>

                    </article>
                `;
            }
        )
        .join("");
}


// ============================================================
// ОТКРЫТЬ ДЕТАЛИ ОБЪЯВЛЕНИЯ
// ============================================================

export async function openAdDetails(
    adId
) {

    const ad =
        await getAd(adId);

    if (!ad) {

        showNotificationSafe(
            "Объявление не найдено."
        );

        return;
    }

    const modal =
        getElement("adDetailsModal");

    if (modal) {

        const title =
            modal.querySelector(
                "[data-ad-title]"
            );

        const description =
            modal.querySelector(
                "[data-ad-description]"
            );

        const price =
            modal.querySelector(
                "[data-ad-price]"
            );

        const location =
            modal.querySelector(
                "[data-ad-location]"
            );

        const phone =
            modal.querySelector(
                "[data-ad-phone]"
            );

        if (title) {
            title.textContent =
                ad.title || "";
        }

        if (description) {
            description.textContent =
                ad.description || "";
        }

        if (price) {
            price.textContent =
                ad.price
                    ? `${ad.price} ${ad.currency || "TJS"}`
                    : "Цена не указана";
        }

        if (location) {
            location.textContent =
                [
                    ad.province,
                    ad.district,
                    ad.village
                ]
                    .filter(Boolean)
                    .join(", ");
        }

        if (phone) {
            phone.textContent =
                ad.phone || "Не указан";
        }

        modal.dataset.adId =
            ad.id;

        modal.classList.remove(
            "hidden"
        );

        return;
    }


    // Если отдельного modal в HTML нет,
    // переходим на страницу подробностей.

    if (
        typeof window.showPage ===
        "function"
    ) {

        window.showPage(
            "category-detail"
        );
    }
}


// ============================================================
// ЗАКРЫТИЕ ДЕТАЛЕЙ
// ============================================================

export function closeAdDetails() {

    const modal =
        getElement("adDetailsModal");

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );
}


// ============================================================
// ПОКАЗАТЬ ОБЪЯВЛЕНИЯ ПОЛЬЗОВАТЕЛЯ
// ============================================================

export function getUserAds(
    uid
) {

    if (!uid) {
        return [];
    }

    return adsData.filter(
        ad =>
            ad.authorUid === uid
    );
}


// ============================================================
// ПОЛУЧИТЬ ВСЕ ОБЪЯВЛЕНИЯ
// ============================================================

export function getAdsData() {
    return [...adsData];
}


// ============================================================
// ЗАКРЫТЬ CREATE MODAL
// ============================================================

function closeCreateModalSafe() {

    const modal =
        getElement("createModal");

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );
}


// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

export function initAds() {

    console.log(
        "TJWORK Ads module загружен."
    );

    startAdsRealtimeListener();
}


// ============================================================
// GLOBAL FUNCTIONS
// Совместимость с onclick="" в index.html
// ============================================================

window.createAd =
    createAd;

window.submitNewAd =
    submitNewAd;

window.loadAds =
    loadAds;

window.startAdsRealtimeListener =
    startAdsRealtimeListener;

window.getAd =
    getAd;

window.updateAd =
    updateAd;

window.deleteAd =
    deleteAd;

window.searchAds =
    searchAds;

window.filterAdsByCategory =
    filterAdsByCategory;

window.filterAdsByLocation =
    filterAdsByLocation;

window.filterAdsByJobType =
    filterAdsByJobType;

window.resetAdsFilters =
    resetAdsFilters;

window.applyFilters =
    applyFilters;

window.renderAds =
    renderAds;

window.openAdDetails =
    openAdDetails;

window.closeAdDetails =
    closeAdDetails;

window.getUserAds =
    getUserAds;

window.getAdsData =
    getAdsData;

window.initAds =
    initAds;