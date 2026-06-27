// ==========================================
// 核心安全加解密模組 (Cryptography Engine - 決定性加密優化版)
// ==========================================

// 預設密鑰 (長度必須為 32 字元以符合 AES-256 規格)
const SECRET_KEY_STR = "nscu_lib_secret_key_2026_dolphin";

/**
 * 決定性加密玩家 ID (AES-256 ECB 模式)
 * 確保同一個玩家 ID 加密出來的結果百分之百相同，供 Google Sheets 後台穩定進行退位比對
 * @param {string} username - 原始明文玩家 ID
 * @returns {string} - 安全的 Hex 格式加密字串
 */
function encryptUsername(username) {
    if (!username) return "";
    try {
        const key = CryptoJS.enc.Utf8.parse(SECRET_KEY_STR);
        const encrypted = CryptoJS.AES.encrypt(username.trim(), key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypted.ciphertext.toString();
    } catch (e) {
        console.error("[安全系統] 加密失敗:", e);
        return "";
    }
}

/**
 * 決定性解密玩家 ID (AES-256 ECB 模式)
 * @param {string} hexStr - 加密過的 Hex 格式字串
 * @returns {string} - 原始明文玩家 ID
 */
function decryptUsername(hexStr) {
    if (!hexStr) return "";
    try {
        const key = CryptoJS.enc.Utf8.parse(SECRET_KEY_STR);
        const ciphertextParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Hex.parse(hexStr)
        });
        const decrypted = CryptoJS.AES.decrypt(ciphertextParams, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("[安全系統] 解密失敗，可能密鑰不符或資料損壞");
        return "";
    }
}

// 綁定至 window 全域命名空間
window.encryptUsername = encryptUsername;
window.decryptUsername = decryptUsername;