const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 加密配置（与原有验证函数保持一致）
const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';
const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const iv = CryptoJS.enc.Utf8.parse(IV);

// 数据库连接（保留原有配置）
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 解密函数（复用原有逻辑，增加日志）
function decryptData(encryptedData) {
  try {
    if (!encryptedData) {
      console.log('解密数据为空');
      return null;
    }
    
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    
    const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
    // 新增：打印解密结果前20位（不泄露完整信息）
    console.log('解密结果前20位:', decryptedStr.substring(0, 20));
    return decryptedStr || null;
  } catch (error) {
    console.error('查询解密失败:', error);
    return null;
  }
}

// 主查询函数（保留原有结构，修复关键问题）
exports.handler = async (event) => {
  try {
    // 保留原有请求方法检查
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ success: false, error: '只支持POST请求' }) 
      };
    }

    // 解析请求参数（原有逻辑，增加异常处理）
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
    
    // 保留原有查询条件验证
    if (!name && !highschool) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请输入姓名或学校' })
      };
    }

    // 构建查询条件（原有逻辑，增加日志）
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

    // 执行查询（原有SQL，增加日志）
    const query = `
      SELECT id, name, highschool, graduation_year, class_name, security_question 
      FROM graduates 
      WHERE ${conditions.join(' AND ')}
      ORDER BY name ASC
    `;
    // 新增：打印执行的SQL和参数（调试用）
    console.log('执行查询:', query);
    console.log('查询参数:', params);
    
    const result = await pool.query(query, params);
    // 新增：打印查询到的记录数
    console.log('查询到记录数:', result.rows.length);

    // 处理结果（保留原有映射逻辑，优化解密容错）
    const results = result.rows.map(item => ({
      ...item,
      // 修复：解密失败时显示友好提示，而非空
      security_question: decryptData(item.security_question) || '无法显示问题（解密失败）'
    }));

    // 保留原有返回格式，增加调试信息
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: results.length,
        data: results,
        // 新增：调试信息（生产环境可删除）
        debug: {
          query: query,
          params: params.length
        }
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
