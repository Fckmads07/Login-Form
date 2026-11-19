// Gestion des comptes et de la session, entièrement côté navigateur (localStorage).
// - Les comptes créés sur register.html sont gardés dans localStorage (le mot de passe est haché).
// - "Remember Me" coché : la session est gardée dans localStorage, donc l'utilisateur
//   est connecté directement à sa prochaine visite, même après avoir fermé le navigateur.
// - "Remember Me" décoché : la session est gardée dans sessionStorage (effacée à la fermeture de l'onglet).

const USERS_KEY = 'loginform_users';
const SESSION_KEY = 'loginform_session';
const LAST_USER_KEY = 'loginform_last_username';

function readJSON(storage, key, fallback) {
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJSON(storage, key, value) {
    try {
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    if (window.crypto && crypto.subtle) {
        const buffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    // Repli simple si crypto.subtle n'est pas disponible
    let h = 0;
    for (const byte of data) h = (h * 31 + byte) | 0;
    return 'fallback-' + h;
}

function getUsers() {
    return readJSON(localStorage, USERS_KEY, []);
}

function findUser(username) {
    const name = username.trim().toLowerCase();
    return getUsers().find(u => u.username.toLowerCase() === name);
}

async function registerUser(username, email, password) {
    if (findUser(username)) {
        return { ok: false, error: 'This username is already taken.' };
    }
    const users = getUsers();
    users.push({
        username: username.trim(),
        email: email.trim(),
        passwordHash: await hashPassword(password),
        createdAt: new Date().toISOString()
    });
    if (!writeJSON(localStorage, USERS_KEY, users)) {
        return { ok: false, error: 'Unable to save your account in this browser.' };
    }
    return { ok: true };
}

async function loginUser(username, password, remember) {
    const user = findUser(username);
    if (!user) {
        return { ok: false, error: 'No account found. Please register first.' };
    }
    if (user.passwordHash !== await hashPassword(password)) {
        return { ok: false, error: 'Incorrect password.' };
    }
    startSession(user.username, remember);
    return { ok: true };
}

function startSession(username, remember) {
    const session = { username, loggedInAt: new Date().toISOString() };
    clearSession();
    writeJSON(remember ? localStorage : sessionStorage, SESSION_KEY, session);
    try { localStorage.setItem(LAST_USER_KEY, username); } catch (e) {}
}

function getSession() {
    const session = readJSON(localStorage, SESSION_KEY, null) || readJSON(sessionStorage, SESSION_KEY, null);
    // La session n'est valide que si le compte existe toujours
    if (session && findUser(session.username)) return session;
    return null;
}

function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
}

function getLastUsername() {
    try { return localStorage.getItem(LAST_USER_KEY) || ''; } catch (e) { return ''; }
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.className = 'message ' + type;
}
