// 邮箱生成器
class EmailGenerator {
  constructor() {
    this.storageManager = null;
  }

  // 初始化存储管理器
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

  // 生成随机邮箱
  async generateEmail() {
    try {
      if (!this.storageManager) {
        await this.init();
      }

      const emailConfig = await this.storageManager.getConfig('emailConfig');
      const mode = emailConfig.generationMode || 'nameNumber';
      
      // 写死的姓氏和名字列表（各100个）
      const firstNames = [
        "linda", "john", "mary", "david", "sarah", "michael", "jennifer", "robert", "lisa", "james",
        "patricia", "william", "elizabeth", "richard", "barbara", "joseph", "susan", "thomas", "jessica", "charles",
        "nancy", "christopher", "karen", "daniel", "betty", "matthew", "helen", "anthony", "sandra", "mark",
        "donna", "donald", "carol", "steven", "ruth", "paul", "sharon", "andrew", "michelle", "joshua",
        "laura", "kenneth", "sarah", "kevin", "kimberly", "brian", "deborah", "george", "dorothy", "timothy",
        "lisa", "ronald", "nancy", "jason", "karen", "edward", "betty", "jeffrey", "helen", "ryan",
        "sandra", "jacob", "donna", "gary", "carol", "nicholas", "ruth", "eric", "sharon", "jonathan",
        "michelle", "stephen", "laura", "larry", "sarah", "justin", "kimberly", "scott", "deborah", "brandon",
        "dorothy", "benjamin", "lisa", "samuel", "nancy", "gregory", "karen", "alexander", "betty", "patrick",
        "helen", "frank", "sandra", "raymond", "donna", "jack", "carol", "dennis", "ruth", "jerry", "sharon"
      ];

      const lastNames = [
        "garcia", "smith", "johnson", "brown", "davis", "miller", "wilson", "moore", "taylor", "anderson",
        "thomas", "jackson", "white", "harris", "martin", "thompson", "martinez", "robinson", "clark", "rodriguez",
        "lewis", "lee", "walker", "hall", "allen", "young", "hernandez", "king", "wright", "lopez",
        "hill", "scott", "green", "adams", "baker", "gonzalez", "nelson", "carter", "mitchell", "perez",
        "roberts", "turner", "phillips", "campbell", "parker", "evans", "edwards", "collins", "stewart", "sanchez",
        "morris", "rogers", "reed", "cook", "morgan", "bell", "murphy", "bailey", "rivera", "cooper",
        "richardson", "cox", "howard", "ward", "torres", "peterson", "gray", "ramirez", "james", "watson",
        "brooks", "kelly", "sanders", "price", "bennett", "wood", "barnes", "ross", "henderson", "coleman",
        "jenkins", "perry", "powell", "long", "patterson", "hughes", "flores", "washington", "butler", "simmons",
        "foster", "gonzales", "bryant", "alexander", "russell", "griffin", "diaz", "hayes", "myers", "ford"
      ];

      let username;
      if (mode === 'regexPattern') {
        // 正则模式
        const config = emailConfig.regexPatternConfig || { pattern: "[a-z]{3,8}\\d{2,4}", maxLength: 20 };
        username = this.generateFromRegex(config.pattern, config.maxLength);
      } else if (mode === 'randomString') {
        // 随机字符串模式
        const config = emailConfig.randomStringConfig || { minLength: 6, maxLength: 15 };
        username = this.generateRandomString(config.minLength, config.maxLength);
      } else {
        // 姓名+数字模式（默认）
        const firstName = this.randomChoice(firstNames);
        const lastName = this.randomChoice(lastNames);
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        username = `${firstName}${lastName}${randomNum}`;
      }

      // 解析域名列表
      const domainsStr = emailConfig.domains || "";
      const domains = domainsStr.split(/[,，]/).map(d => d.trim()).filter(d => d.length > 0);

      if (domains.length === 0) {
        throw new Error('没有配置可用的域名');
      }

      // 随机选择域名（不再使用轮询）
      const selectedDomain = this.randomChoice(domains);

      // 生成完整邮箱（自动添加@符号）
      const email = `${username}@${selectedDomain}`;

      // 保存到历史记录
      await this.storageManager.saveLastEmail(email);
      await this.storageManager.addEmailToHistory(email);

      return email;
    } catch (error) {
      console.error('生成邮箱失败:', error);
      throw new Error('邮箱生成失败: ' + error.message);
    }
  }

  // 验证邮箱格式
  validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // 从邮箱中提取用户名
  extractUsername(email) {
    const atIndex = email.indexOf('@');
    return atIndex > 0 ? email.substring(0, atIndex) : '';
  }

  // 从邮箱中提取域名
  extractDomain(email) {
    const atIndex = email.indexOf('@');
    return atIndex > 0 ? email.substring(atIndex) : '';
  }

  // 生成指定数量的邮箱
  async generateMultipleEmails(count = 1) {
    const emails = [];
    for (let i = 0; i < count; i++) {
      try {
        const email = await this.generateEmail();
        emails.push(email);
        // 添加小延迟确保时间戳不同
        await this.sleep(10);
      } catch (error) {
        console.error(`生成第${i + 1}个邮箱失败:`, error);
      }
    }
    return emails;
  }

