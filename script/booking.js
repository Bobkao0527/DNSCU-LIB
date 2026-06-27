// ==========================================
// 空間預約與 2D 方塊座位地圖模組 (booking.js)
// ==========================================

function enterSelfStudyMap() {
    document.getElementById('booking-lobby').classList.add('hidden');
    document.getElementById('booking-selfstudy').classList.remove('hidden');
    loadMapData();
}

function backToBookingLobby() {
    document.getElementById('booking-selfstudy').classList.add('hidden');
    document.getElementById('booking-lobby').classList.remove('hidden');
}

function bookGroupSpace(spaceName) {
    guardAction(() => {
        showSimulationToast(spaceName);
    });
}

// 異步讀取 Minecraft 自習室物理實體地圖 CSV (百分之百即時讀取雲端)
async function loadMapData() {
    try {
        updateMapStatus(true, "遠端連線中...", "正在載入 52 x 77 物理地圖空間...");
        const response = await fetch(window.MAP_CSV_URL);
        if (!response.ok) throw new Error("無法連接遠端地圖 CSV");
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: false,
            skipEmptyLines: false,
            complete: function (results) {
                processCSVGrid(results.data);
            }
        });
    } catch (error) {
        console.error(error);
        updateMapStatus(false, "離線狀態", "⚠️ 雲端地圖載入失敗，目前處於離線狀態。");
        document.getElementById('loadingOverlay').innerHTML = `
            <div class="text-center p-6 space-y-2">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 text-3xl"></i>
                <p class="text-sm font-semibold text-slate-700">雲端地圖加載失敗</p>
                <p class="text-xs text-slate-500">請確認您的網路連線或稍後再試。</p>
            </div>
        `;
    }
}

// 更新上方的地圖同步狀態點
function updateMapStatus(isOnline, shortText, longText) {
    const statusMsg = document.getElementById('mapStatusMessage');
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    if (statusMsg) statusMsg.textContent = longText;
    if (statusText) statusText.textContent = shortText;

    if (statusDot) {
        statusDot.classList.remove('bg-emerald-400', 'bg-red-400', 'animate-pulse');
        if (isOnline) {
            statusDot.classList.add('bg-emerald-400');
        } else {
            statusDot.classList.add('bg-red-400', 'animate-pulse');
        }
    }
}

// 解析 CSV 的座標矩陣數據 (支援安全解密，不依賴任何 LocalCache)
function processCSVGrid(rows) {
    window.csvOccupiedSeats = {};
    window.gridMatrix = [];
    const targetRows = rows.slice(0, 77);

    targetRows.forEach((row) => {
        const parsedRow = [];
        for (let c = 0; c < 52; c++) {
            let cellVal = (row[c] || '').trim();
            if (cellVal.includes('-')) {
                const parts = cellVal.split('-');
                const seatId = parts[0].trim();
                const encryptedPlayerName = parts[1].trim();
                
                // 【地圖安全解密】即時解密 CSV 當中存放的玩家 ID 安全碼
                const decryptedPlayerName = decryptUsername(encryptedPlayerName) || "未知佔用者";
                
                window.csvOccupiedSeats[seatId] = decryptedPlayerName;
                parsedRow.push(seatId);
            } else {
                parsedRow.push(cellVal);
            }
        }
        window.gridMatrix.push(parsedRow);
    });

    while (window.gridMatrix.length < 77) {
        window.gridMatrix.push(Array(52).fill(""));
    }

    // 移除原有的 cleanLocalCacheWithRemote 混淆防護
    document.getElementById('loadingOverlay').classList.add('hidden');
    updateMapStatus(true, "同步成功", "9F 自習室實體地圖系統運作中");

    renderGridMap();
    calculateMapStatistics();
}

// 判定座位是否被佔用 (完全依賴雲端 CSV 資料)
function checkSeatOccupied(seatId) {
    return !!window.csvOccupiedSeats[seatId];
}

function getSeatOccupantName(seatId) {
    return window.csvOccupiedSeats[seatId] || null;
}

