const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 解密函数
function decryptData(encryptedData) {
  try {
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('验证解密失败:', error);
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: '只支持POST请求' })
    };
  }

  try {
    const { id, answer } = JSON.parse(event.body);
    
    if (!id || !answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '缺少参数' })
      };
    }

    // 获取存储的答案
    const result = await pool.query(
      'SELECT security_answer FROM graduates WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: '记录不存在' })
      };
    }

    // 解密并比对
    const storedAnswer = decryptData(result.rows[0].security_answer);
    const isCorrect = storedAnswer && 
      storedAnswer.trim().toLowerCase() === answer.trim().toLowerCase();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, isCorrect })
    };
  } catch (error) {
    console.error('验证错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '验证失败' })
    };
  }
};
    