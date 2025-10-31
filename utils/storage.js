// 存储管理工具
class StorageManager {
  constructor() {
    this.defaultConfig = {
      emailConfig: {
        domains: "demoan1.com,demoan2.com,demoan3.com",
        targetEmail: "abcd123@mailto.plus",
        currentDomainIndex: 0,
        generationMode: "nameNumber",
        domainSelectionMode: "random",        // 域名选择模式：random/roundRobin/smart
        domainSelectionHistory: [],           // 智能选择历史记录
        avoidRepeatCount: 3,                  // 智能选择避免重复次数
        randomStringConfig: {
          minLength: 6,
          maxLength: 15
        },
        regexPatternConfig: {
          pattern: "[a-z]{3,8}\\d{2,4}",
          maxLength: 20
        }
      },
      tempMailConfig: {
        epin: ""
      },
      historyData: {
        lastEmail: null,
        lastVerificationCode: null,
        emailHistory: [],
        codeHistory: [],
        mailContentHistory: [],
        maxEmailHistory: 1000, // 修改：提升邮箱历史记录限制到1000条
        maxCodeHistory: 10,
        maxMailContentHistory: 1000
      },
      automationConfig: {
        flows: [],
        executionStates: {}
      },
      proxyConfig: {
        enabled: false,
        type: 'http',        // 'http' | 'socks5'
        host: '',
        port: '',
        username: '',        // 可选
        password: ''         // 可选
      }
    };
  }

  // 获取配置项
  async getConfig(key = null) {
    try {
      const result = await chrome.storage.local.get(null);
      const config = { ...this.defaultConfig, ...result };

      if (key) {
        return config[key] || this.defaultConfig[key];
      }
      return config;
    } catch (error) {
      console.error('获取配置失败:', error);
      return key ? this.defaultConfig[key] : this.defaultConfig;
    }
  }