// 統計自習室使用率 (即時運算)
function calculateMapStatistics() {
    let totalSeats = 0;
    let availableA = 0;
    let availableB = 0;
    let occupied = 0;

    window.gridMatrix.forEach(row => {
        row.forEach(cell => {
            if (!cell || cell === 'T' || cell === 'L') return;
            totalSeats++;
            const isOccupied = checkSeatOccupied(cell);
            if (isOccupied) {
                occupied++;
            } else {
                if (cell.startsWith('A')) availableA++;
                if (cell.startsWith('B')) availableB++;
            }
        });
    });

    const freeSeats = availableA + availableB;
    const rate = totalSeats > 0 ? ((occupied / totalSeats) * 100).toFixed(1) : '0.0';

    document.getElementById('statTotal').textContent = totalSeats;
    document.getElementById('statTypeA').textContent = availableA;
    document.getElementById('statTypeB').textContent = availableB;
    document.getElementById('statOccupied').textContent = occupied;
    document.getElementById('statUsageRate').textContent = rate;

    const homeRate = document.getElementById('home-seat-rate');
    const homeDesc = document.getElementById('home-seat-free-desc');
    const lobbyFree = document.getElementById('lobby-free-seats');

    if (homeRate) homeRate.innerText = rate;
    if (homeDesc) homeDesc.innerText = `餘位 ${freeSeats} 席・在線人數同步中`;
    if (lobbyFree) lobbyFree.innerText = freeSeats;

    checkMySeatStatus();
}

// 檢查當前登入者是否已在自習室劃位 (直接自雲端資料比對，完全不使用 LocalCache)
function checkMySeatStatus() {
    let mySeatId = "未登記";
    if (window.currentUser) {
        const loggedInUser = window.currentUser.username.toLowerCase();
        Object.keys(window.csvOccupiedSeats).forEach(seatId => {
            const occupant = window.csvOccupiedSeats[seatId];
            if (occupant && occupant.toLowerCase() === loggedInUser) {
                mySeatId = `9F - ${seatId}`;
            }
        });
    }
    const seatBadge = document.getElementById('home-seat-badge');
    if (seatBadge) {
        seatBadge.innerText = mySeatId;
    }
}

function calculateLobbySeats() {
    const lobbyFree = document.getElementById('lobby-free-seats');
    if (lobbyFree && (lobbyFree.innerText === '--' || lobbyFree.innerText === '0')) {
        lobbyFree.innerText = "0";
    }
}

