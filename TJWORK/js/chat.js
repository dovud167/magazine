// ============================================================
// TJWORK — CHAT.JS
// Чат между пользователями через Firebase Firestore
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
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp
} from "./firebase.js";


// ============================================================
// НАСТРОЙКИ
// ============================================================

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

let currentChatId = null;
let currentChatUnsubscribe = null;
let currentChatsUnsubscribe = null;


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


function getCurrentUser() {
    return auth.currentUser;
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


function getInitial(name) {

    const text =
        String(name || "П")
            .trim();

    return (
        text.charAt(0).toUpperCase() ||
        "П"
    );
}


// ============================================================
// СОЗДАНИЕ ID ЧАТА
// ============================================================

function generateChatId(
    userA,
    userB,
    adId
) {

    const users = [
        userA,
        userB
    ].sort();

    return (
        `${users[0]}_${users[1]}_${adId}`
    )
        .replace(/[^a-zA-Z0-9_-]/g, "_");
}


// ============================================================
// ПОЛУЧЕНИЕ ОБЪЯВЛЕНИЯ
// ============================================================

async function getAdForChat(adId) {

    if (!adId) {
        return null;
    }

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "ads",
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
            "Ошибка получения объявления для чата:",
            error
        );

        return null;
    }
}


// ============================================================
// СОЗДАНИЕ / ПОЛУЧЕНИЕ ЧАТА
// ============================================================

export async function createChat(
    adId,
    sellerUid,
    sellerName = "",
    adTitle = ""
) {

    const user =
        getCurrentUser();

    if (!user) {

        if (
            typeof window.openAuthModal ===
            "function"
        ) {
            window.openAuthModal();
        }

        throw new Error(
            "Необходимо войти в аккаунт."
        );
    }


    if (!sellerUid) {

        throw new Error(
            "Не удалось определить продавца."
        );
    }


    if (sellerUid === user.uid) {

        throw new Error(
            "Нельзя начать чат с самим собой."
        );
    }


    const chatId =
        generateChatId(
            user.uid,
            sellerUid,
            adId
        );


    const chatRef =
        doc(
            db,
            CHATS_COLLECTION,
            chatId
        );


    const existing =
        await getDoc(
            chatRef
        );


    if (!existing.exists()) {

        await setDoc(
            chatRef,
            {

                id: chatId,

                adId:
                    adId || "",

                adTitle:
                    adTitle || "",

                participants: [
                    user.uid,
                    sellerUid
                ],

                buyerUid:
                    user.uid,

                sellerUid:
                    sellerUid,

                buyerName:
                    user.displayName ||
                    user.email?.split("@")[0] ||
                    "Пользователь",

                sellerName:
                    sellerName ||
                    "Продавец",

                lastMessage:
                    "",

                lastMessageAt:
                    serverTimestamp(),

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()
            }
        );

    } else {

        const data =
            existing.data();

        if (
            !data.buyerUid ||
            !data.sellerUid
        ) {

            await updateDoc(
                chatRef,
                {
                    buyerUid:
                        user.uid,

                    sellerUid:
                        sellerUid,

                    updatedAt:
                        serverTimestamp()
                }
            );
        }
    }


    return chatId;
}


// ============================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================

export async function sendMessage(
    chatId,
    text
) {

    const user =
        getCurrentUser();

    if (!user) {

        throw new Error(
            "Необходимо войти в аккаунт."
        );
    }


    const messageText =
        String(text || "").trim();


    if (!messageText) {
        return false;
    }


    if (!chatId) {

        throw new Error(
            "Чат не выбран."
        );
    }


    const messageId =
        Date.now().toString() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8);


    const messageRef =
        doc(
            db,
            CHATS_COLLECTION,
            chatId,
            MESSAGES_SUBCOLLECTION,
            messageId
        );


    await setDoc(
        messageRef,
        {

            id:
                messageId,

            text:
                messageText,

            senderUid:
                user.uid,

            senderName:
                user.displayName ||
                user.email?.split("@")[0] ||
                "Пользователь",

            createdAt:
                serverTimestamp()
        }
    );


    await updateDoc(
        doc(
            db,
            CHATS_COLLECTION,
            chatId
        ),
        {

            lastMessage:
                messageText,

            lastMessageAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()
        }
    );


    return true;
}


// ============================================================
// ОТПРАВКА ИЗ HTML
// ============================================================

