// SSO module (side-effect: attaches functions to window)
const SSO_PORTAL_URL = "https://dolphinloginsystem.pages.dev";
const SSO_VERIFY_API = "https://dolphinloginsystem.pages.dev/api/verify";
const USER_DB_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytCpjFL-42ffcPK5OHmGHVS1oc2cWwuumFwoZenKMTFSPxoQhkHN6OJtoolpU1_6zy/exec";

let currentUser = null;

async function handleSSOAuth() {
    let token = null;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#token=')) {
        token = hash.split('#token=')[1];
        localStorage.setItem('mc_auth_token', token);
        try { history.replaceState(null, document.title, window.location.pathname + window.location.search); } catch (e) {}
    } else {
        token = localStorage.getItem('mc_auth_token');
    }
    if (!token) { setGuestMode(); return; }
    try {
        const response = await fetch(SSO_VERIFY_API, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            if (data.valid) { currentUser = { username: data.username, expiresAt: data.expiresAt, token: token, borrowCode: "讀取中..." }; setLoginMode(currentUser); }
            else { logoutSilently(); }
        } else { setGuestMode(); }
    } catch (err) { console.error("SSO 驗證通訊異常:", err); setGuestMode(); }
}

async function fetchUserLibraryData(username) {
    if (!USER_DB_APPS_SCRIPT_URL) { console.warn("尚未設定 USER_DB_APPS_SCRIPT_URL，僅使用本地端資料。"); return; }
    try {
        const res = await fetch(`${USER_DB_APPS_SCRIPT_URL}?action=getUser&username=${encodeURIComponent(username)}`);
        const data = await res.json();
        currentUser.borrowCode = data.borrowCode;
        const barcode = document.getElementById('barcode-text'); if (barcode) barcode.textContent = data.borrowCode;
        window.myBorrowedBooks = [];
        for (const [isbn, date] of Object.entries(data.books)) {
            const bookInfo = (window.booksData || []).find(b => b.isbn === isbn || b.id === isbn);
            if (bookInfo) window.myBorrowedBooks.push({ id: bookInfo.id, title: bookInfo.title, returnDate: date, isbn: isbn });
            else window.myBorrowedBooks.push({ id: isbn, title: `未登錄書籍 (${isbn})`, returnDate: date, isbn: isbn });
        }
        localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(window.myBorrowedBooks));
        if (window.syncGlobalLibraryState) window.syncGlobalLibraryState();
    } catch (err) { console.error("無法同步雲端使用者資料", err); }
}

async function syncBooksToBackend() {
    if (!currentUser || !USER_DB_APPS_SCRIPT_URL) return;
    const booksDict = {};
    (window.myBorrowedBooks || []).forEach(b => { const key = b.isbn || b.id; if (key) booksDict[key] = b.returnDate; });
    try { fetch(USER_DB_APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'syncBooks', username: currentUser.username, books: booksDict }) }); } catch (err) { console.error("背景上傳借閱資料至雲端失敗", err); }
}

function setLoginMode(user) {
    fetchUserLibraryData(user.username);
    const authArea = document.getElementById('nav-auth-area');
    if (authArea) {
        authArea.innerHTML = `
            <button onclick="logout()" class="flex items-center space-x-2 bg-white hover:bg-nscu-50 border border-white px-4 py-2 rounded-xl text-sm font-bold text-nscu-500 transition-all shadow-md active:scale-95">
                <i data-lucide="log-out" class="w-4 h-4 text-red-600"></i>
                <span class="text-red-600">登出 (${user.username})</span>
            </button>
        `;
    }
    const placeholder = document.getElementById('user-avatar-placeholder');
    if (placeholder) { placeholder.innerHTML = `<img src="https://minotar.net/avatar/${user.username}/48" class="w-full h-full object-cover">`; placeholder.className = "w-12 h-12 rounded-full border border-white/30 bg-white/10 flex items-center justify-center overflow-hidden"; }
    document.getElementById('user-profile-name').textContent = user.username;
    document.getElementById('user-profile-badge').textContent = "SSO 認證";
    document.getElementById('user-profile-badge').className = "text-[9px] bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono";
    document.getElementById('user-profile-sub').textContent = "Minecraft 官方認證玩家";
    const cardAction = document.getElementById('user-card-action-container');
    if (cardAction) {
        cardAction.innerHTML = `
            <p class="text-center text-[10px] text-nscu-200/80 mb-2">安全認證憑證有效中</p>
            <button onclick="logout()" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm">
                <i data-lucide="log-out" class="w-4 h-4"></i>
                登出帳號
            </button>
        `;
    }
    lucide.createIcons();
    if (window.checkMySeatStatus) window.checkMySeatStatus();
    if (window.renderMyBorrowedList) window.renderMyBorrowedList();
}

