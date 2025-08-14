const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';
const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const iv = CryptoJS.enc.Utf8.parse(IV);

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function decryptData(encryptedData) {
  try {
    if (!encryptedData) return null;
    
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return decryptedStr || null;
  } catch (error) {
    console.error('解密错误:', error);
    return null;
  }
}

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

    // 查询加密的答案
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

    // 解密并处理答案
    const encryptedAnswer = result.rows[0].security_answer;
    const decryptedAnswer = decryptData(encryptedAnswer);

    // 关键：打印比对的原始数据（用于调试）
    console.log('--- 答案比对详情 ---');
    console.log('解密后的答案:', JSON.stringify(decryptedAnswer)); // 显示原始格式（如是否带引号）
    console.log('用户输入的答案:', JSON.stringify(answer));
    console.log('解密后类型:', typeof decryptedAnswer);
    console.log('用户输入类型:', typeof answer);

    // 优化比对逻辑：处理空格、大小写、类型转换
    const normalizedStoredAnswer = decryptedAnswer
      ? String(decryptedAnswer).trim().toLowerCase() // 转为字符串、去空格、小写
      : '';
    const normalizedUserAnswer = String(answer).trim().toLowerCase();

    console.log('标准化存储答案:', normalizedStoredAnswer);
    console.log('标准化用户答案:', normalizedUserAnswer);

    const isCorrect = normalizedStoredAnswer === normalizedUserAnswer;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        isCorrect,
        // 调试信息：生产环境可删除
        debug: {
          stored: normalizedStoredAnswer,
          user: normalizedUserAnswer
        }
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
