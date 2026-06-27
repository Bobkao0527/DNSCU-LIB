// ==========================================
// 1. 雲端試算表與 API 端點設定 (Constants)
// ==========================================
window.BOOKS_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS01kcFvbXs1L6e_V3jInI4VB5pISZMPuz3mxTWUXQWv7Y4la2NbQxWz6i7tZ5czBgdvBI83A4jIwmc/pub?output=csv`;
window.CATEGORIES_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS01kcFvbXs1L6e_V3jInI4VB5pISZMPuz3mxTWUXQWv7Y4la2NbQxWz6i7tZ5czBgdvBI83A4jIwmc/pub?output=csv&gid=565039517`;
window.MAP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vREyJWmMzv1p2obev-jTKdRsuCyhHKXy2mVGVMNICmYLkn9pOjpgmx0umxZ9rJYZqvPYEvqucp6VwJN/pub?output=csv";
window.USER_DB_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT6ab5BtIHCqkehRoEoKe4vmYiMiZjUsd6I4ktGxLvLwK6ijHcia6NjlpUuIOmDFLze6a76mUti6c4X/pub?output=csv";

// ----------------- 【雲端 Web App API 網址貼此處】 -----------------
// A. 自習室 2D 地圖劃位與取消登記的 GAS 網址 (與地圖 CSV 試算表綁定)
window.APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYbnaBOhfNtYmyegcz51u891SJygEIta48nqReBBpKEsu43-5X-eMVhH77Xn58dxKM/exec";

// B. 使用者資料庫 (user_db) 的 GAS 網址 (負責新建帳戶與同步個人 borrowDict 字典)
window.USER_DB_API_URL = "https://script.google.com/macros/s/AKfycbzG0FhDUIyH-_NW1_FUbbfEBJCxypQWHFBSKQ316oQSyWgAmYjVhb9mn5KfaDcWJtCj/exec"; 

// C. 圖書在庫狀態更變的 GAS 網址 (負責將書本在架狀態修改為「借閱中」或「在架上」)
window.BOOK_STATUS_API_URL = "https://script.google.com/macros/s/AKfycbywvqF6hd-4U-fFZDRKml7SG-Px1g4pB2dtg53dS_FGKBCm5mqSfVhqVylO7varyMGYXA/exec";
// ------------------------------------------------------------------

// SSO 驗證伺服器
window.SSO_PORTAL_URL = "https://dolphinloginsystem.pages.dev";
window.SSO_VERIFY_API = "https://dolphinloginsystem.pages.dev/api/verify";

// 9F 自習室 Minecraft 座標系基點
window.BASE_X = -1128;
window.BASE_Y = 118;
window.BASE_Z = 827;

// ==========================================
// 2. 系統執行期全域共享狀態 (State)
// ==========================================
window.booksData = [];
window.categoriesData = [];
window.announcementsData = [];

window.gridMatrix = [];
window.zoomLevel = 0.9;
window.selectedCell = null;
window.csvOccupiedSeats = {};

// 雲端同步使用者相關
window.currentUserCardNumber = "";
window.currentUserBorrowDict = {};

// 本地暫存快取機制 (當前帳戶借書與座位狀態)
window.myBorrowedBooks = JSON.parse(localStorage.getItem('NSCU_MY_BORROWED') || '[]');
window.localCacheOccupied = JSON.parse(localStorage.getItem('NSCU_LOCAL_OCCUPIED_SEATS') || '{}');

// SSO 核心登入狀態 ({ username, expiresAt, token })
window.currentUser = null;

// 當前彈窗聚焦的圖書物件
window.currentModalBook = null;