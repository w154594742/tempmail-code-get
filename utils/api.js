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
      // 按优先级顺序尝试匹配验证码
      const patterns = [
        /(?<![a-zA-Z@.])\b\d{6}\b/,     // 6位数字（原有，最高优先级）
        /(?<![a-zA-Z@.])\b\d{7,8}\b/,   // 7-8位数字（第二优先级）
        /(?<![a-zA-Z@.])\b\d{4,5}\b/    // 4-5位数字（第三优先级）
      ];

      // 依次尝试每个模式，找到第一个匹配的验证码
      for (const pattern of patterns) {
        const match = mailText.match(pattern);
        if (match) {
          console.log(`验证码提取成功，使用模式: ${pattern}, 结果: ${match[0]}`);
          return match[0];
        }
      }

      console.log('未找到匹配的验证码');
      return null;
    } catch (error) {
      console.error('提取验证码失败:', error);
      return null;
    }
  }

  // 从邮件HTML中提取链接（基于正则表达式分析，适用于Service Worker环境）
  extractLinksFromMail(mailHtml, mailSubject = '') {
    try {
      const links = [];

      console.log('开始提取链接 - 邮件主题:', mailSubject);
      console.log('开始提取链接 - 邮件HTML:', mailHtml);

      // 如果没有HTML内容，尝试从主题中提取
      if (!mailHtml || mailHtml.trim() === '') {
        console.log('HTML内容为空，尝试从主题提取链接');
        const urlRegex = /https?:\/\/[^\s<>"']+/gi;
        const matches = mailSubject.match(urlRegex);
        if (matches) {
          return [...new Set(matches)].map(link => link.replace(/[.,;!?)\]}>]+$/, ''));
        }
        return [];
      }

      console.log('使用正则表达式解析HTML（Service Worker兼容）');

      // 使用正则表达式查找所有<a>标签
      const linkRegex = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
      let match;

      while ((match = linkRegex.exec(mailHtml)) !== null) {
        const fullTag = match[0];
        const href = match[1];

        console.log(`分析链接标签: ${fullTag}`);
        console.log(`提取的href: ${href}`);

        // 跳过非HTTP/HTTPS链接
        if (!href || !href.match(/^https?:\/\//i)) {
          console.log('跳过非HTTP链接:', href);
          continue;
        }

        // 检查是否在系统区域（通过标签属性判断）
        const isSystemLink = this.isSystemLinkByTag(fullTag, mailHtml, match.index);

        if (isSystemLink) {
          console.log('跳过系统区域链接:', href);
          continue;
        }

        // 清理链接末尾的标点符号和HTML实体
        let cleanLink = href.replace(/[.,;!?)\]}>]+$/, '');
        cleanLink = cleanLink.replace(/&amp;/g, '&'); // 解码HTML实体

        if (cleanLink.length > 10) {
          links.push(cleanLink);
          console.log('添加有效链接:', cleanLink);
        } else {
          console.log('跳过过短链接:', cleanLink);
        }
      }

      // 去重
      const uniqueLinks = [...new Set(links)];
      console.log('最终提取到的链接:', uniqueLinks);
      return uniqueLinks;
    } catch (error) {
      console.error('提取邮件链接失败:', error);
      return [];
    }
  }

  // 检查链接是否在系统区域（基于正则表达式分析）
  isSystemLinkByTag(linkTag, fullHtml, linkIndex) {
    try {
      // 检查链接标签本身的属性
      if (linkTag.includes('class="xm_write_card"') ||
          linkTag.includes('data-readonly="true"')) {
        console.log('链接标签包含系统属性');
        return true;
      }

      // 查找链接前面的HTML内容，检查是否在contenteditable="false"区域内
      const beforeLink = fullHtml.substring(0, linkIndex);

      // 查找最近的contenteditable="false"开始标签
      const contentEditableRegex = /<[^>]*contenteditable\s*=\s*["']false["'][^>]*>/gi;
      let lastContentEditableMatch = null;
      let match;

      while ((match = contentEditableRegex.exec(beforeLink)) !== null) {
        lastContentEditableMatch = match;
      }

      if (lastContentEditableMatch) {
        // 检查在contenteditable="false"之后是否有对应的结束标签
        const afterContentEditable = fullHtml.substring(lastContentEditableMatch.index);
        const tagName = this.extractTagName(lastContentEditableMatch[0]);

        if (tagName) {
          const closeTagRegex = new RegExp(`</${tagName}[^>]*>`, 'i');
          const closeTagMatch = closeTagRegex.exec(afterContentEditable);

          if (closeTagMatch && (lastContentEditableMatch.index + closeTagMatch.index) > linkIndex) {
            console.log(`链接在contenteditable="false"的${tagName}标签内`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('检查系统链接失败:', error);
      return false;
    }
  }

  // 从HTML标签中提取标签名
  extractTagName(tagHtml) {
    const tagNameMatch = tagHtml.match(/<(\w+)/);
    return tagNameMatch ? tagNameMatch[1] : null;
  }

  // 在新标签页中打开链接
  async openLinksInNewTabs(links) {
    try {
      if (!links || links.length === 0) {
        console.log('没有链接需要打开');
        return;
      }

      console.log(`准备在新标签页中打开 ${links.length} 个链接`);

      for (const link of links) {
        try {
          await chrome.tabs.create({ url: link, active: false });
          console.log('已在新标签页打开链接:', link);

          // 添加短暂延迟，避免同时打开太多标签页
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('打开链接失败:', link, error);
        }
      }
    } catch (error) {
      console.error('批量打开链接失败:', error);
    }
  }



  // 在新标签页中打开链接
  async openLinksInNewTabs(links) {
    try {
      if (!links || links.length === 0) {
        console.log('没有链接需要打开');
        return;
      }

      console.log(`准备在新标签页中打开 ${links.length} 个链接`);

      for (const link of links) {
        try {
          await chrome.tabs.create({ url: link, active: false });
          console.log('已在新标签页打开链接:', link);

          // 添加短暂延迟，避免同时打开太多标签页
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('打开链接失败:', link, error);
        }
      }
    } catch (error) {
      console.error('批量打开链接失败:', error);
    }
  }

  // 获取最新邮件中的验证码
  async getLatestMailCode(openLinksOnFailure = false, sourceEmail = null) {
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
      const mailHtml = mailDetailData.html || "";
      const mailSubject = mailDetailData.subject || "";

      console.log('找到邮件主题:', mailSubject);
      console.log('邮件原始数据:', JSON.stringify(mailDetailData, null, 2));
      console.log('邮件文本内容:', mailText);
      console.log('邮件HTML内容:', mailHtml);

      // 记录邮件内容到历史（无论是否提取到验证码）
      if (this.storageManager) {
        try {
          // 使用传入的 sourceEmail，如果为空则记录为未知来源
          const recordEmail = sourceEmail || "未知来源";
          await this.storageManager.addMailContentToHistory(
            recordEmail,
            {
              subject: mailSubject,
              text: mailText,
              html: mailHtml,
              mailId: firstId
            },
            null // 验证码稍后在成功提取后更新
          );
          console.log('邮件内容已记录到历史');
        } catch (error) {
          console.warn('记录邮件内容失败:', error);
        }
      }

      // 提取验证码（只从text字段提取）
      const code = this.extractVerificationCode(mailText);

      // 如果获取到验证码，更新邮件记录中的验证码字段并删除邮件
      if (code) {
        // 更新最新记录的验证码
        if (this.storageManager) {
          try {
            const mailHistory = await this.storageManager.getMailContentHistory();
            if (mailHistory.length > 0) {
              // 更新最新记录的验证码
              mailHistory[0].verificationCode = code;
              const historyData = await this.storageManager.getConfig('historyData');
              historyData.mailContentHistory = mailHistory;
              await this.storageManager.setConfig('historyData', historyData);
              console.log('已更新邮件记录的验证码:', code);
            }
          } catch (error) {
            console.warn('更新邮件记录验证码失败:', error);
          }
        }

        try {
          // 删除邮件
          await this.deleteMail(firstId, email, epin);
          console.log('邮件删除成功');
        } catch (deleteError) {
          console.warn('删除邮件失败，但验证码已获取:', deleteError);
        }
        return code;
      }

      // 如果没有获取到验证码且启用了链接打开功能
      if (!code && openLinksOnFailure) {
        console.log('未找到验证码，尝试从HTML内容中提取并打开链接');
        console.log('openLinksOnFailure参数:', openLinksOnFailure);
        console.log('邮件主题用于链接提取:', mailSubject);
        console.log('邮件HTML内容用于链接提取:', mailHtml);

        // 从HTML内容中提取链接（验证码仍然只从text提取）
        const links = this.extractLinksFromMail(mailHtml, mailSubject);

        if (links.length > 0) {
          console.log(`从HTML中找到 ${links.length} 个链接，准备在新标签页中打开:`, links);

          // 在新标签页中打开链接
          await this.openLinksInNewTabs(links);

          try {
             // 删除邮件
            await this.deleteMail(firstId, email, epin);
            console.log('已打开链接并删除邮件');
          } catch (deleteError) {
            console.warn('删除邮件失败，但链接已打开:', deleteError);
          }

          // 返回包含链接信息的对象
          return {
            type: 'LINKS_OPENED',
            links: links,
            count: links.length
          };
        } else {
          console.log('邮件HTML中未找到有效链接，显示邮件原始内容');

          // 既没有验证码也没有链接，返回邮件内容供显示
          return {
            type: 'MAIL_CONTENT_DISPLAYED',
            subject: mailSubject,
            text: mailText,
            html: mailHtml,
            mailId: firstId
          };
        }
      } else if (!code) {
        console.log('未启用链接打开功能，openLinksOnFailure:', openLinksOnFailure);
      }

      return code;
    } catch (error) {
      console.error('获取最新邮件验证码失败:', error);
      return null;
    }
  }

  // 获取验证码（带重试机制）
  async getVerificationCode(maxRetries = 5, retryInterval = 3000, onProgress = null, abortSignal = null, openLinksOnFailure = false, sourceEmail = null) {
    console.log('getVerificationCode调用参数:', { maxRetries, retryInterval, openLinksOnFailure });

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

        // 每次尝试都启用链接打开功能（如果参数为true）
        console.log(`第${attempt + 1}次尝试, openLinksOnFailure: ${openLinksOnFailure}`);

        const code = await this.getLatestMailCode(openLinksOnFailure, sourceEmail);

        if (code && typeof code === 'object' && code.type === 'LINKS_OPENED') {
          // 链接已打开，停止重试
          if (onProgress) {
            const linksList = code.links.join(', ');
            onProgress({
              attempt: attempt + 1,
              maxRetries: maxRetries,
              message: `已打开 ${code.count} 个链接: ${linksList}`,
              success: false,
              linksOpened: true,
              links: code.links
            });
          }

          // 抛出特殊错误，表示已处理链接
          throw new Error(`邮件中未找到验证码，但已打开 ${code.count} 个相关链接`);
        }

        if (code && typeof code === 'object' && code.type === 'MAIL_CONTENT_DISPLAYED') {
          // 显示邮件内容，停止重试
          if (onProgress) {
            onProgress({
              attempt: attempt + 1,
              maxRetries: maxRetries,
              message: `未找到验证码和链接，显示邮件原始内容`,
              success: false,
              mailContentDisplayed: true,
              mailContent: {
                subject: code.subject,
                text: code.text,
                html: code.html,
                mailId: code.mailId
              }
            });
          }

          // 抛出特殊错误，表示已显示邮件内容
          throw new Error('邮件中未找到验证码和链接，已显示邮件原始内容');
        }

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

        // 如果是链接已处理错误，直接抛出，不继续重试
        if (error.message && error.message.includes('邮件中未找到验证码，但已打开') && error.message.includes('个相关链接')) {
          console.log('检测到链接已处理错误，停止重试');
          throw error;
        }

        // 如果是邮件内容已显示错误，直接抛出，不继续重试
        if (error.message && error.message.includes('邮件中未找到验证码和链接，已显示邮件原始内容')) {
          console.log('检测到邮件内容已显示错误，停止重试');
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
