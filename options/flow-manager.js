// 流程管理器
class FlowManager {
  constructor() {
    this.flows = [];
    this.currentEditingFlow = null;
    this.stepCounter = 0;
    this.init();
  }

  async init() {
    this.bindEventListeners();
    await this.loadFlows();
    this.renderFlows();
    console.log('FlowManager 初始化完成');
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 头部按钮
    document.getElementById('createFlowBtn').addEventListener('click', () => this.createNewFlow());
    document.getElementById('importTemplateBtn').addEventListener('click', () => this.showTemplateSelector());
    document.getElementById('importFlowBtn').addEventListener('click', () => this.importFlow());

    // 使用事件委托处理空状态按钮
    document.addEventListener('click', (e) => {
      if (e.target.id === 'createFlowBtnEmpty') {
        this.createNewFlow();
      }
    });
    
    // 模态框
    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('saveFlowBtn').addEventListener('click', () => this.saveFlow());
    document.getElementById('testFlowBtn').addEventListener('click', () => this.testFlow());
    
    // 步骤管理
    document.getElementById('addStepBtn').addEventListener('click', () => this.addStep());
    
    // 搜索和过滤
    document.getElementById('searchFlow').addEventListener('input', (e) => this.filterFlows());
    document.getElementById('filterDomain').addEventListener('change', (e) => this.filterFlows());
    
    // 导入文件
    document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileImport(e));
    
