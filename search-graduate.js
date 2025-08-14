const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
    }

    // 解析查询参数
    const params = new URLSearchParams(event.queryStringParameters);
    const name = params.get('name');
    const school = params.get('school');
    
    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请提供姓名' })
      };
    }

    // 构建查询
    let query = 'SELECT id, name, highschool, graduation_year, class_name, security_question FROM graduates WHERE name = $1';
    const queryParams = [name];
    
    // 如果提供了学校，添加到查询条件
    if (school) {
      query += ' AND highschool = $2';
      queryParams.push(school);
    }
    
    // 执行查询
    const result = await pool.query(query, queryParams);
    
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
      body: JSON.stringify({ success: false, error: '查询失败' })
    };
  }
};
    