// Books module (attaches functions/state to window)
const BOOKS_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS01kcFvbXs1L6e_V3jInI4VB5pISZMPuz3mxTWUXQWv7Y4la2NbQxWz6i7tZ5czBgdvBI83A4jIwmc/pub?output=csv`;
const CATEGORIES_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS01kcFvbXs1L6e_V3jInI4VB5pISZMPuz3mxTWUXQWv7Y4la2NbQxWz6i7tZ5czBgdvBI83A4jIwmc/pub?output=csv&gid=565039517`;

window.booksData = window.booksData || [];
window.categoriesData = window.categoriesData || [];
window.myBorrowedBooks = JSON.parse(localStorage.getItem('NSCU_MY_BORROWED') || '[]');

async function loadLibraryDatabase() {
    try {
        const [catRes, booksRes] = await Promise.all([ fetch(CATEGORIES_CSV_URL), fetch(BOOKS_CSV_URL) ]);
        if (!catRes.ok || !booksRes.ok) throw new Error("Connection Error");
        window.categoriesData = normalizeCategories(Papa.parse(await catRes.text(), { header: true, skipEmptyLines: true }).data);
        window.booksData = normalizeBooks(Papa.parse(await booksRes.text(), { header: true, skipEmptyLines: true }).data);
        if (window.buildCategoryFilter) window.buildCategoryFilter();
        if (window.calculateDatabaseStatistics) window.calculateDatabaseStatistics();
        if (window.applyFilters) window.applyFilters();
    } catch (error) { console.warn("無法取得遠端書籍資料"); }
}

function normalizeCategories(rawList) { return rawList.map(row => ({ code: (row['code'] || row['分類代碼'] || '').trim(), name: (row['name'] || row['分類名稱'] || '').trim(), floor: (row['floor'] || row['放置樓層'] || '').trim()})).filter(cat => cat.code && cat.name); }
function normalizeBooks(rawList) { return rawList.map(row => ({ id: (row['索書號'] || row['id'] || '').trim(), title: (row['書名'] || row['title'] || '').trim(), author: (row['作者'] || row['author'] || '').trim(), category: (row['主分類'] || row['category'] || '').trim(), sub_category: (row['細部分類'] || row['sub_category'] || '').trim(), description: (row['簡介'] || row['description'] || '').trim(), status: (row['狀態'] || row['status'] || '').trim(), isbn: (row['DS-ISBN'] || row['isbn'] || row['ISBN'] || '').trim() })).filter(book => book.id && book.title); }

function buildCategoryFilter() { const select = document.getElementById('categoryFilter'); if (!select) return; select.innerHTML = '<option value="ALL">所有學科分類</option>'; window.categoriesData.forEach(cat => { const opt = document.createElement('option'); opt.value = cat.name; opt.textContent = `${cat.code} ${cat.name} (${cat.floor})`; select.appendChild(opt); }); }

function calculateDatabaseStatistics() { const total = window.booksData.length; const available = window.booksData.filter(b => !window.myBorrowedBooks.some(m => m.id === b.id)).length; const checkedOut = total - available; const rate = total > 0 ? ((checkedOut / total) * 100).toFixed(1) + '%' : '0.0%'; const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; }; setText('totalBooks', total); setText('availableBooks', available); setText('checkedOutBooks', checkedOut); setText('borrowRate', rate); const homeBorrowRate = document.getElementById('home-borrow-rate'); const homeBorrowDesc = document.getElementById('home-borrow-desc'); if (homeBorrowRate) homeBorrowRate.textContent = rate; if (homeBorrowDesc) homeBorrowDesc.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>已借出 ${checkedOut} 冊 / 共 ${total} 冊`; }

function renderBooks(data) { const grid = document.getElementById('booksGrid'); if (!grid) return; grid.innerHTML = ''; if (data.length === 0) { grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">沒有尋找到符合篩選條件的書籍。</div>`; return; } data.forEach(book => { const isBorrowedByMe = window.myBorrowedBooks.some(b => b.id === book.id); const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中'); const statusClass = isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'; const card = document.createElement('div'); card.className = 'book-card bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between cursor-pointer shadow-sm relative group'; card.onclick = () => window.openBookModal ? window.openBookModal(book) : null; card.innerHTML = `
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
                `; grid.appendChild(card); }); }

function applyFilters() { const qEl = document.getElementById('searchInput'); const query = qEl ? qEl.value.toLowerCase().trim() : ''; const category = (document.getElementById('categoryFilter') || {}).value; const status = (document.getElementById('statusFilter') || {}).value; const filtered = window.booksData.filter(book => { const matchesSearch = book.title.toLowerCase().includes(query) || (book.author || '').toLowerCase().includes(query) || (book.id || '').toLowerCase().includes(query) || (book.isbn || '').includes(query); const matchesCategory = (category === 'ALL' || book.category === category); const isBorrowedByMe = window.myBorrowedBooks.some(b => b.id === book.id); const isAvailable = !isBorrowedByMe && (book.status === '在架上' || book.status === '在館中'); let matchesStatus = true; if (status === '在架上') matchesStatus = isAvailable; if (status === '借閱中') matchesStatus = !isAvailable; return matchesSearch && matchesCategory && matchesStatus; }); renderBooks(filtered); const sf = document.getElementById('searchFeedback'); if (sf) sf.innerHTML = `檢索完成：共尋獲 <strong class="text-nscu-green">${filtered.length}</strong> 本符合條件之館藏`; }