// 實體繪製 52x77 二維方塊座位地圖
function renderGridMap() {
    const container = document.getElementById('seatGridContainer');
    if (!container) return;
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(52, minmax(28px, 1fr))`;

    const fragment = document.createDocumentFragment();

    window.gridMatrix.forEach((row, rIndex) => {
        row.forEach((cell, cIndex) => {
            const blockX = window.BASE_X + cIndex;
            const blockY = window.BASE_Y;
            const blockZ = window.BASE_Z + rIndex;

            const cellEl = document.createElement('div');
            cellEl.className = "grid-cell rounded-[3px] flex flex-col items-center justify-center text-[8px] font-bold select-none relative ";

            if (!cell) {
                cellEl.className += "bg-slate-100/10 border border-dashed border-slate-200/20 text-transparent";
            } else if (cell === 'T') {
                cellEl.className += "bg-nscu-table border border-amber-950/40 cursor-default";
            } else if (cell === 'L') {
                cellEl.className += "bg-nscu-lobby border border-black/40 cursor-default";
            } else {
                cellEl.dataset.seatId = cell;
                cellEl.dataset.x = blockX;
                cellEl.dataset.y = blockY;
                cellEl.dataset.z = blockZ;

                const isOccupied = checkSeatOccupied(cell);
                let typeClass = "";

                if (isOccupied) {
                    typeClass = "bg-slate-200 border border-slate-300 text-slate-500 hover:bg-slate-300 cursor-pointer shadow-sm";
                } else {
                    if (cell.startsWith('A')) {
                        typeClass = "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:-translate-y-0.5 cursor-pointer shadow-sm";
                    } else if (cell.startsWith('B')) {
                        typeClass = "bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100 hover:-translate-y-0.5 cursor-pointer shadow-sm";
                    }
                }

                cellEl.className += ` ${typeClass}`;
                cellEl.onclick = () => openSeatModal(cell, blockX, blockY, blockZ);
                cellEl.innerHTML = `<span class="scale-90 transform">${cell}</span>`;
            }
            fragment.appendChild(cellEl);
        });
    });
    container.appendChild(fragment);
}

// 篩選與高亮座位搜尋
function highlightOnMap() {
    const query = document.getElementById('mapSearch').value.toLowerCase().trim();
    const cells = document.querySelectorAll('#seatGridContainer > .grid-cell');
    cells.forEach(cell => {
        const seatId = cell.dataset.seatId;
        if (!seatId) {
            cell.style.opacity = query ? "0.1" : "1";
            return;
        }
        if (!query) {
            cell.style.opacity = "1";
            cell.style.filter = "none";
            cell.style.transform = "none";
            return;
        }
        if (seatId.toLowerCase().includes(query)) {
            cell.style.opacity = "1";
            cell.style.filter = "drop-shadow(0 0 4px rgba(245, 158, 11, 0.9))";
            cell.style.transform = "scale(1.15)";
            cell.style.zIndex = "10";
        } else {
            cell.style.opacity = "0.15";
            cell.style.filter = "grayscale(80%)";
            cell.style.transform = "none";
            cell.style.zIndex = "1";
        }
    });
}

// 地圖縮放功能
function changeZoom(delta) {
    window.zoomLevel = Math.max(0.3, Math.min(1.8, window.zoomLevel + delta));
    document.getElementById('zoomPercent').textContent = `${Math.round(window.zoomLevel * 100)}%`;
    document.getElementById('seatGridContainer').style.transform = `scale(${window.zoomLevel})`;
}

// 開啟劃位登錄彈窗 (受安全守衛保護)
function openSeatModal(seatId, x, y, z) {
    guardAction(() => {
        window.selectedCell = { seatId, x, y, z };
        const modal = document.getElementById('seatModal');
        const container = document.getElementById('seatModalContainer');
        const badge = document.getElementById('modalSeatBadge');
        const title = document.getElementById('modalSeatId');
        const statusText = document.getElementById('modalStatusText');
        const headerBg = document.getElementById('modalHeaderBg');

        document.getElementById('formSection').classList.add('hidden');
        document.getElementById('detailsSection').classList.add('hidden');
        toggleCancelForm(false);

        title.textContent = `座位 ${seatId}`;
        document.getElementById('modalCoords').textContent = `${x}, ${y}, ${z}`;
        const isOccupied = checkSeatOccupied(seatId);

        if (seatId.startsWith('A')) {
            badge.textContent = "一般單人席";
            badge.className = "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/20";
        } else {
            badge.textContent = "筆電禁用座位";
            badge.className = "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-400/30 text-blue-100";
        }

        if (isOccupied) {
            headerBg.className = "bg-gradient-to-r from-slate-600 to-slate-700 text-white p-5 relative";
            statusText.innerHTML = '<i class="fa-solid fa-user-lock"></i> 座位已被使用 (隱私保護中)';
            document.getElementById('detailsSection').classList.remove('hidden');

            const cancelInput = document.getElementById('cancelNameInput');
            if (cancelInput) {
                cancelInput.value = window.currentUser.username;
                cancelInput.disabled = true;
            }
        } else {
            headerBg.className = "bg-gradient-to-r from-nscu-green to-nscu-darkgreen text-white p-5 relative";
            statusText.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-300"></i> 空閒開放登記中';
            document.getElementById('formSection').classList.remove('hidden');

            const regInput = document.getElementById('regName');
            if (regInput) {
                regInput.value = window.currentUser.username;
                regInput.disabled = true;
            }
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.replace('opacity-0', 'opacity-100');
            container.classList.replace('scale-95', 'scale-100');
        }, 10);
    });
}

function closeSeatModal() {
    const modal = document.getElementById('seatModal');
    const container = document.getElementById('seatModalContainer');
    modal.classList.replace('opacity-100', 'opacity-0');
    container.classList.replace('scale-100', 'scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        window.selectedCell = null;
    }, 150);
}

function toggleCancelForm(show) {
    const btn = document.getElementById('showCancelFormBtn');
    const inputArea = document.getElementById('cancelFormInput');
    if (show) {
        btn.classList.add('hidden');
        inputArea.classList.remove('hidden');
    } else {
        btn.classList.remove('hidden');
        inputArea.classList.add('hidden');
    }
}

// 儲存劃位 (支援安全加密，移除了 LocalStorage)
async function saveRegistration() {
    if (!window.selectedCell) return;
    const mcId = document.getElementById('regName').value.trim();
    if (!mcId) {
        showToast("⚠️ 請先登入您的 Minecraft 帳號！", "warning");
        return;
    }

    // 樂觀 UI 渲染：先暫存於瀏覽器記憶體中 (不存入 LocalStorage)，提供零遲延反饋
    window.csvOccupiedSeats[window.selectedCell.seatId] = mcId;
    
    closeSeatModal();
    renderGridMap();
    calculateMapStatistics();

    // 將劃位玩家 ID 加密為 Hex 字串後傳送至 Apps Script 寫入地圖 Google Sheet
    const encryptedMcId = encryptUsername(mcId);

    try {
        await fetch(window.APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ seatId: window.selectedCell.seatId, minecraftId: encryptedMcId, action: 'register' })
        });
        
        showToast(`🎉 成功登記座位 ${window.selectedCell.seatId}！`);
        
        // 延遲 1.5 秒重新自雲端獲取最新 CSV，確保資料無縫對齊
        setTimeout(() => {
            loadMapData();
        }, 1500);
    } catch (e) {
        console.error("雲端劃位失敗:", e);
        showToast("⚠️ 雲端劃位連線失敗", "warning");
    }
}

// 取消劃位 (移除了 LocalStorage)
async function confirmCancelRegistration() {
    if (!window.selectedCell) return;
    const inputMcId = document.getElementById('cancelNameInput').value.trim();
    if (!inputMcId) {
        showToast("⚠️ 驗證玩家身分失敗！", "warning");
        return;
    }

    const currentOccupant = getSeatOccupantName(window.selectedCell.seatId);

    // 驗證是否為劃位玩家本人
    if (window.currentUser.username.toLowerCase() !== inputMcId.toLowerCase() ||
        (currentOccupant && currentOccupant.toLowerCase() !== window.currentUser.username.toLowerCase())) {
        showToast("❌ 身分驗證失敗！您無權限退還此座位。", "error");
        return;
    }

    // 樂觀 UI 渲染：先在瀏覽器記憶體中釋放座位 (不存入 LocalStorage)
    delete window.csvOccupiedSeats[window.selectedCell.seatId];
    
    closeSeatModal();
    renderGridMap();
    calculateMapStatistics();

    const encryptedMcId = encryptUsername(inputMcId);

    try {
        // 發送 API 釋放座位
        await fetch(`${window.APPS_SCRIPT_URL}?action=cancel&seatId=${encodeURIComponent(window.selectedCell.seatId)}&minecraftId=${encodeURIComponent(encryptedMcId)}`, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        showToast(`🧹 座位 ${window.selectedCell.seatId} 已恢復空閒。`);
        
        // 延遲 1.5 秒重新自雲端獲取最新 CSV，確保與 Google Sheets 後端一致
        setTimeout(() => {
            loadMapData();
        }, 1500);
    } catch (e) {
        console.error("雲端釋放座位失敗:", e);
        showToast("⚠️ 雲端釋放連線失敗", "error");
    }
}

// 複製自習室傳送座標
function copyMinecraftAction(type) {
    if (!selectedCell) return;
    const { x, y, z } = selectedCell;
    const textToCopy = type === 'tp' ? `/tp @s ${x} ${y} ${z}` : `${x} ${y} ${z}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`📋 已複製：${textToCopy}`);
    });
}

// 匯出至全域
window.enterSelfStudyMap = enterSelfStudyMap;
window.backToBookingLobby = backToBookingLobby;
window.bookGroupSpace = bookGroupSpace;
window.loadMapData = loadMapData;
window.highlightOnMap = highlightOnMap;
window.changeZoom = changeZoom;
window.openSeatModal = openSeatModal;
window.closeSeatModal = closeSeatModal;
window.toggleCancelForm = toggleCancelForm;
window.saveRegistration = saveRegistration;
window.confirmCancelRegistration = confirmCancelRegistration;
window.copyMinecraftAction = copyMinecraftAction;
window.checkMySeatStatus = checkMySeatStatus;
window.calculateLobbySeats = calculateLobbySeats;