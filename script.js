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
    } text-white z-50 transition-all duration-300`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 初始化页面导航
function initPages() {
    showPage('home-page');
    document.getElementById('to-register').addEventListener('click', () => showPage('register-page'));
    document.getElementById('to-search').addEventListener('click', () => showPage('search-page'));
    document.getElementById('back-home1').addEventListener('click', () => showPage('home-page'));
    document.getElementById('back-home2').addEventListener('click', () => showPage('home-page'));
}

// 加密配置与函数
const ENCRYPTION_KEY = 'graduateTrackerKey123';
const IV = '1234567890abcdef';

function encryptData(data) {
    try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(IV);
        
        const encrypted = CryptoJS.AES.encrypt(
            dataStr,
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );
        
        return encrypted.toString();
    } catch (error) {
        console.error('加密失败:', error);
        showToast('数据加密失败', false);
        return null;
    }
}

function decryptData(encryptedData) {
    try {
        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(IV);
        
        const decryptedBytes = CryptoJS.AES.decrypt(
            encryptedData,
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );
        
        const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
        try { return JSON.parse(decryptedStr); } 
        catch (e) { return decryptedStr; }
    } catch (error) {
        console.error('解密失败:', error);
        return null;
    }
}

// 全局请求监控与拦截
function setupRequestInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        // 记录所有请求信息
        console.log(`[请求监控] 发送 ${options.method || 'GET'} 请求到 ${url}`);
        
        // 强制查询接口使用POST
        if (url.endsWith('/.netlify/functions/search-graduate')) {
            options.method = 'POST';
            options.headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            console.log(`[请求拦截] 强制查询接口使用POST方法`);
        }
        
        return originalFetch.call(this, url, options)
            .then(response => {
                console.log(`[请求监控] 收到响应: ${response.status} ${url}`);
                return response;
            })
            .catch(error => {
                console.error(`[请求监控] 请求失败: ${error.message}`);
                throw error;
            });
    };
}

// 注册功能
function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.method = 'POST';
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
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
        const required = ['name', 'highschool', 'graduation_year', 'destination_type', 'destination', 'security_question', 'security_answer'];
        const empty = required.filter(field => !formData[field]);
        if (empty.length > 0) {
            showToast(`请填写: ${empty.join(', ')}`, false);
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
        
        try {
            const response = await fetch('/.netlify/functions/save-graduate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(encryptedData)
            });
            
            if (response.status === 405) throw new Error('注册接口只支持POST请求');
            
            const result = await response.json();
            if (result.success) {
                showToast('注册成功！', true);
                form.reset();
            } else {
                showToast(`注册失败: ${result.error}`, false);
            }
        } catch (error) {
            console.error('注册失败:', error);
            showToast('网络错误，请重试', false);
        }
    });
}

// 查询功能（最终修复版）
function setupSearchFunction() {
    const form = document.getElementById('search-form');
    const results = document.getElementById('results-container');
    const nameInput = document.getElementById('query-name');
    const schoolInput = document.getElementById('query-school');
    
    // 验证元素存在性
    if (!form || !results || !nameInput || !schoolInput) {
        console.error('查询功能所需元素缺失');
        return;
    }

    // 彻底禁用表单默认行为
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }, true);

    // 唯一查询函数
    async function searchGraduates() {
        const name = nameInput.value.trim();
        const highschool = schoolInput.value.trim();
        
        results.innerHTML = '<div class="text-center py-4">查询中...</div>';
        
        try {
            const response = await fetch('/.netlify/functions/search-graduate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, highschool })
            });
            
            if (response.status === 405) {
                throw new Error('查询接口只支持POST请求（后端验证）');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                results.innerHTML = `<div class="text-center py-4 text-red-500">${result.error}</div>`;
                return;
            }
            
            if (result.count === 0) {
                results.innerHTML = '<div class="text-center py-4">未找到匹配记录</div>';
                return;
            }
            
            // 渲染结果
            results.innerHTML = '';
            result.data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'border rounded-lg p-4 mb-4 shadow-sm';
                card.innerHTML = `
                    <h3 class="font-bold text-lg">${item.name}</h3>
                    <p><strong>学校:</strong> ${item.highschool}</p>
                    <p><strong>毕业年份:</strong> ${item.graduation_year}</p>
                    <p><strong>班级:</strong> ${item.class_name || '未填写'}</p>
                    <p><strong>安全问题:</strong> ${decryptData(item.security_question) || '无法显示'}</p>
                    <button 
                        onclick="verifyAnswer(${item.id})"
                        class="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                        验证答案
                    </button>
                `;
                results.appendChild(card);
            });
        } catch (error) {
            console.error('查询失败:', error);
            results.innerHTML = `<div class="text-center py-4 text-red-500">${error.message}</div>`;
        }
    }

    // 绑定所有查询触发方式
    const searchBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => searchGraduates());
    }
    
    [nameInput, schoolInput].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchGraduates();
        });
    });
}

// 答案验证功能
window.verifyAnswer = async function(graduateId) {
    const answer = prompt('请输入安全问题的答案:');
    if (!answer) return;

    try {
        const response = await fetch('/.netlify/functions/verify-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: graduateId, answer: answer.trim() })
        });
        
        if (response.status === 405) {
            showToast('验证接口只支持POST请求', false);
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            showToast(result.isCorrect ? '答案正确！' : '答案不正确', result.isCorrect);
        } else {
            showToast(`验证失败: ${result.error}`, false);
        }
    } catch (error) {
        console.error('验证失败:', error);
        showToast('验证失败，请重试', false);
    }
};

// 初始化所有功能
document.addEventListener('DOMContentLoaded', function() {
    setupRequestInterceptor(); // 优先启动请求拦截
    initPages();
    setupRegisterForm();
    setupSearchFunction();
    
    // 加密自检
    const test = encryptData('test');
    if (decryptData(test) !== 'test') {
        console.warn('加密自检失败');
        showToast('加密配置有问题', false);
    }
});
    