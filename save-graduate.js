const { Pool } = require('pg');

// 从环境变量获取数据库连接字符串
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
    }

    const data = JSON.parse(event.body);
    
    // 验证必填字段
    const requiredFields = ['name', 'highschool', 'graduationYear', 'destinationType', 'destination', 'securityQuestion', 'securityAnswer'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: `缺少必填字段: ${missingFields.join(', ')}` 
        })
      };
    }

    // 检查是否已有相同记录（同名同校）
    const checkQuery = `
      SELECT id FROM graduates 
      WHERE name = $1 AND highschool = $2
    `;
    const checkResult = await pool.query(checkQuery, [data.name, data.highschool]);
    
    let result;
    
    if (checkResult.rows.length > 0) {
      // 更新现有记录
      const updateQuery = `
        UPDATE graduates SET 
          graduation_year = $1,
          class_name = $2,
          destination_type = $3,
          destination = $4,
          description = $5,
          security_question = $6,
          security_answer = $7,
          created_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id
      `;
      
      const values = [
        data.graduationYear,
        data.className || '',
        data.destinationType,
        data.destination,
        data.description || '',
        data.securityQuestion,
        data.securityAnswer,
        checkResult.rows[0].id
      ];
      
      result = await pool.query(updateQuery, values);
    } else {
      // 创建新记录
      const insertQuery = `
        INSERT INTO graduates (
          name, highschool, graduation_year, class_name, 
          destination_type, destination, description, 
          security_question, security_answer, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING id
      `;
      
      const values = [
        data.name,
        data.highschool,
        data.graduationYear,
        data.className || '',
        data.destinationType,
        data.destination,
        data.description || '',
        data.securityQuestion,
        data.securityAnswer
      ];
      
      result = await pool.query(insertQuery, values);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: checkResult.rows.length > 0 ? '信息更新成功' : '登记成功',
        id: result.rows[0].id
      })
    };
  } catch (error) {
    console.error('保存数据错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '保存数据失败' })
    };
  }
};
    