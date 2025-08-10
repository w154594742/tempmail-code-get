// Popup界面逻辑
class PopupManager {
  constructor() {
    this.isGettingCode = false;
    this.currentHistoryType = null;

    // 自动化相关状态
    this.automationState = {
      isRunning: false,
      isPaused: false,
      currentExecutionId: null,
      currentTabId: null,
      selectedFlowId: null,
      verificationTimeoutId: null
    };

    this.init();
  }

  async init() {
    // 检查是否在独立窗口中
    this.checkWindowType();

    // 绑定事件监听器
    this.bindEventListeners();

    // 监听来自background的消息
    this.listenToBackgroundMessages();

    // 加载初始数据
    await this.loadInitialData();

    // 初始化自动化功能
    await this.initAutomation();

    // 检查侧边栏支持
    this.checkSidebarSupport();

    console.log('Popup初始化完成');
  }

  // 检查侧边栏支持
  checkSidebarSupport() {
    const sidebarBtn = document.getElementById('openSidebarBtn');
    if (!chrome.sidePanel) {
      // 如果不支持侧边栏，修改按钮文本和提示
      sidebarBtn.textContent = '⚙️ 管理';
      sidebarBtn.title = '浏览器不支持侧边栏，将打开完整管理器';
    } else {
      sidebarBtn.title = '在侧边栏中管理流程';
    }
  }

  // 检查窗口类型
  checkWindowType() {
    // 侧边栏模式
    document.body.classList.add('sidepanel');
    document.title = '临时邮箱工具';
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 邮箱相关
    document.getElementById('generateEmailBtn').addEventListener('click', () => this.generateEmail());
    document.getElementById('copyEmailBtn').addEventListener('click', () => this.copyEmail());
    document.getElementById('emailHistoryBtn').addEventListener('click', () => this.showEmailHistory());

    // 验证码相关
    document.getElementById('getCodeBtn').addEventListener('click', () => this.getVerificationCode());
    document.getElementById('stopCodeBtn').addEventListener('click', () => this.stopGettingCode());
    document.getElementById('copyCodeBtn').addEventListener('click', () => this.copyCode());
    document.getElementById('codeHistoryBtn').addEventListener('click', () => this.showCodeHistory());

    // 设置相关
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());

    // 自动化相关
    document.getElementById('flowSelector').addEventListener('change', (e) => this.onFlowSelectionChange(e));
    document.getElementById('refreshFlowsBtn').addEventListener('click', () => this.refreshFlows());
    document.getElementById('startAutomationBtn').addEventListener('click', () => this.startAutomation());
    document.getElementById('pauseAutomationBtn').addEventListener('click', () => this.pauseAutomation());
    document.getElementById('resumeAutomationBtn').addEventListener('click', () => this.resumeAutomation());
    document.getElementById('stopAutomationBtn').addEventListener('click', () => this.stopAutomation());
    document.getElementById('openSidebarBtn').addEventListener('click', () => this.openSidebar());
    document.getElementById('manageFlowsBtn').addEventListener('click', () => this.openFlowManager());

    // 人机验证相关
    document.getElementById('continueBtn').addEventListener('click', () => this.continueAfterVerification());
    document.getElementById('skipVerificationBtn').addEventListener('click', () => this.skipVerification());
    document.getElementById('retryVerificationBtn').addEventListener('click', () => this.retryVerification());

    // 日志相关
    document.getElementById('clearLogBtn').addEventListener('click', () => this.clearExecutionLog());
    document.getElementById('exportLogBtn').addEventListener('click', () => this.exportExecutionLog());

    // 模态框相关
    document.getElementById('closeHistoryModal').addEventListener('click', () => this.closeHistoryModal());
    document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
    document.getElementById('exportHistoryBtn').addEventListener('click', () => this.exportHistory());

    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', (e) => this.searchHistory(e.target.value));

