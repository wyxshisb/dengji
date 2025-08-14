const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 密钥配置
const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';

// 密钥验证
console.log('后端密钥长度:', ENCRYPTION_KEY.length);
console.log('后端密钥字符:', ENCRYPTION_KEY.split('').map((c, i) => `${i}:${c}`).join(','));

const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const iv = CryptoJS.enc.Utf8.parse(IV);

// 数据库连接
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 解密函数
function decryptData(encryptedData) {
  try {
    if (!encryptedData) return null;
    
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return decryptedStr ? (JSON.parse(decryptedStr) || decryptedStr) : null;
  } catch (error) {
    console.error('解密错误:', error);
    return null;
  }
}

// 必须使用这种简化的导出方式
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
        body: JSON.stringify({ success: false, error: '缺少参数' })
      };
    }

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

    const decryptedAnswer = decryptData(result.rows[0].security_answer);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        isCorrect: decryptedAnswer?.toString().trim().toLowerCase() === answer.trim().toLowerCase()
      })
    };
  } catch (error) {
    console.error('处理错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '服务器错误' })
    };
  }
};
