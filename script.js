// 加密配置 - 与后端完全一致（逐字符匹配）
const ENCRYPTION_KEY = 'graduateTrackerKey123'; // 19个字符，全小写
const IV = '1234567890abcdef'; // 16个字符，严格匹配

// 验证密钥和IV的有效性（调试用）
console.log('前端密钥验证 - 长度:', ENCRYPTION_KEY.length); // 必须为19
console.log('前端IV验证 - 长度:', IV.length); // 必须为16

// 加密函数（完整修复）
function encryptData(data) {
  try {
    // 确保数据为字符串
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // 转换密钥和IV
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    
    // 执行加密
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
    alert('数据加密失败，请检查配置');
    return null;
  }
}

// 前端解密函数（用于测试）
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

// 页面加载时执行加密解密测试
document.addEventListener('DOMContentLoaded', function() {
  // 加密解密一致性测试
  const testData = 'test-key-matching-' + new Date().getTime();
  const encrypted = encryptData(testData);
  const decrypted = decryptData(encrypted);
  
  if (decrypted !== testData) {
    console.error('❌ 前端加密解密测试失败');
    console.log('原始数据:', testData);
    console.log('加密后:', encrypted);
    console.log('解密后:', decrypted);
  } else {
    console.log('✅ 前端加密解密测试成功');
  }

  // 原有页面初始化逻辑
  initPages();
  initToast();
});

// 修复表单提交逻辑（使用正确的加密函数）
document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // 获取表单数据（原有逻辑）
  const name = document.getElementById('name').value;
  const highschool = document.getElementById('highschool').value;
  const graduationYear = document.getElementById('graduation-year').value;
  const className = document.getElementById('class-name').value;
  const destinationType = document.getElementById('destination-type').value;
  const destination = document.getElementById('destination').value;
  const description = document.getElementById('description').value;
  const securityQuestion = document.getElementById('security-question').value;
  const securityAnswer = document.getElementById('security-answer').value;
  
  // 验证表单（原有逻辑）
  if (!name || !highschool || !graduationYear || !destinationType || !destination || !securityQuestion || !securityAnswer) {
    showToast('请填写所有必填字段', false);
    return;
  }
  
  // 使用修复后的加密函数加密数据
  const formData = {
    name: name,
    highschool: highschool,
    graduation_year: graduationYear,
    class_name: className,
    destination_type: destinationType,
    destination: encryptData(destination),
    description: encryptData(description),
    security_question: encryptData(securityQuestion),
    security_answer: encryptData(securityAnswer)
  };
  
  // 提交数据（原有逻辑）
  try {
    const response = await fetch('/.netlify/functions/save-graduate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('保存成功', true);
      this.reset();
    } else {
      showToast('保存失败: ' + (result.error || '未知错误'), false);
    }
  } catch (error) {
    console.error('提交失败:', error);
    showToast('提交失败，请重试', false);
  }
});
    