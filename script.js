// 其他函数（showPage、showToast等）保持不变

// 修改登记表单提交处理（重点强化毕业年份验证）
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
        
        // 获取表单元素（单独获取毕业年份元素用于高亮提示）
        const graduationYearInput = document.getElementById('graduation-year');
        const nameInput = document.getElementById('name');
        const highschoolInput = document.getElementById('highschool');
        
        // 获取表单数据
        const formData = {
            name: nameInput.value.trim(),
            highschool: highschoolInput.value.trim(),
            // 毕业年份单独处理，确保非空且格式正确
            graduation_year: graduationYearInput.value.trim(),
            class_name: document.getElementById('class-name').value.trim(),
            destination_type: document.getElementById('destination-type').value,
            destination: document.getElementById('destination').value.trim(),
            description: document.getElementById('description').value.trim(),
            security_question: document.getElementById('security-question').value.trim(),
            security_answer: document.getElementById('security-answer').value.trim()
        };
        
        // 重置所有输入框的错误状态
        [graduationYearInput, nameInput, highschoolInput].forEach(el => {
            el.classList.remove('border-red-500', 'bg-red-50');
        });
        
        // 验证必填字段（增强毕业年份验证）
        const errors = [];
        
        // 毕业年份专项验证
        if (!formData.graduation_year) {
            errors.push('毕业年份不能为空');
            graduationYearInput.classList.add('border-red-500', 'bg-red-50');
        } else if (!/^\d{4}$/.test(formData.graduation_year)) {
            errors.push('毕业年份必须是4位数字（如2023）');
            graduationYearInput.classList.add('border-red-500', 'bg-red-50');
        }
        
        // 其他必填字段验证
        if (!formData.name) {
            errors.push('姓名不能为空');
            nameInput.classList.add('border-red-500', 'bg-red-50');
        }
        if (!formData.highschool) {
            errors.push('毕业学校不能为空');
            highschoolInput.classList.add('border-red-500', 'bg-red-50');
        }
        if (!formData.destination_type) {
            errors.push('请选择去向类型');
        }
        if (!formData.destination) {
            errors.push('去向信息不能为空');
        }
        if (!formData.security_question) {
            errors.push('安全问题不能为空');
        }
        if (!formData.security_answer) {
            errors.push('安全答案不能为空');
        }
        
        // 显示验证错误
        if (errors.length > 0) {
            showToast(errors.join('；'), false);
            // 自动聚焦到第一个错误字段
            const firstErrorField = document.querySelector('.border-red-500');
            if (firstErrorField) firstErrorField.focus();
            return;
        }
        
        // 加密敏感数据（保持不变）
        const encryptedData = {
            ...formData,
            destination: encryptData(formData.destination),
            description: encryptData(formData.description),
            security_question: encryptData(formData.security_question),
            security_answer: encryptData(formData.security_answer)
        };
        
        // 提交数据到后端（保持不变）
        try {
            const response = await fetch('/.netlify/functions/save-graduate', {
                method: 'POST',
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

// 其他函数（setupSearchFunction等）保持不变