  // 设置配置项
  async setConfig(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('设置配置失败:', error);
      return false;
    }
  }

  // 更新配置项（部分更新）
  async updateConfig(key, updates) {
    try {
      const currentConfig = await this.getConfig(key);
      const updatedConfig = { ...currentConfig, ...updates };
      await this.setConfig(key, updatedConfig);
      return true;
    } catch (error) {
      console.error('更新配置失败:', error);
      return false;
    }
  }

  // 重置配置
  async resetConfig() {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.local.set(this.defaultConfig);
      return true;
    } catch (error) {
      console.error('重置配置失败:', error);
      return false;
    }
  }

  // 保存最新邮箱
  async saveLastEmail(email) {
    try {
      const historyData = await this.getConfig('historyData');
      historyData.lastEmail = email;
      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('保存最新邮箱失败:', error);
      return false;
    }
  }

  // 保存最新验证码
  async saveLastCode(code) {
    try {
      const historyData = await this.getConfig('historyData');
      historyData.lastVerificationCode = code;
      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('保存最新验证码失败:', error);
      return false;
    }
  }

  // 添加邮箱到历史记录
  async addEmailToHistory(email) {
    try {
      const historyData = await this.getConfig('historyData');
      const emailItem = {
        email: email,
        timestamp: Date.now(),
        id: this.generateId(),
        isFavorite: false, // 新增：收藏状态，默认为false
        note: "" // 新增：备注信息，默认为空字符串
      };

      // 检查是否已存在
      const existingIndex = historyData.emailHistory.findIndex(item => item.email === email);
      if (existingIndex !== -1) {
        historyData.emailHistory.splice(existingIndex, 1);
      }

      // 添加到开头
      historyData.emailHistory.unshift(emailItem);

      // 智能删除逻辑：保持最大数量限制，优先删除非收藏项
      if (historyData.emailHistory.length > historyData.maxEmailHistory) {
        this._smartTrimEmailHistory(historyData);
      }

      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('添加邮箱历史失败:', error);
      return false;
    }
  }

  // 添加验证码到历史记录
  async addCodeToHistory(code, email) {
    try {
      const historyData = await this.getConfig('historyData');
      const codeItem = {
        code: code,
        email: email,
        timestamp: Date.now(),
        id: this.generateId()
      };

      // 添加到开头
      historyData.codeHistory.unshift(codeItem);

      // 保持最大数量限制
      if (historyData.codeHistory.length > historyData.maxCodeHistory) {
        historyData.codeHistory = historyData.codeHistory.slice(0, historyData.maxCodeHistory);
      }

      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('添加验证码历史失败:', error);
      return false;
    }
  }

  // 删除单个邮箱历史记录
  async deleteEmailHistoryItem(id) {
    try {
      const historyData = await this.getConfig('historyData');
      const originalLength = historyData.emailHistory.length;

      // 根据ID删除记录
      historyData.emailHistory = historyData.emailHistory.filter(item => item.id !== id);

      // 检查是否删除成功
      if (historyData.emailHistory.length < originalLength) {
        await this.setConfig('historyData', historyData);
        return true;
      } else {
        return false; // 没有找到对应的记录
      }
    } catch (error) {
      console.error('删除邮箱历史记录失败:', error);
      return false;
    }
  }

  // 获取邮箱历史记录
  async getEmailHistory() {
    try {
      const historyData = await this.getConfig('historyData');
      return historyData.emailHistory || [];
    } catch (error) {
      console.error('获取邮箱历史失败:', error);
      return [];
    }
  }

  // 获取验证码历史记录
  async getCodeHistory() {
    try {
      const historyData = await this.getConfig('historyData');
      return historyData.codeHistory || [];
    } catch (error) {
      console.error('获取验证码历史失败:', error);
      return [];
    }
  }

  // 添加邮件内容到历史记录
  async addMailContentToHistory(sourceEmail, mailContent, verificationCode = null) {
    try {
      const historyData = await this.getConfig('historyData');
      const mailItem = {
        id: this.generateId(),
        sourceEmail: sourceEmail,
        mailContent: {
          subject: mailContent.subject || "",
          text: mailContent.text || "",
          html: mailContent.html || "",
          mailId: mailContent.mailId || "",
          originalDate: mailContent.originalDate || null,           // 邮件原始时间戳
          originalDateString: mailContent.originalDateString || "", // 原始日期字符串
          messageId: mailContent.messageId || ""                    // 邮件消息ID
        },
        timestamp: Date.now(),
        verificationCode: verificationCode,
        isFavorite: false,    // 新增：收藏状态
        note: ''              // 新增：备注内容
      };

      // 确保 mailContentHistory 数组存在
      if (!historyData.mailContentHistory) {
        historyData.mailContentHistory = [];
      }

      // 添加到开头
      historyData.mailContentHistory.unshift(mailItem);

      // 确保 maxMailContentHistory 存在
      if (!historyData.maxMailContentHistory) {
        historyData.maxMailContentHistory = 1000;
      }

      // 智能删除逻辑：保持最大数量限制，优先删除非收藏项
      if (historyData.mailContentHistory.length > historyData.maxMailContentHistory) {
        this._smartTrimMailContentHistory(historyData);
      }

      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('添加邮件内容历史失败:', error);
      return false;
    }
  }

  // 获取邮件内容历史记录
  async getMailContentHistory() {
    try {
      const historyData = await this.getConfig('historyData');
      return historyData.mailContentHistory || [];
    } catch (error) {
      console.error('获取邮件内容历史失败:', error);
      return [];
    }
  }

  // 删除单个邮件内容历史记录
  async deleteMailContentHistoryItem(id) {
    try {
      const historyData = await this.getConfig('historyData');
      const originalLength = historyData.mailContentHistory.length;

      // 根据ID删除记录
      historyData.mailContentHistory = historyData.mailContentHistory.filter(item => item.id !== id);

      // 检查是否删除成功
      if (historyData.mailContentHistory.length < originalLength) {
        await this.setConfig('historyData', historyData);
        return true;
      } else {
        return false; // 没有找到对应的记录
      }
    } catch (error) {
      console.error('删除邮件内容历史记录失败:', error);
      return false;
    }
  }

  // 清除历史记录
  async clearHistory(type) {
    try {
      const historyData = await this.getConfig('historyData');
      
      if (type === 'email') {
        historyData.emailHistory = [];
      } else if (type === 'code') {
        historyData.codeHistory = [];
      } else if (type === 'mailContent') {
        historyData.mailContentHistory = [];
      } else if (type === 'all') {
        historyData.emailHistory = [];
        historyData.codeHistory = [];
        historyData.mailContentHistory = [];
        historyData.lastEmail = null;
        historyData.lastVerificationCode = null;
      }

      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('清除历史记录失败:', error);
      return false;
    }
  }

  // 获取上次邮箱
  async getLastEmail() {
    try {
      const historyData = await this.getConfig('historyData');
      return historyData.lastEmail;
    } catch (error) {
      console.error('获取上次邮箱失败:', error);
      return null;
    }
  }

  // 获取上次验证码
  async getLastCode() {
    try {
      const historyData = await this.getConfig('historyData');
      return historyData.lastVerificationCode;
    } catch (error) {
      console.error('获取上次验证码失败:', error);
      return null;
    }
  }

  // 智能删除邮箱历史记录：优先删除非收藏项
  _smartTrimEmailHistory(historyData) {
    const maxHistory = historyData.maxEmailHistory;
    if (historyData.emailHistory.length <= maxHistory) {
      return; // 无需删除
    }

    // 分离收藏和非收藏项
    const favoriteItems = historyData.emailHistory.filter(item => item.isFavorite);
    const nonFavoriteItems = historyData.emailHistory.filter(item => !item.isFavorite);

    // 如果收藏项数量已经超过限制，按时间戳删除最旧的收藏项
    if (favoriteItems.length >= maxHistory) {
      favoriteItems.sort((a, b) => b.timestamp - a.timestamp); // 按时间戳降序排列
      historyData.emailHistory = favoriteItems.slice(0, maxHistory);
      return;
    }

    // 计算可保留的非收藏项数量
    const availableSlots = maxHistory - favoriteItems.length;

    // 按时间戳排序非收藏项，保留最新的
    nonFavoriteItems.sort((a, b) => b.timestamp - a.timestamp);
    const keptNonFavoriteItems = nonFavoriteItems.slice(0, availableSlots);

    // 合并收藏项和保留的非收藏项，按时间戳排序
    historyData.emailHistory = [...favoriteItems, ...keptNonFavoriteItems]
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // 智能删除邮件内容历史记录：优先删除非收藏项
  _smartTrimMailContentHistory(historyData) {
    const maxHistory = historyData.maxMailContentHistory;
    if (historyData.mailContentHistory.length <= maxHistory) {
      return; // 无需删除
    }

    // 分离收藏和非收藏项
    const favoriteItems = historyData.mailContentHistory.filter(item => item.isFavorite);
    const nonFavoriteItems = historyData.mailContentHistory.filter(item => !item.isFavorite);

    // 如果收藏项数量已经超过限制，按时间戳删除最旧的收藏项
    if (favoriteItems.length >= maxHistory) {
      favoriteItems.sort((a, b) => b.timestamp - a.timestamp); // 按时间戳降序排列
      historyData.mailContentHistory = favoriteItems.slice(0, maxHistory);
      return;
    }

    // 计算可保留的非收藏项数量
    const availableSlots = maxHistory - favoriteItems.length;

    // 按时间戳排序非收藏项，保留最新的
    nonFavoriteItems.sort((a, b) => b.timestamp - a.timestamp);
    const keptNonFavoriteItems = nonFavoriteItems.slice(0, availableSlots);

    // 合并收藏项和保留的非收藏项，按时间戳排序
    historyData.mailContentHistory = [...favoriteItems, ...keptNonFavoriteItems]
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // 设置邮箱收藏状态
  async setEmailFavorite(id, isFavorite, note = "") {
    try {
      const historyData = await this.getConfig('historyData');
      const emailIndex = historyData.emailHistory.findIndex(item => item.id === id);

      if (emailIndex === -1) {
        return false; // 未找到对应记录
      }

      // 更新收藏状态和备注
      historyData.emailHistory[emailIndex].isFavorite = isFavorite;
      historyData.emailHistory[emailIndex].note = note || "";

      await this.setConfig('historyData', historyData);
      return true;
    } catch (error) {
      console.error('设置邮箱收藏状态失败:', error);
      return false;
    }
  }

  // 搜索邮箱历史记录
  async searchEmailHistory(keyword) {
    try {
      const historyData = await this.getConfig('historyData');
      if (!keyword || keyword.trim() === "") {
        return historyData.emailHistory || [];
      }

      const searchTerm = keyword.toLowerCase().trim();
      return historyData.emailHistory.filter(item => {
        const emailMatch = item.email.toLowerCase().includes(searchTerm);
        const noteMatch = item.note && item.note.toLowerCase().includes(searchTerm);
        return emailMatch || noteMatch;
      });
    } catch (error) {
      console.error('搜索邮箱历史失败:', error);
      return [];
    }
  }

  // 搜索邮件内容历史记录
  async searchMailContentHistory(keyword) {
    try {
      const historyData = await this.getConfig('historyData');
      if (!keyword || keyword.trim() === "") {
        return historyData.mailContentHistory || [];
      }

      const searchTerm = keyword.toLowerCase().trim();
      return historyData.mailContentHistory.filter(item => {
        const subjectMatch = item.mailContent.subject && item.mailContent.subject.toLowerCase().includes(searchTerm);
        const emailMatch = item.sourceEmail.toLowerCase().includes(searchTerm);
        const noteMatch = item.note && item.note.toLowerCase().includes(searchTerm);
        const codeMatch = item.verificationCode && item.verificationCode.toLowerCase().includes(searchTerm);
        return subjectMatch || emailMatch || noteMatch || codeMatch;
      });
    } catch (error) {
      console.error('搜索邮件内容历史失败:', error);
      return [];
    }
  }

  // 设置邮件内容收藏状态
  async setMailContentFavorite(id, isFavorite, note = '') {
    try {
      const historyData = await this.getConfig('historyData');
      const mailContentHistory = historyData.mailContentHistory || [];

      const itemIndex = mailContentHistory.findIndex(item => item.id === id);
      if (itemIndex === -1) {
        console.error('未找到指定的邮件内容记录');
        return false;
      }

      // 更新收藏状态和备注
      mailContentHistory[itemIndex].isFavorite = isFavorite;
      mailContentHistory[itemIndex].note = note;

      // 保存更新后的数据
      historyData.mailContentHistory = mailContentHistory;
      await this.setConfig('historyData', historyData);

      console.log(`邮件内容${isFavorite ? '收藏' : '取消收藏'}成功`);
      return true;
    } catch (error) {
      console.error('设置邮件内容收藏状态失败:', error);
      return false;
    }
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // 导出配置
  async exportConfig() {
    try {
      const config = await this.getConfig();
      return JSON.stringify(config, null, 2);
    } catch (error) {
      console.error('导出配置失败:', error);
      return null;
    }
  }

  // 导入配置
  async importConfig(configData) {
    try {
      const config = JSON.parse(configData);
      await chrome.storage.local.clear();
      await chrome.storage.local.set(config);
      return true;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }

  // ========== 自动化配置相关方法 ==========

  // 获取自动化流程列表
  async getAutomationFlows() {
    try {
      const automationConfig = await this.getConfig('automationConfig');
      return automationConfig.flows || [];
    } catch (error) {
      console.error('获取自动化流程失败:', error);
      return [];
    }
  }

  // 保存自动化流程
  async saveAutomationFlow(flow) {
    try {
      const automationConfig = await this.getConfig('automationConfig');
      const flows = automationConfig.flows || [];

      // 检查是否已存在
      const existingIndex = flows.findIndex(f => f.id === flow.id);

      if (existingIndex !== -1) {
        // 更新现有流程
        flows[existingIndex] = {
          ...flow,
          updatedAt: Date.now()
        };
      } else {
        // 添加新流程
        flows.push({
          ...flow,
          id: flow.id || this.generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      automationConfig.flows = flows;
      await this.setConfig('automationConfig', automationConfig);
      return true;
    } catch (error) {
      console.error('保存自动化流程失败:', error);
      return false;
    }
  }

  // 删除自动化流程
  async deleteAutomationFlow(flowId) {
    try {
      const automationConfig = await this.getConfig('automationConfig');
      const flows = automationConfig.flows || [];

      automationConfig.flows = flows.filter(f => f.id !== flowId);
      await this.setConfig('automationConfig', automationConfig);
      return true;
    } catch (error) {
      console.error('删除自动化流程失败:', error);
      return false;
    }
  }

  // 获取自动化流程
  async getAutomationFlow(flowId) {
    try {
      const flows = await this.getAutomationFlows();
      return flows.find(f => f.id === flowId) || null;
    } catch (error) {
      console.error('获取自动化流程失败:', error);
      return null;
    }
  }

  // 保存执行状态
  async saveExecutionState(executionId, state) {
    try {
      const automationConfig = await this.getConfig('automationConfig');
      automationConfig.executionStates = automationConfig.executionStates || {};
      automationConfig.executionStates[executionId] = {
        ...state,
        updatedAt: Date.now()
      };
      await this.setConfig('automationConfig', automationConfig);
      return true;
    } catch (error) {
      console.error('保存执行状态失败:', error);
      return false;
    }
  }

  // 获取执行状态
  async getExecutionState(executionId) {
    try {
      const automationConfig = await this.getConfig('automationConfig');
      return automationConfig.executionStates?.[executionId] || null;
    } catch (error) {
      console.error('获取执行状态失败:', error);
      return null;
    }
  }

  // 清除执行状态
  async clearExecutionState(executionId) {
    try {
      const automationConfig = await this.getConfig('automationConfig');
      if (automationConfig.executionStates) {
        delete automationConfig.executionStates[executionId];
        await this.setConfig('automationConfig', automationConfig);
      }
      return true;
    } catch (error) {
      console.error('清除执行状态失败:', error);
      return false;
    }
  }

  // 获取匹配域名的自动化流程
  async getFlowsForDomain(domain) {
    try {
      const flows = await this.getAutomationFlows();
      return flows.filter(flow => {
        if (!flow.enabled) return false;
        if (flow.domain === '*') return true;
        if (flow.domain === domain) return true;
        // 支持通配符匹配
        if (flow.domain.includes('*')) {
          const regex = new RegExp(flow.domain.replace(/\*/g, '.*'));
          return regex.test(domain);
        }
        return false;
      });
    } catch (error) {
      console.error('获取域名匹配流程失败:', error);
      return [];
    }
  }

  // ========== 代理配置相关方法 ==========

  // 获取代理配置
  async getProxyConfig() {
    try {
      const config = await this.getConfig();
      return config.proxyConfig || this.defaultConfig.proxyConfig;
    } catch (error) {
      console.error('获取代理配置失败:', error);
      return this.defaultConfig.proxyConfig;
    }
  }

  // 保存代理配置
  async setProxyConfig(proxyConfig) {
    try {
      await this.setConfig('proxyConfig', proxyConfig);
      return true;
    } catch (error) {
      console.error('保存代理配置失败:', error);
      return false;
    }
  }
}

// 导出单例
const storageManager = new StorageManager();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = storageManager;
} else if (typeof window !== 'undefined') {
  globalThis.storageManager = storageManager;
} else {
  // Service Worker环境
  globalThis.storageManager = storageManager;
}