function resetFilters() { const si = document.getElementById('searchInput'); if (si) si.value = ''; const cf = document.getElementById('categoryFilter'); if (cf) cf.value = 'ALL'; const sf = document.getElementById('statusFilter'); if (sf) sf.value = 'ALL'; applyFilters(); }

function borrowBook(bookId) { const book = (window.booksData || []).find(b => b.id.toLowerCase() === bookId.toLowerCase()); if (!book) { if (window.showToast) window.showToast("❌ 找不到此索書號對應的圖書！", "error"); return; } if (window.myBorrowedBooks.some(b => b.id === book.id)) { if (window.showToast) window.showToast("⚠️ 您已借閱過此書籍！"); return; } const today = new Date(); const returnDate = new Date(); returnDate.setDate(today.getDate() + 30); window.myBorrowedBooks.push({ id: book.id, title: book.title, returnDate: returnDate.toLocaleDateString('zh-TW'), isbn: book.isbn || book.id }); localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(window.myBorrowedBooks)); if (window.showToast) window.showToast(`🎉 成功借閱《${book.title}》！`); if (window.syncGlobalLibraryState) window.syncGlobalLibraryState(); if (window.syncBooksToBackend) window.syncBooksToBackend(); }

function returnBook(bookId) { const idx = window.myBorrowedBooks.findIndex(b => b.id.toLowerCase() === bookId.toLowerCase()); if (idx === -1) { if (window.showToast) window.showToast("⚠️ 您的借閱清單中無此圖書索書號！", "warning"); return; } const bookTitle = window.myBorrowedBooks[idx].title; window.myBorrowedBooks.splice(idx, 1); localStorage.setItem('NSCU_MY_BORROWED', JSON.stringify(window.myBorrowedBooks)); if (window.showToast) window.showToast(`🧹 《${bookTitle}》歸還完成！`); if (window.syncGlobalLibraryState) window.syncGlobalLibraryState(); if (window.syncBooksToBackend) window.syncBooksToBackend(); }

function syncGlobalLibraryState() { if (window.renderMyBorrowedList) window.renderMyBorrowedList(); const badge1 = document.getElementById('home-borrow-badge'); if (badge1) badge1.innerText = (window.myBorrowedBooks || []).length; if (window.calculateDatabaseStatistics) window.calculateDatabaseStatistics(); const viewDb = document.getElementById('view-database'); if (viewDb && viewDb.classList && viewDb.classList.contains('block')) if (window.applyFilters) window.applyFilters(); if (window.renderBarbQuickList) window.renderBarbQuickList(); }

function renderMyBorrowedList() { const container = document.getElementById('my-books-borrowed-container'); if (!container) return; if (!window.myBorrowedBooks || window.myBorrowedBooks.length === 0) { container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">目前暫無借閱中的圖書</div>`; return; } let html = ""; window.myBorrowedBooks.forEach(b => { html += `
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
            <div class="min-w-0 flex-1 pr-2">
                <p class="font-bold text-slate-700 truncate">${b.title}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">索書號: ${b.id}・還書日: ${b.returnDate}</p>
            </div>
            <button onclick="returnBook('${b.id}')" class="px-2 py-1 rounded text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-bold hover:bg-rose-100 transition-colors">歸還</button>
        </div>
    `; }); container.innerHTML = html; }

function renderBarbQuickList() { const container = document.getElementById('barb-quick-list'); if (!container) return; if (!window.booksData || window.booksData.length === 0) { container.innerHTML = `<div class="text-xs text-slate-400">連線異常或資料載入中...</div>`; return; } const available = window.booksData.filter(b => !window.myBorrowedBooks.some(m => m.id === b.id)).slice(0, 4); let html = ""; available.forEach(b => { html += `
        <div onclick="document.getElementById('barb-input-id').value='${b.id}'" class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-nscu-500 cursor-pointer flex justify-between items-center transition-all">
            <span class="font-bold text-slate-700 truncate mr-2">${b.title}</span>
            <span class="font-mono text-slate-400 shrink-0 bg-white px-2 py-0.5 rounded border text-[10px]">${b.id}</span>
        </div>
    `; }); container.innerHTML = html; }

Object.assign(window, { loadLibraryDatabase, normalizeBooks, normalizeCategories, buildCategoryFilter, calculateDatabaseStatistics, renderBooks, applyFilters, resetFilters, borrowBook, returnBook, syncGlobalLibraryState, renderMyBorrowedList, renderBarbQuickList, booksData: window.booksData, categoriesData: window.categoriesData });