    // 模态框外点击关闭
    document.getElementById('flowEditorModal').addEventListener('click', (e) => {
      if (e.target.id === 'flowEditorModal') {
        this.closeModal();
      }
    });
  }

  // 加载流程列表
  async loadFlows() {
    try {
      const response = await this.sendMessage({ action: 'getAutomationFlows' });
      if (response.success) {
        this.flows = response.flows || [];
        this.updateDomainFilter();
      }
    } catch (error) {
      console.error('加载流程失败:', error);
      this.showMessage('加载流程失败', 'error');
    }
  }

  // 渲染流程列表
  renderFlows() {
    const flowsGrid = document.getElementById('flowsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (this.flows.length === 0) {
      flowsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    
    flowsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    flowsGrid.innerHTML = this.flows.map(flow => this.createFlowCard(flow)).join('');
    
    // 绑定卡片事件
    this.bindFlowCardEvents();
  }

  // 创建流程卡片
  createFlowCard(flow) {
    const stepsCount = flow.steps ? flow.steps.length : 0;
    const domainDisplay = flow.domain === '*' ? '通用' : flow.domain || '未设置';
    const statusClass = flow.enabled ? 'enabled' : 'disabled';
    const statusText = flow.enabled ? '启用' : '禁用';
    
    return `
      <div class="flow-card" data-flow-id="${flow.id}">
        <div class="flow-card-header">
          <div>
            <div class="flow-title">${flow.name}</div>
            <div class="flow-domain">${domainDisplay}</div>
          </div>
          <div class="status-indicator ${statusClass}"></div>
        </div>
        
        <div class="flow-description">
          ${flow.description || '暂无描述'}
        </div>
        
        <div class="flow-stats">
          <span>📝 ${stepsCount} 个步骤</span>
          <span class="status-${statusClass}">● ${statusText}</span>
          <span>🕒 ${this.formatDate(flow.updatedAt || flow.createdAt)}</span>
        </div>
        
        <div class="flow-actions">
          <button class="btn btn-small btn-secondary edit-flow" data-flow-id="${flow.id}">
            ✏️ 编辑
          </button>
          <button class="btn btn-small btn-secondary duplicate-flow" data-flow-id="${flow.id}">
            📋 复制
          </button>
          <button class="btn btn-small btn-secondary export-flow" data-flow-id="${flow.id}">
            📤 导出
          </button>
          <button class="btn btn-small btn-secondary delete-flow" data-flow-id="${flow.id}">
            🗑️ 删除
          </button>
        </div>
      </div>
    `;
  }

  // 绑定流程卡片事件
  bindFlowCardEvents() {
    // 编辑流程
    document.querySelectorAll('.edit-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const flowId = e.target.dataset.flowId;
        this.editFlow(flowId);
      });
    });
    
    // 复制流程
    document.querySelectorAll('.duplicate-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const flowId = e.target.dataset.flowId;
        this.duplicateFlow(flowId);
      });
    });
    
    // 导出流程
    document.querySelectorAll('.export-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const flowId = e.target.dataset.flowId;
        this.exportFlow(flowId);
      });
    });
    
    // 删除流程
    document.querySelectorAll('.delete-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const flowId = e.target.dataset.flowId;
        this.deleteFlow(flowId);
      });
    });
  }

  // 创建新流程
  createNewFlow() {
    this.currentEditingFlow = null;
    this.resetForm();
    document.getElementById('modalTitle').textContent = '创建新流程';
    this.showModal();
  }

  // 编辑流程
  editFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return;
    
    this.currentEditingFlow = flow;
    this.populateForm(flow);
    document.getElementById('modalTitle').textContent = '编辑流程';
    this.showModal();
  }

  // 复制流程
  async duplicateFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return;
    
    const duplicatedFlow = {
      ...JSON.parse(JSON.stringify(flow)),
      id: this.generateId(),
      name: flow.name + ' (副本)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      const response = await this.sendMessage({
        action: 'saveAutomationFlow',
        flow: duplicatedFlow
      });
      
      if (response.success) {
        this.flows.push(duplicatedFlow);
        this.renderFlows();
        this.showMessage('流程复制成功', 'success');
      } else {
        this.showMessage('流程复制失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('流程复制失败', 'error');
    }
  }

  // 导出流程
  exportFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return;
    
    const dataStr = JSON.stringify(flow, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${flow.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    link.click();
    
    this.showMessage('流程导出成功', 'success');
  }

  // 删除流程
  async deleteFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return;
    
    if (!confirm(`确定要删除流程"${flow.name}"吗？此操作不可撤销。`)) {
      return;
    }
    
    try {
      const response = await this.sendMessage({
        action: 'deleteAutomationFlow',
        flowId: flowId
      });
      
      if (response.success) {
        this.flows = this.flows.filter(f => f.id !== flowId);
        this.renderFlows();
        this.showMessage('流程删除成功', 'success');
      } else {
        this.showMessage('流程删除失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('流程删除失败', 'error');
    }
  }

  // 显示模板选择器
  showTemplateSelector() {
    const templates = [
      {
        name: 'Gmail注册流程',
        description: '适用于Google账号注册的完整流程',
        file: 'templates/gmail-registration-flow.json'
      },
      {
        name: '通用注册流程',
        description: '适用于大多数网站的通用注册流程',
        file: 'templates/generic-registration-flow.json'
      },
      {
        name: '简单注册流程',
        description: '适用于简单注册表单的基础流程',
        file: 'templates/simple-registration-flow.json'
      }
    ];

    const templateList = templates.map(template =>
      `<div class="template-item" data-file="${template.file}">
        <h4>${template.name}</h4>
        <p>${template.description}</p>
        <button class="btn btn-primary import-template-btn">导入此模板</button>
      </div>`
    ).join('');

    const modalHtml = `
      <div class="modal" id="templateModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>选择流程模板</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="template-grid">
              ${templateList}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 绑定导入事件
    document.querySelectorAll('.import-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateFile = e.target.closest('.template-item').dataset.file;
        this.importTemplate(templateFile);
        document.getElementById('templateModal').remove();
      });
    });
  }

  // 导入模板
  async importTemplate(templateFile) {
    try {
      const response = await fetch(chrome.runtime.getURL(templateFile));
      const templateData = await response.json();

      // 生成新ID避免冲突
      templateData.id = this.generateId();
      templateData.name = templateData.name + ' (模板)';
      templateData.createdAt = Date.now();
      templateData.updatedAt = Date.now();

      const saveResponse = await this.sendMessage({
        action: 'saveAutomationFlow',
        flow: templateData
      });

      if (saveResponse.success) {
        this.flows.push(templateData);
        this.renderFlows();
        this.showMessage('模板导入成功', 'success');
      } else {
        this.showMessage('模板导入失败: ' + saveResponse.error, 'error');
      }
    } catch (error) {
      this.showMessage('模板导入失败: ' + error.message, 'error');
    }
  }

  // 导入流程
  importFlow() {
    document.getElementById('importFileInput').click();
  }

  // 处理文件导入
  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const flowData = JSON.parse(text);
      
      // 验证流程数据
      if (!flowData.name || !flowData.steps) {
        throw new Error('无效的流程文件格式');
      }
      
      // 生成新ID避免冲突
      flowData.id = this.generateId();
      flowData.createdAt = Date.now();
      flowData.updatedAt = Date.now();
      
      const response = await this.sendMessage({
        action: 'saveAutomationFlow',
        flow: flowData
      });
      
      if (response.success) {
        this.flows.push(flowData);
        this.renderFlows();
        this.showMessage('流程导入成功', 'success');
      } else {
        this.showMessage('流程导入失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('流程导入失败: ' + error.message, 'error');
    }
    
    // 清空文件输入
    event.target.value = '';
  }

  // 显示模态框
  showModal() {
    const modal = document.getElementById('flowEditorModal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      console.error('找不到模态框元素');
    }
  }

  // 关闭模态框
  closeModal() {
    document.getElementById('flowEditorModal').style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  // 重置表单
  resetForm() {
    document.getElementById('flowForm').reset();
    document.getElementById('stepsContainer').innerHTML = '';
    this.stepCounter = 0;
    this.clearFormErrors();
  }

  // 填充表单
  populateForm(flow) {
    document.getElementById('flowName').value = flow.name || '';
    document.getElementById('flowDomain').value = flow.domain || '';
    document.getElementById('flowDescription').value = flow.description || '';
    

    
    // 步骤
    document.getElementById('stepsContainer').innerHTML = '';
    this.stepCounter = 0;
    
    if (flow.steps && flow.steps.length > 0) {
      flow.steps.forEach(step => {
        this.addStep(step);
      });
    }
    
    this.clearFormErrors();
  }

  // 添加步骤
  addStep(stepData = null) {
    const template = document.getElementById('stepTemplate');
    const stepElement = template.content.cloneNode(true);
    const stepItem = stepElement.querySelector('.step-item');
    
    this.stepCounter++;
    const stepIndex = this.stepCounter;
    
    stepItem.dataset.stepIndex = stepIndex;
    stepItem.querySelector('.step-number').textContent = stepIndex;
    
    // 如果有步骤数据，填充表单
    if (stepData) {
      this.populateStepForm(stepElement, stepData);
    }
    
    // 绑定步骤事件
    this.bindStepEvents(stepElement);
    
    document.getElementById('stepsContainer').appendChild(stepElement);
    this.updateStepNumbers();
  }

  // 填充步骤表单
  populateStepForm(stepElement, stepData) {
    stepElement.querySelector('.step-name').value = stepData.name || '';
    stepElement.querySelector('.step-type').value = stepData.type || 'fillInput';
    stepElement.querySelector('.step-selector').value = stepData.selector || '';
    stepElement.querySelector('.step-value').value = stepData.value || '';
    stepElement.querySelector('.step-description').value = stepData.description || '';
    
    const options = stepData.options || {};
    stepElement.querySelector('.step-delay').value = options.delay || 500;
    stepElement.querySelector('.step-timeout').value = options.timeout || 5000;
    stepElement.querySelector('.step-clear-first').checked = options.clearFirst || false;
    stepElement.querySelector('.step-scroll-into-view').checked = options.scrollIntoView !== false;
    
    this.updateStepTypeIcon(stepElement.querySelector('.step-type'));
  }

  // 绑定步骤事件
  bindStepEvents(stepElement) {
    // 步骤类型变化
    stepElement.querySelector('.step-type').addEventListener('change', (e) => {
      this.updateStepTypeIcon(e.target);
    });
    
    // 移动步骤
    stepElement.querySelector('.move-up').addEventListener('click', (e) => {
      this.moveStep(e.target.closest('.step-item'), 'up');
    });
    
    stepElement.querySelector('.move-down').addEventListener('click', (e) => {
      this.moveStep(e.target.closest('.step-item'), 'down');
    });
    
    // 复制步骤
    stepElement.querySelector('.duplicate').addEventListener('click', (e) => {
      this.duplicateStep(e.target.closest('.step-item'));
    });
    
    // 删除步骤
    stepElement.querySelector('.delete').addEventListener('click', (e) => {
      this.deleteStep(e.target.closest('.step-item'));
    });
    
    // 选择器助手
    stepElement.querySelector('.selector-helper').addEventListener('click', (e) => {
      this.openSelectorHelper(e.target.closest('.step-item'));
    });
    
    // 更新图标
    this.updateStepTypeIcon(stepElement.querySelector('.step-type'));
  }

  // 更新步骤类型图标
  updateStepTypeIcon(selectElement) {
    const stepItem = selectElement.closest('.step-item');
    const iconElement = stepItem.querySelector('.step-type-icon');
    
    const icons = {
      fillInput: '📝',
      clickButton: '👆',
      waitForElement: '⏳',
      humanVerification: '🔐'
      // delay: '⏱️',
      // scroll: '📜',
      // hover: '🖱️',
      // selectOption: '📋',
      // conditional: '🔀'
    };
    
    iconElement.textContent = icons[selectElement.value] || '❓';
  }

  // 移动步骤
  moveStep(stepItem, direction) {
    const container = document.getElementById('stepsContainer');
    const steps = Array.from(container.children);
    const currentIndex = steps.indexOf(stepItem);
    
    if (direction === 'up' && currentIndex > 0) {
      container.insertBefore(stepItem, steps[currentIndex - 1]);
    } else if (direction === 'down' && currentIndex < steps.length - 1) {
      container.insertBefore(steps[currentIndex + 1], stepItem);
    }
    
    this.updateStepNumbers();
  }

  // 复制步骤
  duplicateStep(stepItem) {
    const stepData = this.extractStepData(stepItem);
    this.addStep(stepData);
  }

  // 删除步骤
  deleteStep(stepItem) {
    if (confirm('确定要删除这个步骤吗？')) {
      stepItem.remove();
      this.updateStepNumbers();
    }
  }

  // 更新步骤编号
  updateStepNumbers() {
    const steps = document.querySelectorAll('.step-item');
    steps.forEach((step, index) => {
      step.querySelector('.step-number').textContent = index + 1;
      step.dataset.stepIndex = index + 1;
    });
  }

  // 提取步骤数据
  extractStepData(stepItem) {
    return {
      name: stepItem.querySelector('.step-name').value,
      type: stepItem.querySelector('.step-type').value,
      selector: stepItem.querySelector('.step-selector').value,
      value: stepItem.querySelector('.step-value').value,
      description: stepItem.querySelector('.step-description').value,
      options: {
        delay: parseInt(stepItem.querySelector('.step-delay').value) || 500,
        timeout: parseInt(stepItem.querySelector('.step-timeout').value) || 5000,
        clearFirst: stepItem.querySelector('.step-clear-first').checked,
        scrollIntoView: stepItem.querySelector('.step-scroll-into-view').checked
      }
    };
  }

  // 保存流程
  async saveFlow() {
    if (!this.validateForm()) {
      return;
    }
    
    const flowData = this.extractFormData();
    
    try {
      const response = await this.sendMessage({
        action: 'saveAutomationFlow',
        flow: flowData
      });
      
      if (response.success) {
        if (this.currentEditingFlow) {
          // 更新现有流程
          const index = this.flows.findIndex(f => f.id === this.currentEditingFlow.id);
          if (index !== -1) {
            this.flows[index] = flowData;
          }
        } else {
          // 添加新流程
          this.flows.push(flowData);
        }
        
        this.renderFlows();
        this.closeModal();
        this.showMessage('流程保存成功', 'success');
      } else {
        this.showMessage('流程保存失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('流程保存失败', 'error');
    }
  }

  // 测试流程
  async testFlow() {
    if (!this.validateForm()) {
      return;
    }
    
    const flowData = this.extractFormData();
    
    try {
      const response = await this.sendMessage({
        action: 'testAutomationFlow',
        flow: flowData
      });
      
      if (response.success) {
        this.showMessage('流程测试通过', 'success');
      } else {
        this.showMessage('流程测试失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('流程测试失败', 'error');
    }
  }

  // 验证表单
  validateForm() {
    this.clearFormErrors();
    let isValid = true;
    
    // 验证基本信息
    const flowName = document.getElementById('flowName').value.trim();
    if (!flowName) {
      this.showFieldError('flowName', '流程名称不能为空');
      isValid = false;
    }
    
    // 验证步骤
    const steps = document.querySelectorAll('.step-item');
    if (steps.length === 0) {
      this.showMessage('至少需要添加一个步骤', 'error');
      isValid = false;
    }
    
    steps.forEach((stepItem, index) => {
      const stepName = stepItem.querySelector('.step-name').value.trim();
      const stepType = stepItem.querySelector('.step-type').value;
      const stepSelector = stepItem.querySelector('.step-selector').value.trim();
      
      if (!stepName) {
        this.showFieldError(stepItem.querySelector('.step-name'), `步骤 ${index + 1} 名称不能为空`);
        isValid = false;
      }
      
      if (['fillInput', 'clickButton', 'waitForElement', 'hover'].includes(stepType) && !stepSelector) {
        this.showFieldError(stepItem.querySelector('.step-selector'), `步骤 ${index + 1} 需要选择器`);
        isValid = false;
      }
    });
    
    return isValid;
  }

  // 显示字段错误
  showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');
    
    let errorElement = formGroup.querySelector('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      formGroup.appendChild(errorElement);
    }
    errorElement.textContent = message;
  }

  // 清除表单错误
  clearFormErrors() {
    document.querySelectorAll('.form-group.error').forEach(group => {
      group.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(msg => {
      msg.remove();
    });
  }

  // 提取表单数据
  extractFormData() {
    const flowData = {
      id: this.currentEditingFlow ? this.currentEditingFlow.id : this.generateId(),
      name: document.getElementById('flowName').value.trim(),
      domain: document.getElementById('flowDomain').value.trim() || '*',
      description: document.getElementById('flowDescription').value.trim(),
      steps: [],
      variables: {
        email: '{{generated_email}}'
      },
      enabled: true,
      createdAt: this.currentEditingFlow ? this.currentEditingFlow.createdAt : Date.now(),
      updatedAt: Date.now()
    };
    
    // 提取步骤数据
    const steps = document.querySelectorAll('.step-item');
    steps.forEach((stepItem, index) => {
      const stepData = this.extractStepData(stepItem);
      stepData.id = `step-${index + 1}`;
      flowData.steps.push(stepData);
    });
    
    return flowData;
  }

  // 过滤流程
  filterFlows() {
    const searchTerm = document.getElementById('searchFlow').value.toLowerCase();
    const domainFilter = document.getElementById('filterDomain').value;
    
    let filteredFlows = this.flows;
    
    if (searchTerm) {
      filteredFlows = filteredFlows.filter(flow => 
        flow.name.toLowerCase().includes(searchTerm) ||
        (flow.description && flow.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (domainFilter) {
      filteredFlows = filteredFlows.filter(flow => flow.domain === domainFilter);
    }
    
    // 临时替换flows进行渲染
    const originalFlows = this.flows;
    this.flows = filteredFlows;
    this.renderFlows();
    this.flows = originalFlows;
  }

  // 更新域名过滤器
  updateDomainFilter() {
    const filterSelect = document.getElementById('filterDomain');
    const domains = [...new Set(this.flows.map(flow => flow.domain))];
    
    // 清除现有选项（保留默认选项）
    while (filterSelect.children.length > 2) {
      filterSelect.removeChild(filterSelect.lastChild);
    }
    
    // 添加域名选项
    domains.forEach(domain => {
      if (domain && domain !== '*') {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        filterSelect.appendChild(option);
      }
    });
  }

  // 打开选择器助手
  async openSelectorHelper(stepItem) {
    try {
      // 显示指导提示
      const confirmed = confirm(
        '选择器助手使用说明：\n\n' +
        '1. 点击"确定"后，系统会尝试在所有标签页中启动选择器助手\n' +
        '2. 请切换到要自动化的网页标签页\n' +
        '3. 移动鼠标到要选择的页面元素上\n' +
        '4. 点击该元素进行选择\n' +
        '5. 系统会自动生成最优的选择器\n' +
        '6. 按ESC键可以取消选择\n\n' +
        '是否继续？'
      );

      if (!confirmed) return;

      // 存储当前编辑的步骤项，用于后续填充选择器
      this.currentEditingStepItem = stepItem;
      console.log('🎯 设置当前编辑步骤:', stepItem.dataset.stepId || 'unknown');

      // 立即显示启动提示
      this.showMessage('选择器助手正在初始化，请稍后...', 'info');

      // 监听元素选择结果
      this.listenForElementSelection();

      // 获取当前流程的适用域名
      const targetDomain = this.getCurrentFlowDomain();

      // 通过background script启动选择器助手
      const response = await this.sendMessage({
        action: 'startElementSelectionForAllTabs',
        targetDomain: targetDomain
      });

      if (response.success) {
        const message = response.successCount > 0 ?
          `选择器助手已在 ${response.successCount} 个标签页中激活，请切换到目标网页并点击要选择的元素` :
          '选择器助手已启动，如果无法使用请刷新目标页面后再试';
        this.showMessage(message, 'success');
      } else {
        this.showMessage('启动选择器助手失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('打开选择器助手失败:', error);
      this.showMessage('打开选择器助手失败', 'error');
    }
  }

  // 获取当前流程的适用域名
  getCurrentFlowDomain() {
    // 在options页面中，可以从当前编辑的流程中获取域名
    if (this.currentFlow && this.currentFlow.domain) {
      return this.currentFlow.domain;
    }

    // 或者从表单中获取
    const domainInput = document.getElementById('flowDomain');
    if (domainInput && domainInput.value.trim()) {
      return domainInput.value.trim();
    }

    return null; // 如果没有指定域名，返回null表示在所有标签页中启动
  }

  // 监听元素选择结果
  listenForElementSelection() {
    // 移除之前的监听器（如果存在）
    if (this.elementSelectionListener) {
      chrome.runtime.onMessage.removeListener(this.elementSelectionListener);
    }

    // 添加新的监听器
    this.elementSelectionListener = (message, sender, sendResponse) => {
      if (message.action === 'elementSelectionResult') {
        this.handleElementSelectionResult(message.result);
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(this.elementSelectionListener);
  }

  // 处理元素选择结果
  handleElementSelectionResult(result) {
    if (!this.currentEditingStepItem || !result) return;

    try {
      const { selectors, recommendations } = result;

      // 找到最佳选择器
      const bestSelector = selectors.find(s => s.isUnique && s.isValid) || selectors[0];

      if (bestSelector) {
        // 填充选择器到输入框
        const selectorInput = this.currentEditingStepItem.querySelector('.step-selector');
        if (selectorInput) {
          selectorInput.value = bestSelector.selector;

          // 触发change事件以更新UI
          selectorInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 显示选择器选择对话框（不要在这里清理currentEditingStepItem，等对话框关闭后再清理）
        this.showSelectorSelectionDialog(selectors, recommendations);
      } else {
        // 如果没有选择器，直接清理
        this.cleanupElementSelection();
      }

    } catch (error) {
      console.error('处理元素选择结果失败:', error);
      this.showMessage('处理选择结果失败', 'error');
    }
  }

  // 显示选择器选择对话框
  showSelectorSelectionDialog(selectors, recommendations) {
    const selectorOptions = selectors.slice(0, 8).map((selector, index) => {
      const uniqueIcon = selector.isUnique ? '✅' : '⚠️';
      const validIcon = selector.isValid ? '✅' : '❌';

      return `
        <div class="selector-option" data-selector="${selector.selector}">
          <div class="selector-info">
            <div class="selector-text">${selector.selector}</div>
            <div class="selector-meta">
              <span class="selector-type">${selector.type}</span>
              <span class="selector-priority">优先级: ${selector.priority}</span>
              <span class="selector-unique">${uniqueIcon} ${selector.isUnique ? '唯一' : '非唯一'}</span>
              <span class="selector-valid">${validIcon} ${selector.isValid ? '有效' : '无效'}</span>
            </div>
            <div class="selector-description">${selector.description}</div>
          </div>
          <button class="btn btn-small select-this-btn">选择此项</button>
        </div>
      `;
    }).join('');

    const recommendationsList = recommendations.map(rec =>
      `<div class="recommendation-item">
        <strong>${rec.type}:</strong> ${rec.message}
      </div>`
    ).join('');

    const modalHtml = `
      <div class="modal" id="selectorSelectionModal">
        <div class="modal-content" style="max-width: 900px;">
          <div class="modal-header">
            <h3>🎯 选择器助手 - 选择最佳选择器</h3>
            <button class="modal-close" onclick="window.flowManager.closeSelectorDialog(this)">&times;</button>
          </div>
          <div class="modal-body">
            <div class="selector-recommendations">
              <h4>💡 推荐建议</h4>
              ${recommendationsList || '<div>暂无特殊建议</div>'}
            </div>

            <div class="selector-options">
              <h4>📋 可用选择器 (按优先级排序)</h4>
              ${selectorOptions}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.flowManager.closeSelectorDialog(this)">取消</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 绑定选择事件
    document.querySelectorAll('.select-this-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectorOption = e.target.closest('.selector-option');
        const selectedSelector = selectorOption.dataset.selector;

        // 更新输入框
        if (this.currentEditingStepItem) {
          const selectorInput = this.currentEditingStepItem.querySelector('.step-selector');
          if (selectorInput) {
            selectorInput.value = selectedSelector;
            selectorInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // 关闭对话框并清理状态
        document.getElementById('selectorSelectionModal').remove();
        this.cleanupElementSelection();

        this.showMessage('选择器已更新', 'success');
      });
    });
  }

  // 清理元素选择状态
  cleanupElementSelection() {
    this.currentEditingStepItem = null;
    if (this.elementSelectionListener) {
      chrome.runtime.onMessage.removeListener(this.elementSelectionListener);
      this.elementSelectionListener = null;
    }
  }

  // 关闭选择器对话框并清理状态
  closeSelectorDialog(element) {
    element.closest('.modal').remove();
    this.cleanupElementSelection();
  }

  // 显示消息
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `${type}-message`;
    messageElement.textContent = message;
    
    // 插入到页面顶部
    const container = document.querySelector('.container');
    container.insertBefore(messageElement, container.firstChild);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 3000);
  }

  // 发送消息到background
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // 生成ID
  generateId() {
    return `flow_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // 格式化日期
  formatDate(timestamp) {
    if (!timestamp) return '未知';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN');
  }
}

// 初始化流程管理器
document.addEventListener('DOMContentLoaded', () => {
  window.flowManager = new FlowManager();
});
