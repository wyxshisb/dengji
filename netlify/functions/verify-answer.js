const { Pool } = require('pg');
const CryptoJS = require('crypto-js'); // 需安装: npm install crypto-js

// 与前端一致的加密密钥（生产环境建议使用Netlify环境变量存储）
const encryptionKey = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY || 'graduateTrackerKey123');
const iv = CryptoJS.enc.Utf8.parse('1234567890abcdef');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 解密函数（与前端保持一致）
function decryptData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey, { 
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    console.error('解密失败:', e);
    return null;
  }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
    }

    const { id, answer } = JSON.parse(event.body);
    
    if (!id || !answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '参数不完整' })
      };
    }

    // 查询记录
    const query = 'SELECT * FROM graduates WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: '记录不存在' })
      };
    }

    const graduate = result.rows[0];
    // 解密答案并验证
    const decryptedAnswer = decryptData(graduate.security_answer);
    const isCorrect = decryptedAnswer && decryptedAnswer.toLowerCase() === answer.toLowerCase();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        isCorrect,
        data: isCorrect ? graduate : null
      })
    };
  } catch (error) {
    console.error('验证错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '验证失败' })
    };
  }
};
    