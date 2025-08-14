// 其他函数（showPage、showToast、加密函数等）保持不变

// 新增：全局请求拦截器，强制查询接口使用POST
function setupRequestInterceptor() {
    // 保存原始fetch方法
    const originalFetch = window.fetch;
    
    // 重写fetch方法
    window.fetch = async function(url, options = {}) {
        // 仅拦截查询接口
        if (url === '/.netlify/functions/search-graduate') {
            // 强制方法为POST
            options.method = 'POST';
            
            // 强制设置请求头
            options.headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
            
            // 如果没有body，添加空对象（避免后端解析错误）
            if (!options.body) {
                options.body = JSON.stringify({});
            }
            
            console.log('拦截并强制POST请求:', url, options.method);
        }
        
        // 调用原始fetch
        return originalFetch.call(this, url, options);
    };
}

// 修改查询功能处理（结合拦截器确保万无一失）
function setupSearchFunction() {
    const searchForm = document.getElementById('search-form');
    const resultsContainer = document.getElementById('results-container');
    const queryNameInput = document.getElementById('query-name');
    const querySchoolInput = document.getElementById('query-school');
    
    if (!searchForm || !resultsContainer || !queryNameInput || !querySchoolInput) {
        console.error('查询所需元素缺失');
        return;
    }

    // 1. 彻底禁用表单默认提交
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }, true); // 使用捕获阶段拦截

    // 2. 唯一的查询触发函数（所有场景都调用此函数）
    async function searchGraduates() {
        const name = queryNameInput.value.trim();
        const highschool = querySchoolInput.value.trim();
        
        resultsContainer.innerHTML = '<div class="loading">查询中...</div>';
        
        try {
            // 无论如何，这里明确使用POST
            const response = await fetch('/.netlify/functions/search-graduate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, highschool })
            });
            
            // 3. 详细错误处理
            if (response.status === 405) {
                throw new Error('服务器仍拒绝POST请求，请检查后端函数是否存在');
            }
            
            const result = await response.json();
            
            // 渲染结果（保持不变）
            resultsContainer.innerHTML = '';
            if (result.success && result.count > 0) {
                result.data.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'result-card border p-4 rounded-md mb-3';
                    card.innerHTML = `
                        <h3 class="text-lg font-semibold">${item.name}</h3>
                        <p><strong>学校:</strong> ${item.highschool}</p>
                        <p><strong>毕业年份:</strong> ${item.graduation_year}</p>
                        <p><strong>班级:</strong> ${item.class_name || '未填写'}</p>
                        <p><strong>安全问题:</strong> ${item.security_question}</p>
                        <button onclick="verifyAnswer(${item.id})" class="mt-2 px-3 py-1 bg-blue-500 text-white rounded">
                            验证答案
                        </button>
                    `;
                    resultsContainer.appendChild(card);
                });
            } else {
                resultsContainer.innerHTML = `<div class="no-results text-center py-4">${result.error || '未找到匹配记录'}</div>`;
            }
        } catch (error) {
            console.error('查询错误:', error);
            resultsContainer.innerHTML = `<div class="error text-center py-4 text-red-500">${error.message}</div>`;
        }
    }

    // 4. 绑定所有可能的触发方式（确保唯一入口）
    // 按钮点击
    const searchButton = document.querySelector('#search-form button[type="submit"]');
    if (searchButton) {
        searchButton.addEventListener('click', () => searchGraduates());
    }
    // 输入框回车
    [queryNameInput, querySchoolInput].forEach(input => {
        input.addEventListener('keydown', (e) => e.key === 'Enter' && searchGraduates());
    });
    // 防止动态生成元素遗漏（事件委托）
    document.addEventListener('click', (e) => {
        if (e.target.closest('#search-form button')) {
            searchGraduates();
        }
    });
}

// 页面初始化时启动拦截器
document.addEventListener('DOMContentLoaded', function() {
    setupRequestInterceptor(); // 启动请求拦截器
    initPages();
    setupRegisterForm();
    setupSearchFunction();
    // 其他初始化代码...
});
