// 自动化日志记录和错误处理系统
class AutomationLogger {
  constructor() {
    this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
    this.maxLogEntries = 1000;
    this.logs = [];
    this.errorHandlers = new Map();
    this.init();
  }

  async init() {
    // 从存储中恢复日志级别设置
    try {
      if (typeof storageManager !== 'undefined') {
        const config = await storageManager.getConfig('automationConfig');
        this.logLevel = config.logLevel || 'INFO';
      }
    } catch (error) {
      console.warn('无法加载日志配置:', error);
    }

    // 设置默认错误处理器
    this.setupDefaultErrorHandlers();
  }

  // 设置默认错误处理器
  setupDefaultErrorHandlers() {
    // 网络错误处理器
    this.errorHandlers.set('NetworkError', (error, context) => {
      return {
        type: 'network',
        message: '网络连接失败，请检查网络连接',
        suggestion: '请检查网络连接后重试',
        retryable: true,
        retryDelay: 5000
      };
    });

    // 元素未找到错误处理器
    this.errorHandlers.set('ElementNotFound', (error, context) => {
      return {
        type: 'element',
        message: `未找到页面元素: ${context.selector}`,
        suggestion: '页面可能还在加载，或者选择器需要更新',
        retryable: true,
        retryDelay: 2000
      };
    });

    // 超时错误处理器
    this.errorHandlers.set('TimeoutError', (error, context) => {
      return {
        type: 'timeout',
        message: '操作超时',
        suggestion: '页面响应较慢，建议增加超时时间或检查网络',
        retryable: true,
        retryDelay: 3000
      };
    });

    // 权限错误处理器
    this.errorHandlers.set('PermissionError', (error, context) => {
      return {
        type: 'permission',
        message: '权限不足，无法执行操作',
        suggestion: '请检查扩展权限设置',
        retryable: false
      };
    });

    // 验证码获取错误处理器
    this.errorHandlers.set('VerificationCodeError', (error, context) => {
      return {
        type: 'verification',
        message: '验证码获取失败',
        suggestion: '请检查邮箱配置或手动获取验证码',
        retryable: true,
        retryDelay: 10000
      };
    });
  }

  // 记录日志
  log(level, message, context = {}) {
    const logEntry = {
      timestamp: Date.now(),
      level: level,
      message: message,
      context: context,
      id: this.generateLogId()
    };

    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    // 添加到内存日志
    this.logs.unshift(logEntry);

    // 保持最大日志数量
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(0, this.maxLogEntries);
    }

    // 输出到控制台
    this.outputToConsole(logEntry);

