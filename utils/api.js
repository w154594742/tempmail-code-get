// API调用封装
class ApiManager {
  constructor() {
    this.storageManager = null;
  }

  // 初始化
  async init() {
    if (typeof storageManager !== 'undefined') {
      this.storageManager = storageManager;
    } else if (typeof self !== 'undefined' && self.storageManager) {
      this.storageManager = self.storageManager;
    } else if (typeof window !== 'undefined' && window.storageManager) {
      this.storageManager = window.storageManager;
    } else {
      console.error('StorageManager not found');
      throw new Error('StorageManager not available');
    }
  }

  // 带重试的fetch请求
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    // 写死重试配置
    const retryConfig = {
      maxRetries: 5,
      retryInterval: 3000,
      timeout: 10000
    };

    const actualMaxRetries = maxRetries || retryConfig.maxRetries;
    
    for (let attempt = 0; attempt < actualMaxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), retryConfig.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`请求失败 (尝试 ${attempt + 1}/${actualMaxRetries}):`, error);
        
        if (attempt === actualMaxRetries - 1) {
          throw error;
        }
        
        // 指数退避延迟
        const delay = retryConfig.retryInterval * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
  }

  // 获取邮件列表
  async getMailList(email, epin) {
    try {
      if (!this.storageManager) {
        await this.init();
      }

      const url = `https://tempmail.plus/api/mails?email=${encodeURIComponent(email)}&limit=20&epin=${encodeURIComponent(epin)}`;
      
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取邮件列表失败:', error);
      throw new Error('获取邮件列表失败: ' + error.message);
    }
  }

  // 获取邮件详情
  async getMailDetail(firstId, email, epin) {
    try {
      if (!this.storageManager) {
        await this.init();
      }

      const url = `https://tempmail.plus/api/mails/${firstId}?email=${encodeURIComponent(email)}&epin=${encodeURIComponent(epin)}`;
      
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取邮件详情失败:', error);
      throw new Error('获取邮件详情失败: ' + error.message);
    }
  }

  // 删除邮件
  async deleteMail(firstId, email, epin) {
    try {
      if (!this.storageManager) {
        await this.init();
      }

      const url = `https://tempmail.plus/api/mails/`;
      
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('first_id', firstId);
      formData.append('epin', epin);

      const response = await this.fetchWithRetry(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('删除邮件失败:', error);
      throw new Error('删除邮件失败: ' + error.message);
    }
  }

  // 从邮件文本中提取验证码
  extractVerificationCode(mailText) {
    try {
      // 匹配6位数字验证码
      const codeMatch = mailText.match(/(?<![a-zA-Z@.])\b\d{6}\b/);
      return codeMatch ? codeMatch[0] : null;
    } catch (error) {
      console.error('提取验证码失败:', error);
      return null;
    }
  }

  // 获取最新邮件中的验证码
  async getLatestMailCode() {
    try {
      // 从正确的键名读取配置
      const result = await chrome.storage.local.get(['emailConfig', 'tempMailConfig']);
      const emailConfig = result.emailConfig || {};
      const tempMailConfig = result.tempMailConfig || {};

      const email = emailConfig.targetEmail;
      const epin = tempMailConfig.epin || '';

      if (!email) {
        throw new Error('未配置目标邮箱地址，请在设置页面配置');
      }

      // 获取邮件列表
      const mailListData = await this.getMailList(email, epin);

      if (!mailListData.result || !mailListData.first_id) {
        return null;
      }

      const firstId = mailListData.first_id;

      // 获取邮件详情
      const mailDetailData = await this.getMailDetail(firstId, email, epin);
      
      if (!mailDetailData.result) {
        return null;
      }

      const mailText = mailDetailData.text || "";
      const mailSubject = mailDetailData.subject || "";
      
      console.log('找到邮件主题:', mailSubject);
      
      // 提取验证码
      const code = this.extractVerificationCode(mailText);
      
      // 如果获取到验证码，尝试删除邮件
      if (code) {
        try {
          await this.deleteMail(firstId, email, epin);
          console.log('邮件删除成功');
        } catch (deleteError) {
          console.warn('删除邮件失败，但验证码已获取:', deleteError);
        }
      }

      return code;
    } catch (error) {
      console.error('获取最新邮件验证码失败:', error);
      return null;
    }
  }

  // 获取验证码（带重试机制）
  async getVerificationCode(maxRetries = 5, retryInterval = 3000, onProgress = null, abortSignal = null) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // 检查是否被中断
      if (abortSignal && abortSignal.aborted) {
        throw new Error('获取验证码已被中断');
      }

      try {
        if (onProgress) {
          onProgress({
            attempt: attempt + 1,
            maxRetries: maxRetries,
            message: `尝试获取验证码 (第 ${attempt + 1}/${maxRetries} 次)...`
          });
        }

        const code = await this.getLatestMailCode();

        if (code) {
          if (onProgress) {
            onProgress({
              attempt: attempt + 1,
              maxRetries: maxRetries,
              message: `成功获取验证码: ${code}`,
              success: true,
              code: code
            });
          }

          // 保存到历史记录
          if (this.storageManager) {
            // 从emailConfig获取邮箱地址
            const emailConfig = await this.storageManager.getConfig('emailConfig');
            const email = emailConfig.targetEmail;

            await this.storageManager.saveLastCode(code);
            await this.storageManager.addCodeToHistory(code, email);
          }

          return code;
        }

        if (attempt < maxRetries - 1) {
          if (onProgress) {
            onProgress({
              attempt: attempt + 1,
              maxRetries: maxRetries,
              message: `未获取到验证码，${retryInterval/1000}秒后重试...`,
              waiting: true
            });
          }

          // 可中断的延迟
          await this.sleepWithAbort(retryInterval, abortSignal);
        }
      } catch (error) {
        // 如果是中断错误，直接抛出
        if (error.message === '获取验证码已被中断' || error.message === '延迟被中断') {
          throw error;
        }

        console.error('获取验证码出错:', error);

        if (onProgress) {
          onProgress({
            attempt: attempt + 1,
            maxRetries: maxRetries,
            message: `获取验证码出错: ${error.message}`,
            error: true
          });
        }

        if (attempt < maxRetries - 1) {
          await this.sleepWithAbort(retryInterval, abortSignal);
        }
      }
    }

    const errorMessage = `经过 ${maxRetries} 次尝试后仍未获取到验证码`;
    if (onProgress) {
      onProgress({
        attempt: maxRetries,
        maxRetries: maxRetries,
        message: errorMessage,
        failed: true
      });
    }

    throw new Error(errorMessage);
  }

  // 测试API连接
  async testConnection() {
    try {
      // 从正确的键名读取配置
      const result = await chrome.storage.local.get(['emailConfig', 'tempMailConfig']);
      const emailConfig = result.emailConfig || {};
      const tempMailConfig = result.tempMailConfig || {};

      const email = emailConfig.targetEmail;
      const epin = tempMailConfig.epin || '';

      if (!email) {
        throw new Error('未配置目标邮箱地址，请在设置页面配置');
      }

      await this.getMailList(email, epin);
      return true;
    } catch (error) {
      console.error('API连接测试失败:', error);
      return false;
    }
  }

  // 工具方法：延迟
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 工具方法：可中断的延迟
  sleepWithAbort(ms, abortSignal) {
    return new Promise((resolve, reject) => {
      if (abortSignal && abortSignal.aborted) {
        reject(new Error('延迟被中断'));
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve();
      }, ms);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('延迟被中断'));
        });
      }
    });
  }
}

// 导出单例
const apiManager = new ApiManager();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiManager;
} else if (typeof window !== 'undefined') {
  window.apiManager = apiManager;
} else {
  // Service Worker环境
  self.apiManager = apiManager;
}
