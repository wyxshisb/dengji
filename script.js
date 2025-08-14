// 在原有前端JS文件中替换加密解密函数

// 加密配置（必须与后端verify-answer.js完全一致）
const ENCRYPTION_KEY = 'graduateTrackerKey123'; // 与后端硬编码值相同
const IV = '1234567890abcdef'; // 严格16位，与后端完全一致

// 修复后的加密函数
function encryptData(data) {
  try {
    // 确保数据是字符串格式（如果是对象则序列化为JSON）
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // 转换密钥和IV
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    
    // 加密（使用与后端相同的模式和填充）
    const encrypted = CryptoJS.AES.encrypt(
      dataStr,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return encrypted.toString();
  } catch (error) {
    console.error('前端加密失败:', error);
    alert('数据加密失败，请刷新页面重试');
    return null;
  }
}

// 前端解密函数（用于本地测试，与后端逻辑一致）
function decryptData(encryptedData) {
  try {
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    // 尝试解析JSON（兼容对象和纯文本）
    try {
      return JSON.parse(decryptedStr);
    } catch (e) {
      return decryptedStr;
    }
  } catch (error) {
    console.error('前端解密失败:', error);
    return null;
  }
}

// 页面加载时自动测试加密解密是否正常
document.addEventListener('DOMContentLoaded', function() {
  // 加密解密测试
  const testData = '测试加密解密一致性';
  const encrypted = encryptData(testData);
  const decrypted = decryptData(encrypted);
  
  if (decrypted !== testData) {
    console.error('加密解密测试失败！前后端配置可能不一致');
    console.log('测试数据:', testData);
    console.log('加密后:', encrypted);
    console.log('解密后:', decrypted);
  } else {
    console.log('加密解密测试成功');
  }
});

// 登记表单提交（使用修复后的加密函数）
document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // 原有逻辑...
  
  // 加密敏感数据（使用修复后的函数）
  const formData = {
    // ...其他字段
    destination: encryptData(destinationValue),
    description: encryptData(descriptionValue),
    security_question: encryptData(questionValue),
    security_answer: encryptData(answerValue)
  };
  
  // 提交逻辑...
});
