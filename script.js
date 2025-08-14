// 修正密钥长度为21位（与后端严格匹配）
const ENCRYPTION_KEY = 'graduateTrackerKey123'; // 确认是21个字符
const IV = '1234567890abcdef'; // 16个字符，保持不变

// 关键：验证密钥长度（必须显示21）
console.log('前端密钥长度:', ENCRYPTION_KEY.length);
console.log('前端密钥字符:', ENCRYPTION_KEY.split('').map((c, i) => `${i}:${c}`).join(','));

// 加密函数（保持逻辑，强化日志）
function encryptData(data) {
  try {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    
    const encrypted = CryptoJS.AES.encrypt(
      dataStr,
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    
    // 输出加密信息用于调试
    console.log('加密数据:', encrypted.toString().substring(0, 30) + '...');
    return encrypted.toString();
  } catch (error) {
    console.error('前端加密失败:', error);
    alert('加密配置错误，请检查密钥');
    return null;
  }
}

// 其他函数保持不变...