export async function sendChatMessage() {

    const input =
        getElement(
            "chatMessageInput"
        );

    if (!input) {
        return;
    }


    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    if (!currentChatId) {

        showNotificationSafe(
            "Сначала выберите чат."
        );

        return;
    }


    try {

        await sendMessage(
            currentChatId,
            text
        );

        input.value = "";

        input.focus();

    } catch (error) {

        console.error(
            "Ошибка отправки сообщения:",
            error
        );

        showNotificationSafe(
            error.message ||
            "Не удалось отправить сообщение."
        );
    }
}


// ============================================================
// СЛУШАТЬ СООБЩЕНИЯ
// ============================================================

export function listenToMessages(
    chatId
) {

    if (currentChatUnsubscribe) {

        currentChatUnsubscribe();

        currentChatUnsubscribe =
            null;
    }


    if (!chatId) {
        return;
    }


    const messagesRef =
        collection(
            db,
            CHATS_COLLECTION,
            chatId,
            MESSAGES_SUBCOLLECTION
        );


    const messagesQuery =
        query(
            messagesRef,
            orderBy(
                "createdAt",
                "asc"
            )
        );


    currentChatUnsubscribe =
        onSnapshot(
            messagesQuery,
            snapshot => {

                const messages =
                    snapshot.docs.map(
                        item => ({
                            id:
                                item.id,

                            ...item.data()
                        })
                    );


                renderMessages(
                    messages
                );
            },
            error => {

                console.error(
                    "Ошибка сообщений:",
                    error
                );
            }
        );


    return currentChatUnsubscribe;
}


// ============================================================
// ОТОБРАЖЕНИЕ СООБЩЕНИЙ
// ============================================================

