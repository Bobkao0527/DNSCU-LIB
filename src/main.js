// Aggregator entry: import modules (they attach functions/state to window)
import './sso.js';
import './books.js';
import './map.js';
import './ui.js';

// Preserve original initialization order: library DB -> SSO -> homepage -> map -> sync UI
window.addEventListener('load', async () => {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    if (window.loadLibraryDatabase) await window.loadLibraryDatabase();
    if (window.handleSSOAuth) await window.handleSSOAuth();
    if (window.fetchHomeSheetData) window.fetchHomeSheetData();
    if (window.loadMapData) window.loadMapData();
    if (window.syncGlobalLibraryState) window.syncGlobalLibraryState();
});

// Re-export commonly used handlers to keep inline onclick compatibility (already attached by modules)
Object.assign(window, {});

async function loadMapData() {
    try {
        updateMapStatus(true, "遠端連線中...", "正在載入地圖空間...");
        const response = await fetch(MAP_CSV_URL);
        if (!response.ok) throw new Error("Connection failed");
        Papa.parse(await response.text(), { header: false, complete: function(results) { processCSVGrid(results.data); } });
    } catch (error) {
        updateMapStatus(false, "離線狀態", "⚠️ 雲端地圖載入失敗");
        const lo = document.getElementById('loadingOverlay'); if (lo) lo.classList.add('hidden');
    }
}
function updateMapStatus(isOnline, shortText, longText) { const statusMsg = document.getElementById('mapStatusMessage'); const statusText = document.getElementById('statusText'); if (statusMsg) statusMsg.textContent = longText; if (statusText) statusText.textContent = shortText; }
function processCSVGrid(rows) {
    csvOccupiedSeats = {}; gridMatrix = [];
    rows.slice(0, 77).forEach((row) => {
        const parsedRow = [];
        for (let c = 0; c < 52; c++) {
            let cellVal = (row[c] || '').trim();
            if (cellVal.includes('-')) {
                const parts = cellVal.split('-');
                csvOccupiedSeats[parts[0].trim()] = parts[1].trim();
                parsedRow.push(parts[0].trim());
            } else { parsedRow.push(cellVal); }
        }
        gridMatrix.push(parsedRow);
    });
    while (gridMatrix.length < 77) gridMatrix.push(Array(52).fill(""));
    cleanLocalCacheWithRemote();
    const lo = document.getElementById('loadingOverlay'); if (lo) lo.classList.add('hidden');
    updateMapStatus(true, "同步成功", "9F 自習室實體地圖系統運作中");
    renderGridMap(); calculateMapStatistics();
}
function cleanLocalCacheWithRemote() { let changed = false; Object.keys(localCacheOccupied).forEach(seatId => { const cacheObj = localCacheOccupied[seatId]; const isRemoteOccupied = !!csvOccupiedSeats[seatId]; const remoteOwner = csvOccupiedSeats[seatId] || ""; if (cacheObj.status === 'occupied') { if (isRemoteOccupied && remoteOwner.toLowerCase() === cacheObj.name.toLowerCase()) { delete localCacheOccupied[seatId]; changed = true; } } else if (cacheObj.status === 'free') { if (!isRemoteOccupied) { delete localCacheOccupied[seatId]; changed = true; } } }); if (changed) localStorage.setItem('NSCU_LOCAL_OCCUPIED_SEATS', JSON.stringify(localCacheOccupied)); }
function checkSeatOccupied(seatId) { if (localCacheOccupied[seatId]) { if (localCacheOccupied[seatId].status === 'occupied') return true; if (localCacheOccupied[seatId].status === 'free') return false; } return !!csvOccupiedSeats[seatId]; }
function calculateMapStatistics() { let totalSeats = 0; let availableA = 0; let availableB = 0; let occupied = 0; gridMatrix.forEach(row => { row.forEach(cell => { if (!cell || cell === 'T' || cell === 'L') return; totalSeats++; const isOccupied = checkSeatOccupied(cell); if (isOccupied) { occupied++; } else { if (cell.startsWith('A')) availableA++; if (cell.startsWith('B')) availableB++; } }); }); const freeSeats = availableA + availableB; const rate = totalSeats > 0 ? ((occupied / totalSeats) * 100).toFixed(1) : '0.0'; const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; }; setText('statTotal', totalSeats); setText('statTypeA', availableA); setText('statTypeB', availableB); setText('statOccupied', occupied); setText('statUsageRate', rate); const homeRate = document.getElementById('home-seat-rate'); const homeDesc = document.getElementById('home-seat-free-desc'); const lobbyFree = document.getElementById('lobby-free-seats'); if (homeRate) homeRate.innerText = rate; if (homeDesc) homeDesc.innerText = `餘位 ${freeSeats} 席・在線人數同步中`; if (lobbyFree) lobbyFree.innerText = freeSeats; checkMySeatStatus(); }
function checkMySeatStatus() { let mySeatId = "未登記"; if (currentUser) { Object.keys(localCacheOccupied).forEach(seatId => { if (localCacheOccupied[seatId].status === 'occupied' && localCacheOccupied[seatId].name.toLowerCase() === currentUser.username.toLowerCase()) { mySeatId = `9F - ${seatId}`; } }); } const seatBadge = document.getElementById('home-seat-badge'); if (seatBadge) seatBadge.innerText = mySeatId; }
function calculateLobbySeats() { const lobbyFree = document.getElementById('lobby-free-seats'); if (lobbyFree && (lobbyFree.innerText === '--' || lobbyFree.innerText === '0')) lobbyFree.innerText = "0"; }
function renderGridMap() {
    const container = document.getElementById('seatGridContainer'); if (!container) return; container.innerHTML = ''; container.style.gridTemplateColumns = `repeat(52, minmax(28px, 1fr))`; const fragment = document.createDocumentFragment(); gridMatrix.forEach((row, rIndex) => { row.forEach((cell, cIndex) => { const blockX = BASE_X + cIndex; const blockY = BASE_Y; const blockZ = BASE_Z + rIndex; const cellEl = document.createElement('div'); cellEl.className = "grid-cell rounded-[3px] flex flex-col items-center justify-center text-[8px] font-bold select-none relative "; if (!cell) { cellEl.className += "bg-slate-100/10 border border-dashed border-slate-200/20 text-transparent"; } else if (cell === 'T') { cellEl.className += "bg-nscu-table border border-amber-950/40 cursor-default"; } else if (cell === 'L') { cellEl.className += "bg-nscu-lobby border border-black/40 cursor-default"; } else { cellEl.dataset.seatId = cell; cellEl.dataset.x = blockX; cellEl.dataset.y = blockY; cellEl.dataset.z = blockZ; const isOccupied = checkSeatOccupied(cell); let typeClass = ""; if (isOccupied) { typeClass = "bg-slate-200 border border-slate-300 text-slate-500 hover:bg-slate-300 cursor-pointer shadow-sm"; } else { if (cell.startsWith('A')) { typeClass = "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:-translate-y-0.5 cursor-pointer shadow-sm"; } else if (cell.startsWith('B')) { typeClass = "bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100 hover:-translate-y-0.5 cursor-pointer shadow-sm"; } } cellEl.className += ` ${typeClass}`; cellEl.onclick = () => openSeatModal(cell, blockX, blockY, blockZ); cellEl.innerHTML = `<span class="scale-90 transform">${cell}</span>`; } fragment.appendChild(cellEl); }); }); container.appendChild(fragment); }
