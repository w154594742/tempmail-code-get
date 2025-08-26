// 侧边栏流程管理器
class SidebarFlowManager {
  constructor() {
    this.flows = [];
    this.currentEditingFlow = null;
    this.currentEditingStepIndex = -1;
    this.stepCounter = 0;
    this.currentPage = 'home';
    this.pageHistory = [];
    this.logs = [];
    this.maxLogs = 100;
    this.runningFlows = new Set(); // 跟踪正在运行的流程
    this.isUserStoppingCode = false; // 标志用户是否主动停止获取验证码
    this.init();
  }

  async init() {
    this.bindEventListeners();
    this.bindNavigationListeners();
    this.bindMessageListeners();
    await this.loadFlows();
    this.renderFlows();
    this.updateDomainFilter();
    this.showPage('home');
    this.renderLogs();
    this.setupConsoleCapture();

    // 加载初始数据（邮箱和验证码）
    await this.loadInitialData();

    this.addLog('侧边栏管理器初始化完成', 'success');
    console.log('SidebarFlowManager 初始化完成');
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 流程管理页面按钮
    document.getElementById('createFlowBtnEmpty').addEventListener('click', () => this.createNewFlow());
    document.getElementById('createFlowBtn2').addEventListener('click', () => this.createNewFlow());
    document.getElementById('importFlowBtn2').addEventListener('click', () => this.importFlow());

    // 搜索和过滤
    document.getElementById('searchFlow').addEventListener('input', (e) => this.filterFlows());
    document.getElementById('filterDomain').addEventListener('change', (e) => this.filterFlows());

    // 模态框
    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('saveFlowBtn').addEventListener('click', () => this.saveFlow());
    document.getElementById('testFlowBtn').addEventListener('click', () => this.testFlow());

    // 步骤管理
    document.getElementById('addStepBtn').addEventListener('click', () => this.addStep());

    // 邮箱搜索功能
    const emailSearchInput = document.getElementById('emailSearchInput');
    if (emailSearchInput) {
      emailSearchInput.addEventListener('input', (e) => this.handleEmailSearch(e.target.value));
    }

    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => this.clearEmailSearch());
    }

    // 邮件内容搜索功能
    const mailContentSearchInput = document.getElementById('mailContentSearchInput');
    if (mailContentSearchInput) {
      mailContentSearchInput.addEventListener('input', (e) => this.handleMailContentSearch(e.target.value));
    }

    const clearMailContentSearchBtn = document.getElementById('clearMailContentSearchBtn');
    if (clearMailContentSearchBtn) {
      clearMailContentSearchBtn.addEventListener('click', () => this.clearMailContentSearch());
    }


  }

  // 创建新流程
  createNewFlow() {
    this.currentEditingFlow = null;
    this.currentEditingStepIndex = -1;
    this.stepCounter = 0;

    // 重置表单
    document.getElementById('flowForm').reset();
    document.getElementById('modalTitle').textContent = '创建新流程';

    // 清空步骤容器
    document.getElementById('stepsContainer').innerHTML = '';

    // 尝试获取当前页面信息并预填充
    this.prefillCurrentPageInfo();

    this.showModal();
  }

  // 预填充当前页面信息
  async prefillCurrentPageInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tab = tabs[0];
        const domain = new URL(tab.url).hostname;

        document.getElementById('flowDomain').value = domain;
        if (!document.getElementById('flowName').value) {
          document.getElementById('flowName').value = `${domain} 自动化流程`;
        }
      }
    } catch (error) {
      console.error('获取当前页面信息失败:', error);
    }
  }

  // 加载流程列表
  async loadFlows() {
    try {
      const response = await this.sendMessage({ action: 'getAutomationFlows' });
      if (response.success) {
        this.flows = response.flows || [];
      }
    } catch (error) {
      console.error('加载流程失败:', error);
    }
  }

  // 加载初始数据（邮箱和验证码）
  async loadInitialData() {
    try {
      // 获取上次的邮箱和验证码
      const response = await this.sendMessage({ action: 'getLastData' });

      if (response.success) {
        if (response.lastEmail) {
          const homeEmailInput = document.getElementById('homeEmailInput');
          if (homeEmailInput) {
            homeEmailInput.value = response.lastEmail;
          }
        }
        if (response.lastCode) {
          const homeCodeInput = document.getElementById('homeCodeInput');
          if (homeCodeInput) {
            homeCodeInput.value = response.lastCode;
          }
        }
      }
    } catch (error) {
      console.error('加载初始数据失败:', error);
      this.addLog('加载初始数据失败: ' + error.message, 'error');
    }
  }

  // 渲染流程列表
  renderFlows() {
    const flowsGrid = document.getElementById('flowsGrid');
    const emptyState = document.getElementById('emptyState');

    if (this.flows.length === 0) {
      flowsGrid.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      flowsGrid.style.display = 'flex';
      emptyState.style.display = 'none';

      flowsGrid.innerHTML = this.flows.map(flow => this.createFlowCard(flow)).join('');
      this.bindFlowCardEvents();
    }
  }

  // 创建流程卡片
  createFlowCard(flow) {
    const stepsCount = flow.steps ? flow.steps.length : 0;
    const domainDisplay = flow.domain === '*' ? '通用' : flow.domain || '未设置';
    const statusClass = flow.enabled ? 'enabled' : 'disabled';
    const statusText = flow.enabled ? '已启用' : '已禁用';

    return `
      <div class="flow-card" data-flow-id="${flow.id}">
        <div class="flow-card-header">
          <div class="flow-info">
            <h3>${flow.name}</h3>
            <span class="flow-domain">${domainDisplay}</span>
          </div>
          <div class="flow-actions">
            ${this.createRunButton(flow.id)}
            <button class="btn-icon edit-flow" data-flow-id="${flow.id}" title="编辑">✏️</button>
            <button class="btn-icon duplicate-flow" data-flow-id="${flow.id}" title="复制">📋</button>
            <button class="btn-icon export-flow" data-flow-id="${flow.id}" title="导出">📤</button>
            <button class="btn-icon delete-flow" data-flow-id="${flow.id}" title="删除">🗑️</button>
          </div>
        </div>

        ${flow.description ? `<div class="flow-description">${flow.description}</div>` : ''}

        <div class="flow-stats">
          <span>📝 ${stepsCount} 个步骤</span>
          <div class="flow-status">
            <span class="status-${statusClass}">●</span>
            <span>${statusText}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 创建运行按钮
  createRunButton(flowId) {
    const isRunning = this.runningFlows.has(flowId);
    const icon = isRunning ? '🛑' : '▶️';
    const title = isRunning ? '停止' : '运行';
    const className = isRunning ? 'stop-flow' : 'run-flow';

    return `<button class="btn-icon ${className}" data-flow-id="${flowId}" title="${title}">${icon}</button>`;
  }

  // 绑定流程卡片事件
  bindFlowCardEvents() {
    // 编辑流程
    document.querySelectorAll('.edit-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = e.target.dataset.flowId;
        this.editFlow(flowId);
      });
    });

    // 复制流程
    document.querySelectorAll('.duplicate-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = e.target.dataset.flowId;
        this.duplicateFlow(flowId);
      });
    });

    // 导出流程
    document.querySelectorAll('.export-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = e.target.dataset.flowId;
        this.exportFlow(flowId);
      });
    });

    // 运行流程
    document.querySelectorAll('.run-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = e.target.dataset.flowId;
        this.runFlow(flowId);
      });
    });

    // 停止流程
    document.querySelectorAll('.stop-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = e.target.dataset.flowId;
        this.stopFlow(flowId);
      });
    });

    // 删除流程
    document.querySelectorAll('.delete-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowId = e.target.dataset.flowId;
        this.deleteFlow(flowId);
      });
    });
  }



  // 编辑流程
  editFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return;

    this.currentEditingFlow = flow;
    this.currentEditingStepIndex = -1;
    this.stepCounter = 0;

    // 填充表单
    document.getElementById('flowName').value = flow.name || '';
    document.getElementById('flowDomain').value = flow.domain || '';
    document.getElementById('flowDescription').value = flow.description || '';



    // 渲染步骤
    this.renderSteps(flow.steps || []);

    document.getElementById('modalTitle').textContent = '编辑流程';
    this.showModal();
  }

  // 停止流程
  async stopFlow(flowId) {
    try {
      // 获取当前标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        this.showMessage('无法获取当前标签页', 'error');
        return;
      }

      // 使用正确的消息类型，直接调用automation manager的停止方法
      const response = await this.sendMessage({
        action: 'stopAutomationFlow',
        tabId: tabs[0].id
      });

      if (response.success) {
        this.showMessage('流程已停止', 'success');
        this.addLog(`🛑 停止执行流程: ${flowId}`, 'info');

        // 更新流程运行状态
        this.runningFlows.delete(flowId);
        this.updateFlowButton(flowId);

        // 清除执行状态显示
        this.clearExecutionStatus();
      } else {
        this.showMessage('停止失败: ' + response.error, 'error');
        this.addLog(`❌ 流程停止失败: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showMessage('停止流程失败', 'error');
      this.addLog(`❌ 停止流程失败: ${error.message}`, 'error');
    }
  }

  // 更新流程按钮状态
  updateFlowButton(flowId) {
    const flowCard = document.querySelector(`[data-flow-id="${flowId}"]`);
    if (!flowCard) return;

    const runButton = flowCard.querySelector('.run-flow, .stop-flow');
    if (!runButton) return;

    const isRunning = this.runningFlows.has(flowId);
    const icon = isRunning ? '🛑' : '▶️';
    const title = isRunning ? '停止' : '运行';
    const className = isRunning ? 'stop-flow' : 'run-flow';

    // 克隆按钮来移除所有事件监听器
    const newButton = runButton.cloneNode(true);

    // 更新按钮属性
    newButton.innerHTML = icon;
    newButton.title = title;
    newButton.className = `btn-icon ${className}`;
    newButton.dataset.flowId = flowId;

    // 绑定新的事件
    if (isRunning) {
      newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopFlow(flowId);
      });
    } else {
      newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.runFlow(flowId);
      });
    }

    // 替换旧按钮
    runButton.parentNode.replaceChild(newButton, runButton);
  }

  // 复制流程
  duplicateFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return;

    const duplicatedFlow = {
      ...flow,
      id: this.generateId(),
      name: flow.name + ' (副本)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.flows.push(duplicatedFlow);
    this.saveFlowToStorage(duplicatedFlow);
    this.renderFlows();
    this.updateDomainFilter();
    this.showMessage('流程复制成功', 'success');
  }

  // 导出流程
  exportFlow(flowId) {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) {
      this.showMessage('流程不存在', 'error');
      return;
    }

    try {
      const dataStr = JSON.stringify(flow, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `${flow.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
      link.click();

      // 清理URL对象
      URL.revokeObjectURL(link.href);

      this.showMessage('流程导出成功', 'success');
    } catch (error) {
      this.showMessage('流程导出失败: ' + error.message, 'error');
    }
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
        this.updateDomainFilter();
        this.showMessage('流程删除成功', 'success');
      } else {
        this.showMessage('删除失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('删除失败', 'error');
    }
  }

  // 添加步骤
  addStep() {
    // 收起所有现有步骤
    this.collapseAllSteps();

    this.stepCounter++;
    const stepIndex = this.stepCounter;

    const template = document.getElementById('stepTemplate');
    const stepElement = template.content.cloneNode(true);

    // 设置步骤索引
    const stepItem = stepElement.querySelector('.step-item');
    stepItem.dataset.stepIndex = stepIndex;

    // 设置步骤编号
    stepElement.querySelector('.step-number').textContent = stepIndex;

    // 添加到容器
    const container = document.getElementById('stepsContainer');
    container.appendChild(stepElement);

    // 获取添加到DOM后的实际元素
    const addedStepItem = container.lastElementChild;

    // 绑定事件
    this.bindStepEvents(addedStepItem);

    // 更新步骤类型图标
    const stepTypeSelect = addedStepItem.querySelector('.step-type');
    this.updateStepTypeIcon(stepTypeSelect);

    // 更新变量助手
    this.updateVariableHelpers(addedStepItem);

    // 新步骤保持展开状态（默认不添加collapsed类）
  }

  // 渲染步骤
  renderSteps(steps) {
    const container = document.getElementById('stepsContainer');
    container.innerHTML = '';
    this.stepCounter = 0;

    steps.forEach((step, index) => {
      this.stepCounter++;
      const template = document.getElementById('stepTemplate');
      const stepElement = template.content.cloneNode(true);

      // 设置步骤索引
      const stepItem = stepElement.querySelector('.step-item');
      stepItem.dataset.stepIndex = this.stepCounter;

      // 填充数据
      stepElement.querySelector('.step-number').textContent = this.stepCounter;
      stepElement.querySelector('.step-name').value = step.name || '';
      stepElement.querySelector('.step-type').value = step.type || 'fillInput';
      stepElement.querySelector('.step-selector').value = step.selector || '';
      stepElement.querySelector('.step-value').value = step.value || '';
      stepElement.querySelector('.step-description').value = step.description || '';
      stepElement.querySelector('.step-delay').value = step.options?.delay || 500;
      stepElement.querySelector('.step-timeout').value = step.options?.timeout || 5000;
      stepElement.querySelector('.step-clear-first').checked = step.options?.clearFirst || false;
      stepElement.querySelector('.step-scroll-into-view').checked = step.options?.scrollIntoView !== false;

      // 添加到容器
      container.appendChild(stepElement);

      // 获取添加到DOM后的实际元素
      const addedStepItem = container.lastElementChild;

      // 编辑流程时默认收起所有步骤
      addedStepItem.classList.add('collapsed');

      // 绑定事件
      this.bindStepEvents(addedStepItem);

      // 更新步骤类型图标
      const stepTypeSelect = addedStepItem.querySelector('.step-type');
      this.updateStepTypeIcon(stepTypeSelect);

      // 更新变量助手
      this.updateVariableHelpers(addedStepItem);
    });
  }

  // 绑定步骤事件
  bindStepEvents(stepElement) {
    // 步骤类型变化
    stepElement.querySelector('.step-type').addEventListener('change', (e) => {
      this.updateStepTypeIcon(e.target);
      this.updateVariableHelpers(e.target.closest('.step-item'));
    });

    // 移动步骤
    stepElement.querySelector('.move-up').addEventListener('click', (e) => {
      this.moveStep(e.target.closest('.step-item'), -1);
    });

    stepElement.querySelector('.move-down').addEventListener('click', (e) => {
      this.moveStep(e.target.closest('.step-item'), 1);
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
      const button = e.target;
      if (button.disabled) {
        e.preventDefault();
        return;
      }
      this.openSelectorHelper(e.target.closest('.step-item'));
    });

    // 步骤展开/收起
    stepElement.querySelector('.step-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleStep(e.target.closest('.step-item'));
    });

    // 变量助手事件
    this.bindVariableHelperEvents(stepElement);
    this.updateVariableHelpers(stepElement.querySelector('.step-item') || stepElement);
  }

  // 更新步骤类型图标
  updateStepTypeIcon(selectElement) {
    if (!selectElement) return;

    const stepItem = selectElement.closest('.step-item');
    if (!stepItem) return;

    const iconElement = stepItem.querySelector('.step-type-icon');
    if (!iconElement) return;

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

    iconElement.textContent = icons[selectElement.value] || '📝';

    // 根据步骤类型控制字段启用状态
    this.updateStepFieldsState(stepItem, selectElement.value);
  }

  // 绑定变量助手事件
  bindVariableHelperEvents(stepElement) {
    const stepItem = stepElement.querySelector('.step-item') || stepElement;

    // 变量插入按钮
    const variableButtons = stepItem.querySelectorAll('.btn-variable');
    variableButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variable = e.target.dataset.variable;
        const valueInput = stepItem.querySelector('.step-value');
        if (valueInput && variable) {
          this.insertVariableAtCursor(valueInput, variable);
        }
      });
    });

    // 帮助按钮
    const helpButton = stepItem.querySelector('.btn-help');
    if (helpButton) {
      helpButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showVariableHelp();
      });
    }
  }

  // 更新变量助手显示状态
  updateVariableHelpers(stepItem) {
    const stepType = stepItem.querySelector('.step-type').value;
    const variableHelpers = stepItem.querySelector('.variable-helpers');

    if (variableHelpers) {
      // 只在填充输入框类型时显示变量助手
      if (stepType === 'fillInput') {
        variableHelpers.style.display = 'flex';
      } else {
        variableHelpers.style.display = 'none';
      }
    }
  }

  // 替换输入框内容为变量
  insertVariableAtCursor(input, variable) {
    input.value = variable;
    input.focus();
    input.setSelectionRange(variable.length, variable.length);

    // 触发input事件
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 显示变量帮助
  showVariableHelp() {
    document.getElementById('variableHelpModal').style.display = 'block';
  }

  // 根据步骤类型更新字段显示状态
  updateStepFieldsState(stepItem, stepType) {
    // 定义每种步骤类型适用的配置项
    const stepFieldsConfig = {
      fillInput: {
        selector: true,
        value: true,
        delay: true,
        timeout: true,
        clearFirst: true,
        scrollIntoView: true
      },
      clickButton: {
        selector: true,
        value: false,
        delay: true,
        timeout: true,
        clearFirst: false,
        scrollIntoView: true
      },
      waitForElement: {
        selector: true,
        value: false,
        delay: true,
        timeout: true,
        clearFirst: false,
        scrollIntoView: false
      },
      humanVerification: {
        selector: false,
        value: false,
        delay: true,
        timeout: true,
        clearFirst: false,
        scrollIntoView: false
      }
    };

    const config = stepFieldsConfig[stepType] || stepFieldsConfig.fillInput;

    // 获取所有配置项元素
    const elements = {
      selector: stepItem.querySelector('.step-selector')?.closest('.form-group'),
      value: stepItem.querySelector('.step-value')?.closest('.form-group'),
      delay: stepItem.querySelector('.step-delay')?.closest('.form-group'),
      timeout: stepItem.querySelector('.step-timeout')?.closest('.form-group'),
      clearFirst: stepItem.querySelector('.step-clear-first')?.closest('.form-group'),
      scrollIntoView: stepItem.querySelector('.step-scroll-into-view')?.closest('.form-group')
    };

    // 根据配置显示/隐藏配置项
    Object.keys(elements).forEach(key => {
      const element = elements[key];
      if (element) {
        if (config[key]) {
          element.style.display = '';
          element.style.opacity = '1';
        } else {
          element.style.display = 'none';
          element.style.opacity = '0';
        }
      }
    });

    // 检查并调整form-row的布局
    this.adjustFormRowLayout(stepItem);
  }

  // 调整form-row布局，确保隐藏元素后布局正常
  adjustFormRowLayout(stepItem) {
    const formRows = stepItem.querySelectorAll('.form-row');

    formRows.forEach(row => {
      const visibleGroups = Array.from(row.querySelectorAll('.form-group')).filter(
        group => group.style.display !== 'none'
      );

      // 如果整行都没有可见元素，隐藏整行
      if (visibleGroups.length === 0) {
        row.style.display = 'none';
      } else {
        row.style.display = '';

        // 如果只有一个可见元素，调整其宽度占满整行
        if (visibleGroups.length === 1) {
          visibleGroups[0].style.flex = '1';
        } else {
          // 多个可见元素时，恢复默认flex布局
          visibleGroups.forEach(group => {
            group.style.flex = '';
          });
        }
      }
    });
  }

  // 移动步骤
  moveStep(stepItem, direction) {
    const container = stepItem.parentNode;
    const steps = Array.from(container.children);
    const currentIndex = steps.indexOf(stepItem);
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= steps.length) return;

    if (direction === -1) {
      container.insertBefore(stepItem, steps[newIndex]);
    } else {
      container.insertBefore(stepItem, steps[newIndex].nextSibling);
    }

    this.updateStepNumbers();
  }

  // 复制步骤
  duplicateStep(stepItem) {
    const newStep = stepItem.cloneNode(true);
    this.stepCounter++;
    newStep.dataset.stepIndex = this.stepCounter;

    // 重新绑定事件
    this.bindStepEvents(newStep);

    stepItem.parentNode.insertBefore(newStep, stepItem.nextSibling);
    this.updateStepNumbers();
  }

  // 删除步骤
  deleteStep(stepItem) {
    if (stepItem.parentNode.children.length <= 1) {
      alert('至少需要保留一个步骤');
      return;
    }

    stepItem.remove();
    this.updateStepNumbers();
  }

  // 切换步骤展开/收起状态
  toggleStep(stepElement) {
    if (!stepElement) return;

    const isCollapsed = stepElement.classList.contains('collapsed');
    if (isCollapsed) {
      this.expandStep(stepElement);
    } else {
      this.collapseStep(stepElement);
    }
  }

  // 展开步骤
  expandStep(stepElement) {
    if (!stepElement) return;
    stepElement.classList.remove('collapsed');
  }

  // 收起步骤
  collapseStep(stepElement) {
    if (!stepElement) return;
    stepElement.classList.add('collapsed');
  }

  // 收起所有步骤
  collapseAllSteps() {
    const stepElements = document.querySelectorAll('.step-item');
    stepElements.forEach(step => {
      this.collapseStep(step);
    });
  }

  // 展开所有步骤
  expandAllSteps() {
    const stepElements = document.querySelectorAll('.step-item');
    stepElements.forEach(step => {
      this.expandStep(step);
    });
  }

  // 更新步骤编号
  updateStepNumbers() {
    const steps = document.querySelectorAll('.step-item');
    steps.forEach((step, index) => {
      step.querySelector('.step-number').textContent = index + 1;
    });
  }

  // 运行流程
  async runFlow(flowId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        this.showMessage('无法获取当前标签页', 'error');
        return;
      }

      const response = await this.sendMessage({
        action: 'startAutomationFlow',
        flowId: flowId,
        tabId: tabs[0].id
      });

      if (response.success) {
        this.showMessage('自动化流程已开始，请保持侧边栏打开以查看执行进度', 'success');
        this.addLog(`🚀 开始执行流程: ${flowId}`, 'info');

        // 更新流程运行状态
        this.runningFlows.add(flowId);
        this.updateFlowButton(flowId);

        // 设置执行状态监听
        this.startExecutionMonitoring(flowId);
      } else {
        this.showMessage('启动失败: ' + response.error, 'error');
        this.addLog(`❌ 流程启动失败: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showMessage('启动流程失败', 'error');
    }
  }

  // 打开选择器助手
  async openSelectorHelper(stepItem) {
    try {
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
    console.log('🎯 获取当前流程域名，currentEditingFlow:', this.currentEditingFlow);

    // 优先从当前编辑的流程获取域名
    if (this.currentEditingFlow && this.currentEditingFlow.domain) {
      console.log('🎯 从currentEditingFlow获取域名:', this.currentEditingFlow.domain);
      return this.currentEditingFlow.domain;
    }

    // 尝试从表单中获取域名（如果正在编辑流程）
    const domainInput = document.getElementById('flowDomain');
    if (domainInput && domainInput.value.trim()) {
      const domain = domainInput.value.trim();
      console.log('🎯 从表单获取域名:', domain);
      return domain === '*' ? null : domain; // '*' 表示通用流程，等同于null
    }

    // 尝试从页面中获取域名信息
    const domainElement = document.querySelector('[data-flow-domain]');
    if (domainElement) {
      const domain = domainElement.dataset.flowDomain;
      console.log('🎯 从页面元素获取域名:', domain);
      return domain;
    }

    console.log('⚠️ 未找到流程域名，将在所有标签页中启动');
    return null; // 如果没有指定域名，返回null表示在所有标签页中启动
  }

  // 监听元素选择结果
  listenForElementSelection() {
    // 这个方法在构造函数中已经设置了消息监听器
    // 这里只是为了保持接口一致性
  }

  // 处理元素选择结果
  handleElementSelectionResult(result) {
    if (!result || !result.selectors) return;

    const bestSelector = result.selectors.find(s => s.isUnique && s.isValid) || result.selectors[0];
    if (bestSelector && this.currentEditingStepItem) {
      // 填充选择器到当前编辑的步骤
      const selectorInput = this.currentEditingStepItem.querySelector('.step-selector');
      if (selectorInput) {
        selectorInput.value = bestSelector.selector;
        this.showMessage(`已生成选择器: ${bestSelector.selector}`, 'success');
      }

      // 注意：不要在这里清除currentEditingStepItem，让用户可以继续选择其他选择器
      // this.currentEditingStepItem = null; // 移除这行，保持状态直到用户明确完成选择
    }
  }

  // 保存流程
  async saveFlow() {
    const flowName = document.getElementById('flowName').value.trim();
    if (!flowName) {
      this.showMessage('请输入流程名称', 'error');
      return;
    }

    // 收集步骤数据
    const steps = this.collectStepsData();
    if (steps.length === 0) {
      this.showMessage('请至少添加一个步骤', 'error');
      return;
    }

    const flowData = {
      id: this.currentEditingFlow ? this.currentEditingFlow.id : this.generateId(),
      name: flowName,
      domain: document.getElementById('flowDomain').value.trim() || '*',
      description: document.getElementById('flowDescription').value.trim(),
      steps: steps,

      enabled: true,
      createdAt: this.currentEditingFlow ? this.currentEditingFlow.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    try {
      const response = await this.sendMessage({
        action: 'saveAutomationFlow',
        flow: flowData
      });

      if (response.success) {
        if (this.currentEditingFlow) {
          const index = this.flows.findIndex(f => f.id === this.currentEditingFlow.id);
          if (index !== -1) {
            this.flows[index] = flowData;
          }
        } else {
          this.flows.push(flowData);
        }

        this.renderFlows();
        this.updateDomainFilter();
        this.closeModal();
        this.showMessage('流程保存成功', 'success');
      } else {
        this.showMessage('保存失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showMessage('保存失败', 'error');
    }
  }

  // 收集步骤数据
  collectStepsData() {
    const steps = [];
    const stepItems = document.querySelectorAll('.step-item');

    stepItems.forEach((stepItem, index) => {
      const stepData = {
        id: `step-${index + 1}`,
        name: stepItem.querySelector('.step-name').value.trim() || `步骤 ${index + 1}`,
        type: stepItem.querySelector('.step-type').value,
        selector: stepItem.querySelector('.step-selector').value.trim(),
        value: stepItem.querySelector('.step-value').value.trim(),
        description: stepItem.querySelector('.step-description').value.trim(),
        options: {
          delay: parseInt(stepItem.querySelector('.step-delay').value) || 500,
          waitTimeout: parseInt(stepItem.querySelector('.step-timeout').value) || 5000, // 使用waitTimeout作为主要超时配置
          timeout: parseInt(stepItem.querySelector('.step-timeout').value) || 5000, // 保持向后兼容
          clearFirst: stepItem.querySelector('.step-clear-first').checked,
          scrollIntoView: stepItem.querySelector('.step-scroll-into-view').checked
        }
      };

      steps.push(stepData);
    });

    return steps;
  }









  // 显示模态框
  showModal() {
    const modal = document.getElementById('flowEditorModal');
    modal.style.display = 'block';

    // 添加拖动功能
    this.makeDraggable(modal);
  }

  // 关闭模态框
  closeModal() {
    document.getElementById('flowEditorModal').style.display = 'none';
  }

  // 使模态框可拖动
  makeDraggable(modal) {
    const modalContent = modal.querySelector('.modal-content');
    const modalHeader = modal.querySelector('.modal-header');

    if (!modalContent || !modalHeader) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    modalHeader.addEventListener('mousedown', (e) => {
      // 避免在关闭按钮上触发拖动
      if (e.target.classList.contains('modal-close')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      // 获取当前位置
      const rect = modalContent.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      // 改变定位方式
      modalContent.style.position = 'fixed';
      modalContent.style.left = startLeft + 'px';
      modalContent.style.top = startTop + 'px';
      modalContent.style.transform = 'none';
      modalContent.style.margin = '0';

      // 添加拖动样式
      modalHeader.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newLeft = startLeft + deltaX;
      const newTop = startTop + deltaY;

      // 限制在视窗内
      const maxLeft = window.innerWidth - modalContent.offsetWidth;
      const maxTop = window.innerHeight - modalContent.offsetHeight;

      modalContent.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
      modalContent.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        modalHeader.style.cursor = 'move';
        document.body.style.userSelect = '';
      }
    });
  }

  // 测试流程
  async testFlow() {
    const flowData = this.collectStepsData();
    if (flowData.length === 0) {
      this.showMessage('请至少添加一个步骤', 'error');
      return;
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        this.showMessage('无法获取当前标签页', 'error');
        return;
      }

      // 收集基本信息
      const flowName = document.getElementById('flowName').value.trim() || '测试流程';
      const flowDomain = document.getElementById('flowDomain').value.trim() || '*';
      const flowDescription = document.getElementById('flowDescription').value.trim() || '临时测试流程';

      // 创建完整的临时流程用于测试
      const testFlow = {
        id: 'test-flow-' + Date.now(), // 使用时间戳确保唯一性
        name: flowName,
        domain: flowDomain,
        description: flowDescription,
        steps: flowData,
        enabled: true,
        variables: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      console.log('准备测试流程:', testFlow);

      const response = await this.sendMessage({
        action: 'startAutomationFlow',
        flowId: testFlow.id,
        tabId: tabs[0].id,
        testFlow: testFlow
      });

      if (response.success) {
        this.showMessage('测试流程已开始，请查看执行日志', 'success');
        console.log('测试流程启动成功，执行ID:', response.executionId);
      } else {
        this.showMessage('测试失败: ' + response.error, 'error');
        console.error('测试流程启动失败:', response.error);
      }
    } catch (error) {
      console.error('测试流程异常:', error);
      this.showMessage('测试失败: ' + error.message, 'error');
    }
  }

  // 过滤流程
  filterFlows() {
    const searchTerm = document.getElementById('searchFlow').value.toLowerCase();
    const domainFilter = document.getElementById('filterDomain').value;

    let filteredFlows = this.flows;

    // 域名过滤
    if (domainFilter) {
      filteredFlows = filteredFlows.filter(flow => flow.domain === domainFilter);
    }

    // 搜索过滤
    if (searchTerm) {
      filteredFlows = filteredFlows.filter(flow =>
        flow.name.toLowerCase().includes(searchTerm) ||
        (flow.description && flow.description.toLowerCase().includes(searchTerm)) ||
        (flow.domain && flow.domain.toLowerCase().includes(searchTerm))
      );
    }

    // 渲染过滤后的流程
    const flowsGrid = document.getElementById('flowsGrid');
    const emptyState = document.getElementById('emptyState');

    if (filteredFlows.length === 0) {
      flowsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      emptyState.querySelector('h3').textContent = searchTerm || domainFilter ? '没有找到匹配的流程' : '还没有配置任何流程';
    } else {
      flowsGrid.style.display = 'flex';
      emptyState.style.display = 'none';

      flowsGrid.innerHTML = filteredFlows.map(flow => this.createFlowCard(flow)).join('');
      this.bindFlowCardEvents();
    }
  }

  // 更新域名过滤器
  updateDomainFilter() {
    const filterSelect = document.getElementById('filterDomain');
    const domains = [...new Set(this.flows.map(flow => flow.domain).filter(Boolean))];

    // 保存当前选择
    const currentValue = filterSelect.value;

    // 清空并重新填充选项
    filterSelect.innerHTML = '<option value="">所有域名</option><option value="*">通用流程</option>';

    domains.forEach(domain => {
      if (domain !== '*') {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        filterSelect.appendChild(option);
      }
    });

    // 恢复选择
    filterSelect.value = currentValue;
  }

  // 导入流程
  importFlow() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const flowData = JSON.parse(e.target.result);
            flowData.id = this.generateId();
            flowData.createdAt = Date.now();
            flowData.updatedAt = Date.now();

            this.flows.push(flowData);
            this.saveFlowToStorage(flowData);
            this.renderFlows();
            this.updateDomainFilter();
            this.showMessage('流程导入成功', 'success');
          } catch (error) {
            this.showMessage('导入失败：文件格式错误', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  // 保存流程到存储
  async saveFlowToStorage(flow) {
    try {
      await this.sendMessage({
        action: 'saveAutomationFlow',
        flow: flow
      });
    } catch (error) {
      console.error('保存流程到存储失败:', error);
    }
  }



  // 显示消息
  showMessage(message, type = 'info') {
    // 创建消息提示
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    `;

    // 设置背景色
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    messageDiv.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);

    console.log(`[${type.toUpperCase()}] ${message}`);
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

  // 开始执行监控
  startExecutionMonitoring(flowId) {
    this.currentExecutingFlowId = flowId;
    this.executionStartTime = Date.now();

    // 显示执行状态
    this.showExecutionStatus('执行中...', 'info');
  }

  // 处理自动化进度
  handleAutomationProgress(message) {
    if (message.flowId !== this.currentExecutingFlowId) return;

    const { step, progress, status } = message;
    let statusText = '';

    if (step) {
      statusText = `执行步骤 ${step.index + 1}: ${step.name}`;
    } else if (progress) {
      statusText = `进度: ${progress.current}/${progress.total}`;
    }

    this.showExecutionStatus(statusText, status === 'error' ? 'error' : 'info');
  }

  // 处理自动化完成
  handleAutomationComplete(message) {
    if (message.flowId !== this.currentExecutingFlowId) return;

    const flowId = this.currentExecutingFlowId;
    this.currentExecutingFlowId = null;
    const duration = Date.now() - this.executionStartTime;
    const durationText = `(耗时 ${Math.round(duration / 1000)}秒)`;

    // 更新流程运行状态
    this.runningFlows.delete(flowId);
    this.updateFlowButton(flowId);

    if (message.success) {
      this.showExecutionStatus(`✅ 执行成功 ${durationText}`, 'success');
      this.showMessage('自动化流程执行成功', 'success');
    } else {
      this.showExecutionStatus(`❌ 执行失败 ${durationText}`, 'error');
      this.showMessage('自动化流程执行失败: ' + (message.error || '未知错误'), 'error');
    }

    // 3秒后清除状态
    setTimeout(() => {
      this.clearExecutionStatus();
    }, 3000);
  }

  // 处理自动化停止
  handleAutomationStopped(message) {
    if (message.executionId && this.currentExecutingFlowId) {
      const flowId = this.currentExecutingFlowId;
      this.currentExecutingFlowId = null;

      // 更新流程运行状态
      this.runningFlows.delete(flowId);
      this.updateFlowButton(flowId);

      // 显示停止状态
      this.showExecutionStatus('🛑 流程已停止', 'warning');
      this.showMessage('自动化流程已停止', 'info');

      // 3秒后清除状态
      setTimeout(() => {
        this.clearExecutionStatus();
      }, 3000);
    }
  }

  // 显示执行状态
  showExecutionStatus(message, type) {
    let statusDiv = document.getElementById('executionStatus');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'executionStatus';
      statusDiv.style.cssText = `
        position: fixed;
        top: 60px;
        left: 10px;
        right: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        z-index: 1000;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(statusDiv);
    }

    const colors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };

    statusDiv.textContent = message;
    statusDiv.style.backgroundColor = colors[type] || colors.info;
    statusDiv.style.color = 'white';
    statusDiv.style.display = 'block';
  }

  // 清除执行状态
  clearExecutionStatus() {
    const statusDiv = document.getElementById('executionStatus');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  // 生成ID
  generateId() {
    return `flow_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // 页面导航方法
  bindNavigationListeners() {
    // 快速操作按钮
    document.getElementById('emailToolBtn')?.addEventListener('click', () => {
      this.showPage('emailTool');
    });

    document.getElementById('flowManagerBtn')?.addEventListener('click', () => {
      this.showPage('flowManager');
    });

    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.showPage('settings');
    });

    // 返回按钮
    document.getElementById('backBtn')?.addEventListener('click', () => {
      this.goBack();
    });

    // 页面返回首页按钮
    document.getElementById('emailToolBackBtn')?.addEventListener('click', () => {
      this.showPage('home');
    });

    document.getElementById('flowManagerBackBtn')?.addEventListener('click', () => {
      this.showPage('home');
    });

    document.getElementById('settingsBackBtn')?.addEventListener('click', () => {
      this.showPage('home');
    });

    // 邮件内容管理标签页切换
    document.getElementById('emailTabBtn')?.addEventListener('click', () => {
      this.switchTab('email');
    });

    document.getElementById('mailContentTabBtn')?.addEventListener('click', () => {
      this.switchTab('mailContent');
    });

    // 清除邮件内容历史
    document.getElementById('clearAllMailContentBtn')?.addEventListener('click', () => {
      this.clearAllMailContentHistory();
    });

    // 关闭邮件详情模态框
    document.getElementById('closeMailDetailModal')?.addEventListener('click', () => {
      this.closeMailDetailModal();
    });

    // 首页邮箱和验证码功能
    document.getElementById('homeGenerateEmailBtn')?.addEventListener('click', () => {
      this.generateEmailForHome();
    });

    document.getElementById('homeGetCodeBtn')?.addEventListener('click', () => {
      this.getCodeForHome();
    });

    document.getElementById('homeStopCodeBtn')?.addEventListener('click', () => {
      this.stopGettingCodeForHome();
    });



    // 邮箱工具功能
    document.getElementById('generateEmailBtn')?.addEventListener('click', () => {
      this.generateEmail();
    });

    document.getElementById('copyEmailBtn')?.addEventListener('click', () => {
      this.copyEmail();
    });

    // 设置功能 - 只保留导入导出功能
    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importDataBtn')?.addEventListener('click', () => {
      this.importData();
    });

    // 帮助图标点击事件
    document.querySelector('.help-icon')?.addEventListener('click', () => {
      this.showCloudflareGuide();
    });

    // 模态框关闭事件
    document.addEventListener('click', (e) => {
      // 关闭按钮点击
      if (e.target.classList.contains('modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.style.display = 'none';
        }
      }
      // 点击模态框背景关闭
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });

    // 日志功能
    document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
      this.clearLogs();
    });

    document.getElementById('toggleLogsBtn')?.addEventListener('click', () => {
      this.toggleLogs();
    });

    // 流程管理页面的日志功能
    document.getElementById('clearLogsBtn2')?.addEventListener('click', () => {
      this.clearLogs();
    });

    document.getElementById('toggleLogsBtn2')?.addEventListener('click', () => {
      this.toggleLogs('logsContainer2', 'toggleLogsBtn2');
    });

    // 流程控制功能
    document.getElementById('stopFlowBtn')?.addEventListener('click', () => {
      this.stopAutomationFlow();
    });
  }

  // 显示页面
  showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // 更新导航状态
    if (pageId !== 'home') {
      this.pageHistory.push(this.currentPage);
      // 注意：这里不需要通用的backBtn，每个页面都有自己的返回按钮
      this.updateHeaderForPage(pageId);
    } else {
      this.pageHistory = [];
      this.updateHeaderForPage('home');
    }

    this.currentPage = pageId;

    // 页面特定的初始化
    if (pageId === 'settings') {
      this.loadSettings();
    } else if (pageId === 'emailTool') {
      this.loadEmailHistory();
      // 默认显示邮箱历史标签页
      this.switchTab('email');
    }
  }

  // 返回上一页
  goBack() {
    if (this.pageHistory.length > 0) {
      const previousPage = this.pageHistory.pop();
      this.showPage(previousPage);
    } else {
      this.showPage('home');
    }
  }

  // 更新页面标题和操作
  updateHeaderForPage(pageId) {
    // 当前HTML结构中没有通用的pageTitle和headerActions元素
    // 每个页面都有自己的标题，不需要动态更新
    // 这个方法保留为空，避免JavaScript错误
  }

  // 生成邮箱
  async generateEmail() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'generateEmail' });
      if (response.success) {
        document.getElementById('generatedEmail').value = response.email;

        // 自动复制到剪切板
        await this.copyToClipboard(response.email, '邮箱已生成并复制到剪切板', '邮箱已生成，但复制失败');

        this.loadEmailHistory();
      } else {
        this.showNotification('生成邮箱失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showNotification('生成邮箱失败: ' + error.message, 'error');
    }
  }

  // 复制邮箱
  async copyEmail() {
    const emailInput = document.getElementById('generatedEmail');
    if (emailInput.value) {
      await this.copyToClipboard(emailInput.value, '邮箱地址已复制');
    }
  }

  // 加载邮箱历史
  async loadEmailHistory() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getHistory', type: 'email' });
      if (response.success) {
        this.renderEmailHistory(response.history);
      }
    } catch (error) {
      console.error('加载邮箱历史失败:', error);
    }
  }

  // 渲染邮箱历史
  renderEmailHistory(history) {
    const container = document.getElementById('emailHistory');
    const clearAllBtn = document.getElementById('clearAllEmailHistoryBtn');

    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <div class="empty-message-text">暂无邮箱历史记录</div>
          <div class="empty-message-desc">您还没有生成过任何临时邮箱<br>生成邮箱后，历史记录将在这里显示</div>
        </div>
      `;
      clearAllBtn.style.display = 'none';
      return;
    }

    // 显示清除全部按钮
    clearAllBtn.style.display = 'inline-block';

    container.innerHTML = history.slice(0, 20).map(item => {
      // 确保向后兼容：为旧数据提供默认值
      const isFavorite = item.isFavorite || false;
      const note = item.note || '';

      // HTML转义函数，防止XSS攻击
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      const escapedEmail = escapeHtml(item.email);
      const escapedNote = escapeHtml(note);
      const escapedId = escapeHtml(item.id);

      // 动态布局：检查是否有备注内容
      const hasNoteClass = note ? 'has-note' : '';

      return `
        <div class="email-history-item ${isFavorite ? 'favorited' : ''} ${hasNoteClass}" data-id="${escapedId}">
          <div class="email-info">
            <div class="email-meta-item">
              <span class="email-meta-label">📧 邮箱:</span>
              <span class="email-meta-value email-address" title="${escapedEmail}">${escapedEmail}</span>
            </div>
            <div class="email-meta-item">
              <span class="email-meta-label">🕒 创建时间:</span>
              <span class="email-meta-value email-time">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
            ${note ? `<div class="email-note"><span class="email-note-content">${escapedNote}</span></div>` : ''}
          </div>
          <div class="email-actions">
            <button class="btn-icon favorite-email-btn ${isFavorite ? 'favorited' : ''}"
                    title="${isFavorite ? '取消收藏' : '添加收藏'}"
                    data-id="${escapedId}"
                    data-favorited="${isFavorite}"
                    data-note="${escapedNote}">${isFavorite ? '⭐' : '☆'}</button>
            <button class="btn-icon copy-email-btn" title="复制邮箱" data-email="${escapedEmail}">📋</button>
            <button class="btn-icon delete-email-btn" title="删除记录" data-id="${escapedId}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定事件监听器
    this.bindEmailHistoryEvents();
  }

  // 导出数据
  async exportData() {
    try {
      // 先确保流程数据是最新的
      await this.loadFlows();

      // 获取设置数据
      const settingsResponse = await chrome.runtime.sendMessage({ action: 'getSettings' });

      const data = {
        settings: settingsResponse.success ? settingsResponse.settings : {},
        flows: this.flows || [], // 使用实例变量
        exportTime: new Date().toISOString(),
        version: '2.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.showNotification('所有数据导出成功', 'success');
    } catch (error) {
      this.showNotification('导出失败: ' + error.message, 'error');
    }
  }

  // 导入数据
  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // 导入设置数据
        if (data.settings) {
          await chrome.runtime.sendMessage({
            action: 'saveSettings',
            settings: data.settings
          });
        }

        // 导入流程数据
        if (data.flows && Array.isArray(data.flows)) {
          for (const flow of data.flows) {
            await chrome.runtime.sendMessage({
              action: 'saveAutomationFlow',
              flow: flow
            });
          }
        }

        // 刷新页面数据
        await this.loadFlows();
        this.renderFlows();
        if (this.currentPage === 'settings') {
          await this.loadSettings();
        }

        this.showNotification('所有数据导入成功', 'success');
      } catch (error) {
        this.showNotification('导入失败: ' + error.message, 'error');
      }
    };
    input.click();
  }

  // 绑定消息监听
  bindMessageListeners() {
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'sidebarNavigate') {
        this.showPage(message.page);
        sendResponse({ success: true });
      } else if (message.action === 'addAutomationLog') {
        this.addLog(message.message, message.logType);
        sendResponse({ success: true });
      } else if (message.action === 'elementPickerResult') {
        this.handleElementPickerResult(message.data);
        sendResponse({ success: true });
      } else if (message.action === 'elementSelectionResult') {
        this.handleElementSelectionResult(message.result);
        sendResponse({ success: true });
      } else if (message.action === 'automationProgress') {
        this.handleAutomationProgress(message);
        sendResponse({ success: true });
      } else if (message.type === 'automationCompleted') {
        this.handleAutomationComplete(message);
        sendResponse({ success: true });
      } else if (message.type === 'automationStopped') {
        this.handleAutomationStopped(message);
        sendResponse({ success: true });
      } else if (message.type === 'codeProgress') {
        this.handleCodeProgress(message.progress);
        sendResponse({ success: true });
      }
      return true;
    });

    // 监听storage变化，获取自动化日志
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.automationLogs) {
        const newLogs = changes.automationLogs.newValue || [];
        const oldLogs = changes.automationLogs.oldValue || [];

        // 找到新增的日志
        const newLogEntries = newLogs.filter(newLog =>
          !oldLogs.some(oldLog => oldLog.id === newLog.id)
        );

        // 按时间戳排序新日志，然后添加到界面
        newLogEntries
          .sort((a, b) => a.timestamp - b.timestamp) // 按时间戳升序排序
          .forEach(logEntry => {
            this.addLog(logEntry.message, logEntry.logType);
          });
      }
    });
  }

  // 注意：清空所有数据功能已移除
  // 用户可以通过导出数据进行备份，然后手动删除各个流程和历史记录

  // 显示Cloudflare配置指南
  showCloudflareGuide() {
    const modal = document.getElementById('cloudflareGuideModal');
    if (modal) {
      modal.style.display = 'block';

      // 添加ESC键关闭功能
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          modal.style.display = 'none';
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    }
  }

  // 绑定邮箱历史事件
  bindEmailHistoryEvents() {
    // 收藏邮箱按钮事件
    document.querySelectorAll('.favorite-email-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        const id = btn.getAttribute('data-id');
        const isFavorited = btn.getAttribute('data-favorited') === 'true';
        const currentNote = btn.getAttribute('data-note') || '';

        if (isFavorited) {
          // 取消收藏
          this.setEmailFavorite(id, false, '');
        } else {
          // 添加收藏，显示编辑弹窗
          const emailAddress = btn.closest('.email-history-item').querySelector('.email-meta-value.email-address').textContent;
          this.showEditModal(id, currentNote, emailAddress);
        }
      });
    });

    // 弹窗事件绑定（只需要绑定一次）
    this.bindModalEvents();

    // 复制邮箱按钮事件
    document.querySelectorAll('.copy-email-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-email');
        this.copyEmailFromHistory(email);
      });
    });

    // 删除邮箱按钮事件
    document.querySelectorAll('.delete-email-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.deleteEmailHistoryItem(id);
      });
    });

    // 清除全部按钮事件
    const clearAllBtn = document.getElementById('clearAllEmailHistoryBtn');
    if (clearAllBtn) {
      clearAllBtn.onclick = () => this.clearAllEmailHistory();
    }
  }

  // 从历史记录复制邮箱
  async copyEmailFromHistory(email) {
    await this.copyToClipboard(email, '邮箱地址已复制');
  }

  // 删除单个邮箱历史记录
  async deleteEmailHistoryItem(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteHistoryItem',
        type: 'email',
        id: id
      });

      if (response.success) {
        this.showNotification('历史记录已删除', 'success');
        // 重新加载历史记录
        await this.loadEmailHistory();
      } else {
        this.showNotification('删除失败: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('删除邮箱历史记录失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  // 清除全部邮箱历史记录
  async clearAllEmailHistory() {
    try {
      // 确认对话框
      if (!confirm('确定要清除所有邮箱历史记录吗？此操作不可撤销。')) {
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'clearHistory',
        type: 'email'
      });

      if (response.success) {
        this.showNotification('所有邮箱历史记录已清除', 'success');
        // 重新加载历史记录
        await this.loadEmailHistory();
      } else {
        this.showNotification('清除失败: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('清除邮箱历史记录失败:', error);
      this.showNotification('清除失败', 'error');
    }
  }

  // 标签页切换
  switchTab(tabName) {
    // 切换标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tabName}TabBtn`).classList.add('active');

    // 切换内容显示
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    document.getElementById(`${tabName}Tab`).style.display = 'block';

    // 加载对应数据
    if (tabName === 'email') {
      this.loadEmailHistory();
    } else if (tabName === 'mailContent') {
      this.loadMailContentHistory();
    }
  }

  // 加载邮件内容历史
  async loadMailContentHistory() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getMailContentHistory' });
      if (response.success) {
        this.renderMailContentHistory(response.history);
      }
    } catch (error) {
      console.error('加载邮件内容历史失败:', error);
    }
  }

  // 渲染邮件内容历史
  renderMailContentHistory(history) {
    const container = document.getElementById('mailContentHistory');
    const clearAllBtn = document.getElementById('clearAllMailContentBtn');

    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <div class="empty-message-text">暂无邮件内容记录</div>
          <div class="empty-message-desc">获取验证码时的邮件内容将在这里显示</div>
        </div>
      `;
      clearAllBtn.style.display = 'none';
      return;
    }

    clearAllBtn.style.display = 'inline-block';

    container.innerHTML = history.slice(0, 50).map(item => {
      // 确保向后兼容：为旧数据提供默认值
      const isFavorite = item.isFavorite || false;
      const note = item.note || '';

      // HTML转义函数，防止XSS攻击
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      const escapedId = escapeHtml(item.id);
      const escapedNote = escapeHtml(note);
      const hasNoteClass = note ? 'has-note' : '';

      return `
        <div class="mail-content-item ${hasNoteClass}" data-id="${escapedId}">
          <div class="mail-info">
            <div class="mail-subject" title="${item.mailContent.subject}">
              📋 主题: ${item.mailContent.subject || '(无主题)'}
            </div>
            <div class="mail-meta">
              <div class="mail-meta-item">
                <span class="mail-meta-label">📧 源邮箱:</span>
                <span class="mail-meta-value mail-address">${item.sourceEmail}</span>
              </div>
              <div class="mail-meta-item">
                <span class="mail-meta-label">🕒 时间:</span>
                <span class="mail-meta-value">${new Date(item.timestamp).toLocaleString()}</span>
              </div>
              ${item.verificationCode ? `
                <div class="mail-meta-item">
                  <span class="mail-meta-label">🔢 验证码:</span>
                  <span class="mail-meta-value mail-code">${item.verificationCode}</span>
                </div>
              ` : ''}
              ${note ? `
                <div class="mail-meta-item note-item">
                  <span class="mail-meta-label">💭 备注:</span>
                  <span class="mail-meta-value note-text">${escapedNote}</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="mail-actions">
            <button class="btn-icon favorite-mail-btn ${isFavorite ? 'favorited' : ''}"
                    title="${isFavorite ? '取消收藏' : '收藏邮件'}"
                    data-id="${escapedId}"
                    data-favorited="${isFavorite ? 'true' : 'false'}"
                    data-note="${escapedNote}">
              ${isFavorite ? '⭐' : '☆'}
            </button>
            <button class="btn-icon view-mail-btn" title="查看详情" data-id="${escapedId}">👁️</button>
            <button class="btn-icon delete-mail-btn" title="删除记录" data-id="${escapedId}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定事件
    this.bindMailContentEvents();
  }

  // 绑定邮件内容事件
  bindMailContentEvents() {
    // 收藏邮件按钮事件
    document.querySelectorAll('.favorite-mail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const isFavorited = btn.getAttribute('data-favorited') === 'true';
        const currentNote = btn.getAttribute('data-note') || '';

        if (isFavorited) {
          // 取消收藏
          this.setMailContentFavorite(id, false, '');
        } else {
          // 添加收藏，显示编辑弹窗
          const mailAddress = btn.closest('.mail-content-item').querySelector('.mail-address').textContent;
          this.showMailContentEditModal(id, currentNote, mailAddress);
        }
      });
    });

    // 查看邮件详情
    document.querySelectorAll('.view-mail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this.viewMailDetail(id);
      });
    });

    // 删除邮件记录
    document.querySelectorAll('.delete-mail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this.deleteMailContentItem(id);
      });
    });
  }

  // 查看邮件详情
  async viewMailDetail(id) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getMailContentHistory' });
      if (response.success) {
        const mailItem = response.history.find(item => item.id === id);
        if (mailItem) {
          this.showMailDetailModal(mailItem);
        }
      }
    } catch (error) {
      console.error('获取邮件详情失败:', error);
    }
  }

  // 显示邮件详情模态框
  showMailDetailModal(mailItem) {
    const modal = document.getElementById('mailDetailModal');
    const content = document.getElementById('mailDetailContent');

    content.innerHTML = `
      <div class="mail-detail-header">
        <h4>📋 邮件主题: ${mailItem.mailContent.subject || '(无主题)'}</h4>
        <p><strong>📧 源邮箱:</strong> ${mailItem.sourceEmail}</p>
        <p><strong>🕒 时间:</strong> ${new Date(mailItem.timestamp).toLocaleString()}</p>
        ${mailItem.verificationCode ? `<p><strong>🔢 验证码:</strong> <span class="modal-verification-code">${mailItem.verificationCode}</span></p>` : ''}
      </div>
      <div class="mail-detail-body">
        ${mailItem.mailContent.html ? `
          <div class="mail-html-section">
            <div class="mail-html-header">
              <h5>📄 邮件内容:</h5>
              <div class="view-toggle-buttons">
                <button class="btn btn-small toggle-btn active" data-view="rendered">渲染视图</button>
                <button class="btn btn-small toggle-btn" data-view="text">纯文本</button>
              </div>
            </div>
            <div class="mail-html-content">
              <!-- 渲染视图 -->
              <div class="html-rendered-view" style="display: block;">
                <iframe class="mail-html-frame" srcdoc="${mailItem.mailContent.html.replace(/"/g, '&quot;')}"
                        sandbox="allow-same-origin" style="width: 100%; min-height: 400px; border: 1px solid #ddd; border-radius: 4px;">
                </iframe>
              </div>
              <!-- 纯文本视图 -->
              <div class="html-text-view" style="display: none;">
                <div class="mail-text-content" style="padding: 15px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; max-height: 400px; overflow-y: auto;">
                  <pre style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; margin: 0;">${mailItem.mailContent.text || '(无纯文本内容)'}</pre>
                </div>
              </div>
            </div>
          </div>
        ` : `
          <div class="mail-text-section">
            <h5>📄 邮件内容:</h5>
            <div class="mail-text-content">
              <pre>${mailItem.mailContent.text || '(无邮件内容)'}</pre>
            </div>
          </div>
        `}
      </div>
    `;

    modal.style.display = 'block';

    // 绑定切换按钮事件
    this.bindViewToggleEvents();
  }

  // 绑定视图切换事件
  bindViewToggleEvents() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const viewType = e.target.getAttribute('data-view');
        const section = e.target.closest('.mail-html-section');

        if (!section) return;

        // 更新按钮状态
        section.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // 切换视图
        const renderedView = section.querySelector('.html-rendered-view');
        const textView = section.querySelector('.html-text-view');

        if (viewType === 'rendered') {
          renderedView.style.display = 'block';
          textView.style.display = 'none';
        } else if (viewType === 'text') {
          renderedView.style.display = 'none';
          textView.style.display = 'block';
        }
      });
    });
  }

  // 关闭邮件详情模态框
  closeMailDetailModal() {
    document.getElementById('mailDetailModal').style.display = 'none';
  }

  // 删除邮件内容记录
  async deleteMailContentItem(id) {
    try {
      if (!confirm('确定要删除这条邮件记录吗？')) {
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'deleteMailContentHistoryItem',
        id: id
      });

      if (response.success) {
        this.showNotification('邮件记录已删除', 'success');
        await this.loadMailContentHistory();
      } else {
        this.showNotification('删除失败: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('删除邮件记录失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  // 清除全部邮件内容历史
  async clearAllMailContentHistory() {
    try {
      if (!confirm('确定要清除所有邮件内容记录吗？此操作不可撤销。')) {
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'clearMailContentHistory'
      });

      if (response.success) {
        this.showNotification('所有邮件内容记录已清除', 'success');
        await this.loadMailContentHistory();
      } else {
        this.showNotification('清除失败: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('清除邮件内容记录失败:', error);
      this.showNotification('清除失败', 'error');
    }
  }

  // 首页生成邮箱
  async generateEmailForHome() {
    try {
      this.addLog('开始生成邮箱地址...', 'info');
      const response = await chrome.runtime.sendMessage({ action: 'generateEmail' });
      if (response.success) {
        document.getElementById('homeEmailInput').value = response.email;
        this.addLog(`邮箱生成成功: ${response.email}`, 'success');

        // 自动复制到剪切板
        const copySuccess = await this.copyToClipboard(response.email, '邮箱已生成并复制到剪切板', '邮箱已生成，但复制失败');
        if (copySuccess) {
          this.addLog('邮箱地址已复制到剪切板', 'success');
        } else {
          this.addLog('复制到剪切板失败', 'warn');
        }
      } else {
        this.showNotification('生成邮箱失败: ' + response.error, 'error');
        this.addLog('生成邮箱失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showNotification('生成邮箱失败: ' + error.message, 'error');
      this.addLog('生成邮箱异常: ' + error.message, 'error');
    }
  }

  // 首页获取验证码
  async getCodeForHome() {
    try {
      // 清空以前的验证码
      document.getElementById('homeCodeInput').value = '';
      // 显示停止按钮，隐藏获取按钮
      document.getElementById('homeGetCodeBtn').style.display = 'none';
      document.getElementById('homeStopCodeBtn').style.display = 'inline-block';

      // 获取当前显示的邮箱作为源邮箱
      const sourceEmail = document.getElementById('homeEmailInput').value;

      this.addLog('开始获取验证码（使用设置页面配置）...', 'info');
      const response = await chrome.runtime.sendMessage({
        action: 'getVerificationCode',
        maxRetries: 10,
        retryInterval: 3000,
        openLinksOnFailure: true,
        sourceEmail: sourceEmail
      });

      if (response.success) {
        document.getElementById('homeCodeInput').value = response.code;

        // 自动复制到剪切板
        const copySuccess = await this.copyToClipboard(response.code, '验证码已获取并复制到剪切板', '验证码已获取，但复制失败');
        if (copySuccess) {
          this.addLog('验证码已复制到剪切板', 'success');
        } else {
          this.addLog('复制验证码失败', 'warn');
        }
      } else {
        // 检查是否是用户主动停止
        if (this.isUserStoppingCode && response.error === '获取验证码已被中断') {
          // 用户主动停止
          console.log('停止获取验证码');
        } else {
          // 真正的错误，显示错误信息
          this.showNotification('获取验证码失败: ' + response.error, 'error');
          this.addLog('获取验证码失败: ' + response.error, 'error');
        }
      }
    } catch (error) {
      // 检查是否是用户主动停止
      if (this.isUserStoppingCode && (error.message === '获取验证码已被中断' || error.message.includes('中断'))) {
        // 用户主动停止
        console.log('停止获取验证码');
      } else {
        // 真正的错误，显示错误信息
        this.showNotification('获取验证码失败: ' + error.message, 'error');
        this.addLog('获取验证码异常: ' + error.message, 'error');
      }
    } finally {
      // 重置用户停止标志
      this.isUserStoppingCode = false;

      // 恢复按钮状态
      document.getElementById('homeGetCodeBtn').style.display = 'inline-block';
      document.getElementById('homeStopCodeBtn').style.display = 'none';
    }
  }

  // 处理验证码获取进度
  handleCodeProgress(progress) {
    if (progress.message) {
      this.addLog(progress.message, progress.error ? 'error' : progress.waiting ? 'warn' : 'info');
    }

    // 如果显示了邮件内容，在日志中展示详细信息
    if (progress.mailContentDisplayed && progress.mailContent) {
      const mailContent = progress.mailContent;

      this.addLog('=== 邮件原始内容 ===', 'info');
      this.addLog(`主题: ${mailContent.subject}`, 'info');
      this.addLog(`文本内容: ${mailContent.text}`, 'info');

      if (mailContent.html && mailContent.html.trim() !== '') {
        this.addLog('HTML内容:', 'info');
        // 显示HTML的前500个字符，避免日志过长
        const htmlPreview = mailContent.html.length > 500
          ? mailContent.html.substring(0, 500) + '...'
          : mailContent.html;
        this.addLog(htmlPreview, 'info');
      }

      this.addLog('=== 邮件内容结束 ===', 'info');
    }
  }

  // 首页停止获取验证码
  async stopGettingCodeForHome() {
    try {
      // 设置用户主动停止标志
      this.isUserStoppingCode = true;

      await chrome.runtime.sendMessage({ action: 'stopGettingCode' });

      // 添加停止日志
      this.showNotification('已停止获取验证码', 'info');
    } catch (error) {
      this.showNotification('停止失败: ' + error.message, 'error');
    } finally {
      // 恢复按钮状态
      document.getElementById('homeGetCodeBtn').style.display = 'inline-block';
      document.getElementById('homeStopCodeBtn').style.display = 'none';
    }
  }

  // 加载设置
  async loadSettings() {
    try {
      console.log('开始加载设置...');
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      console.log('获取设置响应:', response);

      if (response.success) {
        const settings = response.settings || {};
        console.log('设置数据:', settings);

        // 填充表单
        const domainsInput = document.getElementById('domainsInput');
        const targetEmailInput = document.getElementById('targetEmailInput');
        const pinCodeInput = document.getElementById('pinCodeInput');

        if (domainsInput) {
          domainsInput.value = settings.domains || '';
          console.log('设置域名输入框:', settings.domains);
        }
        if (targetEmailInput) {
          targetEmailInput.value = settings.targetEmail || '';
          console.log('设置目标邮箱输入框:', settings.targetEmail);
        }
        if (pinCodeInput) {
          pinCodeInput.value = settings.pinCode || '';
          console.log('设置PIN码输入框:', settings.pinCode);
        }

        // 绑定失焦自动保存事件
        this.bindSettingsAutoSave();

        // 状态显示已移除，不需要更新
      } else {
        console.error('获取设置失败:', response.error);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  // 绑定设置项失焦自动保存事件
  bindSettingsAutoSave() {
    const domainsInput = document.getElementById('domainsInput');
    const targetEmailInput = document.getElementById('targetEmailInput');
    const pinCodeInput = document.getElementById('pinCodeInput');

    // 防抖保存函数
    const debouncedSave = this.debounce(async () => {
      await this.saveSettings();
    }, 500);

    // 移除之前的事件监听器（如果存在）
    if (domainsInput && !domainsInput.hasAttribute('data-autosave-bound')) {
      domainsInput.addEventListener('blur', debouncedSave);
      domainsInput.setAttribute('data-autosave-bound', 'true');
    }
    if (targetEmailInput && !targetEmailInput.hasAttribute('data-autosave-bound')) {
      targetEmailInput.addEventListener('blur', debouncedSave);
      targetEmailInput.setAttribute('data-autosave-bound', 'true');
    }
    if (pinCodeInput && !pinCodeInput.hasAttribute('data-autosave-bound')) {
      pinCodeInput.addEventListener('blur', debouncedSave);
      pinCodeInput.setAttribute('data-autosave-bound', 'true');
    }
  }

  // 防抖函数
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 保存设置
  async saveSettings() {
    try {
      const domainsInput = document.getElementById('domainsInput');
      const targetEmailInput = document.getElementById('targetEmailInput');
      const pinCodeInput = document.getElementById('pinCodeInput');

      const settings = {
        domains: domainsInput ? domainsInput.value.trim() : '',
        targetEmail: targetEmailInput ? targetEmailInput.value.trim() : '',
        pinCode: pinCodeInput ? pinCodeInput.value.trim() : ''
      };

      console.log('保存设置:', settings);
      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: settings
      });

      if (response.success) {
        console.log('设置保存成功');
        // 可以在这里添加成功提示，但为了不打扰用户，暂时只记录日志
      } else {
        console.error('设置保存失败:', response.error);
      }
    } catch (error) {
      console.error('保存设置时发生错误:', error);
    }
  }





  toggleLogs() {
    const logsContainer = document.getElementById('logsContainer');
    const toggleBtn = document.getElementById('toggleLogsBtn');

    if (logsContainer.classList.contains('collapsed')) {
      logsContainer.classList.remove('collapsed');
      toggleBtn.textContent = '收起';
    } else {
      logsContainer.classList.add('collapsed');
      toggleBtn.textContent = '展开';
    }
  }

  // 监听控制台日志
  setupConsoleCapture() {
    // 保存原始console方法
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // 重写console方法
    console.log = (...args) => {
      originalLog.apply(console, args);
      this.addLog(args.join(' '), 'info');
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.addLog(args.join(' '), 'warn');
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      this.addLog(args.join(' '), 'error');
    };
  }

  // 日志管理
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp: timestamp,
      message: message,
      type: type
    };

    // 添加到数组末尾，保持时间顺序（旧→新）
    this.logs.push(logEntry);

    // 限制日志数量，删除最旧的日志
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.renderLogs();
  }

  renderLogs() {
    const logHtml = this.logs.length === 0
      ? '<div class="log-entry info">暂无日志</div>'
      : this.logs.map(log => `
          <div class="log-entry ${log.type}">
            <span class="log-timestamp">[${log.timestamp}]</span>
            <span class="log-message">${log.message}</span>
          </div>
        `).join('');

    // 更新首页日志
    const logsContent = document.getElementById('logsContent');
    if (logsContent) {
      logsContent.innerHTML = logHtml;
      // 滚动到底部显示最新日志
      logsContent.scrollTop = logsContent.scrollHeight;
    }

    // 更新流程管理页面日志
    const logsContent2 = document.getElementById('logsContent2');
    if (logsContent2) {
      logsContent2.innerHTML = logHtml;
      // 滚动到底部显示最新日志
      logsContent2.scrollTop = logsContent2.scrollHeight;
    }
  }

  clearLogs() {
    this.logs = [];
    this.renderLogs();
    this.addLog('日志已清空', 'info');
  }

  toggleLogs(containerId = 'logsContainer', btnId = 'toggleLogsBtn') {
    const logsContainer = document.getElementById(containerId);
    const toggleBtn = document.getElementById(btnId);

    if (logsContainer && toggleBtn) {
      if (logsContainer.classList.contains('collapsed')) {
        logsContainer.classList.remove('collapsed');
        toggleBtn.textContent = '收起';
      } else {
        logsContainer.classList.add('collapsed');
        toggleBtn.textContent = '展开';
      }
    }
  }

  // 监听控制台日志
  setupConsoleCapture() {
    // 保存原始console方法
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // 重写console方法
    console.log = (...args) => {
      originalLog.apply(console, args);
      const message = args.join(' ');
      // 过滤掉一些不重要的日志
      if (!message.includes('SidebarFlowManager') && !message.includes('初始化完成')) {
        this.addLog(message, 'info');
      }
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.addLog(args.join(' '), 'warn');
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      this.addLog(args.join(' '), 'error');
    };
  }

  // 停止自动化流程
  async stopAutomationFlow() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopAutomationFlow'
      });

      if (response.success) {
        this.addLog('🛑 用户手动停止流程', 'warn');

        this.showNotification('流程已停止', 'info');
      } else {
        this.showNotification('停止流程失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showNotification('停止流程失败: ' + error.message, 'error');
    }
  }



  // 启动元素选择器
  async startElementPicker() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startElementPicker'
      });

      if (response.success) {
        this.updatePickerStatus('正在选择元素...点击页面元素或按ESC取消', true);
        this.addLog('🎯 元素选择器已启动', 'info');
        this.showNotification('请在页面上点击要选择的元素', 'info');
      } else {
        this.showNotification('启动元素选择器失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showNotification('启动元素选择器失败: ' + error.message, 'error');
    }
  }

  // 停止元素选择器
  async stopElementPicker() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopElementPicker'
      });

      if (response.success) {
        this.updatePickerStatus('点击"选择元素"开始选择页面元素', false);
        this.addLog('⏹️ 元素选择器已停止', 'info');
      } else {
        this.showNotification('停止元素选择器失败: ' + response.error, 'error');
      }
    } catch (error) {
      this.showNotification('停止元素选择器失败: ' + error.message, 'error');
    }
  }

  // 更新选择器状态
  updatePickerStatus(status, isActive = false) {
    const pickerStatus = document.getElementById('pickerStatus');
    const startBtn = document.getElementById('startPickerBtn');
    const stopBtn = document.getElementById('stopPickerBtn');

    if (pickerStatus) {
      pickerStatus.textContent = status;
      pickerStatus.className = isActive ? 'picker-status active' : 'picker-status';
    }

    if (startBtn && stopBtn) {
      startBtn.style.display = isActive ? 'none' : 'block';
      stopBtn.style.display = isActive ? 'block' : 'none';
    }
  }

  // 处理元素选择结果
  handleElementPickerResult(data) {
    console.log('🎯 handleElementPickerResult 被调用，选择器数量:', data.selectors?.length);

    if (!data || !data.element) {
      console.error('元素选择结果数据无效:', data);
      return;
    }

    // 提取选择器数据，只保留唯一性选择器
    let selectors = [];

    if (data.selectors && Array.isArray(data.selectors)) {
      // 严格过滤：只保留唯一性选择器
      selectors = data.selectors.filter(item => {
        console.log('🔍 检查选择器项:', item);

        // 1. 字符串选择器：无法判断唯一性，跳过
        if (typeof item === 'string') {
          console.log('❌ 跳过字符串选择器（无唯一性信息）:', item);
          return false;
        }

        // 2. 选择器对象：只保留明确标记为唯一的选择器
        if (item && typeof item === 'object' && item.selector && typeof item.selector === 'string') {
          // 只保留标记为唯一的选择器
          if (item.unique === true) {
            console.log('✅ 保留唯一选择器:', item);
            return true;
          } else {
            console.log('❌ 跳过非唯一选择器:', item);
            return false;
          }
        }

        // 3. 跳过其他类型的对象
        console.log('❌ 跳过非选择器对象:', item);
        return false;
      });
    }

    console.log('🎯 过滤后的选择器:', selectors);
    console.log('🎯 选择器数量:', selectors.length);

    if (selectors.length === 0) {
      console.error('没有找到有效的选择器');
      this.showMessage('没有找到有效的选择器，请重试', 'error');
      return;
    }

    this.updatePickerStatus('元素已选择', false);
    // 传递处理后的数据
    this.displaySelectorResults({ ...data, selectors: selectors });
    this.addLog(`✅ 已选择元素: ${data.element.tagName.toLowerCase()}`, 'success');
  }

  // 显示选择器结果（简化版，确保能正常显示）
  displaySelectorResults(data) {
    console.log('🎯 displaySelectorResults 被调用，数据:', data);
    console.log('🎯 当前编辑步骤:', this.currentEditingStepItem);

    // 首先清理所有旧的选择器结果
    this.clearSelectorResults();

    // 优先使用当前编辑步骤附近的容器
    let resultsContainer = null;

    if (this.currentEditingStepItem) {
      console.log('🎯 使用当前编辑步骤的选择器结果容器');

      // 查找当前步骤中的选择器结果容器
      resultsContainer = this.currentEditingStepItem.querySelector('#selectorResults, .selector-results');

      if (resultsContainer) {
        console.log('🎯 找到现有的选择器结果容器');
      } else {
        console.log('⚠️ 当前步骤中没有找到选择器结果容器，使用全局容器');
        resultsContainer = document.getElementById('selectorResults');
      }
    } else {
      console.log('⚠️ 没有当前编辑步骤，使用全局容器');
      resultsContainer = document.getElementById('selectorResults');
    }

    if (!resultsContainer) {
      console.error('❌ 找不到结果容器');
      return;
    }

    // 显示容器并设置样式
    resultsContainer.style.display = 'block';
    resultsContainer.style.cssText = `
      display: block;
      margin-top: 8px;
      padding: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-height: 200px;
      overflow-y: auto;
    `;

    // 不显示元素信息，直接显示选择器候选项
    let html = '';

    // 显示选择器选项（使用已过滤的数据）
    html += '<div class="selector-list">';
    data.selectors.forEach((selector, index) => {
      console.log(`🎯 显示已过滤的选择器 ${index}:`, selector);

      // 提取选择器值（数据已经过过滤，这里只需要简单提取）
      let selectorValue;
      if (typeof selector === 'string') {
        selectorValue = selector;
      } else if (selector && typeof selector.selector === 'string') {
        selectorValue = selector.selector;
      } else {
        console.error(`❌ 过滤后仍有无效选择器 ${index}:`, selector);
        return;
      }

      const selectorType = selector.type || 'css';
      const selectorDesc = selector.description || `${selectorType}选择器`;
      const uniqueIcon = selector.unique ? '✅' : '⚠️';
      const uniqueText = selector.unique ? '唯一' : '非唯一';

      // HTML转义选择器值，确保特殊字符正确处理
      const escapedSelectorValue = selectorValue
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      html += `
        <div class="selector-item" data-selector="${escapedSelectorValue}" data-index="${index}"
             style="cursor: pointer; padding: 8px 12px; margin: 2px 0; border-bottom: 1px solid #f0f0f0; background: #fff; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;">
          <div class="selector-content" style="flex: 1;">
            <div class="selector-value" style="font-family: monospace; font-size: 13px; color: #333; margin-bottom: 2px;">${selectorValue}</div>
            <div class="selector-meta" style="font-size: 11px; color: #888;">${selectorType.toUpperCase()} • ${selectorDesc}</div>
          </div>
          <div class="selector-status" style="font-size: 12px; margin-left: 8px;">${uniqueIcon}</div>
        </div>
      `;
    });
    html += '</div>';

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';

    // 绑定点击事件和悬停效果
    resultsContainer.querySelectorAll('.selector-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSelector(item);
      });

      // 添加悬停效果
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f0f8ff';
        item.style.borderColor = '#007acc';
        item.style.cursor = 'pointer';
      });

      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('selected')) {
          item.style.backgroundColor = '#fff';
          item.style.borderColor = '#ddd';
        }
      });
    });

    console.log('🎯 选择器候选值已显示，等待用户选择');

    // 默认选择第一个选项并填写到输入框
    if (data.selectors.length > 0) {
      const firstSelector = data.selectors[0];
      const firstSelectorValue = typeof firstSelector === 'string' ? firstSelector : firstSelector.selector;
      this.fillSelectorToInput(firstSelectorValue);
      console.log('🎯 默认选择第一个选择器:', firstSelectorValue);
    }

    this.showMessage('选择器候选值已显示，点击可切换选择', 'info');
  }

  // 选择选择器
  selectSelector(item) {
    // 移除其他选中状态
    document.querySelectorAll('.selector-item').forEach(el => {
      el.classList.remove('selected');
    });

    // 添加选中状态
    item.classList.add('selected');

    // HTML解码选择器值
    const rawSelector = item.dataset.selector;
    const selector = rawSelector
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    console.log('🎯 原始选择器值:', rawSelector);
    console.log('🎯 解码后选择器值:', selector);

    // 填充到当前编辑步骤的输入框
    let selectorInput = null;
    if (this.currentEditingStepItem) {
      selectorInput = this.currentEditingStepItem.querySelector('.step-selector');
      console.log('🎯 使用当前编辑步骤的输入框，步骤:', this.currentEditingStepItem.dataset.stepId || 'unknown');
    } else {
      // 如果没有当前编辑步骤，尝试从选择器结果容器的父级查找
      const resultsContainer = item.closest('.selector-results-container');
      if (resultsContainer) {
        const stepItem = resultsContainer.closest('.step-item');
        if (stepItem) {
          selectorInput = stepItem.querySelector('.step-selector');
          console.log('🎯 从结果容器找到对应步骤的输入框');
        }
      }

      // 最后的降级方案
      if (!selectorInput) {
        selectorInput = document.querySelector('.step-selector');
        console.log('⚠️ 使用降级方案：第一个输入框');
      }
    }

    if (selectorInput) {
      selectorInput.value = selector;
      selectorInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ 选择器已填充到输入框:', selector);
    } else {
      console.error('❌ 找不到选择器输入框');
    }

    this.addLog(`✅ 已选择选择器: ${selector}`, 'success');

    // 不清理选择器结果显示，保持候选项可见
    // this.clearSelectorResults();
  }

  // 填写选择器到输入框
  fillSelectorToInput(selector) {
    let selectorInput = null;
    if (this.currentEditingStepItem) {
      selectorInput = this.currentEditingStepItem.querySelector('.step-selector');
      console.log('🎯 使用当前编辑步骤的输入框，步骤:', this.currentEditingStepItem.dataset.stepId || 'unknown');
    } else {
      // 降级方案
      selectorInput = document.querySelector('.step-selector');
      console.log('⚠️ 使用降级方案：第一个输入框');
    }

    if (selectorInput) {
      selectorInput.value = selector;
      console.log('✅ 选择器已填充到输入框:', selector);

      // 触发input事件，确保其他监听器能够响应
      selectorInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      console.error('❌ 找不到选择器输入框');
    }
  }

  // 清理选择器结果显示
  clearSelectorResults() {
    console.log('🧹 开始清理选择器结果');

    // 清理动态创建的选择器结果容器
    const dynamicContainers = document.querySelectorAll('.selector-results-container');
    console.log('🧹 找到动态容器数量:', dynamicContainers.length);

    dynamicContainers.forEach((container, index) => {
      if (container.id !== 'selectorResults') { // 保留全局容器
        console.log(`🧹 移除动态容器 ${index}:`, container.id || 'no-id');
        container.remove();
      }
    });

    // 清理全局容器内容
    const globalContainer = document.getElementById('selectorResults');
    if (globalContainer) {
      console.log('🧹 清理全局容器内容');
      globalContainer.style.display = 'none';
      globalContainer.innerHTML = '';
    }

    console.log('🧹 清理完成');
  }

  // 通用剪贴板复制方法（焦点检查+降级）
  async copyToClipboard(text, successMessage = '已复制到剪切板', errorMessage = '复制失败') {
    try {
      // 方法1：尝试现代API（需要焦点）
      if (navigator.clipboard && document.hasFocus()) {
        await navigator.clipboard.writeText(text);
        this.showNotification(successMessage, 'success');
        return true;
      }

      // 方法2：降级到传统方法
      return this.fallbackCopyToClipboard(text, successMessage, errorMessage);
    } catch (error) {
      console.error('复制失败:', error);
      // 降级到传统方法
      return this.fallbackCopyToClipboard(text, successMessage, errorMessage);
    }
  }

  // 传统剪贴板复制方法
  fallbackCopyToClipboard(text, successMessage, errorMessage) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        this.showNotification(successMessage, 'success');
        return true;
      } else {
        this.showNotification(errorMessage, 'warning');
        return false;
      }
    } catch (err) {
      console.error('传统复制方法失败:', err);
      this.showNotification(errorMessage, 'error');
      return false;
    }
  }

  // 复制选择器到剪切板（保持向后兼容）
  copySelectorToClipboard(text) {
    return this.copyToClipboard(text, '选择器已复制到剪切板', '选择器已填充到输入框');
  }

  // 邮箱搜索功能
  async handleEmailSearch(keyword) {
    const clearBtn = document.getElementById('clearSearchBtn');
    const resultsInfo = document.getElementById('searchResultsInfo');
    const resultsCount = document.getElementById('searchResultsCount');

    // 显示/隐藏清空按钮
    if (keyword.trim()) {
      clearBtn.style.display = 'flex';
    } else {
      clearBtn.style.display = 'none';
      resultsInfo.style.display = 'none';
    }

    try {
      let results;
      if (keyword.trim() === '') {
        // 如果搜索关键词为空，显示所有历史记录
        const response = await chrome.runtime.sendMessage({ action: 'getHistory', type: 'email' });
        results = response.success ? response.history : [];
      } else {
        // 执行搜索
        const response = await chrome.runtime.sendMessage({
          action: 'searchEmailHistory',
          keyword: keyword
        });
        results = response.success ? response.results : [];
      }

      // 渲染搜索结果
      this.renderEmailHistory(results);

      // 显示搜索结果信息
      if (keyword.trim()) {
        resultsCount.textContent = results.length;
        resultsInfo.style.display = 'block';
      }

    } catch (error) {
      console.error('搜索邮箱历史失败:', error);
      this.showNotification('搜索失败', 'error');
    }
  }

  // 清空搜索
  async clearEmailSearch() {
    const searchInput = document.getElementById('emailSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const resultsInfo = document.getElementById('searchResultsInfo');

    searchInput.value = '';
    clearBtn.style.display = 'none';
    resultsInfo.style.display = 'none';

    // 重新加载完整的邮箱历史
    await this.loadEmailHistory();
  }

  // 显示编辑备注弹窗
  showEditModal(emailId, currentNote = '', emailAddress = '') {
    const modal = document.getElementById('edit-note-modal');
    const emailDisplay = document.getElementById('modal-email-address');
    const noteInput = document.getElementById('modal-note-input');

    if (!modal || !emailDisplay || !noteInput) {
      console.error('找不到弹窗元素');
      return;
    }

    // 设置当前编辑的邮箱ID
    this.currentFavoriteEmailId = emailId;

    // 显示邮箱地址和当前备注
    emailDisplay.textContent = emailAddress;
    noteInput.value = currentNote;

    // 显示弹窗
    modal.classList.add('show');

    // 聚焦到输入框
    setTimeout(() => {
      noteInput.focus();
      noteInput.select(); // 选中现有文本便于编辑
    }, 150);
  }

  // 隐藏编辑备注弹窗
  hideEditModal() {
    const modal = document.getElementById('edit-note-modal');
    if (!modal) {
      return;
    }

    modal.classList.remove('show');
    this.currentFavoriteEmailId = null;
    this.currentFavoriteMailId = null;
  }

  // 绑定弹窗事件（只需要绑定一次）
  bindModalEvents() {
    // 避免重复绑定
    if (this.modalEventsBound) {
      return;
    }
    this.modalEventsBound = true;

    const modal = document.getElementById('edit-note-modal');
    const saveBtn = document.getElementById('modal-save-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const closeBtn = document.getElementById('modal-close-btn');

    // 保存按钮
    saveBtn.addEventListener('click', () => {
      this.saveModalNote();
    });

    // 取消按钮
    cancelBtn.addEventListener('click', () => {
      this.hideEditModal();
    });

    // 关闭按钮
    closeBtn.addEventListener('click', () => {
      this.hideEditModal();
    });

    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideEditModal();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        this.hideEditModal();
      }
    });
  }

  // 保存弹窗编辑的备注
  async saveModalNote() {
    const noteInput = document.getElementById('modal-note-input');

    if (!noteInput) {
      console.error('找不到弹窗输入框');
      return;
    }

    const note = noteInput.value.trim();

    // 判断是邮箱历史还是邮件内容历史
    if (this.currentFavoriteEmailId) {
      // 邮箱历史
      await this.setEmailFavorite(this.currentFavoriteEmailId, true, note);
    } else if (this.currentFavoriteMailId) {
      // 邮件内容历史
      await this.setMailContentFavorite(this.currentFavoriteMailId, true, note);
    } else {
      console.error('没有当前编辑的ID');
      return;
    }

    // 隐藏弹窗
    this.hideEditModal();

    // 重置弹窗标题
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = '💭 编辑收藏备注';
    }
  }





  // 设置邮箱收藏状态
  async setEmailFavorite(id, isFavorite, note = '') {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'setEmailFavorite',
        id: id,
        isFavorite: isFavorite,
        note: note
      });

      if (response.success) {
        this.showNotification(isFavorite ? '已添加到收藏' : '已取消收藏', 'success');
        // 重新加载邮箱历史以更新显示
        await this.loadEmailHistory();
      } else {
        this.showNotification('操作失败: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('设置收藏状态失败:', error);
      this.showNotification('操作失败', 'error');
    }
  }

  // 设置邮件内容收藏状态
  async setMailContentFavorite(id, isFavorite, note = '') {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'setMailContentFavorite',
        id: id,
        isFavorite: isFavorite,
        note: note
      });

      if (response.success) {
        this.showNotification(isFavorite ? '已添加到收藏' : '已取消收藏', 'success');
        // 重新加载邮件内容历史以更新显示
        await this.loadMailContentHistory();
      } else {
        this.showNotification('操作失败: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('设置邮件内容收藏状态失败:', error);
      this.showNotification('操作失败', 'error');
    }
  }

  // 显示邮件内容编辑备注弹窗
  showMailContentEditModal(mailId, currentNote = '', mailAddress = '') {
    const modal = document.getElementById('edit-note-modal');
    const emailDisplay = document.getElementById('modal-email-address');
    const noteInput = document.getElementById('modal-note-input');
    const modalTitle = document.querySelector('.modal-title');

    if (!modal || !emailDisplay || !noteInput || !modalTitle) {
      console.error('找不到弹窗元素');
      return;
    }

    // 设置当前编辑的邮件ID
    this.currentFavoriteMailId = mailId;

    // 修改弹窗标题
    modalTitle.textContent = '💭 编辑邮件收藏备注';

    // 显示邮箱地址和当前备注
    emailDisplay.textContent = mailAddress;
    noteInput.value = currentNote;

    // 显示弹窗
    modal.classList.add('show');

    // 聚焦到输入框
    setTimeout(() => {
      noteInput.focus();
      noteInput.select(); // 选中现有文本便于编辑
    }, 150);
  }



  // 搜索邮件内容历史
  async searchMailContentHistory(keyword) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'searchMailContentHistory',
        keyword: keyword
      });

      if (response.success) {
        this.renderMailContentHistory(response.results);
        this.updateMailContentSearchInfo(keyword, response.results.length);
      } else {
        console.error('搜索邮件内容历史失败:', response.error);
        this.showNotification('搜索失败', 'error');
      }
    } catch (error) {
      console.error('搜索邮件内容历史失败:', error);
      this.showNotification('搜索失败', 'error');
    }
  }

  // 更新邮件内容搜索信息显示
  updateMailContentSearchInfo(keyword, count) {
    const searchInfo = document.getElementById('mailContentSearchInfo');
    const searchCount = document.getElementById('mailContentSearchCount');
    const clearBtn = document.getElementById('clearMailContentSearchBtn');

    if (keyword && keyword.trim() !== '') {
      searchInfo.style.display = 'block';
      searchCount.textContent = count;
      clearBtn.style.display = 'block';
    } else {
      searchInfo.style.display = 'none';
      clearBtn.style.display = 'none';
    }
  }

  // 处理邮件内容搜索
  async handleMailContentSearch(keyword) {
    if (keyword && keyword.trim() !== '') {
      await this.searchMailContentHistory(keyword);
    } else {
      await this.loadMailContentHistory();
      this.updateMailContentSearchInfo('', 0);
    }
  }

  // 清空邮件内容搜索
  async clearMailContentSearch() {
    const searchInput = document.getElementById('mailContentSearchInput');
    const clearBtn = document.getElementById('clearMailContentSearchBtn');
    const resultsInfo = document.getElementById('mailContentSearchInfo');

    searchInput.value = '';
    clearBtn.style.display = 'none';
    resultsInfo.style.display = 'none';

    // 重新加载完整的邮件内容历史
    await this.loadMailContentHistory();
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// 创建全局实例
let sidebarFlowManager;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  sidebarFlowManager = new SidebarFlowManager();
});