export function renderMessages(
    messages = []
) {

    const container =
        getElement(
            "chatMessages"
        );

    if (!container) {
        return;
    }


    const user =
        getCurrentUser();


    if (!messages.length) {

        container.innerHTML = `
            <div class="tj-chat-empty">
                <div class="tj-chat-empty-icon">
                    💬
                </div>

                <div class="tj-chat-empty-title">
                    Начните общение
                </div>

                <div class="tj-chat-empty-text">
                    Напишите первое сообщение.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML =
        messages.map(
            message => {

                const own =
                    user &&
                    message.senderUid ===
                    user.uid;


                const time =
                    formatMessageTime(
                        message.createdAt
                    );


                return `
                    <div
                        class="tj-chat-message-row ${
                            own
                                ? "own"
                                : "other"
                        }"
                    >

                        <div
                            class="tj-chat-message ${
                                own
                                    ? "own"
                                    : "other"
                            }"
                        >

                            ${
                                !own
                                    ? `
                                        <div class="tj-chat-message-author">
                                            ${escapeHtml(
                                                message.senderName ||
                                                "Пользователь"
                                            )}
                                        </div>
                                      `
                                    : ""
                            }

                            <div class="tj-chat-message-text">
                                ${escapeHtml(
                                    message.text
                                )}
                            </div>

                            <div class="tj-chat-message-time">
                                ${time}
                            </div>

                        </div>

                    </div>
                `;
            }
        )
        .join("");


    container.scrollTop =
        container.scrollHeight;
}


// ============================================================
// ВРЕМЯ СООБЩЕНИЯ
// ============================================================

function formatMessageTime(
    timestamp
) {

    if (
        !timestamp ||
        typeof timestamp.toDate !==
        "function"
    ) {
        return "";
    }


    const date =
        timestamp.toDate();


    return date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ============================================================
// ОТКРЫТИЕ ЧАТА ИЗ ОБЪЯВЛЕНИЯ
// ============================================================

export async function openAdChat(
    adId
) {

    const user =
        getCurrentUser();


    if (!user) {

        showNotificationSafe(
            "Войдите в аккаунт, чтобы написать продавцу."
        );

        if (
            typeof window.openAuthModal ===
            "function"
        ) {
            window.openAuthModal();
        }

        return;
    }


    try {

        const ad =
            await getAdForChat(
                adId
            );


        if (!ad) {

            showNotificationSafe(
                "Объявление не найдено."
            );

            return;
        }


        if (
            ad.authorUid ===
            user.uid
        ) {

            showNotificationSafe(
                "Нельзя открыть чат с самим собой."
            );

            return;
        }


        const chatId =
            await createChat(
                ad.id,
                ad.authorUid,
                ad.authorNickname,
                ad.title
            );


        currentChatId =
            chatId;


        openChatInterface(
            ad
        );


        listenToMessages(
            chatId
        );


    } catch (error) {

        console.error(
            "Ошибка открытия чата:",
            error
        );

        showNotificationSafe(
            error.message ||
            "Не удалось открыть чат."
        );
    }
}


// ============================================================
// ОТКРЫТИЕ ИНТЕРФЕЙСА ЧАТА
// ============================================================

function openChatInterface(
    ad = null
) {

    const header =
        getElement(
            "chatHeader"
        );


    if (header && ad) {

        header.innerHTML = `
            <div class="tj-chat-header-avatar">
                ${
                    ad.authorPhoto
                        ? `
                            <img
                                src="${escapeHtml(
                                    ad.authorPhoto
                                )}"
                                alt=""
                            >
                          `
                        : `
                            ${getInitial(
                                ad.authorNickname ||
                                "П"
                            )}
                          `
                }
            </div>

            <div class="tj-chat-header-info">

                <div class="tj-chat-header-name">
                    ${escapeHtml(
                        ad.authorNickname ||
                        "Продавец"
                    )}
                </div>

                <div class="tj-chat-header-subtitle">
                    ${escapeHtml(
                        ad.title ||
                        "Объявление"
                    )}
                </div>

            </div>
        `;
    }


    if (
        typeof window.showPage ===
        "function"
    ) {
        window.showPage(
            "messages"
        );
    }


    const input =
        getElement(
            "chatMessageInput"
        );

    if (input) {
        setTimeout(
            () => input.focus(),
            100
        );
    }
}


// ============================================================
// ЗАКРЫТИЕ ЧАТА
// ============================================================

export function closeChat() {

    if (currentChatUnsubscribe) {

        currentChatUnsubscribe();

        currentChatUnsubscribe =
            null;
    }


    currentChatId =
        null;


    const input =
        getElement(
            "chatMessageInput"
        );

    if (input) {
        input.value = "";
    }
}


// ============================================================
// ПОЛУЧЕНИЕ СПИСКА ЧАТОВ
// ============================================================

export async function loadUserChats() {

    const user =
        getCurrentUser();


    if (!user) {
        return [];
    }


    try {

        const chatsRef =
            collection(
                db,
                CHATS_COLLECTION
            );


        const snapshot =
            await getDocs(
                chatsRef
            );


        const chats =
            snapshot.docs
                .map(
                    item => ({
                        id:
                            item.id,

                        ...item.data()
                    })
                )
                .filter(
                    chat =>
                        Array.isArray(
                            chat.participants
                        ) &&
                        chat.participants.includes(
                            user.uid
                        )
                );


        chats.sort(
            (a, b) => {

                const aTime =
                    a.lastMessageAt?.seconds ||
                    0;

                const bTime =
                    b.lastMessageAt?.seconds ||
                    0;

                return bTime - aTime;
            }
        );


        renderChatList(
            chats
        );


        return chats;

    } catch (error) {

        console.error(
            "Ошибка загрузки чатов:",
            error
        );

        return [];
    }
}


// ============================================================
// REALTIME СПИСОК ЧАТОВ
// ============================================================

export function startChatsRealtimeListener() {

    const user =
        getCurrentUser();


    if (!user) {
        return null;
    }


    if (currentChatsUnsubscribe) {

        currentChatsUnsubscribe();

        currentChatsUnsubscribe =
            null;
    }


    const chatsRef =
        collection(
            db,
            CHATS_COLLECTION
        );


    const chatsQuery =
        query(
            chatsRef,
            where(
                "participants",
                "array-contains",
                user.uid
            )
        );


    currentChatsUnsubscribe =
        onSnapshot(
            chatsQuery,
            snapshot => {

                const chats =
                    snapshot.docs.map(
                        item => ({
                            id:
                                item.id,

                            ...item.data()
                        })
                    );


                chats.sort(
                    (a, b) => {

                        const aTime =
                            a.lastMessageAt?.seconds ||
                            0;

                        const bTime =
                            b.lastMessageAt?.seconds ||
                            0;

                        return bTime - aTime;
                    }
                );


                renderChatList(
                    chats
                );
            },
            error => {

                console.error(
                    "Ошибка realtime чатов:",
                    error
                );
            }
        );


    return currentChatsUnsubscribe;
}


// ============================================================
// СПИСОК ЧАТОВ
// ============================================================

export function renderChatList(
    chats = []
) {

    const container =
        getElement(
            "chatContactsList"
        );


    if (!container) {
        return;
    }


    const user =
        getCurrentUser();


    if (!chats.length) {

        container.innerHTML = `
            <div class="tj-chat-list-empty">
                <div>💬</div>
                <p>У вас пока нет чатов.</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        chats.map(
            chat => {

                const isBuyer =
                    chat.buyerUid ===
                    user?.uid;


                const otherName =
                    isBuyer
                        ? chat.sellerName
                        : chat.buyerName;


                const initial =
                    getInitial(
                        otherName
                    );


                return `
                    <button
                        type="button"
                        class="tj-chat-contact"
                        onclick="openExistingChat('${escapeHtml(
                            chat.id
                        )}')"
                    >

                        <div class="tj-chat-contact-avatar">
                            ${initial}
                        </div>

                        <div class="tj-chat-contact-info">

                            <strong>
                                ${escapeHtml(
                                    otherName ||
                                    "Пользователь"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    chat.adTitle ||
                                    "Чат"
                                )}
                            </span>

                            ${
                                chat.lastMessage
                                    ? `
                                        <small>
                                            ${escapeHtml(
                                                chat.lastMessage
                                            )}
                                        </small>
                                      `
                                    : ""
                            }

                        </div>

                    </button>
                `;
            }
        )
        .join("");
}


