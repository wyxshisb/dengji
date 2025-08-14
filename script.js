// 页面元素切换控制
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

// 提示框功能
function showToast(message, isSuccess = true) {
    const toast = document.createElement('div');
    toast.className = `toast fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md ${
        isSuccess ? 'bg-green-500' : 'bg-red-500'
    } text-white z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 初始化页面
function initPages() {
    showPage('home-page');
    document.getElementById('to-register').addEventListener('click', () => showPage('register-page'));
    document.getElementById('to-search').addEventListener('click', () => showPage('search-page'));
    document.getElementById('back-home1').addEventListener('click', () => showPage('home-page'));
    document.getElementById('back-home2').addEventListener('click', () => showPage('home-page'));
}

// 加密配置 - 与后端完全一致
const ENCRYPTION_KEY = 'graduateTrackerKey123'; // 21位密钥
const IV = '1234567890abcdef'; // 16位偏移量

// 加密函数
function encryptData(data) {
    try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(IV);
        
        const encrypted = CryptoJS.AES.encrypt(
            dataStr,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        
        return encrypted.toString();
    } catch (error) {
        console.error('前端加密失败:', error);
        showToast('数据加密失败，请重试', false);
        return null;
    }
}

// 解密函数（用于前端测试）
function decryptData(encryptedData) {
    try {
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(IV);
        
        const decryptedBytes = CryptoJS.AES.decrypt(
            encryptedData,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        
        const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
        
        try {
            return JSON.parse(decryptedStr);
        } catch (e) {
            return decryptedStr;
        }
    } catch (error) {
        console.error('前端解密失败:', error);
        return null;
    }
}

// 登记表单提交处理
function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) {
        console.error('未找到登记表单元素');
        return;
    }

    // 强制表单使用POST方法
    form.method = 'POST';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 获取表单数据
        const formData = {
            name: document.getElementById('name').value.trim(),
            highschool: document.getElementById('highschool').value.trim(),
            graduation_year: document.getElementById('graduation-year').value.trim(),
            class_name: document.getElementById('class-name').value.trim(),
            destination_type: document.getElementById('destination-type').value,
            destination: document.getElementById('destination').value.trim(),
            description: document.getElementById('description').value.trim(),
            security_question: document.getElementById('security-question').value.trim(),
            security_answer: document.getElementById('security-answer').value.trim()
        };
        
        // 验证必填字段
        const requiredFields = [
            'name', 'highschool', 'graduation_year', 
            'destination_type', 'destination', 
            'security_question', 'security_answer'
        ];
        const emptyFields = requiredFields.filter(field => !formData[field]);
        
        if (emptyFields.length > 0) {
            showToast(`请填写所有必填字段: ${emptyFields.join(', ')}`, false);
            return;
        }
        
        // 加密敏感数据
        const encryptedData = {
            ...formData,
            destination: encryptData(formData.destination),
            description: encryptData(formData.description),
            security_question: encryptData(formData.security_question),
            security_answer: encryptData(formData.security_answer)
        };
        
        // 提交数据到后端
        try {
            const response = await fetch('/.netlify/functions/save-graduate', {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(encryptedData)
            });
            
            if (response.status === 405) {
                console.error('服务器拒绝：请求方法不是POST');
                showToast('提交失败：请求方法错误', false);
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                showToast('数据保存成功！', true);
                form.reset();
            } else {
                showToast(`保存失败: ${result.error || '未知错误'}`, false);
            }
        } catch (error) {
            console.error('提交表单失败:', error);
            showToast('网络错误，提交失败', false);
        }
    });
}

// 查询功能处理
function setupSearchFunction() {
    const searchForm = document.getElementById('search-form');
    const resultsContainer = document.getElementById('results-container');
    
    if (!searchForm || !resultsContainer) {
        console.error('未找到查询表单或结果容器');
        return;
    }

    // 强制表单使用POST方法
    searchForm.method = 'POST';
    
    // 查询函数
    async function searchGraduates() {
        const name = document.getElementById('query-name').value.trim();
        const highschool = document.getElementById('query-school').value.trim();
        
        resultsContainer.innerHTML = '<div class="loading">查询中...</div>';
        
        try {
            const response = await fetch('/.netlify/functions/search-graduate', {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, highschool })
            });
            
            if (response.status === 405) {
                console.error('服务器拒绝：请求方法不是POST');
                resultsContainer.innerHTML = '<div class="error">查询失败：请求方法错误</div>';
                return;
            }
            
            const result = await response.json();
            console.log('查询结果:', result);
            
            resultsContainer.innerHTML = '';
            
            if (result.success) {
                if (result.count > 0) {
                    result.data.forEach(item => {
                        const card = document.createElement('div');
                        card.className = 'result-card border p-4 rounded-md mb-3';
                        card.innerHTML = `
                            <h3 class="text-lg font-semibold">${item.name}</h3>
                            <p><strong>学校:</strong> ${item.highschool}</p>
                            <p><strong>毕业年份:</strong> ${item.graduation_year}</p>
                            <p><strong>班级:</strong> ${item.class_name || '未填写'}</p>
                            <p><strong>安全问题:</strong> ${item.security_question}</p>
                            <button 
                                onclick="verifyAnswer(${item.id})"
                                class="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
                            >
                                验证答案
                            </button>
                        `;
                        resultsContainer.appendChild(card);
                    });
                } else {
                    resultsContainer.innerHTML = '<div class="no-results text-center py-4">未找到匹配的记录</div>';
                }
            } else {
                resultsContainer.innerHTML = `<div class="error text-center py-4 text-red-500">${result.error}</div>`;
            }
        } catch (error) {
            console.error('查询失败:', error);
            resultsContainer.innerHTML = '<div class="error text-center py-4 text-red-500">查询失败，请检查网络连接</div>';
        }
    }

    // 绑定查询表单提交事件
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        searchGraduates();
    });
    
    // 绑定查询按钮点击事件
    const searchButton = document.querySelector('#search-form button[type="submit"]');
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            searchGraduates();
        });
    }
}

// 答案验证功能
window.verifyAnswer = async function(graduateId) {
    const answer = prompt('请输入安全问题的答案:');
    if (!answer) return;

    try {
        const response = await fetch('/.netlify/functions/verify-answer', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: graduateId, answer: answer.trim() })
        });
        
        if (response.status === 405) {
            console.error('服务器拒绝：请求方法不是POST');
            showToast('验证失败：请求方法错误', false);
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            if (result.isCorrect) {
                showToast('答案正确！', true);
            } else {
                showToast('答案不正确，请重试', false);
            }
        } else {
            showToast(`验证失败: ${result.error}`, false);
        }
    } catch (error) {
        console.error('验证答案失败:', error);
        showToast('验证失败，请重试', false);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initPages();
    setupRegisterForm();
    setupSearchFunction();
    
    // 加密解密自检
    const testData = 'test-encryption';
    const encrypted = encryptData(testData);
    const decrypted = decryptData(encrypted);
    
    if (decrypted !== testData) {
        console.warn('⚠️ 加密解密自检失败');
        showToast('加密配置可能存在问题，请检查', false);
    } else {
        console.log('✅ 加密解密自检成功');
    }
});
    