function highlightOnMap() { const query = document.getElementById('mapSearch').value.toLowerCase().trim(); const cells = document.querySelectorAll('#seatGridContainer > .grid-cell'); cells.forEach(cell => { const seatId = cell.dataset.seatId; if (!seatId) { cell.style.opacity = query ? "0.1" : "1"; return; } if (!query) { cell.style.opacity = "1"; cell.style.filter = "none"; cell.style.transform = "none"; return; } if (seatId.toLowerCase().includes(query)) { cell.style.opacity = "1"; cell.style.filter = "drop-shadow(0 0 4px rgba(245, 158, 11, 0.9))"; cell.style.transform = "scale(1.15)"; cell.style.zIndex = "10"; } else { cell.style.opacity = "0.15"; cell.style.filter = "grayscale(80%)"; cell.style.transform = "none"; cell.style.zIndex = "1"; } }); }
function changeZoom(delta) { zoomLevel = Math.max(0.3, Math.min(1.8, zoomLevel + delta)); const zp = document.getElementById('zoomPercent'); if (zp) zp.textContent = `${Math.round(zoomLevel * 100)}%`; const sg = document.getElementById('seatGridContainer'); if (sg) sg.style.transform = `scale(${zoomLevel})`; }
function openSeatModal(seatId, x, y, z) { guardAction(() => { selectedCell = { seatId, x, y, z }; const modal = document.getElementById('seatModal'); const container = document.getElementById('seatModalContainer'); const badge = document.getElementById('modalSeatBadge'); const title = document.getElementById('modalSeatId'); const statusText = document.getElementById('modalStatusText'); const headerBg = document.getElementById('modalHeaderBg'); const formSection = document.getElementById('formSection'); const detailsSection = document.getElementById('detailsSection'); if (formSection) formSection.classList.add('hidden'); if (detailsSection) detailsSection.classList.add('hidden'); toggleCancelForm(false); if (title) title.textContent = `座位 ${seatId}`; const coords = document.getElementById('modalCoords'); if (coords) coords.textContent = `${x}, ${y}, ${z}`; const isOccupied = checkSeatOccupied(seatId); if (badge) { if (seatId.startsWith('A')) { badge.textContent = "一般單人席"; badge.className = "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/20"; } else { badge.textContent = "筆電禁用座位"; badge.className = "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-400/30 text-blue-100"; } } if (isOccupied) { if (headerBg) headerBg.className = "bg-gradient-to-r from-slate-600 to-slate-700 text-white p-5 relative"; if (statusText) statusText.innerHTML = '<i class="fa-solid fa-user-lock"></i> 座位已被使用 (隱私保護中)'; if (detailsSection) detailsSection.classList.remove('hidden'); const cancelInput = document.getElementById('cancelNameInput'); if (cancelInput && currentUser) { cancelInput.value = currentUser.username; cancelInput.disabled = true; } } else { if (headerBg) headerBg.className = "bg-gradient-to-r from-nscu-green to-nscu-darkgreen text-white p-5 relative"; if (statusText) statusText.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-300"></i> 空閒開放登記中'; if (formSection) formSection.classList.remove('hidden'); const regInput = document.getElementById('regName'); if (regInput && currentUser) { regInput.value = currentUser.username; regInput.disabled = true; } } if (modal) { modal.classList.remove('hidden'); setTimeout(() => { modal.classList.replace('opacity-0', 'opacity-100'); if (container) container.classList.replace('scale-95', 'scale-100'); }, 10); } }); }
function closeSeatModal() { const modal = document.getElementById('seatModal'); const container = document.getElementById('seatModalContainer'); if (modal) modal.classList.replace('opacity-100', 'opacity-0'); if (container) container.classList.replace('scale-100', 'scale-95'); setTimeout(() => { if (modal) modal.classList.add('hidden'); selectedCell = null; }, 150); }
function toggleCancelForm(show) { const btn = document.getElementById('showCancelFormBtn'); const inputArea = document.getElementById('cancelFormInput'); if (show) { if (btn) btn.classList.add('hidden'); if (inputArea) inputArea.classList.remove('hidden'); } else { if (btn) btn.classList.remove('hidden'); if (inputArea) inputArea.classList.add('hidden'); } }
async function saveRegistration() { if (!selectedCell) return; const mcId = document.getElementById('regName').value.trim(); if (!mcId) { showToast("⚠️ 請先登入您的 Minecraft 帳號！", "warning"); return; } localCacheOccupied[selectedCell.seatId] = { status: 'occupied', name: mcId, time: new Date().getTime() }; localStorage.setItem('NSCU_LOCAL_OCCUPIED_SEATS', JSON.stringify(localCacheOccupied)); showToast(`🎉 成功登記座位 ${selectedCell.seatId}！`); closeSeatModal(); renderGridMap(); calculateMapStatistics(); try { fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ seatId: selectedCell.seatId, minecraftId: mcId, action: 'register' }) }); } catch (e) {} }
async function confirmCancelRegistration() { if (!selectedCell) return; const inputMcId = document.getElementById('cancelNameInput').value.trim(); if (!inputMcId) { showToast("⚠️ 驗證玩家身分失敗！", "warning"); return; } const currentOccupant = getSeatOccupantName ? getSeatOccupantName(selectedCell.seatId) : null; if (!currentUser || currentUser.username.toLowerCase() !== inputMcId.toLowerCase() || (currentOccupant && currentOccupant.toLowerCase() !== currentUser.username.toLowerCase())) { showToast("❌ 身分驗證失敗！您無權限退還此座位。", "error"); return; } localCacheOccupied[selectedCell.seatId] = { status: 'free', name: '', time: new Date().getTime() }; localStorage.setItem('NSCU_LOCAL_OCCUPIED_SEATS', JSON.stringify(localCacheOccupied)); showToast(`🧹 座位 ${selectedCell.seatId} 已恢復空閒。`); closeSeatModal(); renderGridMap(); calculateMapStatistics(); try { fetch(`${APPS_SCRIPT_URL}?action=cancel&seatId=${encodeURIComponent(selectedCell.seatId)}&minecraftId=${encodeURIComponent(inputMcId)}`); } catch (e) {} }
function copyMinecraftAction(type) { if (!selectedCell) return; const { x, y, z } = selectedCell; const textToCopy = type === 'tp' ? `/tp @s ${x} ${y} ${z}` : `${x} ${y} ${z}`; navigator.clipboard.writeText(textToCopy).then(() => { showToast(`📋 已複製：${textToCopy}`); }); }

