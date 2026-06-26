// ==========================================
// 館藏搜尋檢索與自助借還書模組 (database.html)
// ==========================================

// 開啟並載入圖書館藏主資料庫 CSV 檔
async function loadLibraryDatabase() {
    try {
        const [catRes, booksRes] = await Promise.all([
            fetch(window.CATEGORIES_CSV_URL),
            fetch(window.BOOKS_CSV_URL)
        ]);
        if (!catRes.ok || !booksRes.ok) throw new Error("館藏連線失敗");

        const catCsvText = await catRes.text();
        const booksCsvText = await booksRes.text();

        window.categoriesData = normalizeCategories(Papa.parse(catCsvText, { header: true, skipEmptyLines: true }).data);
        window.booksData = normalizeBooks(Papa.parse(booksCsvText, { header: true, skipEmptyLines: true }).data);

        buildCategoryFilter();
        calculateDatabaseStatistics();
        applyFilters();
    } catch (error) {
        console.warn("無法取得遠端書籍資料", error);
        const grid = document.getElementById('booksGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-500"></i>
                    <span class="text-sm font-medium">⚠️ 無法載入館藏資料，請檢查網路狀態。</span>
                </div>
            `;
        }
    }
}

// 正規化學術分類欄位
function normalizeCategories(rawList) {
    return rawList.map(row => ({
        code: (row['code'] || row['分類代碼'] || '').trim(),
        name: (row['name'] || row['分類名稱'] || '').trim(),
        floor: (row['floor'] || row['放置樓層'] || '').trim(),
    })).filter(cat => cat.code && cat.name);
}

// 正規化書籍核心欄位
function normalizeBooks(rawList) {
    return rawList.map(row => ({
        id: (row['索書號'] || row['id'] || '').trim(),
        title: (row['書名'] || row['title'] || '').trim(),
        author: (row['作者'] || row['author'] || '').trim(),
        recorder: (row['引入'] || row['recorder'] || '').trim(),
        category: (row['主分類'] || row['category'] || '').trim(),
        sub_category: (row['細部分類'] || row['sub_category'] || '').trim(),
        location: (row['位置'] || row['location'] || '').trim(),
        description: (row['簡介'] || row['description'] || '').trim(),
        status: (row['狀態'] || row['status'] || '').trim(),
        isbn: (row['DS-ISBN'] || row['isbn'] || row['ISBN'] || '').trim()
    })).filter(book => book.id && book.title);
}

// 建立學科分類過濾下拉選單
function buildCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    select.innerHTML = '<option value="ALL">所有學科分類</option>';
    window.categoriesData.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = `${cat.code} ${cat.name} (${cat.floor})`;
        select.appendChild(opt);
    });
}

// 計算館藏相關統計指標
function calculateDatabaseStatistics() {
    const total = window.booksData.length;
    const available = window.booksData.filter(b => !window.myBorrowedBooks.some(m => m.id === b.id)).length;
    const checkedOut = total - available;
    const rate = total > 0 ? ((checkedOut / total) * 100).toFixed(1) + '%' : '0.0%';

    document.getElementById('totalBooks').textContent = total;
    document.getElementById('availableBooks').textContent = available;
    document.getElementById('checkedOutBooks').textContent = checkedOut;
    document.getElementById('borrowRate').textContent = rate;

    const homeBorrowRate = document.getElementById('home-borrow-rate');
    const homeBorrowDesc = document.getElementById('home-borrow-desc');

    if (homeBorrowRate) homeBorrowRate.textContent = rate;
    if (homeBorrowDesc) {
        homeBorrowDesc.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>已借出 ${checkedOut} 冊 / 共 ${total} 冊`;
    }
}

// 渲染圖書檢索卡片
function renderBooks(data) {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">沒有尋找到符合篩選條件的書籍。</div>`;
        return;
    }

    data.forEach(book => {
        const isBorrowedByMe = window.myBorrowedBooks.some(b => b.id === book.id);
        const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中');
        const statusClass = isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100';

        const card = document.createElement('div');
        card.className = 'book-card bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between cursor-pointer shadow-sm relative group';
        card.onclick = () => openBookModal(book);

        card.innerHTML = `
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
    });
}

// 執行搜尋與複選過濾器
function applyFilters() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;

    const filtered = window.booksData.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query) || book.id.toLowerCase().includes(query);
        const matchesCategory = (category === 'ALL' || book.category === category);

        const isBorrowedByMe = window.myBorrowedBooks.some(b => b.id === book.id);
        const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中');

        let matchesStatus = true;
        if (status === '在架上') matchesStatus = isAvailable;
        if (status === '借閱中') matchesStatus = !isAvailable;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    renderBooks(filtered);
    document.getElementById('searchFeedback').innerHTML = `檢索完成：共尋獲 <strong class="text-nscu-green">${filtered.length}</strong> 本符合條件之館藏`;
}

// 重設過濾選單
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = 'ALL';
    document.getElementById('statusFilter').value = 'ALL';
    applyFilters();
}

// 開啟書籍詳情彈窗
function openBookModal(book) {
    window.currentModalBook = book;

    const modal = document.getElementById('bookModal');
    const container = document.getElementById('modalContainer');

    document.getElementById('modalCategory').textContent = `${book.category || '未分類'} ${book.sub_category ? ' · ' + book.sub_category : ''}`;
    document.getElementById('modalTitle').textContent = book.title;

    const authorHTML = `
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-pen-nib text-emerald-300"></i> 著者：${book.author || '未知著者'}</span>
        ${book.recorder ? `<span class="flex items-center gap-1.5"><i class="fa-solid fa-user-pen text-emerald-300"></i> Minecraft 引入署名：${book.recorder}</span>` : ''}
    `;
    document.getElementById('modalAuthor').innerHTML = authorHTML;

    document.getElementById('modalDescription').textContent = book.description || '暫無此圖書的詳細簡介，歡迎前往遊戲內圖書館參閱實體書籍。';
    document.getElementById('modalBookId').textContent = book.id;
    document.getElementById('modalISBN').textContent = book.isbn ? `ISBN: ${book.isbn}` : 'ISBN: 暫無登記';

    const rawLocation = book.location ? book.location.trim() : '未標記';
    const displayLocation = rawLocation !== '未標記' ? rawLocation.replace(/\\/g, ', ') : '未標記';
    document.getElementById('modalLocationDisplay').textContent = displayLocation;

    const statusEl = document.getElementById('modalStatus');
    const actionBtn = document.getElementById('modal-action-btn');

    const isBorrowedByMe = window.myBorrowedBooks.some(b => b.id === book.id);
    const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中');

    if (isAvailable) {
        statusEl.textContent = '在架上';
        statusEl.className = "inline-block text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold";

        actionBtn.className = 'w-full py-3 rounded-xl font-bold text-sm text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 bg-nscu-500 hover:bg-nscu-600';
        actionBtn.innerHTML = '<i class="fa-solid fa-book-bookmark"></i> 申請借閱此書';
        actionBtn.disabled = false;
    } else if (isBorrowedByMe) {
        statusEl.textContent = '借閱中 (您借閱的書籍)';
        statusEl.className = "inline-block text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-bold";

        actionBtn.className = 'w-full py-3 rounded-xl font-bold text-sm text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700';
        actionBtn.innerHTML = '<i class="fa-solid fa-undo"></i> 歸還此書';
        actionBtn.disabled = false;
    } else {
        statusEl.textContent = '借閱中';
        statusEl.className = "inline-block text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-bold";

        actionBtn.className = 'w-full py-3 rounded-xl font-bold text-sm text-slate-400 bg-slate-200 flex items-center justify-center gap-2 cursor-not-allowed';
        actionBtn.innerHTML = '<i class="fa-solid fa-lock"></i> 此書已借出';
        actionBtn.disabled = true;
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.replace('opacity-0', 'opacity-100');
        container.classList.replace('scale-95', 'scale-100');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('bookModal');
    const container = document.getElementById('modalContainer');

    if (modal) modal.classList.replace('opacity-100', 'opacity-0');
    if (container) container.classList.replace('scale-100', 'scale-95');

    setTimeout(() => {
        if (modal) modal.classList.add('hidden');
        window.currentModalBook = null;
    }, 150);
}

// 執行彈窗借還書觸發
function executeModalBorrowReturn() {
    if (!window.currentModalBook) return;
    guardAction(() => {
        const isBorrowedByMe = window.myBorrowedBooks.some(b => b.id === window.currentModalBook.id);
        if (isBorrowedByMe) {
            returnBook(window.currentModalBook.id);
        } else {
            borrowBook(window.currentModalBook.id);
        }
        closeModal();
    });
}

// 複製 Minecraft tp 及座標指令
function copyCommand(mode) {
    if (!window.currentModalBook || !window.currentModalBook.location) {
        showToast("此圖書暫無登錄 Minecraft 座標資料", "warning");
        return;
    }

    const rawLocation = window.currentModalBook.location.trim();
    const spaceCoords = rawLocation.replace(/\\/g, ' ');

    if (mode === 'tp') {
        const command = `/tp @s ${spaceCoords}`;
        navigator.clipboard.writeText(command).then(() => {
            showToast(`📋 已複製傳送指令：${command}`);
        });
    } else if (mode === 'coords') {
        navigator.clipboard.writeText(spaceCoords).then(() => {
            showToast(`📋 已複製空間世界座標：${spaceCoords}`);
        });
    }
}

// ------------------------------------------
// 自助借書系統核心邏輯 (BARB)
// ------------------------------------------
function handleBarbAction(action) {
    guardAction(() => {
        const inputVal = document.getElementById('barb-input-id').value.trim();
        if (!inputVal) {
            showToast("⚠️ 請輸入或點選索書號！", "warning");
            return;
        }
        if (action === 'borrow') {
            borrowBook(inputVal);
        } else {
            returnBook(inputVal);
        }
        document.getElementById('barb-input-id').value = "";
    });
}

// 核心：借書
function borrowBook(bookId) {
    const book = window.booksData.find(b => b.id.toLowerCase() === bookId.toLowerCase());
    if (!book) {
        showToast("❌ 找不到此索書號對應的圖書！", "error");
        return;
    }
    if (window.myBorrowedBooks.some(b => b.id === book.id)) {
        showToast("⚠️ 您已借閱過此書籍！");
        return;
    }

    const today = new Date();
    const returnDate = new Date();
    returnDate.setDate(today.getDate() + 30); // 延長為 30 天期

    window.myBorrowedBooks.push({
        id: book.id,
        title: book.title,
        returnDate: returnDate.toLocaleDateString('zh-TW')
    });
    localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(window.myBorrowedBooks));

    showToast(`🎉 成功借閱《${book.title}》！`);
    syncGlobalLibraryState();
}

// 核心：還書
function returnBook(bookId) {
    const idx = window.myBorrowedBooks.findIndex(b => b.id.toLowerCase() === bookId.toLowerCase());
    if (idx === -1) {
        showToast("⚠️ 您的借閱清單中無此圖書索書號！", "warning");
        return;
    }
    const bookTitle = window.myBorrowedBooks[idx].title;
    window.myBorrowedBooks.splice(idx, 1);
    localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(window.myBorrowedBooks));

    showToast(`🧹 《${bookTitle}》歸還完成！`);
    syncGlobalLibraryState();
}

// 同步全系統狀態（包括各分頁與徽章計數）
function syncGlobalLibraryState() {
    renderMyBorrowedList();

    const badge1 = document.getElementById('home-borrow-badge');
    if (badge1) badge1.innerText = window.myBorrowedBooks.length;

    calculateDatabaseStatistics();
    if (document.getElementById('view-database').classList.contains('block')) {
        applyFilters();
    }
    renderBarbQuickList();
}

// 渲染個人的借閱清單
function renderMyBorrowedList() {
    const container = document.getElementById('my-books-borrowed-container');
    if (!container) return;
    if (window.myBorrowedBooks.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">目前暫無借閱中的圖書</div>`;
        return;
    }
    let html = "";
    window.myBorrowedBooks.forEach(b => {
        html += `
            <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                <div class="min-w-0 flex-1 pr-2">
                    <p class="font-bold text-slate-700 truncate">${b.title}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">索書號: ${b.id}・還書日: ${b.returnDate}</p>
                </div>
                <button onclick="returnBook('${b.id}')" class="px-2 py-1 rounded text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-bold hover:bg-rose-100 transition-colors">歸還</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 渲染自助借書機快速測試清單
function renderBarbQuickList() {
    const container = document.getElementById('barb-quick-list');
    if (!container) return;
    if (window.booksData.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400">連線異常或資料載入中...</div>`;
        return;
    }
    const available = window.booksData.filter(b => !window.myBorrowedBooks.some(m => m.id === b.id)).slice(0, 4);
    let html = "";
    available.forEach(b => {
        html += `
            <div onclick="document.getElementById('barb-input-id').value='${b.id}'" 
                 class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-nscu-500 cursor-pointer flex justify-between items-center transition-all">
                <span class="font-bold text-slate-700 truncate mr-2">${b.title}</span>
                <span class="font-mono text-slate-400 shrink-0 bg-white px-2 py-0.5 rounded border text-[10px]">${b.id}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 匯出至全域
window.loadLibraryDatabase = loadLibraryDatabase;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.openBookModal = openBookModal;
window.closeModal = closeModal;
window.executeModalBorrowReturn = executeModalBorrowReturn;
window.copyCommand = copyCommand;
window.handleBarbAction = handleBarbAction;
window.borrowBook = borrowBook;
window.returnBook = returnBook;
window.syncGlobalLibraryState = syncGlobalLibraryState;
window.renderMyBorrowedList = renderMyBorrowedList;
window.renderBarbQuickList = renderBarbQuickList;