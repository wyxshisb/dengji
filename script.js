// 其他函数保持不变，仅修改查询相关部分

// 查询功能处理（强化POST请求机制）
function setupSearchFunction() {
    const searchForm = document.getElementById('search-form');
    const resultsContainer = document.getElementById('results-container');
    const queryNameInput = document.getElementById('query-name');
    const querySchoolInput = document.getElementById('query-school');
    
    // 验证关键元素是否存在
    if (!searchForm) {
        console.error('严重错误：未找到id为"search-form"的查询表单');
        return;
    }
    if (!resultsContainer) {
        console.error('严重错误：未找到id为"results-container"的结果容器');
        return;
    }
    if (!queryNameInput || !querySchoolInput) {
        console.error('严重错误：查询输入框不存在');
        return;
    }

    // 1. 强制表单属性为POST（三重保障）
    searchForm.setAttribute('method', 'POST');
    searchForm.method = 'POST';
    searchForm.enctype = 'application/json'; // 明确数据类型

    // 2. 重写表单默认提交行为（彻底避免GET请求）
    searchForm.onsubmit = function(e) {
        e.preventDefault();
        e.stopPropagation(); // 阻止任何冒泡的事件处理
        searchGraduates();
        return false; // 彻底阻止默认行为
    };

    // 3. 查询函数（强化POST请求配置）
    async function searchGraduates() {
        const name = queryNameInput.value.trim();
        const highschool = querySchoolInput.value.trim();
        
        resultsContainer.innerHTML = '<div class="loading">查询中...</div>';
        
        try {
            // 构建完整的请求配置
            const requestOptions = {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest', // 标识AJAX请求
                    'Accept': 'application/json'
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({ name, highschool })
            };

            // 打印请求信息（调试用）
            console.log('发送查询请求:', {
                url: '/.netlify/functions/search-graduate',
                method: requestOptions.method,
                data: { name, highschool }
            });

            const response = await fetch('/.netlify/functions/search-graduate', requestOptions);
            
            // 4. 详细的响应状态检查
            console.log('查询响应状态:', response.status);
            if (!response.ok) {
                if (response.status === 405) {
                    throw new Error(`服务器拒绝请求（状态码405）：可能请求方法不是POST`);
                } else {
                    throw new Error(`请求失败（状态码${response.status}）`);
                }
            }
            
            const result = await response.json();
            console.log('查询结果:', result);
            
            // 渲染结果（保持不变）
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
            console.error('查询失败详情:', error);
            resultsContainer.innerHTML = `
                <div class="error text-center py-4 text-red-500">
                    查询失败: ${error.message}
                </div>
            `;
        }
    }

    // 5. 为所有可能的查询触发元素绑定事件
    // 绑定查询按钮（处理可能的动态生成按钮）
    const bindSearchButton = () => {
        const buttons = document.querySelectorAll('#search-form button');
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                searchGraduates();
            });
        });
    };

    // 初始绑定 + 监听DOM变化重新绑定
    bindSearchButton();
    const observer = new MutationObserver(bindSearchButton);
    observer.observe(searchForm, { childList: true, subtree: true });

    // 6. 支持回车键提交（仍强制POST）
    [queryNameInput, querySchoolInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchGraduates();
            }
        });
    });
}

// 其他函数（showPage、showToast、加密函数等）保持不变
