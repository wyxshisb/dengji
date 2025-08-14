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

    const { name, school } = event.queryStringParameters;
    
    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '请提供姓名' })
      };
    }

    // 构建查询条件
    let query = 'SELECT * FROM graduates WHERE name ILIKE $1';
    const params = [`%${name}%`];
    
    // 如提供学校，增加过滤条件
    if (school) {
      query += ' AND highschool ILIKE $2';
      params.push(`%${school}%`);
    }

    const result = await pool.query(query, params);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result.rows
      })
    };
  } catch (error) {
    console.error('查询失败:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '查询数据失败' })
    };
  }
};
    