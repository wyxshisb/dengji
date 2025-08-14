const { Pool } = require('pg');

// 复用连接字符串获取逻辑
const getConnectionString = () => {
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
  
  throw new Error('未找到数据库连接字符串');
};

try {
  var connectionString = getConnectionString();
} catch (error) {
  console.error('数据库配置错误:', error.message);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event) => {
  try {
    if (!connectionString) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: '数据库未配置'
        })
      };
    }

    if (event.httpMethod !== 'GET') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ success: false, error: '只支持GET请求' }) 
      };
    }

    // 解析查询参数
    const queryParams = new URLSearchParams(event.queryStringParameters);
    const name = queryParams.get('name') || '';
    const school = queryParams.get('school') || '';

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请提供查询姓名' })
      };
    }

    // 构建查询
    let query = 'SELECT id, name, highschool, graduation_year, class_name, security_question FROM graduates WHERE name ILIKE $1';
    const queryParamsArray = [`%${name}%`];
    
    if (school) {
      query += ' AND highschool ILIKE $2';
      queryParamsArray.push(`%${school}%`);
    }

    const result = await pool.query(query, queryParamsArray);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result.rows
      })
    };

  } catch (error) {
    console.error('查询错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: '查询失败'
      })
    };
  }
};
    