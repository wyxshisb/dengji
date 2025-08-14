const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 加密配置 - 与前端完全一致（逐字符匹配）
const ENCRYPTION_KEY = 'graduateTrackerKey123'; // 19个字符，全小写
const IV = '1234567890abcdef'; // 16个字符，严格匹配

// 验证密钥和IV的有效性（调试用）
console.log('后端密钥验证 - 长度:', ENCRYPTION_KEY.length); // 必须为19
console.log('后端IV验证 - 长度:', IV.length); // 必须为16

// 转换为CryptoJS所需格式
const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const iv = CryptoJS.enc.Utf8.parse(IV);

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 解密函数（完整修复）
function decryptData(encryptedData) {
  try {
    // 检查输入数据
    if (!encryptedData || typeof encryptedData !== 'string') {
      console.error('解密失败：无效的加密数据');
      return null;
    }

    // 尝试解密
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    // 转换为字符串
    const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    // 验证解密结果
    if (!decryptedStr) {
      console.error('解密失败：结果为空（密钥不匹配）');
      console.error('使用的密钥:', ENCRYPTION_KEY);
      console.error('使用的IV:', IV);
      console.error('加密数据前30位:', encryptedData.substring(0, 30));
      return null;
    }

    // 兼容JSON和纯文本
    try {
      return JSON.parse(decryptedStr);
    } catch (e) {
      return decryptedStr;
    }

  } catch (error) {
    console.error('解密过程错误:', error);
    return null;
  }
}

// 主处理函数
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ success: false, error: '只支持POST请求' }) 
      };
    }

    const { id, answer } = JSON.parse(event.body);
    
    if (!id || !answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '缺少参数id或answer' })
      };
    }

    // 查询加密的答案
    const query = 'SELECT security_answer FROM graduates WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: '记录不存在' })
      };
    }

    // 解密并验证
    const encryptedAnswer = result.rows[0].security_answer;
    const decryptedAnswer = decryptData(encryptedAnswer);
    
    if (decryptedAnswer === null) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: '答案解密失败',
          debug: '前后端密钥可能不匹配'
        })
      };
    }

    const isCorrect = decryptedAnswer.toString().trim().toLowerCase() === 
                     answer.toString().trim().toLowerCase();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, isCorrect })
    };

  } catch (error) {
    console.error('验证错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '服务器验证失败' })
    };
  }
};
    