// ============================================================
// ОТКРЫТИЕ СУЩЕСТВУЮЩЕГО ЧАТА
// ============================================================

export async function openExistingChat(
    chatId
) {

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


    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    CHATS_COLLECTION,
                    chatId
                )
            );


        if (!snapshot.exists()) {

            showNotificationSafe(
                "Чат не найден."
            );

            return;
        }


        const chat = {
            id:
                snapshot.id,

            ...snapshot.data()
        };


        if (
            !Array.isArray(
                chat.participants
            ) ||
            !chat.participants.includes(
                user.uid
            )
        ) {

            showNotificationSafe(
                "У вас нет доступа к этому чату."
            );

            return;
        }


        currentChatId =
            chatId;


        const isBuyer =
            chat.buyerUid ===
            user.uid;


        const otherName =
            isBuyer
                ? chat.sellerName
                : chat.buyerName;


        const header =
            getElement(
                "chatHeader"
            );


        if (header) {

            header.innerHTML = `
                <div class="tj-chat-header-avatar">
                    ${getInitial(
                        otherName
                    )}
                </div>

                <div class="tj-chat-header-info">

                    <div class="tj-chat-header-name">
                        ${escapeHtml(
                            otherName ||
                            "Пользователь"
                        )}
                    </div>

                    <div class="tj-chat-header-subtitle">
                        ${escapeHtml(
                            chat.adTitle ||
                            "Чат"
                        )}
                    </div>

                </div>
            `;
        }


        if (
            typeof window.showPage ===
            "function"
        ) {
            window.showPage(
                "messages"
            );
        }


        listenToMessages(
            chatId
        );


    } catch (error) {

        console.error(
            "Ошибка открытия существующего чата:",
            error
        );

        showNotificationSafe(
            "Не удалось открыть чат."
        );
    }
}


// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

export function initChat() {

    const input =
        getElement(
            "chatMessageInput"
        );


    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendChatMessage();
                }
            }
        );
    }


    const user =
        getCurrentUser();


    if (user) {
        startChatsRealtimeListener();
    }


    console.log(
        "TJWORK Chat module загружен."
    );
}


// ============================================================
// GLOBAL FUNCTIONS
// Совместимость с onclick="" в index.html
// ============================================================

window.sendChatMessage =
    sendChatMessage;

window.openAdChat =
    openAdChat;

window.openExistingChat =
    openExistingChat;

window.closeChat =
    closeChat;

window.createChat =
    createChat;

window.sendMessage =
    sendMessage;

window.listenToMessages =
    listenToMessages;

window.loadUserChats =
    loadUserChats;

window.renderChatList =
    renderChatList;

window.renderMessages =
    renderMessages;

window.initChat =
    initChat;