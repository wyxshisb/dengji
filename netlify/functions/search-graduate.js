const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 加密配置（与验证函数一致）
const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';
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
    return decryptedStr || null;
  } catch (error) {
    console.error('查询解密失败:', error);
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

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('请求参数解析错误:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请求格式错误' })
      };
    }
    const { name, highschool } = requestBody;
    
    if (!name && !highschool) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请输入姓名或学校' })
      };
    }

    // 构建查询条件
    let params = [];
    let conditions = [];
    let paramIndex = 1;

    if (name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${name.trim()}%`);
      paramIndex++;
    }
    if (highschool) {
      conditions.push(`highschool ILIKE $${paramIndex}`);
      params.push(`%${highschool.trim()}%`);
      paramIndex++;
    }

    const query = `
      SELECT id, name, highschool, graduation_year, class_name, security_question 
      FROM graduates 
      WHERE ${conditions.join(' AND ')}
      ORDER BY name ASC
    `;

    const result = await pool.query(query, params);
    console.log('查询到记录数:', result.rows.length);

    // 处理结果
    const results = result.rows.map(item => ({
      ...item,
      security_question: decryptData(item.security_question) || '无法显示问题'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: results.length,
        data: results
      })
    };

  } catch (error) {
    console.error('查询函数错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '查询失败' })
    };
  }
};
    