function setGuestMode() {
    currentUser = null;
    const authArea = document.getElementById('nav-auth-area');
    if (authArea) {
        authArea.innerHTML = `
            <button onclick="toggleLibraryCard()" class="flex items-center space-x-2 bg-white hover:bg-nscu-50 border border-white px-4 py-2 rounded-xl text-sm font-bold text-nscu-500 transition-all shadow-md active:scale-95">
                <i data-lucide="contact-2" class="w-4 h-4 text-nscu-500"></i>
                <span>虛擬借閱證</span>
            </button>
        `;
    }
    const placeholder = document.getElementById('user-avatar-placeholder');
    if (placeholder) { placeholder.innerHTML = `<span class="font-bold text-lg text-white">訪</span>`; placeholder.className = "w-12 h-12 rounded-full border border-white/30 p-1 bg-white/10 flex items-center justify-center"; }
    document.getElementById('user-profile-name').textContent = "未登入讀者";
    document.getElementById('user-profile-badge').textContent = "GUEST";
    document.getElementById('user-profile-badge').className = "text-[9px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded font-mono";
    document.getElementById('user-profile-sub').textContent = "請登入以使用預約與借書服務";
    const cardAction = document.getElementById('user-card-action-container');
    if (cardAction) {
        cardAction.innerHTML = `
            <button onclick="redirectToSSO()" class="w-full py-3 bg-white text-nscu-600 hover:bg-slate-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm">
                <i data-lucide="contact-2" class="w-4 h-4 text-nscu-500"></i>
                登入 Minecraft 帳號
            </button>
        `;
    }
    const barcode = document.getElementById('barcode-text'); if (barcode) barcode.textContent = "GUEST-TOKEN";
    lucide.createIcons();
    if (window.checkMySeatStatus) window.checkMySeatStatus();
    if (window.renderMyBorrowedList) window.renderMyBorrowedList();
}

function redirectToSSO() {
    let callbackUrl = window.location.origin + window.location.pathname;
    if (callbackUrl.startsWith('file:') || callbackUrl.includes('null/') || callbackUrl.startsWith('blob:')) { if (window.showToast) window.showToast("⚠️ 請先將網頁檔案上傳至伺服器或 GitHub Pages 後再進行登入跳轉！", "warning"); return; }
    window.location.href = `${SSO_PORTAL_URL}?returnUrl=${encodeURIComponent(callbackUrl)}`;
}

function logout() {
    localStorage.removeItem('mc_auth_token');
    window.myBorrowedBooks = [];
    localStorage.removeItem('NSCU_MY_BORROWED');
    setGuestMode();
    if (window.showToast) window.showToast("🧹 已成功登出帳號，清除認證憑證。");
    if (window.syncGlobalLibraryState) window.syncGlobalLibraryState();
}

function logoutSilently() { localStorage.removeItem('mc_auth_token'); setGuestMode(); }

function guardAction(actionCallback) { if (!currentUser) { if (window.showToast) window.showToast("⚠️ 此操作需要登入身份驗證！正在為您導向登入大廳...", "warning"); setTimeout(() => { redirectToSSO(); }, 1200); return false; } if (actionCallback) actionCallback(); return true; }

Object.assign(window, { handleSSOAuth, fetchUserLibraryData, syncBooksToBackend, setLoginMode, setGuestMode, redirectToSSO, logout, logoutSilently, guardAction, ssoCurrentUser: () => currentUser });
