const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: '只支持POST请求' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // 插入数据
    const result = await pool.query(`
      INSERT INTO graduates (
        name, highschool, graduation_year, class_name, 
        destination_type, destination, description,
        security_question, security_answer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      data.name, data.highschool, data.graduation_year, data.class_name,
      data.destination_type, data.destination, data.description,
      data.security_question, data.security_answer
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        id: result.rows[0].id
      })
    };
  } catch (error) {
    console.error('保存失败:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '保存数据失败' })
    };
  }
};
    