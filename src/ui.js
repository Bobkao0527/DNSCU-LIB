// UI helpers and homepage data
window.announcementsData = [];

function parseCSV(text) { let lines = []; let row = [""]; let inQuotes = false; for (let i = 0; i < text.length; i++) { let c = text[i]; let next = text[i+1]; if (c === '"') { if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; } else { inQuotes = !inQuotes; } } else if (c === ',' && !inQuotes) { row.push(''); } else if ((c === '\r' || c === '\n') && !inQuotes) { if (c === '\r' && next === '\n') { i++; } lines.push(row); row = ['']; } else { row[row.length - 1] += c; } } if (row.length > 1 || row[0] !== '') lines.push(row); return lines; }

async function fetchHomeSheetData() { const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS01kcFvbXs1L6e_V3jInI4VB5pISZMPuz3mxTWUXQWv7Y4la2NbQxWz6i7tZ5czBgdvBI83A4jIwmc/pub?output=csv&gid=248986281"; try { const response = await fetch(url); const dataRows = parseCSV(await response.text()).slice(1); const announcements = []; const hotBooks = []; const guides = []; const openingHours = []; dataRows.forEach(row => { if (row[0] && row[0].trim() !== "" && row[0] !== "公告日期") announcements.push({ date: row[0].trim(), title: row[1].trim(), content: row[2] ? row[2].trim() : "" }); if (row[3] && row[3].trim() !== "" && row[3] !== "熱門榜書名") hotBooks.push({ title: row[3].trim(), borrows: row[4] ? row[4].trim() : "0" }); if (row[5] && row[5].trim() !== "" && row[5] !== "指南名稱") guides.push({ title: row[5].trim(), content: row[6] ? row[6].trim() : "" }); if (row[7] && row[7].trim() !== "" && row[7] !== "開館日期") openingHours.push({ days: row[7].trim(), hours: row[8] ? row[8].trim() : "" }); }); window.announcementsData = announcements; if (window.renderAnnouncements) window.renderAnnouncements(announcements); if (window.renderHotBooks) window.renderHotBooks(hotBooks); if (window.renderGuides) window.renderGuides(guides); if (window.renderOpeningHours) window.renderOpeningHours(openingHours); } catch (error) {} }

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
    `; }); container.innerHTML = html; if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }

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
    `; }); container.innerHTML = html; if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }

function getTodayOpeningInfo(list) { if (!list || list.length === 0) return null; const now = new Date(); const day = now.getDay(); const dayNames = ["日", "一", "二", "三", "四", "五", "六"]; const dayFullNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"]; for (let item of list) { const daysText = item.days.replace(/\s+/g, ''); if (daysText.includes("每日") || daysText.includes("每天")) return item; if (daysText.includes("至") || daysText.includes("-") || daysText.includes("~")) { const parts = daysText.split(/[至\-~]/); if (parts.length === 2) { const getIdx = (txt) => { for (let i = 0; i < 7; i++) { if (txt.includes(dayFullNames[i]) || txt.includes(dayNames[i])) return i; } return -1; }; const startIdx = getIdx(parts[0]); const endIdx = getIdx(parts[1]); if (startIdx !== -1 && endIdx !== -1) { if (startIdx <= endIdx) { if (day >= startIdx && day <= endIdx) return item; } else { if (day >= startIdx || day <= endIdx) return item; } } } if (daysText.includes(dayFullNames[day]) || (daysText.includes(dayNames[day]) && daysText.length === 1)) { return item; } } return list[0]; }

function renderOpeningHours(list) { const footerContainer = document.getElementById('footer-opening-hours'); const cardHours = document.getElementById('live-opening-hours'); const cardDays = document.getElementById('live-opening-days'); if (list.length > 0) { const todayInfo = getTodayOpeningInfo(list); if (cardHours && cardDays && todayInfo) { cardHours.innerText = todayInfo.hours; cardDays.innerText = `今日開放 (${todayInfo.days})`; } let html = ""; list.forEach(item => { html += `<li>${item.days}: ${item.hours}</li>`; }); if (footerContainer) footerContainer.innerHTML = html; } }

function openAnnouncementDetail(index) { const announcement = window.announcementsData[index]; if (!announcement) return; const dateEl = document.getElementById('modal-announcement-date'); const titleEl = document.getElementById('modal-announcement-title'); const contentEl = document.getElementById('modal-announcement-content'); if (dateEl) dateEl.innerText = announcement.date; if (titleEl) titleEl.innerText = announcement.title; if (contentEl) contentEl.innerText = announcement.content || "無詳細內文。"; toggleAnnouncementModal(); }

function toggleAnnouncementModal() { const modal = document.getElementById('announcement-modal'); if (!modal) return; if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); setTimeout(() => { const content = document.getElementById('announcement-modal-content'); if (content) content.classList.replace('scale-95', 'scale-100'); }, 10); } else { const content = document.getElementById('announcement-modal-content'); if (content) content.classList.replace('scale-100', 'scale-95'); setTimeout(() => modal.classList.add('hidden'), 150); } }

function toggleLibraryCard() { const modal = document.getElementById('library-card-modal'); if (!modal) return; if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); setTimeout(() => { const content = document.getElementById('card-modal-content'); if (content) content.classList.replace('scale-95', 'scale-100'); }, 10); } else { const content = document.getElementById('card-modal-content'); if (content) content.classList.replace('scale-100', 'scale-95'); setTimeout(() => modal.classList.add('hidden'), 150); } }

function showToast(message, type = "success") { const toast = document.getElementById('toast'); const icon = document.getElementById('toast-icon'); const msg = document.getElementById('toastMsg'); if (msg) msg.textContent = message; if (icon) { if (type === "success") icon.className = "fa-solid fa-check-circle text-emerald-400"; else if (type === "warning") icon.className = "fa-solid fa-triangle-exclamation text-amber-400"; else icon.className = "fa-solid fa-circle-xmark text-rose-500"; } if (toast) { toast.classList.remove('translate-y-24', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100'); setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-24', 'opacity-0'); }, 3000); } }

function showSimulationToast(spaceName) { showToast(`⚙️ [預約成功] 成功提交 ${spaceName} 的預約申請！`, "success"); }

Object.assign(window, { parseCSV, fetchHomeSheetData, renderAnnouncements, renderHotBooks, renderGuides, renderOpeningHours, openAnnouncementDetail, toggleAnnouncementModal, toggleLibraryCard, showToast, showSimulationToast, announcementsData: window.announcementsData });
