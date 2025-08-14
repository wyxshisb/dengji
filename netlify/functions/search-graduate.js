const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 加密配置（与前端一致）
const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';

// 数据库连接
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
    console.error('后端解密失败:', error);
    return null;
  }
}

exports.handler = async (event) => {
  console.log(`[查询函数] 收到请求方法: ${event.httpMethod}`);
  
  // 严格检查POST方法
  if (event.httpMethod !== 'POST') {
    console.error(`[查询函数] 拒绝非POST请求: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `只支持POST请求，收到: ${event.httpMethod}` })
    };
  }

  try {
    // 解析请求体
    const body = event.body ? JSON.parse(event.body) : {};
    const { name, highschool } = body;
    
    // 验证查询条件
    if (!name && !highschool) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请输入查询条件' })
      };
    }

    // 构建查询
    let query = 'SELECT id, name, highschool, graduation_year, class_name, security_question FROM graduates WHERE 1=1';
    const params = [];
    
    if (name) {
      params.push(`%${name}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    if (highschool) {
      params.push(`%${highschool}%`);
      query += ` AND highschool ILIKE $${params.length}`;
    }

    // 执行查询
    const result = await pool.query(query, params);
    
    // 处理结果（解密安全问题）
    const data = result.rows.map(item => ({
      ...item,
      security_question: decryptData(item.security_question) || '解密失败'
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        count: data.length,
        data: data
      })
    };

  } catch (error) {
    console.error('[查询函数错误]', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '服务器查询失败' })
    };
  }
};
    