// ==========================================
// 5. 圖書檢索系統與對接
// ==========================================
async function loadLibraryDatabase() {
    try {
        const [catRes, booksRes] = await Promise.all([ fetch(CATEGORIES_CSV_URL), fetch(BOOKS_CSV_URL) ]);
        if (!catRes.ok || !booksRes.ok) throw new Error("Connection Error");
        categoriesData = normalizeCategories(Papa.parse(await catRes.text(), { header: true, skipEmptyLines: true }).data);
        booksData = normalizeBooks(Papa.parse(await booksRes.text(), { header: true, skipEmptyLines: true }).data);
        buildCategoryFilter(); calculateDatabaseStatistics(); applyFilters();
    } catch (error) { console.warn("無法取得遠端書籍資料"); }
}

function normalizeCategories(rawList) { return rawList.map(row => ({ code: (row['code'] || row['分類代碼'] || '').trim(), name: (row['name'] || row['分類名稱'] || '').trim(), floor: (row['floor'] || row['放置樓層'] || '').trim()})).filter(cat => cat.code && cat.name); }
function normalizeBooks(rawList) { return rawList.map(row => ({ id: (row['索書號'] || row['id'] || '').trim(), title: (row['書名'] || row['title'] || '').trim(), author: (row['作者'] || row['author'] || '').trim(), category: (row['主分類'] || row['category'] || '').trim(), sub_category: (row['細部分類'] || row['sub_category'] || '').trim(), description: (row['簡介'] || row['description'] || '').trim(), status: (row['狀態'] || row['status'] || '').trim(), isbn: (row['DS-ISBN'] || row['isbn'] || row['ISBN'] || '').trim() })).filter(book => book.id && book.title); }
function buildCategoryFilter() { const select = document.getElementById('categoryFilter'); if (!select) return; select.innerHTML = '<option value="ALL">所有學科分類</option>'; categoriesData.forEach(cat => { const opt = document.createElement('option'); opt.value = cat.name; opt.textContent = `${cat.code} ${cat.name} (${cat.floor})`; select.appendChild(opt); }); }
function calculateDatabaseStatistics() { const total = booksData.length; const available = booksData.filter(b => !myBorrowedBooks.some(m => m.id === b.id)).length; const checkedOut = total - available; const rate = total > 0 ? ((checkedOut / total) * 100).toFixed(1) + '%' : '0.0%'; const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; }; setText('totalBooks', total); setText('availableBooks', available); setText('checkedOutBooks', checkedOut); setText('borrowRate', rate); const homeBorrowRate = document.getElementById('home-borrow-rate'); const homeBorrowDesc = document.getElementById('home-borrow-desc'); if (homeBorrowRate) homeBorrowRate.textContent = rate; if (homeBorrowDesc) homeBorrowDesc.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>已借出 ${checkedOut} 冊 / 共 ${total} 冊`; }
function renderBooks(data) { const grid = document.getElementById('booksGrid'); if (!grid) return; grid.innerHTML = ''; if (data.length === 0) { grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">沒有尋找到符合篩選條件的書籍。</div>`; return; } data.forEach(book => { const isBorrowedByMe = myBorrowedBooks.some(b => b.id === book.id); const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中'); const statusClass = isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'; const card = document.createElement('div'); card.className = 'book-card bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between cursor-pointer shadow-sm relative group'; card.onclick = () => openBookModal ? openBookModal(book) : null; card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start gap-4 mb-3">
                            <span class="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200/60 max-w-[85%] truncate">
                                ${book.category || '未分類'} ${book.sub_category ? '· ' + book.sub_category : ''}
                            </span>
                        </div>
                        <h3 class="text-base font-bold text-slate-900 leading-snug mb-1 group-hover:text-nscu-500 transition-colors line-clamp-2">${book.title}</h3>
                        <div class="text-xs text-slate-500 mb-4">著者：${book.author || '未知著者'}</div>
                        <p class="text-xs text-slate-600 leading-relaxed bg-slate-50/75 rounded-lg p-3 border border-slate-100/50 mb-4 line-clamp-3">
                            ${book.description || '暫無此圖書的詳細簡介，歡迎入館參閱實體書庫。'}
                        </p>
                    </div>
                    <div class="pt-3 border-t border-slate-100 space-y-2">
                        <div class="flex justify-between items-center text-xs">
                            <span class="px-2 py-0.5 rounded-full border font-semibold text-[10px] ${statusClass}">
                                ${isAvailable ? '在架上' : '借閱中'}
                            </span>
                            <span class="text-slate-400 font-mono text-[10px]">${book.id}</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            }); }

