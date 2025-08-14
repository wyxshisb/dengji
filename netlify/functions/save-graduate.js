const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

// 从环境变量读取连接字符串，增加容错处理
const getConnectionString = () => {
  // 检查所有可能的环境变量名称（解决拼写问题）
  const possibleEnvVars = [
    'NEON_DATABASE_URL',
    'NETLIFY_DATABASE_URL',
    'DATABASE_URL'
  ];
  
  for (const envVar of possibleEnvVars) {
    if (process.env[envVar]) {
      console.log(`使用环境变量: ${envVar}`);
      return process.env[envVar];
    }
  }
  
  // 如果都没有找到，抛出明确错误
  throw new Error('未找到数据库连接字符串，请检查环境变量设置');
};

try {
  var connectionString = getConnectionString();
} catch (error) {
  console.error('数据库配置错误:', error.message);
  // 开发环境可临时硬编码连接字符串（生产环境删除此行）
  // connectionString = 'postgresql://你的完整连接字符串';
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event) => {
  try {
    // 额外检查连接字符串是否存在
    if (!connectionString) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: '数据库未配置，请联系管理员'
        })
      };
    }

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
        error: '保存失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
    