const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

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

// 加密配置
const encryptionKey = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY || 'graduateTrackerKey123');
const iv = CryptoJS.enc.Utf8.parse('1234567890abcdef');

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// 解密函数
function decryptData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey, { 
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    console.error('解密失败:', e);
    return null;
  }
}

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

    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ success: false, error: '只支持POST请求' }) 
      };
    }

    const { id, answer } = JSON.parse(event.body);
    
    if (!id || !answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '参数不完整' })
      };
    }

    // 查询记录
    const query = 'SELECT * FROM graduates WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: '记录不存在' })
      };
    }

    const graduate = result.rows[0];
    const decryptedAnswer = decryptData(graduate.security_answer);
    const isCorrect = decryptedAnswer && decryptedAnswer.toLowerCase() === answer.toLowerCase();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        isCorrect,
        data: isCorrect ? graduate : null
      })
    };
  } catch (error) {
    console.error('验证错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: '验证失败' })
    };
  }
};
    