function applyFilters() { const qEl = document.getElementById('searchInput'); const query = qEl ? qEl.value.toLowerCase().trim() : ''; const category = (document.getElementById('categoryFilter') || {}).value; const status = (document.getElementById('statusFilter') || {}).value; const filtered = booksData.filter(book => { const matchesSearch = book.title.toLowerCase().includes(query) || (book.author || '').toLowerCase().includes(query) || (book.id || '').toLowerCase().includes(query) || (book.isbn || '').includes(query); const matchesCategory = (category === 'ALL' || book.category === category); const isBorrowedByMe = myBorrowedBooks.some(b => b.id === book.id); const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中'); let matchesStatus = true; if (status === '在架上') matchesStatus = isAvailable; if (status === '借閱中') matchesStatus = !isAvailable; return matchesSearch && matchesCategory && matchesStatus; }); renderBooks(filtered); const sf = document.getElementById('searchFeedback'); if (sf) sf.innerHTML = `檢索完成：共尋獲 <strong class="text-nscu-green">${filtered.length}</strong> 本符合條件之館藏`; }
function resetFilters() { const si = document.getElementById('searchInput'); if (si) si.value = ''; const cf = document.getElementById('categoryFilter'); if (cf) cf.value = 'ALL'; const sf = document.getElementById('statusFilter'); if (sf) sf.value = 'ALL'; applyFilters(); }

// ------------------------------------------
// 6. 借還書系統核心邏輯 (加入雲端同步)
// ------------------------------------------
function handleBarbAction(action) { guardAction(() => { const inputVal = (document.getElementById('barb-input-id') || {}).value || ''; const v = inputVal.trim(); if (!v) { showToast("⚠️ 請輸入或點選索書號！", "warning"); return; } if (action === 'borrow') borrowBook(v); else returnBook(v); const iv = document.getElementById('barb-input-id'); if (iv) iv.value = ""; }); }
function borrowBook(bookId) { const book = booksData.find(b => b.id.toLowerCase() === bookId.toLowerCase()); if (!book) { showToast("❌ 找不到此索書號對應的圖書！", "error"); return; } if (myBorrowedBooks.some(b => b.id === book.id)) { showToast("⚠️ 您已借閱過此書籍！"); return; } const today = new Date(); const returnDate = new Date(); returnDate.setDate(today.getDate() + 30); myBorrowedBooks.push({ id: book.id, title: book.title, returnDate: returnDate.toLocaleDateString('zh-TW'), isbn: book.isbn || book.id }); localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(myBorrowedBooks)); showToast(`🎉 成功借閱《${book.title}》！`); syncGlobalLibraryState(); syncBooksToBackend(); }
function returnBook(bookId) { const idx = myBorrowedBooks.findIndex(b => b.id.toLowerCase() === bookId.toLowerCase()); if (idx === -1) { showToast("⚠️ 您的借閱清單中無此圖書索書號！", "warning"); return; } const bookTitle = myBorrowedBooks[idx].title; myBorrowedBooks.splice(idx, 1); localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(myBorrowedBooks)); showToast(`🧹 《${bookTitle}》歸還完成！`); syncGlobalLibraryState(); syncBooksToBackend(); }
function syncGlobalLibraryState() { renderMyBorrowedList(); const badge1 = document.getElementById('home-borrow-badge'); if (badge1) badge1.innerText = myBorrowedBooks.length; calculateDatabaseStatistics(); if (document.getElementById('view-database').classList.contains('block')) applyFilters(); renderBarbQuickList(); }
function renderMyBorrowedList() { const container = document.getElementById('my-books-borrowed-container'); if (!container) return; if (myBorrowedBooks.length === 0) { container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">目前暫無借閱中的圖書</div>`; return; } let html = ""; myBorrowedBooks.forEach(b => { html += `
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
            <div class="min-w-0 flex-1 pr-2">
                <p class="font-bold text-slate-700 truncate">${b.title}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">索書號: ${b.id}・還書日: ${b.returnDate}</p>
            </div>
            <button onclick="returnBook('${b.id}')" class="px-2 py-1 rounded text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-bold hover:bg-rose-100 transition-colors">歸還</button>
        </div>
    `; }); container.innerHTML = html; }
function renderBarbQuickList() { const container = document.getElementById('barb-quick-list'); if (!container) return; if (booksData.length === 0) { container.innerHTML = `<div class="text-xs text-slate-400">連線異常或資料載入中...</div>`; return; } const available = booksData.filter(b => !myBorrowedBooks.some(m => m.id === b.id)).slice(0, 4); let html = ""; available.forEach(b => { html += `
        <div onclick="document.getElementById('barb-input-id').value='${b.id}'" class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-nscu-500 cursor-pointer flex justify-between items-center transition-all">
            <span class="font-bold text-slate-700 truncate mr-2">${b.title}</span>
            <span class="font-mono text-slate-400 shrink-0 bg-white px-2 py-0.5 rounded border text-[10px]">${b.id}</span>
        </div>
    `; }); container.innerHTML = html; }

// ==========================================
// 7. 首頁資料與 Utils
// ==========================================
async function fetchHomeSheetData() { const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS01kcFvbXs1L6e_V3jInI4VB5pISZMPuz3mxTWUXQWv7Y4la2NbQxWz6i7tZ5czBgdvBI83A4jIwmc/pub?output=csv&gid=248986281"; try { const response = await fetch(url); const dataRows = parseCSV(await response.text()).slice(1); const announcements = []; const hotBooks = []; const guides = []; const openingHours = []; dataRows.forEach(row => { if (row[0] && row[0].trim() !== "" && row[0] !== "公告日期") announcements.push({ date: row[0].trim(), title: row[1].trim(), content: row[2] ? row[2].trim() : "" }); if (row[3] && row[3].trim() !== "" && row[3] !== "熱門榜書名") hotBooks.push({ title: row[3].trim(), borrows: row[4] ? row[4].trim() : "0" }); if (row[5] && row[5].trim() !== "" && row[5] !== "指南名稱") guides.push({ title: row[5].trim(), content: row[6] ? row[6].trim() : "" }); if (row[7] && row[7].trim() !== "" && row[7] !== "開館日期") openingHours.push({ days: row[7].trim(), hours: row[8] ? row[8].trim() : "" }); }); announcementsData = announcements; renderAnnouncements(announcements); renderHotBooks(hotBooks); renderGuides(guides); renderOpeningHours(openingHours); } catch (error) {} }
function parseCSV(text) { let lines = []; let row = [""]; let inQuotes = false; for (let i = 0; i < text.length; i++) { let c = text[i]; let next = text[i+1]; if (c === '"') { if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; } else { inQuotes = !inQuotes; } } else if (c === ',' && !inQuotes) { row.push(''); } else if ((c === '\r' || c === '\n') && !inQuotes) { if (c === '\r' && next === '\n') { i++; } lines.push(row); row = ['']; } else { row[row.length - 1] += c; } } if (row.length > 1 || row[0] !== '') lines.push(row); return lines; }
function renderAnnouncements(list) { const container = document.getElementById('announcement-container'); if (!container) return; if (list.length === 0) { container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">目前暫無最新公告</div>`; return; } let html = ""; list.forEach((item, index) => { html += `
        <div onclick="openAnnouncementDetail(${index})" class="p-4 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group border border-transparent hover:border-slate-100 flex items-start space-x-3 text-left">
            <div class="mt-1 shrink-0 bg-nscu-50 text-nscu-500 w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-nscu-500 group-hover:text-white transition-colors">
                <i data-lucide="megaphone" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0 flex-1">
                <span class="text-[10px] text-nscu-500 font-mono font-bold">${item.date}</span>
                <h4 class="text-sm font-bold text-slate-800 group-hover:text-nscu-500 transition-colors mt-0.5 truncate">${item.title}</h4>
                <p class="text-xs text-slate-400 mt-1 truncate">${item.content ? item.content : '點選檢視公告內文'}</p>
            </div>
            <div class="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i data-lucide="chevron-right" class="w-4 h-4 text-nscu-500"></i>
            </div>
        </div>
    `; }); container.innerHTML = html; lucide.createIcons(); }
function renderHotBooks(list) { const container = document.getElementById('hot-books-container'); if (!container) return; if (list.length === 0) { container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">目前暫無排行榜資料</div>`; return; } let html = ""; list.forEach((book, index) => { const rankColor = index === 0 ? 'bg-nscu-100 text-nscu-500 border-nscu-200 font-black' : 'bg-slate-100 text-slate-500 border-slate-200'; html += `
        <div class="flex items-center space-x-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-nscu-200 transition-all">
            <span class="w-6 h-6 rounded-full ${rankColor} border flex items-center justify-center font-bold text-xs shrink-0">${index + 1}</span>
            <div class="min-w-0 flex-1">
                <h4 class="text-xs font-bold text-slate-800 truncate">${book.title}</h4>
                <span class="text-[10px] text-slate-400 block mt-0.5">累計借閱 ${book.borrows} 次</span>
            </div>
        </div>
    `; }); container.innerHTML = html; }
function renderGuides(list) { const container = document.getElementById('guides-container'); if (!container) return; if (list.length === 0) { container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">暫無使用指南</div>`; return; } let html = ""; list.forEach((item, index) => { const icons = ['book-open', 'compass', 'help-circle', 'shield', 'laptop', 'settings']; const selectedIcon = icons[index % icons.length]; html += `
        <div class="p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-nscu-200 transition-all">
            <div class="w-10 h-10 rounded-lg bg-nscu-50 flex items-center justify-center text-nscu-500 mb-4">
                <i data-lucide="${selectedIcon}" class="w-5 h-5"></i>
            </div>
            <h3 class="font-bold text-slate-800 text-sm">${item.title}</h3>
            <p class="text-xs text-slate-500 mt-2 leading-relaxed whitespace-pre-line">${item.content}</p>
        </div>
    `; }); container.innerHTML = html; lucide.createIcons(); }
function getTodayOpeningInfo(list) { if (!list || list.length === 0) return null; const now = new Date(); const day = now.getDay(); const dayNames = ["日", "一", "二", "三", "四", "五", "六"]; const dayFullNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"]; for (let item of list) { const daysText = item.days.replace(/\s+/g, ''); if (daysText.includes("每日") || daysText.includes("每天")) return item; if (daysText.includes("至") || daysText.includes("-") || daysText.includes("~")) { const parts = daysText.split(/[至\-~]/); if (parts.length === 2) { const getIdx = (txt) => { for (let i = 0; i < 7; i++) { if (txt.includes(dayFullNames[i]) || txt.includes(dayNames[i])) return i; } return -1; }; const startIdx = getIdx(parts[0]); const endIdx = getIdx(parts[1]); if (startIdx !== -1 && endIdx !== -1) { if (startIdx <= endIdx) { if (day >= startIdx && day <= endIdx) return item; } else { if (day >= startIdx || day <= endIdx) return item; } } } if (daysText.includes(dayFullNames[day]) || (daysText.includes(dayNames[day]) && daysText.length === 1)) { return item; } } return list[0]; }
function renderOpeningHours(list) { const footerContainer = document.getElementById('footer-opening-hours'); const cardHours = document.getElementById('live-opening-hours'); const cardDays = document.getElementById('live-opening-days'); if (list.length > 0) { const todayInfo = getTodayOpeningInfo(list); if (cardHours && cardDays && todayInfo) { cardHours.innerText = todayInfo.hours; cardDays.innerText = `今日開放 (${todayInfo.days})`; } let html = ""; list.forEach(item => { html += `<li>${item.days}: ${item.hours}</li>`; }); if (footerContainer) footerContainer.innerHTML = html; } }
function openAnnouncementDetail(index) { const announcement = announcementsData[index]; if (!announcement) return; document.getElementById('modal-announcement-date').innerText = announcement.date; document.getElementById('modal-announcement-title').innerText = announcement.title; document.getElementById('modal-announcement-content').innerText = announcement.content || "無詳細內文。"; toggleAnnouncementModal(); }
function toggleAnnouncementModal() { const modal = document.getElementById('announcement-modal'); if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); setTimeout(() => document.getElementById('announcement-modal-content').classList.replace('scale-95', 'scale-100'), 10); } else { document.getElementById('announcement-modal-content').classList.replace('scale-100', 'scale-95'); setTimeout(() => modal.classList.add('hidden'), 150); } }
function toggleLibraryCard() { const modal = document.getElementById('library-card-modal'); if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); setTimeout(() => document.getElementById('card-modal-content').classList.replace('scale-95', 'scale-100'), 10); } else { document.getElementById('card-modal-content').classList.replace('scale-100', 'scale-95'); setTimeout(() => modal.classList.add('hidden'), 150); } }
function showToast(message, type = "success") { const toast = document.getElementById('toast'); const icon = document.getElementById('toast-icon'); const msg = document.getElementById('toastMsg'); if (msg) msg.textContent = message; if (type === "success") icon.className = "fa-solid fa-check-circle text-emerald-400"; else if (type === "warning") icon.className = "fa-solid fa-triangle-exclamation text-amber-400"; else icon.className = "fa-solid fa-circle-xmark text-rose-500"; toast.classList.remove('translate-y-24', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-24', 'opacity-0'); }, 3000); }
function showSimulationToast(spaceName) { showToast(`⚙️ [預約成功] 成功提交 ${spaceName} 的預約申請！`, "success"); }

// ==========================================
// 8. 初始化程序與背景載入
// ==========================================
window.addEventListener('load', async () => {
    lucide.createIcons();
    await loadLibraryDatabase();
    await handleSSOAuth();
    fetchHomeSheetData();
    loadMapData();
    syncGlobalLibraryState();
});

// 暴露給 HTML inline handlers
Object.assign(window, {
    switchView, toggleLibraryCard, redirectToSSO, logout, toggleMobileMenu,
    enterSelfStudyMap, backToBookingLobby, bookGroupSpace, changeZoom,
    resetFilters, applyFilters, handleBarbAction, borrowBook, returnBook,
    toggleAnnouncementModal, openAnnouncementDetail, openSeatModal, closeSeatModal,
    saveRegistration, confirmCancelRegistration, copyMinecraftAction, toggleCancelForm
});
