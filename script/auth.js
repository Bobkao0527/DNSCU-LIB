// ==========================================
// SSO 身份驗證與安全守衛 (Dolphin SSO Engine)
// ==========================================

// 處理 SSO Token 擷取與過期校驗
async function handleSSOAuth() {
    let token = null;
    const hash = window.location.hash;

    // 1. 偵測網址列 Hash 是否有 Token 跳回
    if (hash && hash.startsWith('#token=')) {
        token = hash.split('#token=')[1];
        localStorage.setItem('mc_auth_token', token);
        try {
            // 清除網址 Hash，維持網址乾淨
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch (e) {
            console.warn("無法清除網址 Hash (沙盒安全限制):", e);
        }
    } else {
        // 2. 嘗試讀取本地快取 Token
        token = localStorage.getItem('mc_auth_token');
    }

    if (!token) {
        setGuestMode();
        return;
    }

    // 3. 向驗證伺服器確認 token 效期
    try {
        const response = await fetch(window.SSO_VERIFY_API, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.valid) {
                window.currentUser = {
                    username: data.username, // 這裡自驗證 API 拿回的仍是明文玩家 ID
                    expiresAt: data.expiresAt,
                    token: token
                };
                
                // 動態對接 Google Sheet 使用者資料庫進行隨機證號同步 (內部自動完成安全加解密比對)
                await checkAndSyncUser(data.username);
                setLoginMode(window.currentUser);
            } else {
                console.warn("SSO Token 已過期或不合法。");
                logoutSilently();
            }
        } else {
            setGuestMode();
        }
    } catch (err) {
        console.error("SSO 驗證通訊異常:", err);
        setGuestMode();
    }
}

// 登入成功 UI 渲染
function setLoginMode(user) {
    const authArea = document.getElementById('nav-auth-area');
    if (authArea) {
        authArea.innerHTML = `
            <button onclick="logout()" class="flex items-center space-x-2 bg-white hover:bg-nscu-50 border border-white px-4 py-2 rounded-xl text-sm font-bold text-nscu-500 transition-all shadow-md active:scale-95">
                <i data-lucide="log-out" class="w-4 h-4 text-red-600"></i>
                <span class="text-red-600">登出 (${user.username})</span>
            </button>
        `;
    }

    // 更新首頁讀者資訊摘要卡
    const placeholder = document.getElementById('user-avatar-placeholder');
    if (placeholder) {
        placeholder.innerHTML = `<img src="https://minotar.net/avatar/${user.username}/48" class="w-full h-full object-cover">`;
        placeholder.className = "w-12 h-12 rounded-full border border-white/30 bg-white/10 flex items-center justify-center overflow-hidden";
    }
    
    document.getElementById('user-profile-name').textContent = user.username;
    
    const profileBadge = document.getElementById('user-profile-badge');
    profileBadge.textContent = "SSO 認證";
    profileBadge.className = "text-[9px] bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono";
    
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

    const barcode = document.getElementById('barcode-text');
    if (barcode) {
        // 顯示雲端下載下來的隨機證號
        barcode.textContent = window.currentUserCardNumber || user.username;
    }

    lucide.createIcons();
    if (typeof checkMySeatStatus === 'function') checkMySeatStatus();
    if (typeof renderMyBorrowedList === 'function') renderMyBorrowedList();
}

// 訪客模式 UI 恢復
function setGuestMode() {
    window.currentUser = null;
    window.currentUserCardNumber = "";
    window.currentUserBorrowDict = {};

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
    if (placeholder) {
        placeholder.innerHTML = `<span class="font-bold text-lg text-white">訪</span>`;
        placeholder.className = "w-12 h-12 rounded-full border border-white/30 p-1 bg-white/10 flex items-center justify-center";
    }
    
    document.getElementById('user-profile-name').textContent = "未登入讀者";
    
    const profileBadge = document.getElementById('user-profile-badge');
    profileBadge.textContent = "GUEST";
    profileBadge.className = "text-[9px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded font-mono";
    
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

    const barcode = document.getElementById('barcode-text');
    if (barcode) {
        barcode.textContent = "GUEST-TOKEN";
    }

    lucide.createIcons();
    if (typeof checkMySeatStatus === 'function') checkMySeatStatus();
    if (typeof renderMyBorrowedList === 'function') renderMyBorrowedList();
}

