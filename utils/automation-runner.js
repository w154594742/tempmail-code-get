// 自动化执行器
class AutomationRunner {
  constructor(config, tabId, isTestMode = false, logHandler = null, backgroundInstance = null) {
    this.config = config;
    this.tabId = tabId;
    this.isTestMode = isTestMode;
    this.logHandler = logHandler; // 日志处理回调函数
    this.backgroundInstance = backgroundInstance; // background实例引用
    this.currentStepIndex = 0;
    this.status = 'idle'; // idle, running, paused, completed, error, stopped
    this.context = {}; // 存储执行上下文和变量
    this.pauseResolver = null; // 用于暂停/恢复的Promise resolver
    this.verificationTimeoutId = null; // 人机验证超时ID
    this.executionId = this.generateExecutionId();
    this.startTime = null;
    this.errors = [];
    this.stepResults = [];
    this.storageManager = null; // 存储管理器实例
  }

  // 生成执行ID
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // 初始化存储管理器
  async initStorageManager() {
    if (!this.storageManager) {
      // 使用全局 storageManager 实例，而不是创建新实例
      if (typeof storageManager !== 'undefined') {
        this.storageManager = storageManager;
      } else {
        throw new Error('StorageManager not available');
      }
    }
  }

  // 开始执行流程
  async start() {
    try {
      console.log('AutomationRunner开始执行流程');
      this.sendLog('🚀 自动化流程开始执行', 'info');
      this.status = 'running';
      this.startTime = Date.now();
      this.currentStepIndex = 0;
      this.errors = [];
      this.stepResults = [];

      // 初始化变量上下文
      console.log('开始初始化变量上下文');
      this.sendLog('🔧 正在初始化变量上下文...', 'info');
      await this.initializeContext();
      console.log('变量上下文初始化完成');
      this.sendLog('✅ 变量上下文初始化完成', 'success');

      // 保存执行状态
      await this.saveExecutionState();

      // 记录开始日志
      if (typeof automationLogger !== 'undefined') {
        automationLogger.info('自动化流程开始执行', {
          executionId: this.executionId,
          flowName: this.config.name,
          totalSteps: this.config.steps.length,
          tabId: this.tabId
        });
      }

      // 发送开始消息
      this.sendProgress({
        type: 'automationStarted',
        executionId: this.executionId,
        totalSteps: this.config.steps.length,
        flowName: this.config.name
      });

      // 执行所有步骤
      console.log(`开始执行步骤，总共${this.config.steps.length}个步骤`);
      this.sendLog(`📋 开始执行步骤，总共${this.config.steps.length}个步骤`, 'info');
      while (this.currentStepIndex < this.config.steps.length && this.status === 'running') {
        const step = this.config.steps[this.currentStepIndex];
        console.log(`准备执行步骤${this.currentStepIndex + 1}: ${step.name} (${step.type})`);
        this.sendLog(`▶️ 步骤${this.currentStepIndex + 1}: ${step.name} (${step.type})`, 'info');
        await this.executeStep(step);
        console.log(`步骤${this.currentStepIndex + 1}执行完成`);
        this.sendLog(`✅ 步骤${this.currentStepIndex + 1}执行完成`, 'success');

        if (this.status === 'running') {
          this.currentStepIndex++;
          await this.saveExecutionState();
        }
      }

      if (this.status === 'running') {
        this.status = 'completed';

        // 记录完成日志
        if (typeof automationLogger !== 'undefined') {
          automationLogger.info('自动化流程执行完成', {
            executionId: this.executionId,
            duration: Date.now() - this.startTime,
            totalSteps: this.config.steps.length,
            successfulSteps: this.stepResults.length
          });
        }

        this.sendProgress({
          type: 'automationCompleted',
          executionId: this.executionId,
          flowId: this.config.id,
          success: true,
          duration: Date.now() - this.startTime,
          results: this.stepResults
        });

        // 通知automation-manager清理执行器
        if (this.backgroundInstance && this.backgroundInstance.automationManager) {
          this.backgroundInstance.automationManager.cleanupRunner(this.tabId);
        }

        // 通知automation-manager清理执行器
        if (this.backgroundInstance && this.backgroundInstance.automationManager) {
          this.backgroundInstance.automationManager.cleanupRunner(this.tabId);
        }
      }
    } catch (error) {
      this.status = 'error';
      this.errors.push(error.message);

      // 记录错误日志
      if (typeof automationLogger !== 'undefined') {
        automationLogger.error('自动化流程执行失败', {
          executionId: this.executionId,
          error: error.message,
          currentStep: this.currentStepIndex,
          stepName: this.config.steps[this.currentStepIndex]?.name
        });
      }

      this.sendProgress({
        type: 'automationError',
        executionId: this.executionId,
        error: error.message,
        step: this.config.steps[this.currentStepIndex],
        stepIndex: this.currentStepIndex
      });
    } finally {
      // 清理执行状态
      if (!this.isTestMode) {
        setTimeout(() => {
          storageManager.clearExecutionState(this.executionId);
          // 通过消息通知清理，避免直接调用
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
              action: 'cleanupRunner',
              tabId: this.tabId,
              executionId: this.executionId
            }).catch(() => {
              // 忽略清理失败的错误
            });
          }
        }, 60000); // 1分钟后清理
      }
    }
  }

  // 初始化变量上下文
  async initializeContext() {
    this.context = {
      ...this.config.variables,
      executionId: this.executionId,
      startTime: this.startTime,
      tabId: this.tabId
    };

    // 检查流程是否需要各种变量
    const needsEmail = this.checkIfNeedsEmail();
    const needsNameVariables = this.checkIfNeedsNameVariables();
    const needsPassword = this.checkIfNeedsPasswordVariable();

    // 按需生成邮箱地址和姓名变量
    if ((needsEmail || needsNameVariables) && !this.context.email) {
      try {
        // 直接调用emailGenerator，避免消息传递的问题
        if (typeof emailGenerator !== 'undefined') {
          const email = await emailGenerator.generateEmail();
          this.context.email = email;

          // 从邮箱地址中提取姓名组件
          const nameComponents = this.extractNameComponentsFromEmail(email);
          this.context.firstName = nameComponents.firstName;
          this.context.lastName = nameComponents.lastName;
          this.context.fullName = nameComponents.fullName;

          console.log('生成邮箱地址:', email);
          console.log('提取姓名组件:', nameComponents);
          this.sendLog(`📧 生成邮箱: ${email}`, 'success');
          if (needsNameVariables) {
            this.sendLog(`👤 提取姓名: ${nameComponents.fullName}`, 'success');
          }
        } else {
          throw new Error('邮箱生成器未初始化');
        }
      } catch (error) {
        console.error('生成邮箱失败:', error);
        this.sendLog(`⚠️ 邮箱生成失败: ${error.message}`, 'warn');

        // 如果生成失败，使用默认的随机邮箱格式
        const firstNames = ['john', 'mary', 'david', 'sarah', 'michael', 'jennifer', 'robert', 'lisa'];
        const lastNames = ['smith', 'johnson', 'brown', 'davis', 'miller', 'wilson', 'moore', 'taylor'];
        const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const domain = domains[Math.floor(Math.random() * domains.length)];

        this.context.email = `${firstName}${lastName}${randomNum}@${domain}`;
        this.context.firstName = firstName;
        this.context.lastName = lastName;
        this.context.fullName = `${firstName}.${lastName}`;

        console.log('使用默认邮箱格式:', this.context.email);
        console.log('使用默认姓名组件:', { firstName, lastName, fullName: this.context.fullName });
        this.sendLog(`📧 使用默认邮箱: ${this.context.email}`, 'info');
        if (needsNameVariables) {
          this.sendLog(`👤 使用默认姓名: ${this.context.fullName}`, 'info');
        }
      }
    } else if (!needsEmail && !needsNameVariables) {
      console.log('流程不需要邮箱或姓名变量，跳过生成');
      this.sendLog('ℹ️ 流程不需要邮箱或姓名变量，跳过生成', 'info');
    }

    // 按需生成密码变量
    if (needsPassword && !this.context.password) {
      try {
        this.context.password = this.generateSecurePassword();
        console.log('生成安全密码:', this.context.password);
        this.sendLog(`🔐 生成安全密码: ${this.context.password}`, 'success');
      } catch (error) {
        console.error('生成密码失败:', error);
        this.sendLog(`⚠️ 密码生成失败: ${error.message}`, 'warn');
        // 使用默认密码（使用高兼容性特殊符号）
        this.context.password = 'DefaultPass123!@#';
        this.sendLog(`🔐 使用默认密码: ${this.context.password}`, 'info');
      }
    } else if (!needsPassword) {
      console.log('流程不需要密码变量，跳过密码生成');
      this.sendLog('ℹ️ 流程不需要密码变量，跳过密码生成', 'info');
    }

    // 获取验证码的处理
    if (this.context.code === '{{fetched_code}}') {
      // 这里暂时设置为占位符，实际获取验证码会在需要时进行
      this.context.code = null;
    }
  }

  // 检查流程是否需要邮箱变量
  checkIfNeedsEmail() {
    for (const step of this.config.steps) {
      // 检查步骤的value字段是否包含{{email}}
      if (step.value && typeof step.value === 'string' && step.value.includes('{{email}}')) {
        return true;
      }

      // 检查步骤的其他可能包含变量的字段
      if (step.selector && typeof step.selector === 'string' && step.selector.includes('{{email}}')) {
        return true;
      }

      // 检查步骤的options中是否有使用email变量的地方
      if (step.options) {
        const optionsStr = JSON.stringify(step.options);
        if (optionsStr.includes('{{email}}')) {
          return true;
        }
      }
    }

    // 检查流程的variables配置
    if (this.config.variables && this.config.variables.email === '{{email}}') {
      return true;
    }

    return false;
  }

  // 检查流程是否需要姓名变量
  checkIfNeedsNameVariables() {
    const nameVariables = ['{{firstName}}', '{{lastName}}', '{{fullName}}'];

    for (const step of this.config.steps) {
      // 检查步骤的value字段是否包含姓名变量
      if (step.value && typeof step.value === 'string') {
        for (const nameVar of nameVariables) {
          if (step.value.includes(nameVar)) {
            return true;
          }
        }
      }

      // 检查步骤的其他可能包含变量的字段
      if (step.selector && typeof step.selector === 'string') {
        for (const nameVar of nameVariables) {
          if (step.selector.includes(nameVar)) {
            return true;
          }
        }
      }

      // 检查步骤的options中是否有使用姓名变量的地方
      if (step.options) {
        const optionsStr = JSON.stringify(step.options);
        for (const nameVar of nameVariables) {
          if (optionsStr.includes(nameVar)) {
            return true;
          }
        }
      }
    }

    // 检查流程的variables配置
    if (this.config.variables) {
      for (const nameVar of nameVariables) {
        const varName = nameVar.replace(/[{}]/g, ''); // 移除大括号
        if (this.config.variables[varName] === nameVar) {
          return true;
        }
      }
    }

    return false;
  }

  // 检查流程是否需要密码变量
  checkIfNeedsPasswordVariable() {
    for (const step of this.config.steps) {
      // 检查步骤的value字段是否包含{{password}}
      if (step.value && typeof step.value === 'string' && step.value.includes('{{password}}')) {
        return true;
      }

      // 检查步骤的其他可能包含变量的字段
      if (step.selector && typeof step.selector === 'string' && step.selector.includes('{{password}}')) {
        return true;
      }

      // 检查步骤的options中是否有使用password变量的地方
      if (step.options) {
        const optionsStr = JSON.stringify(step.options);
        if (optionsStr.includes('{{password}}')) {
          return true;
        }
      }
    }

    // 检查流程的variables配置
    if (this.config.variables && this.config.variables.password === '{{password}}') {
      return true;
    }

    return false;
  }

  // 从邮箱地址中提取姓名组件
  extractNameComponentsFromEmail(email) {
    try {
      // 提取用户名部分（@符号之前）
      const username = email.split('@')[0];

      // 移除数字后缀，获取姓名部分
      const nameMatch = username.match(/^([a-zA-Z]+)([a-zA-Z]+)\d*$/);

      if (nameMatch && nameMatch.length >= 3) {
        // 假设格式是 firstNamelastName123456
        // 需要智能分割姓和名
        const fullNamePart = nameMatch[1] + nameMatch[2];

        // 使用预定义的姓名列表来智能分割
        const { firstName, lastName } = this.smartSplitName(fullNamePart);

        return {
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName}.${lastName}`
        };
      } else {
        // 如果无法解析，使用默认值
        return {
          firstName: 'user',
          lastName: 'temp',
          fullName: 'user.temp'
        };
      }
    } catch (error) {
      console.error('提取姓名组件失败:', error);
      return {
        firstName: 'user',
        lastName: 'temp',
        fullName: 'user.temp'
      };
    }
  }

  // 智能分割姓名
  smartSplitName(fullNamePart) {
    // 预定义的常见名字和姓氏列表（简化版）
    const commonFirstNames = [
      'john', 'mary', 'david', 'sarah', 'michael', 'jennifer', 'robert', 'lisa', 'james', 'patricia',
      'william', 'elizabeth', 'richard', 'barbara', 'joseph', 'susan', 'thomas', 'jessica', 'charles', 'nancy'
    ];

    const commonLastNames = [
      'smith', 'johnson', 'brown', 'davis', 'miller', 'wilson', 'moore', 'taylor', 'anderson', 'thomas',
      'jackson', 'white', 'harris', 'martin', 'thompson', 'garcia', 'martinez', 'robinson', 'clark', 'rodriguez'
    ];

    const lowerFullName = fullNamePart.toLowerCase();

    // 尝试匹配已知的名字
    for (const firstName of commonFirstNames) {
      if (lowerFullName.startsWith(firstName)) {
        const remainingPart = lowerFullName.substring(firstName.length);

        // 检查剩余部分是否是已知的姓氏
        for (const lastName of commonLastNames) {
          if (remainingPart === lastName) {
            return { firstName, lastName };
          }
        }

        // 如果剩余部分不是已知姓氏，但长度合理，就使用它
        if (remainingPart.length >= 3 && remainingPart.length <= 10) {
          return { firstName, lastName: remainingPart };
        }
      }
    }

    // 如果无法智能分割，使用简单的分割方法
    const midPoint = Math.floor(lowerFullName.length / 2);
    return {
      firstName: lowerFullName.substring(0, midPoint) || 'user',
      lastName: lowerFullName.substring(midPoint) || 'temp'
    };
  }

  // 生成安全密码
  generateSecurePassword() {
    try {
      // 定义字符集（优化特殊符号以提高网站兼容性）
      const passwordChars = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',  // 添加数字字符集
        special: '!@#_-'  // 使用高度兼容的特殊符号：感叹号、At符号、井号、下划线、连字符
      };

      // 随机确定长度（16-20位）
      const length = Math.floor(Math.random() * 5) + 16;

      // 确保每种类型至少有一个字符
      const requiredChars = [
        this.getRandomChar(passwordChars.uppercase),
        this.getRandomChar(passwordChars.lowercase),
        this.getRandomChar(passwordChars.numbers),  // 确保至少包含一个数字
        this.getRandomChar(passwordChars.special)
      ];

      // 填充剩余位置
      const allChars = passwordChars.uppercase + passwordChars.lowercase + passwordChars.numbers + passwordChars.special;
      const remainingLength = length - requiredChars.length;

      for (let i = 0; i < remainingLength; i++) {
        requiredChars.push(this.getRandomChar(allChars));
      }

      // 随机打乱数组
      const password = this.shuffleArray(requiredChars).join('');

      // 验证密码是否符合要求
      if (this.validatePassword(password)) {
        return password;
      } else {
        // 如果验证失败，递归重新生成
        return this.generateSecurePassword();
      }
    } catch (error) {
      console.error('生成密码失败:', error);
      // 返回一个默认的安全密码（使用高兼容性特殊符号）
      return 'DefaultPass123!@#';
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

  // 验证密码是否符合要求
  validatePassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);  // 添加数字验证
    const hasSpecial = /[!@#_\-]/.test(password);  // 更新正则表达式以匹配高度兼容的特殊符号集
    const hasValidLength = password.length >= 16 && password.length <= 20;

    return hasUppercase && hasLowercase && hasNumbers && hasSpecial && hasValidLength;
  }

  // 获取验证码（直接调用background方法，支持进度回调）
  async getVerificationCodeAsync() {
    if (!this.backgroundInstance) {
      return { success: false, error: 'Background实例不可用' };
    }

    // 检查流程状态
    if (this.status === 'stopped') {
      return { success: false, error: '流程已停止' };
    }

    try {
      // 模拟sendResponse回调
      let result = null;
      const mockSendResponse = (response) => {
        result = response;
      };

      // 创建进度回调，直接调用sendLog显示进度
      const progressCallback = (progress) => {
        // 在每次进度回调时检查流程状态
        if (this.status === 'stopped') {
          this.sendLog('🛑 流程已停止，中断验证码获取', 'warning');
          return;
        }

        if (progress.message) {
          let logType = 'info';
          if (progress.success) {
            logType = 'success';
          } else if (progress.failed || progress.error) {
            logType = 'error';
          } else if (progress.waiting) {
            logType = 'info';
          }
          this.sendLog(`📧 ${progress.message}`, logType);
        }
      };

      // 确保存储管理器已初始化
      await this.initStorageManager();

      // 获取最新生成的邮箱作为源邮箱
      let sourceEmail = null;
      try {
        const emailHistory = await this.storageManager.getEmailHistory();
        sourceEmail = emailHistory.length > 0 ? emailHistory[0].email : null;
        console.log('自动化流程获取到的源邮箱:', sourceEmail);
      } catch (error) {
        console.warn('获取邮箱历史失败:', error);
      }

      // 直接调用background的验证码获取方法，传入进度回调
      await this.backgroundInstance.handleGetVerificationCodeWithProgress({
        maxRetries: 10,
        retryInterval: 3000,
        sourceEmail: sourceEmail
      }, mockSendResponse, progressCallback);

      // 再次检查流程状态
      if (this.status === 'stopped') {
        return { success: false, error: '流程已停止' };
      }

      return result || { success: false, error: '获取验证码失败' };
    } catch (error) {
      // 如果是中断错误，返回特定消息
      if (error.message.includes('中断') || error.message.includes('停止')) {
        return { success: false, error: '验证码获取已被停止' };
      }
      return { success: false, error: error.message };
    }
  }

  // 执行单个步骤（无重试机制）
  async executeStep(step) {
    try {
      // 发送步骤开始消息
      this.sendProgress({
        type: 'stepStarted',
        step: step,
        stepIndex: this.currentStepIndex,
        totalSteps: this.config.steps.length
      });

      let result = await this.executeStepOnce(step);

      // 记录结果（无论成功还是跳过）
      this.stepResults.push({
        stepIndex: this.currentStepIndex,
        stepId: step.id,
        result: result,
        timestamp: Date.now()
      });

      // 记录步骤完成日志
      if (typeof automationLogger !== 'undefined') {
        const logLevel = result.skipped ? 'warn' : 'debug';
        const logMessage = result.skipped ? '步骤已跳过' : '步骤执行完成';
        automationLogger[logLevel](logMessage, {
          executionId: this.executionId,
          stepIndex: this.currentStepIndex,
          stepName: step.name,
          stepType: step.type,
          result: result
        });
      }

      this.sendProgress({
        type: result.skipped ? 'stepSkipped' : 'stepCompleted',
        step: step,
        stepIndex: this.currentStepIndex,
        result: result
      });

      // 步骤执行完成后延迟
      const delay = step.options?.delay || 0;
      if (delay > 0) {
        this.sendLog(`⏱️ 步骤执行完成，延迟 ${delay}ms`, 'info');
        await this.sleep(delay);
      }

      return result;

    } catch (error) {
      // 记录错误
      this.errors.push({
        stepIndex: this.currentStepIndex,
        stepId: step.id,
        error: error.message,
        timestamp: Date.now()
      });

      // 记录步骤错误日志
      if (typeof automationLogger !== 'undefined') {
        automationLogger.error('步骤执行失败', {
          executionId: this.executionId,
          stepIndex: this.currentStepIndex,
          stepName: step.name,
          stepType: step.type,
          error: error.message
        });
      }

      this.sendProgress({
        type: 'stepError',
        step: step,
        stepIndex: this.currentStepIndex,
        error: error.message
      });

      throw error;
    }
  }

  // 执行单个步骤（单次尝试）
  async executeStepOnce(step) {
    let result;
    switch (step.type) {
      case 'fillInput':
        result = await this.fillInput(step);
        break;
      case 'clickButton':
        result = await this.clickButton(step);
        break;
      case 'waitForElement':
        result = await this.waitForElement(step);
        break;
      case 'humanVerification':
        result = await this.handleHumanVerification(step);
        break;
      case 'delay':
        result = await this.delay(step);
        break;
      case 'scroll':
        result = await this.scroll(step);
        break;
      case 'hover':
        result = await this.hover(step);
        break;
      case 'selectOption':
        result = await this.selectOption(step);
        break;
      case 'uploadFile':
        result = await this.uploadFile(step);
        break;
      case 'executeScript':
        result = await this.executeScript(step);
        break;
      case 'waitForNavigation':
        result = await this.waitForNavigation(step);
        break;
      case 'conditional':
        result = await this.conditional(step);
        break;
      default:
        throw new Error(`不支持的步骤类型: ${step.type}`);
    }

    return result;
  }



  // 🔑 处理人机验证步骤 (核心新功能)
  async handleHumanVerification(step) {
    if (this.isTestMode) {
      return { success: true, message: '测试模式：跳过人机验证' };
    }

    // 检查是否可以跳过
    if (step.options?.skipable && step.options?.autoDetect) {
      const skipResult = await this.trySkipVerification(step);
      if (skipResult.canSkip) {
        return { success: true, message: '自动检测：无需人机验证', skipped: true };
      }
    }

    this.status = 'paused';

    // 记录人机验证开始
    if (typeof automationLogger !== 'undefined') {
      automationLogger.info('人机验证节点开始', {
        executionId: this.executionId,
        stepName: step.name,
        timeout: step.options?.timeout || 180000,
        skipable: step.options?.skipable || false
      });
    }

    // 发送进度消息
    this.sendProgress({
      type: 'humanVerificationRequired',
      step: step,
      executionId: this.executionId,
      message: step.description || '请完成人机验证后点击继续',
      timeout: step.options?.waitTimeout || step.options?.timeout || 180000,
      skipable: step.options?.skipable || false,
      retryable: step.options?.retryable || true,
      hints: step.options?.hints || []
    });

    // 在页面上显示人机验证UI
    try {
      await chrome.tabs.sendMessage(this.tabId, {
        action: 'showHumanVerification',
        step: step,
        executionId: this.executionId,
        timeout: step.options?.waitTimeout || step.options?.timeout || 180000
      });
    } catch (error) {
      console.debug('显示人机验证UI失败（可能是页面不支持）:', error.message);
    }

    // 保存暂停状态
    await this.saveExecutionState();

    // 创建一个Promise，等待用户点击继续或自动检测完成
    return new Promise((resolve, reject) => {
      this.pauseResolver = { resolve, reject };

      // 设置超时，优先使用waitTimeout
      const timeout = step.options?.waitTimeout || step.options?.timeout || 180000; // 优先使用waitTimeout，默认3分钟
      this.verificationTimeoutId = setTimeout(() => {
        if (this.status === 'paused') {
          this.status = 'running';

          // 清理检测定时器
          if (this.elementDetectionInterval) {
            clearInterval(this.elementDetectionInterval);
            this.elementDetectionInterval = null;
          }

          // 记录超时日志
          if (typeof automationLogger !== 'undefined') {
            automationLogger.warn('人机验证超时，继续执行下一步', {
              executionId: this.executionId,
              stepName: step.name,
              timeout: timeout
            });
          }

          // 发送超时日志
          this.sendLog('⏰ 人机验证超时，自动继续执行下一步', 'warn');

          // 隐藏验证UI
          this.hideVerificationUI();

          // 清理pauseResolver
          if (this.pauseResolver) {
            this.pauseResolver.resolve({ success: true, message: '人机验证超时，已跳过' });
            this.pauseResolver = null;
          }

          // 清理超时ID
          this.verificationTimeoutId = null;
        }
      }, timeout);

      // 如果配置了元素选择器，启动自动检测
      if (step.selector && step.selector.trim()) {
        this.sendLog(`🔍 启动元素自动检测: ${step.selector}`, 'info');
        this.startElementDetection(step, resolve, this.verificationTimeoutId);
      }
    });
  }

  // 启动元素检测
  startElementDetection(step, resolve, timeoutId) {
    let detectionCount = 0;
    const maxDetections = Math.floor((step.options?.waitTimeout || step.options?.timeout || 180000) / 500); // 总检测次数

    this.elementDetectionInterval = setInterval(async () => {
      detectionCount++;

      try {
        // 向content script发送检测请求
        const result = await new Promise((detectResolve, detectReject) => {
          chrome.tabs.sendMessage(this.tabId, {
            action: 'checkElementExists',
            selector: step.selector
          }, (response) => {
            if (chrome.runtime.lastError) {
              detectReject(new Error(chrome.runtime.lastError.message));
            } else {
              detectResolve(response);
            }
          });
        });

        if (result && result.exists) {
          // 元素检测到，自动完成验证
          this.status = 'running';

          // 清理定时器
          clearInterval(this.elementDetectionInterval);
          clearTimeout(timeoutId);
          this.elementDetectionInterval = null;
          this.verificationTimeoutId = null;

          // 记录自动完成日志
          this.sendLog(`✅ 检测到目标元素，自动完成人机验证`, 'success');
          if (typeof automationLogger !== 'undefined') {
            automationLogger.info('元素自动检测成功', {
              executionId: this.executionId,
              stepName: step.name,
              selector: step.selector,
              detectionCount: detectionCount
            });
          }

          // 隐藏验证UI
          this.hideVerificationUI();

          // 完成验证
          resolve({ success: true, message: '自动检测到目标元素，验证完成' });
          return;
        }

        // 记录检测进度（每10次记录一次）
        if (detectionCount % 10 === 0) {
          this.sendLog(`🔍 元素检测中... (${detectionCount}/${maxDetections})`, 'info');
        }

      } catch (error) {
        console.debug('元素检测失败:', error.message);
        // 继续检测，不中断流程
      }

      // 检查是否达到最大检测次数
      if (detectionCount >= maxDetections) {
        clearInterval(this.elementDetectionInterval);
        this.elementDetectionInterval = null;
        this.sendLog(`⏰ 元素检测已达到最大次数，等待手动操作`, 'warn');
      }
    }, 500); // 每500ms检测一次
  }

  // 尝试跳过人机验证（自动检测）
  async trySkipVerification(step) {
    try {
      // 检查常见的验证码元素是否存在
      const verificationSelectors = [
        '.captcha',
        '.recaptcha',
        '#captcha',
        '[class*="captcha"]',
        '[id*="captcha"]',
        '.verification',
        '[class*="verification"]'
      ];

      let hasVerification = false;

      for (const selector of verificationSelectors) {
        const result = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(this.tabId, {
            action: 'checkElementExists',
            selector: selector
          }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ exists: false });
            } else {
              resolve(response);
            }
          });
        });

        if (result.exists && result.visible) {
          hasVerification = true;
          break;
        }
      }

      return {
        canSkip: !hasVerification,
        reason: hasVerification ? '检测到验证码元素' : '未检测到验证码元素'
      };

    } catch (error) {
      // 检测失败时保守处理，不跳过
      return {
        canSkip: false,
        reason: `检测失败: ${error.message}`
      };
    }
  }

  // 恢复执行 (用户点击继续后调用)
  resume() {
    console.log('Resume方法被调用，当前状态:', this.status, '是否有pauseResolver:', !!this.pauseResolver);

    if (this.status === 'paused' && this.pauseResolver) {
      console.log('开始恢复执行，当前步骤索引:', this.currentStepIndex);
      this.status = 'running';

      // 清除验证超时
      if (this.verificationTimeoutId) {
        clearTimeout(this.verificationTimeoutId);
        this.verificationTimeoutId = null;
        console.log('已清除验证超时定时器');
      }

      // 清理元素检测定时器（修复：停止元素检测）
      if (this.elementDetectionInterval) {
        clearInterval(this.elementDetectionInterval);
        this.elementDetectionInterval = null;
        this.sendLog('🛑 停止元素自动检测，用户选择继续执行', 'info');
      }

      // 隐藏验证UI
      this.hideVerificationUI();

      // 记录恢复日志
      if (typeof automationLogger !== 'undefined') {
        automationLogger.info('自动化流程恢复执行', {
          executionId: this.executionId,
          currentStep: this.currentStepIndex
        });
      }

      // 发送恢复日志
      this.sendLog('✅ 用户点击继续，恢复执行下一步', 'success');

      // 解决Promise，让人机验证步骤完成
      const resolver = this.pauseResolver;
      this.pauseResolver = null;

      console.log('正在解决pauseResolver...');
      resolver.resolve({ success: true, message: '用户确认继续' });
      console.log('pauseResolver已解决，人机验证步骤应该完成');

      this.sendProgress({
        type: 'automationResumed',
        executionId: this.executionId
      });
    } else {
      console.log('Resume条件不满足 - status:', this.status, 'pauseResolver:', !!this.pauseResolver);
    }
  }

  // 暂停执行
  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      this.sendProgress({
        type: 'automationPaused',
        executionId: this.executionId
      });
    }
  }

  // 停止执行
  stop() {
    this.status = 'stopped';

    // 隐藏人机验证弹窗（如果正在显示）
    this.hideVerificationUI();

    // 停止正在进行的验证码获取
    if (this.backgroundInstance) {
      try {
        this.backgroundInstance.handleStopGettingCode({}, () => { });
        this.sendLog('🛑 已停止验证码获取过程', 'info');
      } catch (error) {
        console.error('停止验证码获取失败:', error);
      }
    }

    if (this.pauseResolver) {
      this.pauseResolver.reject(new Error('用户停止了自动化流程'));
      this.pauseResolver = null;
    }
    this.sendProgress({
      type: 'automationStopped',
      executionId: this.executionId
    });
  }

  // 获取当前状态
  getState() {
    return {
      executionId: this.executionId,
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.config.steps.length,
      startTime: this.startTime,
      errors: this.errors,
      stepResults: this.stepResults,
      context: this.context
    };
  }

  // 保存执行状态
  async saveExecutionState() {
    if (!this.isTestMode) {
      await storageManager.saveExecutionState(this.executionId, this.getState());
    }
  }

  // 发送进度消息
  sendProgress(message) {
    if (!this.isTestMode && typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            // 消息端口关闭是正常情况，不需要记录错误
            // 这通常发生在侧边栏关闭或页面刷新时
            console.debug('进度消息发送失败（正常情况）:', chrome.runtime.lastError.message);
          }
        });
      } catch (error) {
        // 忽略发送错误，继续执行流程
        console.debug('进度消息发送异常（正常情况）:', error.message);
      }
    }
  }

  // 发送日志消息到侧边栏
  sendLog(message, type = 'info') {
    if (!this.isTestMode) {
      try {
        // 如果有日志处理器，直接调用
        if (this.logHandler && typeof this.logHandler === 'function') {
          this.logHandler({
            message: message,
            logType: type,
            executionId: this.executionId,
            timestamp: Date.now()
          });
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
          // 备用方案：发送消息（虽然在background环境中不会工作）
          chrome.runtime.sendMessage({
            action: 'automationLog',
            message: message,
            logType: type,
            executionId: this.executionId,
            timestamp: Date.now()
          }, (response) => {
            if (chrome.runtime.lastError) {
              // 忽略发送错误
            }
          });
        }
      } catch (error) {
        // 忽略发送错误
        console.debug('发送日志失败:', error);
      }
    }
  }

  // 解析变量
  resolveVariable(value) {
    if (typeof value !== 'string') return value;

    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return this.context[varName] || match;
    });
  }

  // 延迟等待
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 智能等待页面稳定
  async waitForPageStable(timeout = 10000) {
    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'waitForPageStable',
        timeout: timeout
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      throw new Error(result.error || '等待页面稳定失败');
    }

    return result;
  }

  // 等待AJAX请求完成
  async waitForAjaxComplete(timeout = 10000) {
    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'waitForAjaxComplete',
        timeout: timeout
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      throw new Error(result.error || '等待AJAX完成失败');
    }

    return result;
  }

  // 检查页面是否准备就绪
  async checkPageReady() {
    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'checkPageReady'
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    return result.ready;
  }

  // ========== 步骤执行方法 ==========

  // 填充输入框（等待机制）
  async fillInput(step) {
    console.log(`开始执行fillInput步骤: ${step.name}`);
    console.log(`选择器: ${step.selector}`);
    console.log(`原始值: ${step.value}`);
    this.sendLog(`📝 填充输入框: ${step.name}`, 'info');

    let value = this.resolveVariable(step.value);
    console.log(`解析后的值: ${value}`);
    this.sendLog(`🔍 解析值: ${step.value} → ${value}`, 'info');

    // 如果需要获取验证码（当解析后的值仍然是{{code}}时，说明变量不存在）
    if (value === '{{code}}' && step.value === '{{code}}') {
      try {
        this.sendLog('🔄 检测到{{code}}变量，开始自动获取验证码...', 'info');

        // 使用与首页相同的验证码获取方式
        const codeResult = await this.getVerificationCodeAsync();

        if (codeResult.success && codeResult.code) {
          value = codeResult.code;
          this.context.code = value;
          this.sendLog(`✅ 验证码获取成功: ${value}`, 'success');
        } else {
          this.sendLog(`❌ 获取验证码失败: ${codeResult.error || '获取验证码失败'}`, 'error');
          this.sendLog(`⏭️ 跳过填充步骤，继续执行下一步`, 'warn');
          return { success: false, error: `获取验证码失败: ${codeResult.error || '获取验证码失败'}`, skipped: true };
        }
      } catch (error) {
        this.sendLog(`❌ 获取验证码失败: ${error.message}`, 'error');
        this.sendLog(`⏭️ 跳过填充步骤，继续执行下一步`, 'warn');
        return { success: false, error: `获取验证码失败: ${error.message}`, skipped: true };
      }
    }

    // 使用等待机制：在超时时间内每500ms检查元素是否存在
    const timeout = step.options?.waitTimeout || step.options?.timeout || 10000; // 优先使用waitTimeout
    const checkInterval = 500; // 固定500ms检查间隔
    const startTime = Date.now();

    this.sendLog(`⏳ 等待元素出现: ${step.selector} (超时: ${timeout}ms)`, 'info');

    while (Date.now() - startTime < timeout) {
      try {
        // 检查元素是否存在
        const checkResult = await new Promise((resolve) => {
          chrome.tabs.sendMessage(this.tabId, {
            action: 'checkElement',
            selector: step.selector
          }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ exists: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { exists: false });
            }
          });
        });

        if (checkResult.exists) {
          // 元素存在，执行填充
          this.sendLog(`✅ 元素已找到，开始填充`, 'success');

          const fillResult = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(this.tabId, {
              action: 'fillInput',
              selector: step.selector,
              value: value,
              options: step.options || {}
            }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });

          if (!fillResult.success) {
            this.sendLog(`❌ 填充输入框失败: ${fillResult.error}`, 'error');
            this.sendLog(`⏭️ 跳过填充步骤，继续执行下一步`, 'warn');
            return { success: false, error: fillResult.error || '填充输入框失败', skipped: true };
          }

          return { success: true, value: value };
        }

        // 元素不存在，等待500ms后重试
        await this.sleep(checkInterval);

      } catch (error) {
        console.error(`检查元素时出错: ${error.message}`);
        await this.sleep(checkInterval);
      }
    }

    // 超时未找到元素，继续执行下一步
    this.sendLog(`⏰ 超时未找到元素: ${step.selector} (等待时间: ${timeout}ms)`, 'warn');
    this.sendLog(`⏭️ 跳过填充步骤，继续执行下一步`, 'warn');
    return { success: false, error: `超时未找到元素: ${step.selector}`, timeout: true, skipped: true };
  }

  // 点击按钮（等待机制）
  async clickButton(step) {
    console.log(`开始执行clickButton步骤: ${step.name}`);
    console.log(`选择器: ${step.selector}`);
    this.sendLog(`🖱️ 点击按钮: ${step.name}`, 'info');

    // 使用等待机制：在超时时间内每500ms检查元素是否存在且可点击
    const timeout = step.options?.waitTimeout || step.options?.timeout || 10000; // 优先使用waitTimeout
    const checkInterval = 500; // 固定500ms检查间隔
    const startTime = Date.now();

    this.sendLog(`⏳ 等待元素可点击: ${step.selector} (超时: ${timeout}ms)`, 'info');

    while (Date.now() - startTime < timeout) {
      try {
        // 检查元素是否存在且可点击
        const checkResult = await new Promise((resolve) => {
          chrome.tabs.sendMessage(this.tabId, {
            action: 'checkClickableElement',
            selector: step.selector
          }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ clickable: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { clickable: false });
            }
          });
        });

        if (checkResult.clickable) {
          // 元素存在且可点击，执行点击
          this.sendLog(`✅ 元素可点击，开始点击`, 'success');

          const clickResult = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(this.tabId, {
              action: 'clickButton',
              selector: step.selector,
              options: step.options || {}
            }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });

          if (!clickResult.success) {
            this.sendLog(`❌ 点击按钮失败: ${clickResult.error}`, 'error');
            this.sendLog(`⏭️ 跳过点击步骤，继续执行下一步`, 'warn');
            return { success: false, error: clickResult.error || '点击按钮失败', skipped: true };
          }

          return { success: true };
        }

        // 元素不存在或不可点击，等待500ms后重试
        await this.sleep(checkInterval);

      } catch (error) {
        console.error(`检查元素时出错: ${error.message}`);
        await this.sleep(checkInterval);
      }
    }

    // 超时未找到可点击元素，继续执行下一步
    this.sendLog(`⏰ 超时未找到可点击元素: ${step.selector} (等待时间: ${timeout}ms)`, 'warn');
    this.sendLog(`⏭️ 跳过点击步骤，继续执行下一步`, 'warn');
    return { success: false, error: `超时未找到可点击元素: ${step.selector}`, timeout: true, skipped: true };
  }

  // 等待元素出现
  async waitForElement(step) {
    this.sendLog(`⏳ 等待元素出现: ${step.name}`, 'info');

    // 使用高级选项中的等待超时时间
    const timeout = step.options?.waitTimeout || step.options?.timeout || 10000;
    const options = {
      ...step.options,
      timeout: timeout
    };

    this.sendLog(`⏳ 等待元素: ${step.selector} (超时: ${timeout}ms)`, 'info');

    // 发送消息到content script执行
    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'waitForElement',
        selector: step.selector,
        options: options
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      // 超时或失败时继续执行下一步
      this.sendLog(`⏰ 等待元素超时或失败: ${result.error}`, 'warn');
      this.sendLog(`⏭️ 跳过等待步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '等待元素失败', timeout: true, skipped: true };
    }

    if (result.found) {
      this.sendLog(`✅ 元素已找到: ${step.selector}`, 'success');
    } else {
      this.sendLog(`⏰ 等待超时，元素未找到: ${step.selector}`, 'warn');
      this.sendLog(`⏭️ 跳过等待步骤，继续执行下一步`, 'warn');
    }

    return { success: true, found: result.found, timeout: !result.found };
  }

  // 延迟步骤
  async delay(step) {
    const duration = step.options?.duration || 1000;
    await this.sleep(duration);
    return { success: true, duration: duration };
  }

  // 滚动页面
  async scroll(step) {
    this.sendLog(`📜 滚动页面: ${step.name}`, 'info');

    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'scroll',
        selector: step.selector,
        options: step.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      this.sendLog(`❌ 滚动操作失败: ${result.error}`, 'error');
      this.sendLog(`⏭️ 跳过滚动步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '滚动操作失败', skipped: true };
    }

    return { success: true };
  }

  // 鼠标悬停
  async hover(step) {
    this.sendLog(`🖱️ 鼠标悬停: ${step.name}`, 'info');

    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'hover',
        selector: step.selector,
        options: step.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      this.sendLog(`❌ 鼠标悬停失败: ${result.error}`, 'error');
      this.sendLog(`⏭️ 跳过悬停步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '悬停操作失败', skipped: true };
    }

    return { success: true };
  }

  // 选择下拉选项
  async selectOption(step) {
    this.sendLog(`📋 选择下拉选项: ${step.name}`, 'info');

    const value = this.resolveVariable(step.value);

    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'selectOption',
        selector: step.selector,
        value: value,
        options: step.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      this.sendLog(`❌ 选择选项失败: ${result.error}`, 'error');
      this.sendLog(`⏭️ 跳过选择步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '选择选项失败', skipped: true };
    }

    return { success: true, value: value };
  }

  // 上传文件
  async uploadFile(step) {
    this.sendLog(`📁 上传文件: ${step.name}`, 'info');

    const filePath = this.resolveVariable(step.value);

    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'uploadFile',
        selector: step.selector,
        filePath: filePath,
        options: step.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      this.sendLog(`❌ 上传文件失败: ${result.error}`, 'error');
      this.sendLog(`⏭️ 跳过上传步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '文件上传失败', skipped: true };
    }

    return { success: true, filePath: filePath };
  }

  // 执行自定义脚本
  async executeScript(step) {
    this.sendLog(`⚙️ 执行自定义脚本: ${step.name}`, 'info');

    const script = this.resolveVariable(step.value);

    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'executeScript',
        script: script,
        options: step.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      this.sendLog(`❌ 脚本执行失败: ${result.error}`, 'error');
      this.sendLog(`⏭️ 跳过脚本步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '脚本执行失败', skipped: true };
    }

    return { success: true, result: result.result };
  }

  // 等待页面导航
  async waitForNavigation(step) {
    this.sendLog(`🧭 等待页面导航: ${step.name}`, 'info');

    const timeout = step.options?.waitTimeout || step.options?.timeout || 10000; // 优先使用waitTimeout
    const expectedUrl = step.options?.expectedUrl;

    this.sendLog(`⏳ 等待页面导航 (超时: ${timeout}ms)`, 'info');

    const result = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId, {
        action: 'waitForNavigation',
        expectedUrl: expectedUrl,
        timeout: timeout,
        options: step.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (!result.success) {
      this.sendLog(`⏰ 等待页面导航超时或失败: ${result.error}`, 'warn');
      this.sendLog(`⏭️ 跳过导航步骤，继续执行下一步`, 'warn');
      return { success: false, error: result.error || '等待导航失败', timeout: true, skipped: true };
    }

    return { success: true, url: result.url };
  }

  // 条件判断步骤
  async conditional(step) {
    const condition = step.options?.condition;
    const trueSteps = step.options?.trueSteps || [];
    const falseSteps = step.options?.falseSteps || [];

    // 评估条件
    let conditionResult = false;

    if (condition?.type === 'elementExists') {
      const result = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(this.tabId, {
          action: 'checkElementExists',
          selector: condition.selector
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      conditionResult = result.exists;
    } else if (condition?.type === 'urlContains') {
      const result = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(this.tabId, {
          action: 'getPageInfo'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      conditionResult = result.info.url.includes(condition.value);
    }

    // 执行相应的步骤
    const stepsToExecute = conditionResult ? trueSteps : falseSteps;
    const results = [];

    for (const subStep of stepsToExecute) {
      const subResult = await this.executeStep(subStep);
      results.push(subResult);
    }

    return {
      success: true,
      conditionResult: conditionResult,
      executedSteps: stepsToExecute.length,
      results: results
    };
  }

  // 验证流程配置
  async validate() {
    const issues = [];

    // 检查基本配置
    if (!this.config.name) {
      issues.push('缺少流程名称');
    }

    if (!this.config.steps || this.config.steps.length === 0) {
      issues.push('缺少执行步骤');
    }

    // 检查每个步骤
    this.config.steps.forEach((step, index) => {
      if (!step.type) {
        issues.push(`步骤 ${index + 1}: 缺少步骤类型`);
      }

      if (!step.name) {
        issues.push(`步骤 ${index + 1}: 缺少步骤名称`);
      }

      // 检查特定步骤类型的必需字段
      switch (step.type) {
        case 'fillInput':
          if (!step.selector) {
            issues.push(`步骤 ${index + 1}: fillInput 缺少选择器`);
          }
          if (!step.value) {
            issues.push(`步骤 ${index + 1}: fillInput 缺少填充值`);
          }
          break;
        case 'clickButton':
          if (!step.selector) {
            issues.push(`步骤 ${index + 1}: clickButton 缺少选择器`);
          }
          break;
        case 'waitForElement':
          if (!step.selector) {
            issues.push(`步骤 ${index + 1}: waitForElement 缺少选择器`);
          }
          break;
      }
    });

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  // 继续执行（用于人机验证后继续）
  continueExecution() {
    if (this.isWaitingForHuman) {
      console.log('用户确认继续执行');
      this.isWaitingForHuman = false;

      // 清理检测定时器
      if (this.elementDetectionInterval) {
        clearInterval(this.elementDetectionInterval);
        this.elementDetectionInterval = null;
      }

      // 隐藏验证UI
      this.hideVerificationUI();

      // 继续执行下一步
      this.executeNextStep();
    }
  }

  // 跳过当前步骤
  skipCurrentStep() {
    if (this.isWaitingForHuman) {
      console.log('用户选择跳过当前步骤');
      this.isWaitingForHuman = false;

      // 清理检测定时器
      if (this.elementDetectionInterval) {
        clearInterval(this.elementDetectionInterval);
        this.elementDetectionInterval = null;
      }

      // 隐藏验证UI
      this.hideVerificationUI();

      // 跳过当前步骤，执行下一步
      this.currentStepIndex++;
      this.executeNextStep();
    }
  }

  // 隐藏验证UI
  async hideVerificationUI() {
    try {
      await chrome.tabs.sendMessage(this.tabId, {
        action: 'hideHumanVerification'
      });
    } catch (error) {
      console.debug('隐藏验证UI失败（可能是页面不支持）:', error.message);
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutomationRunner;
} else {
  globalThis.AutomationRunner = AutomationRunner;
}
