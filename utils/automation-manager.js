// 自动化流程管理器
class AutomationManager {
  constructor(backgroundInstance = null) {
    this.activeRunners = new Map(); // 存储活跃的执行器
    this.messageHandlers = new Map(); // 消息处理器
    this.backgroundInstance = backgroundInstance; // 保存background实例的引用
    this.init();
  }

  // 日志处理器，将日志保存到storage供侧边栏使用
  async handleLog(logData) {
    try {
      const logEntry = {
        message: logData.message,
        logType: logData.logType,
        executionId: logData.executionId,
        timestamp: logData.timestamp,
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
    } catch (error) {
      console.error('处理自动化日志失败:', error);
    }
  }

  async init() {
    // 初始化消息处理器
    this.setupMessageHandlers();
    console.log('AutomationManager 初始化完成');
  }

  // 设置消息处理器
  setupMessageHandlers() {
    this.messageHandlers.set('startAutomationFlow', this.handleStartFlow.bind(this));
    this.messageHandlers.set('pauseAutomationFlow', this.handlePauseFlow.bind(this));
    this.messageHandlers.set('resumeAutomationFlow', this.handleResumeFlow.bind(this));
    this.messageHandlers.set('stopAutomationFlow', this.handleStopFlow.bind(this));
    this.messageHandlers.set('getExecutionState', this.handleGetExecutionState.bind(this));
    this.messageHandlers.set('getAutomationFlows', this.handleGetFlows.bind(this));
    this.messageHandlers.set('saveAutomationFlow', this.handleSaveFlow.bind(this));
    this.messageHandlers.set('deleteAutomationFlow', this.handleDeleteFlow.bind(this));
    this.messageHandlers.set('testAutomationFlow', this.handleTestFlow.bind(this));
  }

  // 处理消息
  async handleMessage(message, sender, sendResponse) {
    const handler = this.messageHandlers.get(message.action);
    if (handler) {
      try {
        await handler(message, sender, sendResponse);
      } catch (error) {
        console.error(`处理消息 ${message.action} 失败:`, error);
        sendResponse({ success: false, error: error.message });
      }
    } else {
      sendResponse({ success: false, error: `未知的自动化操作: ${message.action}` });
    }
  }

  // 开始自动化流程
  async handleStartFlow(message, sender, sendResponse) {
    const { flowId, tabId } = message;
    
    if (!flowId) {
      sendResponse({ success: false, error: '缺少流程ID' });
      return;
    }

    // 检查是否已有活跃的执行器
    if (this.activeRunners.has(tabId)) {
      sendResponse({ success: false, error: '该标签页已有正在执行的自动化流程' });
      return;
    }

    try {
      // 获取流程配置
      const flow = await storageManager.getAutomationFlow(flowId);
      if (!flow) {
        sendResponse({ success: false, error: '流程配置不存在' });
        return;
      }

      // 确保content script已注入到目标标签页
      await this.ensureContentScriptInjected(tabId);

      // 创建执行器，传入日志处理器和background实例
      const runner = new AutomationRunner(flow, tabId, false, this.handleLog.bind(this), this.backgroundInstance);
      this.activeRunners.set(tabId, runner);

      // 开始执行
      runner.start().catch(error => {
        console.error('自动化流程执行失败:', error);
        this.activeRunners.delete(tabId);
      });

      sendResponse({
        success: true,
        executionId: runner.executionId,
        message: '自动化流程已开始'
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 暂停自动化流程
  async handlePauseFlow(message, sender, sendResponse) {
    const { tabId } = message;
    const runner = this.activeRunners.get(tabId);
    
    if (!runner) {
      sendResponse({ success: false, error: '没有找到活跃的自动化流程' });
      return;
    }

    runner.pause();
    sendResponse({ success: true, message: '自动化流程已暂停' });
  }

  // 恢复自动化流程
  async handleResumeFlow(message, sender, sendResponse) {
    const { tabId } = message;
    const runner = this.activeRunners.get(tabId);
    
    if (!runner) {
      sendResponse({ success: false, error: '没有找到活跃的自动化流程' });
      return;
    }

    runner.resume();
    sendResponse({ success: true, message: '自动化流程已恢复' });
  }

  // 停止自动化流程
  async handleStopFlow(message, sender, sendResponse) {
    const { tabId } = message;
    const runner = this.activeRunners.get(tabId);
    
    if (!runner) {
      sendResponse({ success: false, error: '没有找到活跃的自动化流程' });
      return;
    }

    runner.stop();
    this.activeRunners.delete(tabId);
    sendResponse({ success: true, message: '自动化流程已停止' });
  }

  // 获取执行状态
  async handleGetExecutionState(message, sender, sendResponse) {
    const { tabId, executionId } = message;
    
    try {
      let state = null;
      
      // 先检查活跃的执行器
      const runner = this.activeRunners.get(tabId);
      if (runner && runner.executionId === executionId) {
        state = runner.getState();
      } else {
        // 从存储中获取
        state = await storageManager.getExecutionState(executionId);
      }
      
      sendResponse({ success: true, state: state });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取自动化流程列表
  async handleGetFlows(message, sender, sendResponse) {
    try {
      const flows = await storageManager.getAutomationFlows();
      sendResponse({ success: true, flows: flows });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 保存自动化流程
  async handleSaveFlow(message, sender, sendResponse) {
    try {
      const { flow } = message;
      const success = await storageManager.saveAutomationFlow(flow);
      sendResponse({ success: success, message: success ? '流程保存成功' : '流程保存失败' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 删除自动化流程
  async handleDeleteFlow(message, sender, sendResponse) {
    try {
      const { flowId } = message;
      const success = await storageManager.deleteAutomationFlow(flowId);
      sendResponse({ success: success, message: success ? '流程删除成功' : '流程删除失败' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 测试自动化流程
  async handleTestFlow(message, sender, sendResponse) {
    try {
      const { flow, tabId } = message;
      
      // 创建临时执行器进行测试
      const runner = new AutomationRunner(flow, tabId, true, this.handleLog.bind(this)); // 测试模式
      const result = await runner.validate();
      
      sendResponse({ 
        success: true, 
        result: result,
        message: result.valid ? '流程配置有效' : '流程配置存在问题'
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 清理已完成的执行器
  cleanupRunner(tabId) {
    this.activeRunners.delete(tabId);
  }

  // 获取活跃执行器数量
  getActiveRunnersCount() {
    return this.activeRunners.size;
  }

  // 获取指定标签页的执行器
  getRunner(tabId) {
    return this.activeRunners.get(tabId);
  }

  // 确保content script已注入
  async ensureContentScriptInjected(tabId) {
    try {
      // 首先尝试发送ping消息检查content script是否存在
      const pingResult = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(false); // content script不存在
          } else {
            resolve(true); // content script存在
          }
        });
      });

      if (!pingResult) {
        console.log(`标签页 ${tabId} 没有content script，开始注入...`);

        // 注入content script
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content/automation-content.js']
        });

        console.log(`标签页 ${tabId} content script注入成功`);

        // 等待一小段时间让content script初始化
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`注入content script到标签页 ${tabId} 失败:`, error);
      throw new Error(`无法注入content script: ${error.message}`);
    }
  }

  // 继续执行（用于人机验证后继续）
  async continueExecution(executionId) {
    try {
      // 查找对应的执行器
      for (const [tabId, runner] of this.activeRunners) {
        if (runner.executionId === executionId) {
          runner.continueExecution();
          return { success: true, message: '已继续执行' };
        }
      }

      return { success: false, error: '未找到对应的执行器' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 恢复执行（用于人机验证步骤的resume）
  async resumeExecution(executionId) {
    console.log('AutomationManager: resumeExecution被调用，executionId:', executionId);
    console.log('AutomationManager: 当前活跃的runners数量:', this.activeRunners.size);

    try {
      // 查找对应的执行器
      for (const [tabId, runner] of this.activeRunners) {
        console.log('AutomationManager: 检查runner，tabId:', tabId, 'executionId:', runner.executionId);
        if (runner.executionId === executionId) {
          console.log('AutomationManager: 找到匹配的runner，调用resume()');
          runner.resume();
          console.log('AutomationManager: runner.resume()调用完成');
          return { success: true, message: '已恢复执行' };
        }
      }

      console.log('AutomationManager: 未找到匹配的执行器');
      return { success: false, error: '未找到对应的执行器' };
    } catch (error) {
      console.error('AutomationManager: resumeExecution失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 跳过当前步骤
  async skipCurrentStep(executionId) {
    try {
      // 查找对应的执行器
      for (const [tabId, runner] of this.activeRunners) {
        if (runner.executionId === executionId) {
          runner.skipCurrentStep();
          return { success: true, message: '已跳过当前步骤' };
        }
      }

      return { success: false, error: '未找到对应的执行器' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 获取当前步骤信息
  getCurrentStep(executionId) {
    try {
      // 查找对应的执行器
      for (const [tabId, runner] of this.activeRunners) {
        if (runner.executionId === executionId) {
          const state = runner.getState();
          if (state.currentStepIndex < runner.config.steps.length) {
            return runner.config.steps[state.currentStepIndex];
          }
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('获取当前步骤失败:', error);
      return null;
    }
  }

  // 取消执行
  async cancelExecution(executionId) {
    try {
      // 查找对应的执行器
      for (const [tabId, runner] of this.activeRunners) {
        if (runner.executionId === executionId) {
          runner.stop();
          this.activeRunners.delete(tabId);
          return { success: true, message: '已取消执行' };
        }
      }

      return { success: false, error: '未找到对应的执行器' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 停止所有流程
  async stopAllFlows() {
    try {
      let stoppedCount = 0;
      for (const [tabId, runner] of this.activeRunners) {
        runner.stop();
        this.activeRunners.delete(tabId);
        stoppedCount++;
      }

      return {
        success: true,
        message: `已停止 ${stoppedCount} 个运行中的流程`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 获取全局状态
  async getGlobalStatus() {
    try {
      if (this.activeRunners.size === 0) {
        return { isRunning: false };
      }

      // 获取第一个运行中的流程状态
      for (const [tabId, runner] of this.activeRunners) {
        const state = runner.getState();
        return {
          isRunning: state.status === 'running' || state.status === 'paused',
          isPaused: state.status === 'paused',
          currentStep: state.currentStepIndex,
          totalSteps: state.totalSteps,
          executionId: state.executionId
        };
      }

      return { isRunning: false };
    } catch (error) {
      return { isRunning: false, error: error.message };
    }
  }
}

// 导出单例
const automationManager = new AutomationManager();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = automationManager;
} else if (typeof window !== 'undefined') {
  globalThis.automationManager = automationManager;
} else {
  // Service Worker环境
  globalThis.automationManager = automationManager;
}