  // 检查邮箱是否已存在于历史记录中
  async isEmailInHistory(email) {
    try {
      if (!this.storageManager) {
        await this.init();
      }
      
      const emailHistory = await this.storageManager.getEmailHistory();
      return emailHistory.some(item => item.email === email);
    } catch (error) {
      console.error('检查邮箱历史失败:', error);
      return false;
    }
  }

  // 生成唯一邮箱(确保不在历史记录中)
  async generateUniqueEmail(maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const email = await this.generateEmail();
      const isInHistory = await this.isEmailInHistory(email);
      
      if (!isInHistory) {
        return email;
      }
      
      // 如果在历史记录中，添加小延迟后重试
      await this.sleep(50);
    }
    
    // 如果多次尝试都重复，返回最后一个生成的邮箱
    return await this.generateEmail();
  }

  // 根据自定义配置生成邮箱
  async generateEmailWithConfig(customConfig) {
    try {
      const config = {
        firstNames: customConfig.firstNames || ["user"],
        lastNames: customConfig.lastNames || ["temp"],
        domain: customConfig.domain || "@example.com"
      };

      const firstName = this.randomChoice(config.firstNames);
      const lastName = this.randomChoice(config.lastNames);
      const timestamp = Date.now().toString(36);
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      const username = `${firstName}${lastName}${timestamp}${randomNum}`;
      const email = `${username}${config.domain}`;
      
      if (this.validateEmail(email)) {
        return email;
      } else {
        throw new Error('生成的邮箱格式无效');
      }
    } catch (error) {
      console.error('使用自定义配置生成邮箱失败:', error);
      throw error;
    }
  }

  // 获取邮箱统计信息
  async getEmailStats() {
    try {
      if (!this.storageManager) {
        await this.init();
      }

      const emailHistory = await this.storageManager.getEmailHistory();
      const lastEmail = await this.storageManager.getLastEmail();
      
      return {
        totalGenerated: emailHistory.length,
        lastGenerated: lastEmail,
        lastGeneratedTime: emailHistory.length > 0 ? emailHistory[0].timestamp : null,
        oldestInHistory: emailHistory.length > 0 ? emailHistory[emailHistory.length - 1].timestamp : null
      };
    } catch (error) {
      console.error('获取邮箱统计失败:', error);
      return {
        totalGenerated: 0,
        lastGenerated: null,
        lastGeneratedTime: null,
        oldestInHistory: null
      };
    }
  }

  // 工具方法：随机选择数组元素
  randomChoice(array) {
    if (!Array.isArray(array) || array.length === 0) {
      throw new Error('数组为空或无效');
    }
    return array[Math.floor(Math.random() * array.length)];
  }

  // 工具方法：延迟
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 工具方法：格式化时间戳
  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN');
  }

  // 生成随机字符串
  generateRandomString(minLength, maxLength) {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const chars = {
      numbers: '0123456789',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    };

    // 确保包含数字和字母
    let result = [
      this.getRandomChar(chars.numbers),
      this.getRandomChar(chars.lowercase + chars.uppercase)
    ];

    // 填充剩余位置
    const allChars = chars.numbers + chars.lowercase + chars.uppercase;
    for (let i = 2; i < length; i++) {
      result.push(this.getRandomChar(allChars));
    }

    // 随机打乱并验证
    const shuffled = this.shuffleArray(result).join('');

    // 验证是否同时包含数字和字母
    if (this.validateRandomString(shuffled)) {
      return shuffled;
    } else {
      // 递归重新生成
      return this.generateRandomString(minLength, maxLength);
    }
  }

  // 获取随机字符
  getRandomChar(charSet) {
    return charSet.charAt(Math.floor(Math.random() * charSet.length));
  }

  // 随机打乱数组
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 验证随机字符串
  validateRandomString(str) {
    const hasNumber = /\d/.test(str);
    const hasLetter = /[a-zA-Z]/.test(str);
    return hasNumber && hasLetter;
  }

  // 根据正则表达式生成字符串
  generateFromRegex(pattern, maxLength = 20) {
    try {
      // 确保RegexGenerator类可用
      if (typeof RegexGenerator === 'undefined') {
        console.error('RegexGenerator类未加载，使用回退方案');
        return this.getRegexFallback();
      }

      const generator = new RegexGenerator(pattern, maxLength);
      const result = generator.generate();

      // 验证生成的结果
      if (!result || result.length === 0) {
        console.warn('正则生成结果为空，使用回退方案');
        return this.getRegexFallback();
      }

      return result;
    } catch (error) {
      console.error('正则生成失败:', error);
      return this.getRegexFallback();
    }
  }

  // 正则生成失败时的回退方案
  getRegexFallback() {
    // 使用简单的字母+数字组合作为回退
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';

    let result = '';
    // 3-6个字母
    const letterCount = Math.floor(Math.random() * 4) + 3;
    for (let i = 0; i < letterCount; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // 2-4个数字
    const numberCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numberCount; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return result;
  }
}

// 导出单例
const emailGenerator = new EmailGenerator();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = emailGenerator;
} else if (typeof window !== 'undefined') {
  window.emailGenerator = emailGenerator;
} else {
  // Service Worker环境
  self.emailGenerator = emailGenerator;
}