    // 持久化重要日志
    if (level === 'ERROR' || level === 'WARN') {
      this.persistLog(logEntry);
    }
  }

  // 检查是否应该记录日志
  shouldLog(level) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  // 输出到控制台
  outputToConsole(logEntry) {
    const { level, message, context } = logEntry;
    const timestamp = new Date(logEntry.timestamp).toISOString();
    
    switch (level) {
      case 'DEBUG':
        console.debug(`[${timestamp}] [AUTOMATION-DEBUG] ${message}`, context);
        break;
      case 'INFO':
        console.info(`[${timestamp}] [AUTOMATION-INFO] ${message}`, context);
        break;
      case 'WARN':
        console.warn(`[${timestamp}] [AUTOMATION-WARN] ${message}`, context);
        break;
      case 'ERROR':
        console.error(`[${timestamp}] [AUTOMATION-ERROR] ${message}`, context);
        break;
    }
  }

  // 持久化日志
  async persistLog(logEntry) {
    try {
      if (typeof storageManager !== 'undefined') {
        const config = await storageManager.getConfig('automationConfig');
        config.persistentLogs = config.persistentLogs || [];

        config.persistentLogs.unshift(logEntry);

        // 保持最大持久化日志数量
        if (config.persistentLogs.length > 100) {
          config.persistentLogs = config.persistentLogs.slice(0, 100);
        }

        await storageManager.setConfig('automationConfig', config);
      }
    } catch (error) {
      console.error('持久化日志失败:', error);
    }
  }

  // 便捷方法
  debug(message, context) { this.log('DEBUG', message, context); }
  info(message, context) { this.log('INFO', message, context); }
  warn(message, context) { this.log('WARN', message, context); }
  error(message, context) { this.log('ERROR', message, context); }

  // 处理错误
  handleError(error, context = {}) {
    // 记录错误日志
    this.error(error.message, { error: error, context: context });

    // 尝试识别错误类型
    const errorType = this.identifyErrorType(error, context);
    
    // 获取错误处理器
    const handler = this.errorHandlers.get(errorType);
    
    if (handler) {
      const errorInfo = handler(error, context);
      this.info(`错误处理建议: ${errorInfo.suggestion}`, errorInfo);
      return errorInfo;
    }

    // 默认错误处理
    return {
      type: 'unknown',
      message: error.message,
      suggestion: '发生未知错误，请查看详细日志',
      retryable: false
    };
  }

  // 识别错误类型
  identifyErrorType(error, context) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'NetworkError';
    }
    
    if (message.includes('element') || message.includes('selector')) {
      return 'ElementNotFound';
    }
    
    if (message.includes('timeout')) {
      return 'TimeoutError';
    }
    
    if (message.includes('permission') || message.includes('denied')) {
      return 'PermissionError';
    }
    
    if (message.includes('verification') || message.includes('code')) {
      return 'VerificationCodeError';
    }
    
    return 'UnknownError';
  }

  // 获取日志
  getLogs(filter = {}) {
    let filteredLogs = [...this.logs];
    
    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }
    
    if (filter.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since);
    }
    
    if (filter.executionId) {
      filteredLogs = filteredLogs.filter(log => 
        log.context.executionId === filter.executionId
      );
    }
    
    if (filter.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }
    
    return filteredLogs;
  }

  // 获取持久化日志
  async getPersistentLogs() {
    try {
      if (typeof storageManager !== 'undefined') {
        const config = await storageManager.getConfig('automationConfig');
        return config.persistentLogs || [];
      }
      return [];
    } catch (error) {
      this.error('获取持久化日志失败', { error: error });
      return [];
    }
  }

  // 清除日志
  clearLogs(type = 'memory') {
    if (type === 'memory' || type === 'all') {
      this.logs = [];
      this.info('内存日志已清除');
    }
    
    if (type === 'persistent' || type === 'all') {
      this.clearPersistentLogs();
    }
  }

  // 清除持久化日志
  async clearPersistentLogs() {
    try {
      if (typeof storageManager !== 'undefined') {
        const config = await storageManager.getConfig('automationConfig');
        config.persistentLogs = [];
        await storageManager.setConfig('automationConfig', config);
        this.info('持久化日志已清除');
      }
    } catch (error) {
      this.error('清除持久化日志失败', { error: error });
    }
  }

  // 设置日志级别
  setLogLevel(level) {
    if (['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
      this.logLevel = level;
      this.info(`日志级别已设置为: ${level}`);
      
      // 保存到配置
      this.saveLogLevel(level);
    }
  }

  // 保存日志级别到配置
  async saveLogLevel(level) {
    try {
      if (typeof storageManager !== 'undefined') {
        const config = await storageManager.getConfig('automationConfig');
        config.logLevel = level;
        await storageManager.setConfig('automationConfig', config);
      }
    } catch (error) {
      this.error('保存日志级别失败', { error: error });
    }
  }

  // 导出日志
  exportLogs(format = 'json') {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'context'];
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = [
          new Date(log.timestamp).toISOString(),
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.context).replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
    
    return logs;
  }

  // 生成日志ID
  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // 获取统计信息
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 },
      recent: this.logs.slice(0, 10)
    };
    
    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
    });
    
    return stats;
  }
}

// 导出单例
const automationLogger = new AutomationLogger();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = automationLogger;
} else if (typeof window !== 'undefined') {
  globalThis.automationLogger = automationLogger;
} else {
  // Service Worker环境
  globalThis.automationLogger = automationLogger;
}
