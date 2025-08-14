const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 修正密钥长度为21位（与前端严格匹配）
const ENCRYPTION_KEY = 'graduateTrackerKey123'; // 确认是21个字符
const IV = '1234567890abcdef'; // 16个字符，保持不变

// 关键：验证密钥长度（必须显示21）
console.log('后端密钥长度:', ENCRYPTION_KEY.length);
console.log('后端密钥字符:', ENCRYPTION_KEY.split('').map((c, i) => `${i}:${c}`).join(','));

const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const iv = CryptoJS.enc.Utf8.parse(IV);

// 数据库连接配置保持不变...

// 解密函数（强化日志）
function decryptData(encryptedData) {
  try {
    console.log('待解密数据前30位:', encryptedData.substring(0, 30) + '...');
    
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedStr) {
      console.error('解密失败：结果为空');
      console.error('密钥字符详情:', ENCRYPTION_KEY.split('').map((c, i) => `${i}:${c}`).join(','));
      return null;
    }

    try {
      return JSON.parse(decryptedStr);
    } catch (e) {
      return decryptedStr;
    }

  } catch (error) {
    console.error('解密过程异常:', error);
    return null;
  }
}

// 主处理函数保持不变...