// 跳轉到 SSO 系統
function redirectToSSO() {
    let callbackUrl = window.location.origin + window.location.pathname;

    if (callbackUrl.startsWith('file:') || callbackUrl.includes('null/') || callbackUrl.startsWith('blob:')) {
        showToast("⚠️ 請先將網頁檔案上傳至伺服器或 GitHub Pages 後再進行登入跳轉！", "warning");
        return;
    }

    window.location.href = `${window.SSO_PORTAL_URL}?returnUrl=${encodeURIComponent(callbackUrl)}`;
}

// 登出機制
function logout() {
    localStorage.removeItem('mc_auth_token');
    setGuestMode();
    showToast("🧹 已成功登出帳號，清除認證憑證。");
}

function logoutSilently() {
    localStorage.removeItem('mc_auth_token');
    setGuestMode();
}

// 身份驗證攔截守衛
function guardAction(actionCallback) {
    if (!window.currentUser) {
        showToast("⚠️ 此操作需要登入身份驗證！正在為您導向登入大廳...", "warning");
        setTimeout(() => {
            redirectToSSO();
        }, 1200);
        return false;
    }
    if (actionCallback) actionCallback();
    return true;
}

// 動態對接並登錄 Google Sheet 使用者資料庫
async function checkAndSyncUser(username) {
    try {
        const response = await fetch(window.USER_DB_CSV_URL);
        const csvText = await response.text();
        
        let userFound = false;
        let matchedCardNumber = "";
        let matchedBorrowDictStr = "{}";

        Papa.parse(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                const rows = results.data;
                for (let i = 0; i < rows.length; i++) {
                    if (rows[i][0]) {
                        // 【解密比對】解密 CSV 當中的加密使用者名稱 hexStr
                        const decryptedUser = decryptUsername(rows[i][0].trim());
                        if (decryptedUser && decryptedUser.toLowerCase() === username.trim().toLowerCase()) {
                            userFound = true;
                            matchedCardNumber = rows[i][1];
                            matchedBorrowDictStr = rows[i][2] || "{}";
                            break;
                        }
                    }
                }
            }
        });

        if (userFound) {
            console.log(`[系統] 找到現有用戶：${username}`);
            window.currentUserCardNumber = matchedCardNumber;
            try {
                window.currentUserBorrowDict = JSON.parse(matchedBorrowDictStr);
            } catch (e) {
                console.error("[系統] 字典解析失敗，重設為空字典", e);
                window.currentUserBorrowDict = {};
            }
            showToast(`歡迎回來！已同步您的借閱證號：${window.currentUserCardNumber}`, "success");
        } else {
            console.log(`[系統] 未發現此用戶，建立新加密帳戶中...`);
            const randomCardNum = "LIB" + Math.floor(100000 + Math.random() * 900000);
            const emptyDictStr = "{}";
            
            window.currentUserCardNumber = randomCardNum;
            window.currentUserBorrowDict = {};

            // 【加密寫入】將明文 ID 加密後再傳給 Google Apps Script 寫入後台
            await writeNewUserToSheet(username, randomCardNum, emptyDictStr);
            showToast(`新帳戶建立成功！您的卡號為：${randomCardNum}`, "success");
        }
    } catch (error) {
        console.error("[系統] 同步使用者資料時發生錯誤:", error);
        showToast("無法同步雲端帳戶資料，改以離線模式暫存", "warning");
    }
}

// 呼叫 Google Apps Script 寫入新帳戶資料 (自動進行安全加密)
async function writeNewUserToSheet(username, cardNumber, dictStr) {
    try {
        // 將明文玩家 ID 加密成 Hex 安全碼再寫入
        const encryptedUser = encryptUsername(username);

        await fetch(window.USER_DB_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: encryptedUser, // 傳送加密後的玩家 ID
                cardNumber: cardNumber,
                borrowDict: dictStr
            })
        });
        console.log("[系統] 新用戶加密寫入請求已送出");
    } catch (e) {
        console.error("[系統] 寫入 Google Sheet 失敗", e);
    }
}

// 輸出至 window 全域命名空間以相容 HTML 的 inline 事件
window.handleSSOAuth = handleSSOAuth;
window.setLoginMode = setLoginMode;
window.setGuestMode = setGuestMode;
window.redirectToSSO = redirectToSSO;
window.logout = logout;
window.logoutSilently = logoutSilently;
window.guardAction = guardAction;
window.checkAndSyncUser = checkAndSyncUser;