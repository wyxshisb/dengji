const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 加密配置（与前端保持一致）
const encryptionKey = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY || 'graduateTrackerKey123');
const iv = CryptoJS.enc.Utf8.parse('1234567890abcdef');

// 数据库连接（保持不变）
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 修复后的解密函数（核心修改）
function decryptData(encryptedData) {
  try {
    // 1. 检查加密数据有效性
    if (!encryptedData || typeof encryptedData !== 'string') {
      console.error('解密失败：无效的加密数据');
      return null;
    }

    // 2. 执行解密
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey, { 
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

    // 3. 检查解密结果是否为空
    if (!decryptedStr) {
      console.error('解密失败：解密后字符串为空（可能密钥不匹配）');
      return null;
    }

    // 4. 容错处理JSON解析（关键修复）
    try {
      return JSON.parse(decryptedStr);
    } catch (jsonError) {
      // 打印解密后的原始字符串，帮助排查问题
      console.error('JSON解析失败，解密后原始数据：', decryptedStr);
      console.error('JSON解析错误详情：', jsonError);
      // 尝试直接返回字符串（如果前端加密的是纯文本而非对象）
      return decryptedStr;
    }

  } catch (e) {
    console.error('解密过程出错：', e);
    return null;
  }
}

// 处理函数（保持原有逻辑，仅优化错误提示）
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
    const decryptedAnswer = decryptData(graduate.security_answer);
    
    // 新增：检查解密结果
    if (decryptedAnswer === null) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: '答案解密失败，请检查加密配置' })
      };
    }

    // 兼容解密结果为字符串的情况
    const isCorrect = decryptedAnswer.toString().toLowerCase() === answer.toLowerCase();

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
    