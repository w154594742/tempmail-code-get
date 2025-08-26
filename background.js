// Service Worker - 后台脚本
importScripts(
  'utils/storage.js',
  'utils/email-generator.js',
  'utils/api.js',
  'utils/automation-manager.js',
  'utils/automation-runner.js',
  'utils/automation-templates.js',
  'utils/automation-logger.js',
  'utils/automation-validator.js',
  'utils/selector-helper.js',
  'utils/flow-editor.js',
  'utils/smart-selector-generator.js',
  'utils/performance-monitor.js',
  'utils/advanced-config-manager.js'
);

class BackgroundService {
  constructor() {
    this.isGettingCode = false;
    this.codeRequestController = null;

    // 初始化自动化管理器，传递this实例
    this.automationManager = new AutomationManager(this);

    // 初始化高级功能组件
    this.flowEditor = new FlowEditor();
    this.smartSelectorGenerator = new SmartSelectorGenerator();
    this.performanceMonitor = new PerformanceMonitor();
    this.advancedConfigManager = new AdvancedConfigManager();

    this.init();
  }

  async init() {
    // 监听消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听插件安装
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    // 监听插件启动
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // 监听插件图标点击
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });

    console.log('Background Service 初始化完成');
  }

  // 处理消息
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'generateEmail':
          await this.handleGenerateEmail(message, sendResponse);
          break;
        
        case 'getVerificationCode':
          await this.handleGetVerificationCode(message, sendResponse);
          break;





        case 'stopGettingCode':
          await this.handleStopGettingCode(message, sendResponse);
          break;
        
        case 'getHistory':
          await this.handleGetHistory(message, sendResponse);
          break;
        
        case 'clearHistory':
          await this.handleClearHistory(message, sendResponse);
          break;
        case 'deleteHistoryItem':
          await this.handleDeleteHistoryItem(message, sendResponse);
          break;

        case 'setEmailFavorite':
          await this.handleSetEmailFavorite(message, sendResponse);
          break;

        case 'searchEmailHistory':
          await this.handleSearchEmailHistory(message, sendResponse);
          break;

        case 'searchMailContentHistory':
          await this.handleSearchMailContentHistory(message, sendResponse);
          break;

        case 'setMailContentFavorite':
          await this.handleSetMailContentFavorite(message, sendResponse);
          break;

        case 'getMailContentHistory':
          await this.handleGetMailContentHistory(message, sendResponse);
          break;

        case 'deleteMailContentHistoryItem':
          await this.handleDeleteMailContentHistoryItem(message, sendResponse);
          break;

        case 'clearMailContentHistory':
          await this.handleClearMailContentHistory(message, sendResponse);
          break;
        
        case 'getLastData':
          await this.handleGetLastData(message, sendResponse);
          break;
        
        case 'testConnection':
          await this.handleTestConnection(message, sendResponse);
          break;


        
        case 'getConfig':
          await this.handleGetConfig(message, sendResponse);
          break;
        
        case 'setConfig':
          await this.handleSetConfig(message, sendResponse);
          break;

        case 'resetConfig':
          await this.handleResetConfig(message, sendResponse);
          break;

        case 'exportConfig':
          await this.handleExportConfig(message, sendResponse);
          break;

        case 'importConfig':
          await this.handleImportConfig(message, sendResponse);
          break;

        // 自动化相关操作
        case 'startAutomationFlow':
        case 'pauseAutomationFlow':
        case 'resumeAutomationFlow':
        case 'stopAutomationFlow':
        case 'getExecutionState':
        case 'getAutomationFlows':
        case 'saveAutomationFlow':
        case 'deleteAutomationFlow':
        case 'testAutomationFlow':
          await this.automationManager.handleMessage(message, sender, sendResponse);
          break;

        // 模板管理操作
        case 'getAutomationTemplates':
          await this.handleGetAutomationTemplates(message, sendResponse);
          break;

        case 'createFlowFromTemplate':
          await this.handleCreateFlowFromTemplate(message, sendResponse);
          break;

        // 日志管理操作
        case 'getAutomationLogs':
          await this.handleGetAutomationLogs(message, sendResponse);
          break;

        case 'clearAutomationLogs':
          await this.handleClearAutomationLogs(message, sendResponse);
          break;

        // 清理操作
        case 'cleanupRunner':
          await this.handleCleanupRunner(message, sendResponse);
          break;

        // 高级功能操作
        case 'generateSmartSelector':
          await this.handleGenerateSmartSelector(message, sendResponse);
          break;

        case 'testSelector':
          await this.handleTestSelector(message, sendResponse);
          break;

        case 'getPerformanceReport':
          await this.handleGetPerformanceReport(message, sendResponse);
          break;

        case 'getAdvancedConfig':
          await this.handleGetAdvancedConfig(message, sendResponse);
          break;

        case 'updateAdvancedConfig':
          await this.handleUpdateAdvancedConfig(message, sendResponse);
          break;

        // 流程管理操作
        case 'saveAutomationFlow':
          await this.handleSaveAutomationFlow(message, sendResponse);
          break;

        case 'deleteAutomationFlow':
          await this.handleDeleteAutomationFlow(message, sendResponse);
          break;

        case 'testAutomationFlow':
          await this.handleTestAutomationFlow(message, sendResponse);
          break;

        // 选择器助手操作
        case 'startElementSelection':
          await this.handleStartElementSelection(message, sendResponse);
          break;

        case 'elementSelected':
          await this.handleElementSelected(message, sendResponse);
          break;

        case 'startElementSelectionForAllTabs':
          await this.handleStartElementSelectionForAllTabs(message, sendResponse);
          break;

        case 'getLastSelectedElement':
          sendResponse({
            success: true,
            result: this.getLastSelectedElement()
          });
          break;

        case 'contentScriptLoaded':
          console.log('Background: Content script已加载到页面:', message.url);
          sendResponse({ success: true });
          break;

        case 'elementSelectorInitialized':
          console.log('Background: ElementSelector已初始化完成:', message.url);
          sendResponse({ success: true });
          break;

        case 'elementSelectorError':
          console.error('Background: ElementSelector初始化失败:', message.error, '页面:', message.url);
          sendResponse({ success: true });
          break;

        // 人机验证操作
        case 'continueAutomation':
          await this.handleContinueAutomation(message, sendResponse);
          break;

        case 'skipVerificationStep':
          await this.handleSkipVerificationStep(message, sendResponse);
          break;

        case 'cancelAutomation':
          await this.handleCancelAutomation(message, sendResponse);
          break;

        // 页面导航
        case 'navigateToPage':
          await this.handleNavigateToPage(message, sendResponse);
          break;

        // 设置管理
        case 'getSettings':
          await this.handleGetSettings(message, sendResponse);
          break;

        case 'saveSettings':
          await this.handleSaveSettings(message, sendResponse);
          break;

        case 'resetSettings':
          await this.handleResetSettings(message, sendResponse);
          break;

        // 自动化日志
        case 'automationLog':
          await this.handleAutomationLog(message, sendResponse);
          break;

        // 流程控制（stopAutomationFlow已在automationManager中处理）

        case 'getAutomationStatus':
          await this.handleGetAutomationStatus(message, sendResponse);
          break;

        // 元素选择器
        case 'startElementPicker':
          await this.handleStartElementPicker(message, sendResponse);
          break;

        case 'stopElementPicker':
          await this.handleStopElementPicker(message, sendResponse);
          break;

        case 'elementSelected':
          await this.handleElementSelected(message, sendResponse);
          break;

        default:
          sendResponse({ success: false, error: '未知的操作类型' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 生成邮箱
  async handleGenerateEmail(message, sendResponse) {
    try {
      // 确保emailGenerator存在
      if (typeof emailGenerator === 'undefined') {
        throw new Error('邮箱生成器未初始化');
      }

      const email = await emailGenerator.generateEmail();

      // emailGenerator.generateEmail() 已经处理了历史记录保存
      // 不需要在这里重复保存

      sendResponse({
        success: true,
        email: email,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('生成邮箱失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取验证码（首页专用，支持进度显示）
  async handleGetVerificationCode(message, sendResponse) {
    if (this.isGettingCode) {
      sendResponse({ success: false, error: '正在获取验证码中，请稍候' });
      return;
    }

    try {
      this.isGettingCode = true;
      this.codeRequestController = new AbortController();

      const { maxRetries = 5, retryInterval = 3000, openLinksOnFailure = false, sourceEmail = null } = message;

      // 获取验证码，恢复进度回调用于首页显示
      const code = await apiManager.getVerificationCode(
        maxRetries,
        retryInterval,
        (progress) => {
          // 使用安全的消息发送方式，避免消息通道冲突
          try {
            chrome.runtime.sendMessage({
              type: 'codeProgress',
              progress: progress
            });
          } catch (error) {
            // 忽略发送错误，不影响主要功能
            console.log('发送进度消息失败:', error.message);
          }
        },
        this.codeRequestController.signal,
        openLinksOnFailure,
        sourceEmail
      );

      this.isGettingCode = false;

      // 发送成功结果到前端
      try {
        chrome.runtime.sendMessage({
          type: 'codeResult',
          success: true,
          code: code,
          timestamp: Date.now()
        });
      } catch (error) {
        console.log('发送结果消息失败:', error.message);
      }

      // 响应给调用者
      sendResponse({
        success: true,
        code: code,
        timestamp: Date.now()
      });

    } catch (error) {
      this.isGettingCode = false;
      console.error('获取验证码失败:', error);

      // 发送失败结果到前端
      try {
        chrome.runtime.sendMessage({
          type: 'codeResult',
          success: false,
          error: error.message
        });
      } catch (sendError) {
        console.log('发送错误消息失败:', sendError.message);
      }

      // 响应给调用者
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // 获取验证码（支持进度回调，用于自动化流程）
  async handleGetVerificationCodeWithProgress(message, sendResponse, progressCallback = null) {
    if (this.isGettingCode) {
      sendResponse({ success: false, error: '正在获取验证码中，请稍候' });
      return;
    }

    try {
      this.isGettingCode = true;
      this.codeRequestController = new AbortController();

      const { maxRetries = 5, retryInterval = 3000, sourceEmail = null } = message;

      // 包装进度回调，添加中断检查
      const wrappedProgressCallback = progressCallback ? (progress) => {
        // 检查是否被中断
        if (this.codeRequestController && this.codeRequestController.signal.aborted) {
          console.log('验证码获取已被中断，停止进度回调');
          return;
        }
        progressCallback(progress);
      } : null;

      // 获取验证码，传入包装后的进度回调（自动化流程不启用链接打开功能）
      const code = await apiManager.getVerificationCode(
        maxRetries,
        retryInterval,
        wrappedProgressCallback,
        this.codeRequestController.signal,
        false, // 自动化流程不启用链接打开功能
        sourceEmail
      );

      this.isGettingCode = false;

      // 响应给调用者
      sendResponse({
        success: true,
        code: code,
        timestamp: Date.now()
      });

    } catch (error) {
      this.isGettingCode = false;
      console.error('获取验证码失败:', error);

      // 检查是否是中断错误
      if (error.name === 'AbortError' || error.message.includes('中断') || error.message.includes('停止')) {
        sendResponse({
          success: false,
          error: '验证码获取已被停止'
        });
      } else {
        sendResponse({
          success: false,
          error: error.message
        });
      }
    }
  }

  // 停止获取验证码
  async handleStopGettingCode(message, sendResponse) {
    if (this.codeRequestController) {
      this.codeRequestController.abort();
      this.codeRequestController = null;
    }

    this.isGettingCode = false;

    sendResponse({
      success: true,
      message: '已停止获取验证码'
    });
  }

  // 获取历史记录
  async handleGetHistory(message, sendResponse) {
    try {
      const { type } = message;
      let history = [];

      if (type === 'email') {
        history = await storageManager.getEmailHistory();
      } else if (type === 'code') {
        history = await storageManager.getCodeHistory();
      }

      sendResponse({ 
        success: true, 
        history: history,
        type: type
      });
    } catch (error) {
      console.error('获取历史记录失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 清除历史记录
  async handleClearHistory(message, sendResponse) {
    try {
      const { type } = message;
      const result = await storageManager.clearHistory(type);
      
      sendResponse({ 
        success: result, 
        message: result ? '历史记录已清除' : '清除历史记录失败'
      });
    } catch (error) {
      console.error('清除历史记录失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 删除历史记录项
  async handleDeleteHistoryItem(message, sendResponse) {
    try {
      const { type, id } = message;
      let result = false;

      if (type === 'email') {
        result = await storageManager.deleteEmailHistoryItem(id);
      }
      // 可以在这里添加其他类型的删除逻辑

      sendResponse({
        success: result,
        message: result ? '历史记录已删除' : '删除历史记录失败'
      });
    } catch (error) {
      console.error('删除历史记录项失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取邮件内容历史记录
  async handleGetMailContentHistory(message, sendResponse) {
    try {
      const history = await storageManager.getMailContentHistory();
      sendResponse({
        success: true,
        history: history
      });
    } catch (error) {
      console.error('获取邮件内容历史失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 删除邮件内容历史记录项
  async handleDeleteMailContentHistoryItem(message, sendResponse) {
    try {
      const { id } = message;
      const result = await storageManager.deleteMailContentHistoryItem(id);

      sendResponse({
        success: result,
        message: result ? '邮件记录已删除' : '删除邮件记录失败'
      });
    } catch (error) {
      console.error('删除邮件记录失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 清除邮件内容历史记录
  async handleClearMailContentHistory(message, sendResponse) {
    try {
      const result = await storageManager.clearHistory('mailContent');

      sendResponse({
        success: result,
        message: result ? '邮件内容历史已清除' : '清除邮件内容历史失败'
      });
    } catch (error) {
      console.error('清除邮件内容历史失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 设置邮箱收藏状态
  async handleSetEmailFavorite(message, sendResponse) {
    try {
      const { id, isFavorite, note } = message;
      const result = await storageManager.setEmailFavorite(id, isFavorite, note);

      sendResponse({
        success: result,
        message: result ? '收藏状态已更新' : '更新收藏状态失败'
      });
    } catch (error) {
      console.error('设置邮箱收藏状态失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 搜索邮箱历史记录
  async handleSearchEmailHistory(message, sendResponse) {
    try {
      const { keyword } = message;
      const results = await storageManager.searchEmailHistory(keyword);

      sendResponse({
        success: true,
        results: results
      });
    } catch (error) {
      console.error('搜索邮箱历史失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 搜索邮件内容历史记录
  async handleSearchMailContentHistory(message, sendResponse) {
    try {
      const { keyword } = message;
      const results = await storageManager.searchMailContentHistory(keyword);

      sendResponse({
        success: true,
        results: results
      });
    } catch (error) {
      console.error('搜索邮件内容历史失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 设置邮件内容收藏状态
  async handleSetMailContentFavorite(message, sendResponse) {
    try {
      const { id, isFavorite, note } = message;
      const success = await storageManager.setMailContentFavorite(id, isFavorite, note);

      sendResponse({
        success: success,
        message: success ? '操作成功' : '操作失败'
      });
    } catch (error) {
      console.error('设置邮件内容收藏状态失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取上次数据
  async handleGetLastData(message, sendResponse) {
    try {
      const lastEmail = await storageManager.getLastEmail();
      const lastCode = await storageManager.getLastCode();
      
      sendResponse({ 
        success: true, 
        lastEmail: lastEmail,
        lastCode: lastCode
      });
    } catch (error) {
      console.error('获取上次数据失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 测试连接
  async handleTestConnection(message, sendResponse) {
    try {
      const result = await apiManager.testConnection();
      sendResponse({ 
        success: true, 
        connected: result,
        message: result ? 'API连接正常' : 'API连接失败'
      });
    } catch (error) {
      console.error('测试连接失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取配置
  async handleGetConfig(message, sendResponse) {
    try {
      const { key } = message;
      const config = await storageManager.getConfig(key);
      
      sendResponse({ 
        success: true, 
        config: config
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 设置配置
  async handleSetConfig(message, sendResponse) {
    try {
      const { key, value } = message;
      const result = await storageManager.setConfig(key, value);

      sendResponse({
        success: result,
        message: result ? '配置已保存' : '保存配置失败'
      });
    } catch (error) {
      console.error('设置配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 重置配置
  async handleResetConfig(message, sendResponse) {
    try {
      const result = await storageManager.resetConfig();

      sendResponse({
        success: result,
        message: result ? '配置已重置' : '重置配置失败'
      });
    } catch (error) {
      console.error('重置配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 导出配置
  async handleExportConfig(message, sendResponse) {
    try {
      const config = await storageManager.exportConfig();

      if (config) {
        sendResponse({
          success: true,
          config: config
        });
      } else {
        sendResponse({ success: false, error: '导出配置失败' });
      }
    } catch (error) {
      console.error('导出配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 导入配置
  async handleImportConfig(message, sendResponse) {
    try {
      const { configData } = message;
      const result = await storageManager.importConfig(configData);

      sendResponse({
        success: result,
        message: result ? '配置已导入' : '导入配置失败'
      });
    } catch (error) {
      console.error('导入配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }



  // 处理插件安装
  async handleInstalled(details) {
    console.log('插件安装/更新:', details.reason);
    
    if (details.reason === 'install') {
      // 首次安装，初始化默认配置
      await storageManager.resetConfig();
      console.log('首次安装，已初始化默认配置');
    } else if (details.reason === 'update') {
      // 更新版本，可能需要迁移数据
      console.log('插件已更新到版本:', chrome.runtime.getManifest().version);
    }
  }

  // 处理插件图标点击
  async handleActionClick(tab) {
    try {
      // 打开侧边栏
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('打开侧边栏失败:', error);
    }
  }

  // 处理插件启动
  async handleStartup() {
    console.log('插件启动');
    // 可以在这里执行一些启动时的初始化操作
  }

  // ========== 自动化相关消息处理方法 ==========

  // 获取自动化模板
  async handleGetAutomationTemplates(message, sendResponse) {
    try {
      const { domain } = message;
      let templates;

      if (domain) {
        templates = automationTemplates.getRecommendedTemplates(domain);
      } else {
        templates = automationTemplates.getAllTemplates();
      }

      sendResponse({
        success: true,
        templates: templates
      });
    } catch (error) {
      console.error('获取自动化模板失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 从模板创建流程
  async handleCreateFlowFromTemplate(message, sendResponse) {
    try {
      const { templateId, customizations } = message;
      const newFlow = automationTemplates.createFlowFromTemplate(templateId, customizations);

      // 验证新流程
      const validation = await automationValidator.validateAutomationConfig({ flows: [newFlow] });
      if (!validation.valid) {
        sendResponse({
          success: false,
          error: '流程配置验证失败',
          details: validation.errors
        });
        return;
      }

      // 保存流程
      const saved = await storageManager.saveAutomationFlow(newFlow);
      if (saved) {
        automationLogger.info('从模板创建新流程', { templateId, flowId: newFlow.id });
        sendResponse({
          success: true,
          flow: newFlow,
          message: '流程创建成功'
        });
      } else {
        sendResponse({ success: false, error: '保存流程失败' });
      }
    } catch (error) {
      console.error('从模板创建流程失败:', error);
      automationLogger.error('从模板创建流程失败', { error: error.message });
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取自动化日志
  async handleGetAutomationLogs(message, sendResponse) {
    try {
      const { filter } = message;
      const logs = automationLogger.getLogs(filter);
      const stats = automationLogger.getStats();

      sendResponse({
        success: true,
        logs: logs,
        stats: stats
      });
    } catch (error) {
      console.error('获取自动化日志失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 清除自动化日志
  async handleClearAutomationLogs(message, sendResponse) {
    try {
      const { type = 'memory' } = message;
      automationLogger.clearLogs(type);

      sendResponse({
        success: true,
        message: `${type === 'all' ? '所有' : type}日志已清除`
      });
    } catch (error) {
      console.error('清除自动化日志失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 清理执行器
  async handleCleanupRunner(message, sendResponse) {
    try {
      const { tabId, executionId } = message;
      this.automationManager.cleanupRunner(tabId);

      sendResponse({
        success: true,
        message: '执行器已清理'
      });
    } catch (error) {
      console.error('清理执行器失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // ========== 高级功能消息处理方法 ==========

  // 生成智能选择器
  async handleGenerateSmartSelector(message, sendResponse) {
    try {
      const { tabId, elementInfo } = message;
      const result = await this.smartSelectorGenerator.generateFromElement(tabId, elementInfo);

      sendResponse(result);
    } catch (error) {
      console.error('生成智能选择器失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 测试选择器
  async handleTestSelector(message, sendResponse) {
    try {
      const { tabId, selector } = message;
      const result = await this.smartSelectorGenerator.testSelector(tabId, selector);

      sendResponse(result);
    } catch (error) {
      console.error('测试选择器失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取性能报告
  async handleGetPerformanceReport(message, sendResponse) {
    try {
      const { executionId } = message;
      const report = this.performanceMonitor.getPerformanceReport(executionId);

      sendResponse({
        success: true,
        report: report
      });
    } catch (error) {
      console.error('获取性能报告失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取高级配置
  async handleGetAdvancedConfig(message, sendResponse) {
    try {
      const config = this.advancedConfigManager.getCurrentConfig();
      const environments = Array.from(this.advancedConfigManager.environments.values());
      const profiles = Array.from(this.advancedConfigManager.profiles.values());

      sendResponse({
        success: true,
        config: config,
        environments: environments,
        profiles: profiles,
        currentEnvironment: this.advancedConfigManager.currentEnvironment,
        currentProfile: this.advancedConfigManager.currentProfile
      });
    } catch (error) {
      console.error('获取高级配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 更新高级配置
  async handleUpdateAdvancedConfig(message, sendResponse) {
    try {
      const { type, data } = message;

      switch (type) {
        case 'switchEnvironment':
          await this.advancedConfigManager.switchEnvironment(data.environmentId);
          break;
        case 'createEnvironment':
          await this.advancedConfigManager.createEnvironment(data);
          break;
        case 'updateEnvironment':
          await this.advancedConfigManager.updateEnvironment(data.id, data.updates);
          break;
        case 'deleteEnvironment':
          await this.advancedConfigManager.deleteEnvironment(data.environmentId);
          break;
        default:
          throw new Error(`未知的配置操作类型: ${type}`);
      }

      sendResponse({
        success: true,
        message: '配置更新成功'
      });
    } catch (error) {
      console.error('更新高级配置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // ========== 流程管理消息处理方法 ==========

  // 保存自动化流程
  async handleSaveAutomationFlow(message, sendResponse) {
    try {
      const { flow } = message;
      await storageManager.saveAutomationFlow(flow);

      sendResponse({
        success: true,
        message: '流程保存成功'
      });
    } catch (error) {
      console.error('保存自动化流程失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 删除自动化流程
  async handleDeleteAutomationFlow(message, sendResponse) {
    try {
      const { flowId } = message;
      await storageManager.deleteAutomationFlow(flowId);

      sendResponse({
        success: true,
        message: '流程删除成功'
      });
    } catch (error) {
      console.error('删除自动化流程失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 测试自动化流程
  async handleTestAutomationFlow(message, sendResponse) {
    try {
      const { flow } = message;

      // 使用自动化验证器验证流程
      const validator = new AutomationValidator();
      const result = validator.validateFlow(flow);

      if (result.valid) {
        sendResponse({
          success: true,
          message: '流程验证通过',
          result: result
        });
      } else {
        sendResponse({
          success: false,
          error: '流程验证失败: ' + result.errors.join(', '),
          result: result
        });
      }
    } catch (error) {
      console.error('测试自动化流程失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // ========== 选择器助手消息处理方法 ==========

  // 开始元素选择
  async handleStartElementSelection(message, sendResponse) {
    try {
      const { tabId } = message;

      // 向指定标签页发送开始选择消息
      chrome.tabs.sendMessage(tabId, {
        action: 'startElementSelection'
      }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          sendResponse({
            success: true,
            message: '元素选择已开始'
          });
        }
      });
    } catch (error) {
      console.error('开始元素选择失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 处理元素选择结果
  async handleElementSelected(message, sendResponse) {
    try {
      const { elementInfo, element, selectors } = message;

      let finalSelectors;
      let finalElement;

      // 检查是否有新的智能选择器格式
      if (elementInfo && elementInfo.smartSelectors) {
        console.log('使用智能选择器结果');
        finalSelectors = elementInfo.smartSelectors;
        finalElement = elementInfo;
      } else if (selectors) {
        console.log('使用传统选择器结果');
        finalSelectors = selectors;
        finalElement = element || elementInfo;
      } else {
        // 降级使用智能选择器生成器
        console.log('降级使用智能选择器生成器');
        const selectorResult = this.smartSelectorGenerator.generateSelectorsFromAnalysis({
          element: elementInfo,
          cssPath: elementInfo.cssPath,
          xpath: elementInfo.xpath,
          parentInfo: elementInfo.parentInfo
        });
        finalSelectors = selectorResult; // 修复：selectorResult本身就是选择器数组
        finalElement = elementInfo;
      }

      // 存储选择结果，供流程管理器使用
      this.lastSelectedElement = {
        element: finalElement,
        selectors: finalSelectors,
        recommendations: this.generateRecommendations(finalSelectors),
        position: elementInfo?.position || message.position,
        timestamp: Date.now()
      };

      // 通知侧边栏
      chrome.runtime.sendMessage({
        action: 'elementPickerResult',
        data: this.lastSelectedElement
      }).catch(() => {
        // 忽略没有监听器的错误
        console.log('侧边栏未打开，无法发送元素选择结果');
      });

      sendResponse({
        success: true,
        result: this.lastSelectedElement
      });
    } catch (error) {
      console.error('处理元素选择结果失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 生成选择器推荐
  generateRecommendations(selectors) {
    if (!selectors || selectors.length === 0) return [];

    const recommendations = [];

    // 找到最佳选择器
    const uniqueSelectors = selectors.filter(s => s.unique);
    const stableSelectors = selectors.filter(s => s.stable);

    if (uniqueSelectors.length > 0) {
      recommendations.push({
        type: 'best',
        selector: uniqueSelectors[0].selector,
        reason: '推荐使用：唯一且稳定的选择器'
      });
    }

    if (stableSelectors.length > 0 && stableSelectors[0] !== uniqueSelectors[0]) {
      recommendations.push({
        type: 'stable',
        selector: stableSelectors[0].selector,
        reason: '备选方案：稳定的选择器'
      });
    }

    return recommendations;
  }

  // 为匹配域名的标签页启动元素选择
  async handleStartElementSelectionForAllTabs(message, sendResponse) {
    try {
      const { targetDomain } = message;
      console.log('Background: 开始启动元素选择，目标域名:', targetDomain);

      // 获取所有标签页
      const tabs = await chrome.tabs.query({});
      console.log(`Background: 找到 ${tabs.length} 个标签页`);

      let successCount = 0;
      let errorCount = 0;
      let matchingTabs = [];

      // 为每个标签页发送启动消息
      for (const tab of tabs) {
        try {
          // 跳过chrome://等特殊页面
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
            console.log(`Background: 跳过特殊页面 ${tab.url}`);
            continue;
          }

          // 检查域名匹配
          let shouldActivate = false;

          if (targetDomain) {
            const tabUrl = new URL(tab.url);
            const tabDomain = tabUrl.hostname;

            // 支持通配符匹配
            const domainMatches = targetDomain === '*' ||
                                 tabDomain === targetDomain ||
                                 tabDomain.endsWith('.' + targetDomain) ||
                                 targetDomain.endsWith('.' + tabDomain);

            if (domainMatches) {
              shouldActivate = true;
              matchingTabs.push(tab);
              console.log(`Background: 域名匹配 ${tabDomain} (目标: ${targetDomain})`);
            } else {
              console.log(`Background: 跳过不匹配的域名 ${tabDomain} (目标: ${targetDomain})`);
              continue;
            }
          } else {
            // 如果没有指定目标域名，在所有标签页中启动
            shouldActivate = true;
            console.log(`Background: 未指定目标域名，在所有标签页中启动`);
          }

          if (!shouldActivate) {
            continue;
          }

          console.log(`Background: 向标签页 ${tab.id} (${tab.url}) 发送启动消息`);

          try {
            // 首先尝试发送消息
            await chrome.tabs.sendMessage(tab.id, {
              action: 'startElementSelection'
            });

            successCount++;
            console.log(`Background: 标签页 ${tab.id} 启动成功`);
          } catch (sendError) {
            console.log(`Background: 标签页 ${tab.id} 消息发送失败，尝试注入content script`);

            try {
              // 如果消息发送失败，尝试注入content script（包括所有iframe）
              await chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                files: ['content/automation-content.js', 'content/element-selector.js']
              });

              console.log(`Background: 标签页 ${tab.id} content script注入成功（包括iframe）`);

              // 移除初始化延迟，立即尝试启动
              // await new Promise(resolve => setTimeout(resolve, 200));

              // 再次尝试发送消息
              await chrome.tabs.sendMessage(tab.id, {
                action: 'startElementSelection'
              });

              successCount++;
              console.log(`Background: 标签页 ${tab.id} 注入后启动成功`);
            } catch (injectError) {
              errorCount++;
              console.log(`Background: 标签页 ${tab.id} 注入失败:`, injectError.message);
            }
          }
        } catch (error) {
          errorCount++;
          console.log(`Background: 标签页 ${tab.id} 处理失败:`, error.message);
        }
      }

      console.log(`Background: 完成启动，成功: ${successCount}, 失败: ${errorCount}, 匹配标签页: ${matchingTabs.length}`);

      // 根据结果提供不同的反馈
      let responseMessage;
      let success = true;

      if (targetDomain && matchingTabs.length === 0) {
        responseMessage = `未找到匹配域名 "${targetDomain}" 的标签页，请先打开目标网站`;
        success = false;
      } else if (successCount === 0) {
        responseMessage = '选择器助手启动失败，请刷新目标页面后重试';
        success = false;
      } else if (targetDomain) {
        responseMessage = `选择器助手已在 ${successCount} 个匹配域名 "${targetDomain}" 的标签页中激活`;
      } else {
        responseMessage = `选择器助手已在 ${successCount} 个标签页中激活`;
      }

      sendResponse({
        success: success,
        message: responseMessage,
        successCount,
        errorCount,
        matchingTabs: matchingTabs.length,
        targetDomain
      });
    } catch (error) {
      console.error('Background: 为所有标签页启动元素选择失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 继续自动化执行
  async handleContinueAutomation(message, sendResponse) {
    try {
      const { executionId } = message;
      console.log('Background: 收到continueAutomation消息，executionId:', executionId);

      // 通过automation manager继续执行
      if (this.automationManager) {
        // 检查当前步骤是否是人机验证步骤
        const currentStep = this.automationManager.getCurrentStep(executionId);
        console.log('Background: 当前步骤:', currentStep);

        if (currentStep && currentStep.type === 'humanVerification') {
          console.log('Background: 确认是人机验证步骤，用户点击继续执行，调用resumeExecution方法');
          // 对于人机验证步骤，需要调用resume方法来解决pauseResolver
          const result = await this.automationManager.resumeExecution(executionId);
          console.log('Background: resumeExecution结果:', result);
          sendResponse(result);
        } else {
          console.log('Background: 非人机验证步骤，调用continueExecution方法');
          // 其他步骤正常继续执行
          const result = await this.automationManager.continueExecution(executionId);
          sendResponse(result);
        }
      } else {
        console.log('Background: automation manager不可用');
        sendResponse({ success: false, error: 'Automation manager not available' });
      }
    } catch (error) {
      console.error('继续自动化执行失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 跳过验证步骤
  async handleSkipVerificationStep(message, sendResponse) {
    try {
      const { executionId } = message;

      // 通过automation manager跳过步骤
      if (this.automationManager) {
        const result = await this.automationManager.skipCurrentStep(executionId);
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'Automation manager not available' });
      }
    } catch (error) {
      console.error('跳过验证步骤失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 取消自动化执行
  async handleCancelAutomation(message, sendResponse) {
    try {
      const { executionId } = message;

      // 通过automation manager取消执行
      if (this.automationManager) {
        const result = await this.automationManager.cancelExecution(executionId);
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'Automation manager not available' });
      }
    } catch (error) {
      console.error('取消自动化执行失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 页面导航处理
  async handleNavigateToPage(message, sendResponse) {
    try {
      const { page } = message;

      // 向侧边栏发送导航消息
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'sidebarNavigate',
          page: page
        }).catch(() => {
          // 忽略错误，可能侧边栏还没有加载完成
        });
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error('页面导航失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取设置
  async handleGetSettings(message, sendResponse) {
    try {
      const result = await chrome.storage.local.get(['emailConfig', 'tempMailConfig', 'emailSettings']);
      let emailConfig = result.emailConfig;
      let tempMailConfig = result.tempMailConfig;

      // 如果存在旧格式数据，进行数据迁移
      if (result.emailSettings) {
        console.log('检测到旧格式设置数据，正在迁移...');
        const oldSettings = result.emailSettings;

        // 合并配置，优先使用用户保存的数据
        emailConfig = {
          domains: oldSettings.domains || (emailConfig && emailConfig.domains) || '',
          targetEmail: oldSettings.targetEmail || (emailConfig && emailConfig.targetEmail) || '',
          currentDomainIndex: (emailConfig && emailConfig.currentDomainIndex) || 0
        };

        tempMailConfig = {
          epin: oldSettings.pinCode || (tempMailConfig && tempMailConfig.epin) || ''
        };

        // 保存迁移后的数据
        await chrome.storage.local.set({
          emailConfig: emailConfig,
          tempMailConfig: tempMailConfig
        });

        // 删除旧数据
        await chrome.storage.local.remove(['emailSettings']);
        console.log('数据迁移完成');
      } else {
        // 如果没有旧数据，使用 storageManager 获取配置（包含默认值）
        emailConfig = await storageManager.getConfig('emailConfig');
        tempMailConfig = await storageManager.getConfig('tempMailConfig');
      }

      // 组合设置数据，匹配设置页面期望的格式
      const settings = {
        domains: emailConfig.domains || '',
        targetEmail: emailConfig.targetEmail || '',
        pinCode: tempMailConfig.epin || ''
      };

      console.log('handleGetSettings - emailConfig:', emailConfig);
      console.log('handleGetSettings - tempMailConfig:', tempMailConfig);
      console.log('handleGetSettings - 返回的settings:', settings);

      sendResponse({
        success: true,
        settings: settings
      });
    } catch (error) {
      console.error('获取设置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 保存设置
  async handleSaveSettings(message, sendResponse) {
    try {
      const { settings } = message;

      // 获取当前配置
      const result = await chrome.storage.local.get(['emailConfig', 'tempMailConfig']);
      const emailConfig = result.emailConfig || {};
      const tempMailConfig = result.tempMailConfig || {};

      // 更新邮箱配置
      const updatedEmailConfig = {
        ...emailConfig,
        domains: settings.domains || '',
        targetEmail: settings.targetEmail || ''
      };

      // 更新临时邮箱配置
      const updatedTempMailConfig = {
        ...tempMailConfig,
        epin: settings.pinCode || ''
      };

      // 保存到正确的键
      await chrome.storage.local.set({
        emailConfig: updatedEmailConfig,
        tempMailConfig: updatedTempMailConfig
      });

      sendResponse({ success: true });
    } catch (error) {
      console.error('保存设置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 重置设置
  async handleResetSettings(message, sendResponse) {
    try {
      // 使用 storageManager 重置配置，这会恢复默认值
      const success = await storageManager.resetConfig();
      sendResponse({ success: success });
    } catch (error) {
      console.error('重置设置失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }



  // 处理自动化日志
  async handleAutomationLog(message, sendResponse) {
    try {
      // 将日志保存到storage，侧边栏会监听storage变化
      const logEntry = {
        message: message.message,
        logType: message.logType,
        executionId: message.executionId,
        timestamp: message.timestamp,
        id: Date.now() + Math.random() // 唯一ID
      };

      // 获取现有日志
      const result = await chrome.storage.local.get(['automationLogs']);
      const logs = result.automationLogs || [];

      // 添加新日志
      logs.unshift(logEntry);

      // 只保留最近100条
      if (logs.length > 100) {
        logs.splice(100);
      }

      // 保存到storage
      await chrome.storage.local.set({ automationLogs: logs });

      sendResponse({ success: true });
    } catch (error) {
      console.error('处理自动化日志失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 停止自动化流程
  async handleStopAutomationFlow(message, sendResponse) {
    try {
      if (this.automationManager) {
        const result = await this.automationManager.stopAllFlows();
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'Automation manager not available' });
      }
    } catch (error) {
      console.error('停止自动化流程失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取自动化状态
  async handleGetAutomationStatus(message, sendResponse) {
    try {
      if (this.automationManager) {
        const status = await this.automationManager.getGlobalStatus();
        sendResponse({ success: true, status: status });
      } else {
        sendResponse({ success: true, status: { isRunning: false } });
      }
    } catch (error) {
      console.error('获取自动化状态失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 启动元素选择器
  async handleStartElementPicker(message, sendResponse) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        sendResponse({ success: false, error: '没有找到活动标签页' });
        return;
      }

      const result = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startElementPicker'
      });

      sendResponse(result);
    } catch (error) {
      console.error('启动元素选择器失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 停止元素选择器
  async handleStopElementPicker(message, sendResponse) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        sendResponse({ success: false, error: '没有找到活动标签页' });
        return;
      }

      const result = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stopElementPicker'
      });

      sendResponse(result);
    } catch (error) {
      console.error('停止元素选择器失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }



  // 获取最后选择的元素
  getLastSelectedElement() {
    return this.lastSelectedElement || null;
  }
}

// 创建后台服务实例
const backgroundService = new BackgroundService();