    // 点击模态框外部关闭
    document.getElementById('historyModal').addEventListener('click', (e) => {
      if (e.target.id === 'historyModal') {
        this.closeHistoryModal();
      }
    });


  }

  // 监听来自background的消息
  listenToBackgroundMessages() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'codeProgress':
          this.updateCodeProgress(message.progress);
          break;
        case 'codeResult':
          this.handleCodeResult(message);
          break;
        case 'codeStopped':
          this.handleCodeStopped(message);
          break;

        // 自动化相关消息
        case 'automationStarted':
          this.handleAutomationStarted(message);
          break;
        case 'automationCompleted':
          this.handleAutomationCompleted(message);
          break;
        case 'automationError':
          this.handleAutomationError(message);
          break;
        case 'automationPaused':
          this.handleAutomationPaused(message);
          break;
        case 'automationResumed':
          this.handleAutomationResumed(message);
          break;
        case 'automationStopped':
          this.handleAutomationStopped(message);
          break;
        case 'stepStarted':
          this.handleStepStarted(message);
          break;
        case 'stepCompleted':
          this.handleStepCompleted(message);
          break;
        case 'stepError':
          this.handleStepError(message);
          break;
        case 'stepRetry':
          this.handleStepRetry(message);
          break;
        case 'humanVerificationRequired':
          this.handleHumanVerificationRequired(message);
          break;
      }
    });
  }

  // 加载初始数据
  async loadInitialData() {
    try {
      this.showLoading('加载数据中...');
      
      // 获取上次的邮箱和验证码
      const response = await this.sendMessageToBackground({ action: 'getLastData' });
      
      if (response.success) {
        if (response.lastEmail) {
          document.getElementById('emailInput').value = response.lastEmail;
        }
        if (response.lastCode) {
          document.getElementById('codeInput').value = response.lastCode;
        }
      }



      // 清除默认状态并添加初始状态
      this.clearStatus();

      this.hideLoading();
      this.updateStatus('就绪', 'ready');
    } catch (error) {
      console.error('加载初始数据失败:', error);
      this.hideLoading();
      this.showNotification('加载数据失败', 'error');
    }
  }

  // 生成邮箱
  async generateEmail() {
    try {
      this.showLoading('生成邮箱中...');
      this.updateStatus('正在生成邮箱...', 'working');

      const response = await this.sendMessageToBackground({ action: 'generateEmail' });
      
      if (response.success) {
        document.getElementById('emailInput').value = response.email;
        this.updateStatus('邮箱生成成功', 'success');
        this.showNotification('邮箱生成成功', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('生成邮箱失败:', error);
      this.updateStatus('生成邮箱失败: ' + error.message, 'error');
      this.showNotification('生成邮箱失败', 'error');
    } finally {
      this.hideLoading();
    }
  }

  // 复制邮箱
  async copyEmail() {
    const email = document.getElementById('emailInput').value;
    if (!email) {
      this.showNotification('没有邮箱可复制', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
      this.showNotification('邮箱已复制', 'success');
    } catch (error) {
      console.error('复制邮箱失败:', error);
      this.showNotification('复制失败', 'error');
    }
  }

  // 获取验证码
  async getVerificationCode() {
    if (this.isGettingCode) {
      this.showNotification('正在获取验证码中...', 'warning');
      return;
    }

    try {
      this.isGettingCode = true;
      this.updateButtonStates(true);
      this.updateStatus('开始获取验证码...', 'working');

      // 禁用获取验证码按钮，防止重复点击
      const getCodeBtn = document.getElementById('getCodeBtn');
      if (getCodeBtn) {
        getCodeBtn.disabled = true;
        getCodeBtn.textContent = '获取中...';
      }

      const response = await this.sendMessageToBackground({
        action: 'getVerificationCode',
        maxRetries: 10,
        retryInterval: 3000
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取验证码失败:', error);
      this.updateStatus('获取验证码失败: ' + error.message, 'error');
      this.showNotification('获取验证码失败', 'error');
      this.isGettingCode = false;
      this.updateButtonStates(false);

      // 恢复获取验证码按钮状态
      const getCodeBtn = document.getElementById('getCodeBtn');
      if (getCodeBtn) {
        getCodeBtn.disabled = false;
        getCodeBtn.textContent = '获取验证码';
      }
    }
  }

  // 停止获取验证码
  async stopGettingCode() {
    try {
      // 立即更新UI状态
      this.isGettingCode = false;
      this.updateButtonStates(false);
      this.updateStatus('正在停止获取验证码...', 'warning');

      const response = await this.sendMessageToBackground({ action: 'stopGettingCode' });

      if (response.success) {
        this.updateStatus('已停止获取验证码', 'ready');
      } else {
        this.updateStatus('停止失败', 'error');
        this.showNotification('停止失败', 'error');
      }
    } catch (error) {
      console.error('停止获取验证码失败:', error);
      this.updateStatus('停止失败', 'error');
      this.showNotification('停止失败', 'error');
    }
  }

  // 复制验证码
  async copyCode() {
    const code = document.getElementById('codeInput').value;
    if (!code) {
      this.showNotification('没有验证码可复制', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.showNotification('验证码已复制', 'success');
    } catch (error) {
      console.error('复制验证码失败:', error);
      this.showNotification('复制失败', 'error');
    }
  }

  // 显示邮箱历史
  async showEmailHistory() {
    this.currentHistoryType = 'email';
    await this.showHistory('email', '📧 邮箱历史记录');
  }

  // 显示验证码历史
  async showCodeHistory() {
    this.currentHistoryType = 'code';
    await this.showHistory('code', '🔐 验证码历史记录');
  }



  // 显示历史记录
  async showHistory(type, title) {
    try {
      this.showLoading('加载历史记录...');
      
      const response = await this.sendMessageToBackground({ 
        action: 'getHistory',
        type: type
      });
      
      if (response.success) {
        document.getElementById('historyModalTitle').textContent = title;
        
        // 显示/隐藏搜索框
        const searchContainer = document.getElementById('searchContainer');
        if (type === 'email') {
          searchContainer.style.display = 'block';
        } else {
          searchContainer.style.display = 'none';
        }
        
        this.renderHistoryList(response.history, type);
        document.getElementById('historyModal').style.display = 'block';
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      this.showNotification('加载历史记录失败', 'error');
    } finally {
      this.hideLoading();
    }
  }

  // 渲染历史列表
  renderHistoryList(history, type) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-item">暂无历史记录</div>';
      return;
    }

    history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.addEventListener('click', () => this.selectHistoryItem(item, type));

      if (type === 'email') {
        historyItem.innerHTML = `
          <div class="history-email">${item.email}</div>
          <div class="history-time">${this.formatTime(item.timestamp)}</div>
        `;
      } else if (type === 'code') {
        historyItem.innerHTML = `
          <div class="history-code">${item.code}</div>
          <div class="history-related">${item.email}</div>
          <div class="history-time">${this.formatTime(item.timestamp)}</div>
        `;
      }

      historyList.appendChild(historyItem);
    });
  }

  // 选择历史项目
  async selectHistoryItem(item, type) {
    try {
      if (type === 'email') {
        document.getElementById('emailInput').value = item.email;
        await navigator.clipboard.writeText(item.email);
        this.showNotification('邮箱已选择并复制', 'success');
      } else if (type === 'code') {
        document.getElementById('codeInput').value = item.code;
        await navigator.clipboard.writeText(item.code);
        this.showNotification('验证码已选择并复制', 'success');
      }
      
      this.closeHistoryModal();
    } catch (error) {
      console.error('选择历史项目失败:', error);
      this.showNotification('操作失败', 'error');
    }
  }

  // 搜索历史记录
  searchHistory(query) {
    const historyItems = document.querySelectorAll('.history-item');
    
    historyItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const isVisible = text.includes(query.toLowerCase());
      item.style.display = isVisible ? 'block' : 'none';
    });
  }

  // 清除历史记录
  async clearHistory() {
    if (!this.currentHistoryType) return;

    const confirmMessage = this.currentHistoryType === 'email' ? 
      '确定要清除所有邮箱历史记录吗？' : 
      '确定要清除所有验证码历史记录吗？';

    if (!confirm(confirmMessage)) return;

    try {
      this.showLoading('清除历史记录...');
      
      const response = await this.sendMessageToBackground({ 
        action: 'clearHistory',
        type: this.currentHistoryType
      });
      
      if (response.success) {
        this.showNotification('历史记录已清除', 'success');
        this.closeHistoryModal();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('清除历史记录失败:', error);
      this.showNotification('清除失败', 'error');
    } finally {
      this.hideLoading();
    }
  }

  // 导出历史记录
  async exportHistory() {
    if (!this.currentHistoryType) return;

    try {
      const response = await this.sendMessageToBackground({ 
        action: 'getHistory',
        type: this.currentHistoryType
      });
      
      if (response.success) {
        const data = JSON.stringify(response.history, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentHistoryType}_history_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('历史记录已导出', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('导出历史记录失败:', error);
      this.showNotification('导出失败', 'error');
    }
  }

  // 显示设置
  async showSettings() {
    try {
      // 打开侧边栏并导航到设置页面
      if (chrome.sidePanel) {
        await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
        // 发送消息到侧边栏，让它导航到设置页面
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'navigateToPage',
            page: 'settings'
          });
        }, 500);
      } else {
        // 如果不支持侧边栏，打开options页面
        chrome.runtime.openOptionsPage();
      }
    } catch (error) {
      console.error('打开设置页面失败:', error);
      this.showNotification('打开设置失败', 'error');
    }
  }



  // 关闭历史模态框
  closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
    document.getElementById('searchInput').value = '';
    this.currentHistoryType = null;
  }



  // 更新验证码进度
  updateCodeProgress(progress) {
    if (progress.success) {
      document.getElementById('codeInput').value = progress.code;
      this.updateStatus(progress.message, 'success');
      this.isGettingCode = false;
      this.updateButtonStates(false);
    } else if (progress.failed) {
      this.updateStatus(progress.message, 'error');
      this.isGettingCode = false;
      this.updateButtonStates(false);
    } else if (progress.error) {
      this.updateStatus(progress.message, 'error');
    } else {
      this.updateStatus(progress.message, 'working');
    }
  }

  // 处理验证码结果
  handleCodeResult(result) {
    if (result.success) {
      document.getElementById('codeInput').value = result.code;
      this.updateStatus('验证码获取成功', 'success');
    } else {
      this.updateStatus('验证码获取失败: ' + result.error, 'error');
    }

    this.isGettingCode = false;
    this.updateButtonStates(false);

    // 恢复获取验证码按钮状态
    const getCodeBtn = document.getElementById('getCodeBtn');
    if (getCodeBtn) {
      getCodeBtn.disabled = false;
      getCodeBtn.textContent = '获取验证码';
    }
  }

  // 处理验证码停止
  handleCodeStopped(result) {
    this.updateStatus(result.message, 'ready');
    this.isGettingCode = false;
    this.updateButtonStates(false);

    // 恢复获取验证码按钮状态
    const getCodeBtn = document.getElementById('getCodeBtn');
    if (getCodeBtn) {
      getCodeBtn.disabled = false;
      getCodeBtn.textContent = '获取验证码';
    }
  }

  // 更新按钮状态
  updateButtonStates(isGetting) {
    const getCodeBtn = document.getElementById('getCodeBtn');
    const stopCodeBtn = document.getElementById('stopCodeBtn');

    if (isGetting) {
      getCodeBtn.style.display = 'none';
      stopCodeBtn.style.display = 'inline-block';
    } else {
      getCodeBtn.style.display = 'inline-block';
      stopCodeBtn.style.display = 'none';
    }
  }

  // 清除状态
  clearStatus() {
    const statusContainer = document.getElementById('statusContainer');
    statusContainer.innerHTML = '';
  }

  // 更新状态
  updateStatus(message, type = 'info') {
    const statusContainer = document.getElementById('statusContainer');
    const statusItem = document.createElement('div');
    statusItem.className = 'status-item';

    const statusDot = document.createElement('span');
    statusDot.className = `status-dot ${type}`;

    const statusText = document.createElement('span');
    statusText.className = 'status-text';

    // 添加时间戳
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    statusText.textContent = `[${timeStr}] ${message}`;

    statusItem.appendChild(statusDot);
    statusItem.appendChild(statusText);

    // 添加到底部（最新消息在下方）
    statusContainer.appendChild(statusItem);

    // 限制状态项数量，删除最旧的（顶部的）
    const statusItems = statusContainer.querySelectorAll('.status-item');
    if (statusItems.length > 5) {
      statusContainer.removeChild(statusItems[0]);
    }

    // 自动滚动到最新消息
    statusContainer.scrollTop = statusContainer.scrollHeight;
  }

  // 显示加载遮罩
  showLoading(text = '处理中...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.querySelector('.loading-text');
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
  }

  // 隐藏加载遮罩
  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }

  // 显示通知
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');

    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  // 发送消息到background
  async sendMessageToBackground(message) {
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

  // 格式化时间
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // ========== 自动化功能相关方法 ==========

  // 初始化自动化功能
  async initAutomation() {
    try {
      // 获取当前标签页ID
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        this.automationState.currentTabId = tabs[0].id;
      }

      // 加载可用的自动化流程
      await this.loadAutomationFlows();

      // 检查是否有正在执行的自动化流程
      await this.checkRunningAutomation();

    } catch (error) {
      console.error('初始化自动化功能失败:', error);
      this.showNotification('自动化功能初始化失败', 'error');
    }
  }

  // 加载自动化流程列表
  async loadAutomationFlows() {
    try {
      // 获取当前页面域名
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentDomain = tabs.length > 0 ? new URL(tabs[0].url).hostname : null;

      // 获取流程列表
      const response = await this.sendMessageToBackground({
        action: 'getAutomationFlows'
      });

      if (response.success) {
        this.populateFlowSelector(response.flows, currentDomain);
      } else {
        console.error('获取自动化流程失败:', response.error);
      }
    } catch (error) {
      console.error('加载自动化流程失败:', error);
    }
  }

  // 填充流程选择器
  populateFlowSelector(flows, currentDomain) {
    const flowSelector = document.getElementById('flowSelector');

    // 清空现有选项
    flowSelector.innerHTML = '<option value="">选择自动化流程...</option>';

    // 按匹配度排序流程
    const sortedFlows = flows.sort((a, b) => {
      // 精确匹配的域名优先
      if (a.domain === currentDomain && b.domain !== currentDomain) return -1;
      if (b.domain === currentDomain && a.domain !== currentDomain) return 1;

      // 通用流程排在后面
      if (a.domain === '*' && b.domain !== '*') return 1;
      if (b.domain === '*' && a.domain !== '*') return -1;

      return a.name.localeCompare(b.name);
    });

    // 添加流程选项
    sortedFlows.forEach(flow => {
      const option = document.createElement('option');
      option.value = flow.id;
      option.textContent = flow.name;

      // 标记匹配的域名
      if (flow.domain === currentDomain) {
        option.textContent += ' ✓';
        option.style.fontWeight = 'bold';
      } else if (flow.domain === '*') {
        option.textContent += ' (通用)';
        option.style.color = '#5f6368';
      }

      if (!flow.enabled) {
        option.disabled = true;
        option.textContent += ' (已禁用)';
      }

      flowSelector.appendChild(option);
    });
  }

  // 检查是否有正在执行的自动化流程
  async checkRunningAutomation() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'getExecutionState',
        tabId: this.automationState.currentTabId
      });

      if (response.success && response.state) {
        const state = response.state;
        this.automationState.currentExecutionId = state.executionId;

        // 根据状态更新UI
        switch (state.status) {
          case 'running':
            this.updateAutomationUI('running', state);
            break;
          case 'paused':
            this.updateAutomationUI('paused', state);
            break;
          case 'completed':
            this.updateAutomationUI('completed', state);
            break;
          case 'error':
            this.updateAutomationUI('error', state);
            break;
        }
      }
    } catch (error) {
      console.error('检查运行状态失败:', error);
    }
  }

  // 流程选择变化处理
  onFlowSelectionChange(event) {
    this.automationState.selectedFlowId = event.target.value;

    // 更新开始按钮状态
    const startBtn = document.getElementById('startAutomationBtn');
    startBtn.disabled = !this.automationState.selectedFlowId || this.automationState.isRunning;
  }

  // 刷新流程列表
  async refreshFlows() {
    const refreshBtn = document.getElementById('refreshFlowsBtn');
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄';

    try {
      await this.loadAutomationFlows();
      this.showNotification('流程列表已刷新', 'success');
    } catch (error) {
      this.showNotification('刷新失败', 'error');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄';
    }
  }

  // 开始自动化
  async startAutomation() {
    if (!this.automationState.selectedFlowId) {
      this.showNotification('请先选择一个自动化流程', 'warning');
      return;
    }

    if (this.automationState.isRunning) {
      this.showNotification('已有自动化流程在运行', 'warning');
      return;
    }

    try {
      const response = await this.sendMessageToBackground({
        action: 'startAutomationFlow',
        flowId: this.automationState.selectedFlowId,
        tabId: this.automationState.currentTabId
      });

      if (response.success) {
        this.automationState.isRunning = true;
        this.automationState.currentExecutionId = response.executionId;
        this.showNotification('自动化流程已开始', 'success');
        this.updateAutomationUI('starting');
      } else {
        this.showNotification(`启动失败: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('启动自动化失败:', error);
      this.showNotification('启动自动化失败', 'error');
    }
  }

  // 暂停自动化
  async pauseAutomation() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'pauseAutomationFlow',
        tabId: this.automationState.currentTabId
      });

      if (response.success) {
        this.automationState.isPaused = true;
        this.showNotification('自动化流程已暂停', 'success');
      } else {
        this.showNotification(`暂停失败: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('暂停自动化失败:', error);
      this.showNotification('暂停自动化失败', 'error');
    }
  }

  // 恢复自动化
  async resumeAutomation() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'resumeAutomationFlow',
        tabId: this.automationState.currentTabId
      });

      if (response.success) {
        this.automationState.isPaused = false;
        this.showNotification('自动化流程已恢复', 'success');
      } else {
        this.showNotification(`恢复失败: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('恢复自动化失败:', error);
      this.showNotification('恢复自动化失败', 'error');
    }
  }

  // 停止自动化
  async stopAutomation() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'stopAutomationFlow',
        tabId: this.automationState.currentTabId
      });

      if (response.success) {
        this.resetAutomationState();
        this.showNotification('自动化流程已停止', 'success');
      } else {
        this.showNotification(`停止失败: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('停止自动化失败:', error);
      this.showNotification('停止自动化失败', 'error');
    }
  }

  // 🔑 人机验证后继续
  async continueAfterVerification() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'resumeAutomationFlow',
        tabId: this.automationState.currentTabId
      });

      if (response.success) {
        this.hideHumanVerification();
        this.showNotification('继续执行自动化流程', 'success');
      } else {
        this.showNotification(`继续失败: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('继续自动化失败:', error);
      this.showNotification('继续自动化失败', 'error');
    }
  }

  // 跳过人机验证
  async skipVerification() {
    // 这里可以实现跳过逻辑，或者直接继续
    await this.continueAfterVerification();
  }

  // 重试人机验证
  async retryVerification() {
    // 隐藏验证界面，让用户重新尝试
    this.hideHumanVerification();
    this.showNotification('请重新完成人机验证', 'info');

    // 可以在这里添加重新检测验证状态的逻辑
    setTimeout(() => {
      this.showHumanVerification({
        message: '请重新完成人机验证，然后点击继续',
        timeout: 300000
      });
    }, 2000);
  }

  // 清除执行日志
  async clearExecutionLog() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'clearAutomationLogs',
        type: 'memory'
      });

      if (response.success) {
        const logContainer = document.getElementById('logContainer');
        logContainer.innerHTML = '';
        this.showNotification('执行日志已清除', 'success');
      }
    } catch (error) {
      console.error('清除日志失败:', error);
      this.showNotification('清除日志失败', 'error');
    }
  }

  // 导出执行日志
  async exportExecutionLog() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'getAutomationLogs',
        filter: { executionId: this.automationState.currentExecutionId }
      });

      if (response.success) {
        const logs = response.logs;
        const logText = logs.map(log =>
          `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`
        ).join('\n');

        // 创建下载链接
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `automation-log-${this.automationState.currentExecutionId}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('日志已导出', 'success');
      }
    } catch (error) {
      console.error('导出日志失败:', error);
      this.showNotification('导出日志失败', 'error');
    }
  }

  // ========== UI更新方法 ==========

  // 更新自动化UI状态
  updateAutomationUI(status, state = null) {
    const automationStatus = document.getElementById('automationStatus');
    const currentStep = document.getElementById('currentStep');
    const automationProgress = document.getElementById('automationProgress');
    const executionLog = document.getElementById('executionLog');

    const startBtn = document.getElementById('startAutomationBtn');
    const pauseBtn = document.getElementById('pauseAutomationBtn');
    const resumeBtn = document.getElementById('resumeAutomationBtn');
    const stopBtn = document.getElementById('stopAutomationBtn');

    // 重置按钮状态
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'none';
    stopBtn.style.display = 'none';

    switch (status) {
      case 'starting':
      case 'running':
        automationStatus.style.display = 'block';
        currentStep.style.display = 'block';
        automationProgress.style.display = 'block';
        executionLog.style.display = 'block';

        pauseBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';

        this.updateStatusDisplay('⏳', '执行中...', '#4285f4');
        break;

      case 'paused':
        resumeBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';

        this.updateStatusDisplay('⏸️', '已暂停', '#f57c00');
        break;

      case 'completed':
        startBtn.style.display = 'inline-block';
        this.updateStatusDisplay('✅', '已完成', '#34a853');
        this.resetAutomationState();
        break;

      case 'error':
        startBtn.style.display = 'inline-block';
        this.updateStatusDisplay('❌', '执行失败', '#ea4335');
        this.resetAutomationState();
        break;

      default:
        automationStatus.style.display = 'none';
        currentStep.style.display = 'none';
        automationProgress.style.display = 'none';
        executionLog.style.display = 'none';

        startBtn.style.display = 'inline-block';
        startBtn.disabled = !this.automationState.selectedFlowId;
    }

    // 更新进度信息
    if (state) {
      this.updateProgressDisplay(state.currentStepIndex, state.totalSteps);
    }
  }

  // 更新状态显示
  updateStatusDisplay(icon, text, color) {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    statusIcon.textContent = icon;
    statusText.textContent = text;
    statusText.style.color = color;
  }

  // 更新进度显示
  updateProgressDisplay(current, total) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${current}/${total}`;
  }

  // 🔑 显示人机验证界面
  showHumanVerification(data) {
    const humanVerification = document.getElementById('humanVerification');
    const verificationMessage = document.getElementById('verificationMessage');
    const timeoutCounter = document.getElementById('timeoutCounter');
    const skipBtn = document.getElementById('skipVerificationBtn');
    const retryBtn = document.getElementById('retryVerificationBtn');

    // 显示验证界面
    humanVerification.style.display = 'block';

    // 设置消息
    verificationMessage.textContent = data.message || '请完成人机验证后点击继续';

    // 显示可选按钮
    if (data.skipable) {
      skipBtn.style.display = 'inline-block';
    }
    if (data.retryable) {
      retryBtn.style.display = 'inline-block';
    }

    // 启动倒计时
    if (data.timeout) {
      this.startVerificationCountdown(data.timeout);
    }

    // 滚动到验证区域
    humanVerification.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // 隐藏人机验证界面
  hideHumanVerification() {
    const humanVerification = document.getElementById('humanVerification');
    humanVerification.style.display = 'none';

    // 清除倒计时
    if (this.automationState.verificationTimeoutId) {
      clearInterval(this.automationState.verificationTimeoutId);
      this.automationState.verificationTimeoutId = null;
    }
  }

  // 启动验证倒计时
  startVerificationCountdown(timeout) {
    const timeoutCounter = document.getElementById('timeoutCounter');
    let remainingTime = Math.floor(timeout / 1000);

    const updateCounter = () => {
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      timeoutCounter.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      if (remainingTime <= 0) {
        clearInterval(this.automationState.verificationTimeoutId);
        this.hideHumanVerification();
        this.showNotification('人机验证超时', 'error');
        return;
      }

      remainingTime--;
    };

    updateCounter();
    this.automationState.verificationTimeoutId = setInterval(updateCounter, 1000);
  }

  // ========== 消息处理方法 ==========

  // 处理自动化开始消息
  handleAutomationStarted(message) {
    this.automationState.isRunning = true;
    this.automationState.currentExecutionId = message.executionId;
    this.updateAutomationUI('running', {
      currentStepIndex: 0,
      totalSteps: message.totalSteps
    });
    this.addLogEntry('info', `自动化流程 "${message.flowName}" 开始执行`);
  }

  // 处理自动化完成消息
  handleAutomationCompleted(message) {
    this.updateAutomationUI('completed');
    this.addLogEntry('info', `自动化流程执行完成，耗时 ${Math.round(message.duration / 1000)}秒`);
    this.showNotification('自动化注册完成！', 'success');
  }

  // 处理自动化错误消息
  handleAutomationError(message) {
    this.updateAutomationUI('error');
    this.addLogEntry('error', `自动化流程执行失败: ${message.error}`);
    this.showNotification(`自动化执行失败: ${message.error}`, 'error');
  }

  // 处理自动化暂停消息
  handleAutomationPaused(message) {
    this.automationState.isPaused = true;
    this.updateAutomationUI('paused');
    this.addLogEntry('warn', '自动化流程已暂停');
  }

  // 处理自动化恢复消息
  handleAutomationResumed(message) {
    this.automationState.isPaused = false;
    this.updateAutomationUI('running');
    this.addLogEntry('info', '自动化流程已恢复');
  }

  // 处理自动化停止消息
  handleAutomationStopped(message) {
    this.resetAutomationState();
    this.updateAutomationUI('idle');
    this.addLogEntry('warn', '自动化流程已停止');
  }

  // 处理步骤开始消息
  handleStepStarted(message) {
    this.updateCurrentStep(message.step);
    this.updateProgressDisplay(message.stepIndex, message.totalSteps);
    this.updateStepStatus(message.stepIndex, 'running');
    this.addLogEntry('info', `开始执行步骤: ${message.step.name}`);
  }

  // 处理步骤完成消息
  handleStepCompleted(message) {
    this.updateStepStatus(message.stepIndex, 'completed');
    this.addLogEntry('info', `步骤完成: ${message.step.name}`);
  }

  // 处理步骤错误消息
  handleStepError(message) {
    this.updateStepStatus(message.stepIndex, 'error');
    this.addLogEntry('error', `步骤失败: ${message.step.name} - ${message.error}`);
  }

  // 处理步骤重试消息
  handleStepRetry(message) {
    this.addLogEntry('warn', `步骤重试 (${message.attempt}/${message.maxRetries}): ${message.step.name}`);
  }

  // 🔑 处理人机验证需求消息
  handleHumanVerificationRequired(message) {
    this.showHumanVerification(message);
    this.addLogEntry('warn', '需要人机验证，流程已暂停');
  }

  // ========== 辅助方法 ==========

  // 更新当前步骤显示
  updateCurrentStep(step) {
    const stepName = document.getElementById('stepName');
    const stepDescription = document.getElementById('stepDescription');

    stepName.textContent = step.name;
    stepDescription.textContent = step.description || '';
  }

  // 更新步骤状态
  updateStepStatus(stepIndex, status) {
    // 这里可以实现步骤列表的状态更新
    // 由于步骤列表是动态生成的，需要根据实际需求实现
  }

  // 添加日志条目
  addLogEntry(level, message) {
    const logContainer = document.getElementById('logContainer');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${level}`;

    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // 重置自动化状态
  resetAutomationState() {
    this.automationState.isRunning = false;
    this.automationState.isPaused = false;
    this.automationState.currentExecutionId = null;

    // 隐藏人机验证界面
    this.hideHumanVerification();

    // 重新启用流程选择
    const flowSelector = document.getElementById('flowSelector');
    flowSelector.disabled = false;
  }

  // 打开侧边栏
  async openSidebar() {
    try {
      // 检查是否支持侧边栏API
      if (!chrome.sidePanel) {
        console.log('浏览器不支持侧边栏API，使用选项页面');
        this.openFlowManager();
        return;
      }

      // 获取当前标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        this.openFlowManager();
        return;
      }

      // 打开侧边栏
      await chrome.sidePanel.open({ tabId: tabs[0].id });

      // 关闭popup
      window.close();
    } catch (error) {
      console.error('打开侧边栏失败:', error);
      // 如果侧边栏不支持，回退到选项页面
      this.openFlowManager();
    }
  }

  // 打开流程管理页面
  openFlowManager() {
    chrome.runtime.openOptionsPage();
  }

}

// 初始化Popup管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
