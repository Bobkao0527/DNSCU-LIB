// ==========================================
// 核心 SPA 單頁面路由切換與事件控制中心
// ==========================================

// 單頁應用 (SPA) 視圖控制切換
function switchView(viewName) {
    document.querySelectorAll('.view-panel').forEach(el => el.classList.replace('block', 'hidden'));

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) {
        activePanel.classList.replace('hidden', 'block');
    }

    // 更新導覽按鈕高亮
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = "nav-btn px-4 py-2 rounded-lg text-sm font-medium text-nscu-100 hover:text-white hover:bg-nscu-600 transition-all";
    });
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) {
        activeBtn.className = "nav-btn px-4 py-2 rounded-lg text-sm font-bold text-nscu-500 bg-white shadow-sm";
    }

    // 更新行動端導覽按鈕高亮
    document.querySelectorAll('[id^="mob-nav-"]').forEach(btn => {
        btn.className = "flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-nscu-100 hover:bg-nscu-700 transition-all";
    });
    const activeMobBtn = document.getElementById(`mob-nav-${viewName}`);
    if (activeMobBtn) {
        activeMobBtn.className = "flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-nscu-500 bg-white shadow-sm";
    }

    // 視圖初始化載入
    if (viewName === 'database' && window.booksData.length === 0) {
        loadLibraryDatabase();
    }
    if (viewName === 'booking') {
        backToBookingLobby();
        calculateLobbySeats();
    }
    if (viewName === 'barb') {
        renderBarbQuickList();
    }
}

// 行動端漢堡選單開關
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');
    if (mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.remove('hidden');
        menuIcon.setAttribute('data-lucide', 'x');
        menuIcon.classList.add('rotate-90');
    } else {
        mobileMenu.classList.add('hidden');
        menuIcon.setAttribute('data-lucide', 'menu');
        menuIcon.classList.remove('rotate-90');
    }
    lucide.createIcons();
}

// 虛擬學生證卡片開關
function toggleLibraryCard() {
    const modal = document.getElementById('library-card-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('card-modal-content').classList.replace('scale-95', 'scale-100');
        }, 10);
    } else {
        document.getElementById('card-modal-content').classList.replace('scale-100', 'scale-95');
        setTimeout(() => { modal.classList.add('hidden'); }, 150);
    }
}

// 輕提示彈窗 (Toast)
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const icon = document.getElementById('toast-icon');

    if (!toast || !toastMsg || !icon) return;

    toastMsg.textContent = message;
    if (type === "success") {
        icon.className = "fa-solid fa-check-circle text-emerald-400";
    } else if (type === "warning") {
        icon.className = "fa-solid fa-triangle-exclamation text-amber-400";
    } else {
        icon.className = "fa-solid fa-circle-xmark text-rose-500";
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
}

// 預約完成之模擬輕提示
function showSimulationToast(spaceName) {
    showToast(`⚙️ [預約成功] 成功提交 ${spaceName} 的預約申請！`, "success");
}

// 外部點擊 Modal 主體時關閉處理
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('bookModal')) {
        if (typeof closeModal === 'function') closeModal();
    }
    if (e.target === document.getElementById('seatModal')) {
        if (typeof closeSeatModal === 'function') closeSeatModal();
    }
});

// 雙擊自習室地圖區域重置縮放比例 (90%)
const mapViewport = document.getElementById('mapViewport');
if (mapViewport) {
    mapViewport.addEventListener('dblclick', () => {
        window.zoomLevel = 0.9;
        const percentEl = document.getElementById('zoomPercent');
        const gridContainer = document.getElementById('seatGridContainer');
        if (percentEl) percentEl.textContent = "90%";
        if (gridContainer) gridContainer.style.transform = "scale(0.9)";
        showToast("🔍 地圖比例已重置為 90%");
    });
}

// ==========================================
// 初始化程序與背景載入 (Onload)
// ==========================================
window.onload = async function () {
    lucide.createIcons();

    // 1. 優先處理 SSO 認證與登入狀態判定
    if (typeof handleSSOAuth === 'function') {
        await handleSSOAuth();
    }

    // 2. 載入 Google Sheets 首頁配置 (公告、指南、開館時間)
    if (typeof fetchHomeSheetData === 'function') {
        fetchHomeSheetData();
    }

    // 3. 背景載入圖書資料庫與指標計算
    if (typeof loadLibraryDatabase === 'function') {
        loadLibraryDatabase();
    }

    // 4. 背景載入自習室座標與地圖資訊
    if (typeof loadMapData === 'function') {
        loadMapData();
    }

    // 5. 初始化個人借閱明細與狀態同步
    if (typeof syncGlobalLibraryState === 'function') {
        syncGlobalLibraryState();
    }
}

// 匯出至全域
window.switchView = switchView;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleLibraryCard = toggleLibraryCard;
window.showToast = showToast;
window.showSimulationToast = showSimulationToast;