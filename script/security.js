// ==========================================
// 核心安全加解密模組 (Cryptography Engine)
// ==========================================

// 預設密鑰 (你可以在此處更換成你專屬的 16 或 32 位元密鑰)
const SECRET_KEY = "nscu_lib_secret_key_2026_dolphin";

/**
 * 加密玩家 ID (AES-256)
 * @param {string} username - 原始明文玩家 ID
 * @returns {string} - 安全的 Hex 格式加密字串 (避免 Base64 的 +, /, = 字元造成 URL 或 CSV 混亂)
 */
function encryptUsername(username) {
    if (!username) return "";
    try {
        const ciphertext = CryptoJS.AES.encrypt(username.trim(), SECRET_KEY).toString();
        // 將 Base64 字串轉換成純 Hex 十六進位編碼，確保能安全放置於 CSV 單格與 URL 參數中
        return CryptoJS.enc.Hex.stringify(CryptoJS.enc.Utf8.parse(ciphertext));
    } catch (e) {
        console.error("[安全系統] 加密失敗:", e);
        return "";
    }
}

/**
 * 解密玩家 ID (AES-256)
 * @param {string} hexStr - 加密過的 Hex 格式字串
 * @returns {string} - 原始明文玩家 ID
 */
function decryptUsername(hexStr) {
    if (!hexStr) return "";
    try {
        // 將 Hex 十六進位編碼還原成 Base64 密文字串
        const ciphertext = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Hex.parse(hexStr));
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted;
    } catch (e) {
        console.error("[安全系統] 解密失敗，可能密鑰不符或資料損壞");
        return "";
    }
}

// 綁定至 window 全域命名空間
window.encryptUsername = encryptUsername;
window.decryptUsername = decryptUsername;