const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 加密密钥（建议存储在环境变量中）
const encryptionKey = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY || 'graduateTrackerKey123');
const iv = CryptoJS.enc.Utf8.parse('1234567890abcdef');

// 关键修复：正确使用NEON_DATABASE_URL环境变量
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  // 确保SSL配置正确，Neon需要SSL连接
  ssl: {
    rejectUnauthorized: false
  }
});

// 验证连接字符串是否存在（调试用）
if (!process.env.NEON_DATABASE_URL) {
  console.error('警告：NEON_DATABASE_URL环境变量未设置！');
} else {
  // 只输出连接字符串的主机部分，避免泄露敏感信息
  const urlParts = new URL(process.env.NEON_DATABASE_URL);
  console.log('数据库连接主机:', urlParts.host);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ success: false, error: '只支持POST请求' }) 
      };
    }

    const formData = JSON.parse(event.body);
    
    // 验证必填字段
    const requiredFields = ['name', 'highschool', 'graduationYear', 'destinationType', 'destination', 'securityQuestion', 'securityAnswer'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: `缺少必填字段：${missingFields.join(', ')}` 
        })
      };
    }

    // 准备插入数据
    const data = [
      formData.name.trim(),
      formData.highschool.trim(),
      formData.graduationYear.toString().trim(),
      (formData.className || '').trim(),
      formData.destinationType,
      formData.destination,
      formData.description,
      formData.securityQuestion,
      formData.securityAnswer
    ];

    // SQL插入语句
    const query = `
      INSERT INTO graduates (
        name, highschool, graduation_year, class_name,
        destination_type, destination, description,
        security_question, security_answer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const result = await pool.query(query, data);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '数据保存成功',
        id: result.rows[0].id
      })
    };

  } catch (error) {
    console.error('保存数据错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: '无法连接到数据库，请检查配置',
        // 仅在开发环境显示详细错误
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
    