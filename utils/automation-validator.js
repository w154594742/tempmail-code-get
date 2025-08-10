// 自动化配置验证和迁移系统
class AutomationValidator {
  constructor() {
    this.currentVersion = '2.0';
    this.migrationHandlers = new Map();
    this.validationRules = new Map();
    this.init();
  }

  init() {
    this.setupMigrationHandlers();
    this.setupValidationRules();
  }

  // 设置迁移处理器
  setupMigrationHandlers() {
    // 从1.0迁移到2.0
    this.migrationHandlers.set('1.0->2.0', (oldConfig) => {
      const newConfig = {
        version: '2.0',
        flows: [],
        executionStates: {},

      };

      // 如果有旧的固定流程配置，转换为新的步骤数组格式
      if (oldConfig.fixedFlows) {
        oldConfig.fixedFlows.forEach(oldFlow => {
          const newFlow = this.convertLegacyFlow(oldFlow);
          newConfig.flows.push(newFlow);
        });
      }

      return newConfig;
    });
  }

  // 设置验证规则
  setupValidationRules() {
    // 流程配置验证规则
    this.validationRules.set('flow', {
      required: ['id', 'name', 'steps'],
      optional: ['domain', 'description', 'variables', 'globalOptions', 'enabled'],
      validators: {
        id: (value) => typeof value === 'string' && value.length > 0,
        name: (value) => typeof value === 'string' && value.length > 0,
        domain: (value) => typeof value === 'string',
        steps: (value) => Array.isArray(value) && value.length > 0,
        variables: (value) => typeof value === 'object',
        globalOptions: (value) => typeof value === 'object',
        enabled: (value) => typeof value === 'boolean'
      }
    });

    // 步骤验证规则
    this.validationRules.set('step', {
      required: ['id', 'type', 'name'],
      optional: ['description', 'selector', 'value', 'options'],
      validators: {
        id: (value) => typeof value === 'string' && value.length > 0,
        type: (value) => [
          'fillInput', 'clickButton', 'waitForElement', 'humanVerification', 'delay',
          'scroll', 'hover', 'selectOption', 'uploadFile', 'executeScript',
          'waitForNavigation', 'conditional'
        ].includes(value),
        name: (value) => typeof value === 'string' && value.length > 0,
        description: (value) => typeof value === 'string',
        selector: (value) => typeof value === 'string',
        value: (value) => typeof value === 'string',
        options: (value) => typeof value === 'object'
      }
    });

    // 执行状态验证规则
    this.validationRules.set('executionState', {
      required: ['executionId', 'status', 'currentStepIndex'],
      optional: ['totalSteps', 'startTime', 'errors', 'stepResults', 'context'],
      validators: {
        executionId: (value) => typeof value === 'string' && value.length > 0,
        status: (value) => ['idle', 'running', 'paused', 'completed', 'error', 'stopped'].includes(value),
        currentStepIndex: (value) => typeof value === 'number' && value >= 0,
        totalSteps: (value) => typeof value === 'number' && value > 0,
        startTime: (value) => typeof value === 'number',
        errors: (value) => Array.isArray(value),
        stepResults: (value) => Array.isArray(value),
        context: (value) => typeof value === 'object'
      }
    });
  }

  // 验证自动化配置
  async validateAutomationConfig(config) {
    const errors = [];
    const warnings = [];

    try {
      // 检查版本
      if (!config.version) {
        warnings.push('配置缺少版本信息，将使用默认版本');
        config.version = this.currentVersion;
      }

      // 检查是否需要迁移
      if (config.version !== this.currentVersion) {
        const migrationResult = await this.migrateConfig(config);
        if (!migrationResult.success) {
          errors.push(`配置迁移失败: ${migrationResult.error}`);
          return { valid: false, errors, warnings };
        }
        config = migrationResult.config;
        warnings.push(`配置已从版本 ${migrationResult.fromVersion} 迁移到 ${migrationResult.toVersion}`);
      }

      // 验证流程配置
      if (config.flows) {
        config.flows.forEach((flow, index) => {
          const flowValidation = this.validateFlow(flow);
          if (!flowValidation.valid) {
            errors.push(`流程 ${index + 1} (${flow.name || 'unnamed'}) 验证失败:`);
            errors.push(...flowValidation.errors.map(err => `  - ${err}`));
          }
          warnings.push(...flowValidation.warnings.map(warn => `流程 ${index + 1}: ${warn}`));
        });
      }

      // 验证执行状态
      if (config.executionStates) {
        Object.entries(config.executionStates).forEach(([executionId, state]) => {
          const stateValidation = this.validateExecutionState(state);
          if (!stateValidation.valid) {
            errors.push(`执行状态 ${executionId} 验证失败:`);
            errors.push(...stateValidation.errors.map(err => `  - ${err}`));
          }
        });
      }

      // 验证全局选项
      if (config.globalOptions) {
        const globalValidation = this.validateGlobalOptions(config.globalOptions);
        if (!globalValidation.valid) {
          errors.push('全局选项验证失败:');
          errors.push(...globalValidation.errors.map(err => `  - ${err}`));
        }
      }

    } catch (error) {
      errors.push(`配置验证过程中发生错误: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config
    };
  }

  // 验证流程配置
  validateFlow(flow) {
    return this.validateObject(flow, 'flow', (flow) => {
      const errors = [];
      const warnings = [];

      // 验证步骤
      if (flow.steps) {
        flow.steps.forEach((step, index) => {
          const stepValidation = this.validateStep(step);
          if (!stepValidation.valid) {
            errors.push(`步骤 ${index + 1} (${step.name || 'unnamed'}) 验证失败:`);
            errors.push(...stepValidation.errors.map(err => `  - ${err}`));
          }
          warnings.push(...stepValidation.warnings.map(warn => `步骤 ${index + 1}: ${warn}`));
        });
      }

      // 检查域名格式
      if (flow.domain && flow.domain !== '*') {
        if (!this.isValidDomain(flow.domain)) {
          warnings.push('域名格式可能不正确');
        }
      }

      // 检查变量引用
      if (flow.variables && flow.steps) {
        const usedVariables = this.extractUsedVariables(flow.steps);
        const definedVariables = Object.keys(flow.variables);
        
        usedVariables.forEach(varName => {
          if (!definedVariables.includes(varName) && !['generated_email', 'fetched_code'].includes(varName)) {
            warnings.push(`使用了未定义的变量: ${varName}`);
          }
        });
      }

      return { errors, warnings };
    });
  }

  // 验证步骤配置
  validateStep(step) {
    return this.validateObject(step, 'step', (step) => {
      const errors = [];
      const warnings = [];

      // 特定步骤类型的验证
      switch (step.type) {
        case 'fillInput':
          if (!step.selector) errors.push('fillInput 步骤缺少选择器');
          if (!step.value) errors.push('fillInput 步骤缺少填充值');
          break;
        case 'clickButton':
          if (!step.selector) errors.push('clickButton 步骤缺少选择器');
          break;
        case 'waitForElement':
          if (!step.selector) errors.push('waitForElement 步骤缺少选择器');
          if (step.options?.timeout && step.options.timeout < 1000) {
            warnings.push('等待超时时间可能过短');
          }
          break;
        case 'humanVerification':
          if (step.options?.timeout && step.options.timeout < 30000) {
            warnings.push('人机验证超时时间可能过短');
          }
          break;
        case 'delay':
          if (!step.options?.duration) {
            warnings.push('delay 步骤建议设置持续时间');
          }
          break;
        case 'scroll':
          // scroll可以没有selector（滚动页面）或有selector（滚动到元素）
          break;
        case 'hover':
          if (!step.selector) errors.push('hover 步骤缺少选择器');
          break;
        case 'selectOption':
          if (!step.selector) errors.push('selectOption 步骤缺少选择器');
          if (!step.value) errors.push('selectOption 步骤缺少选择值');
          break;
        case 'uploadFile':
          if (!step.selector) errors.push('uploadFile 步骤缺少选择器');
          if (!step.value) warnings.push('uploadFile 步骤建议设置文件路径');
          break;
        case 'executeScript':
          if (!step.value) errors.push('executeScript 步骤缺少脚本内容');
          warnings.push('executeScript 步骤存在安全风险，请谨慎使用');
          break;
        case 'waitForNavigation':
          if (step.options?.timeout && step.options.timeout < 5000) {
            warnings.push('导航等待超时时间可能过短');
          }
          break;
        case 'conditional':
          if (!step.options?.condition) {
            errors.push('conditional 步骤缺少条件配置');
          } else {
            const condition = step.options.condition;
            if (!condition.type) {
              errors.push('conditional 步骤的条件缺少类型');
            }
            if (condition.type === 'elementExists' && !condition.selector) {
              errors.push('elementExists 条件缺少选择器');
            }
            if (condition.type === 'urlContains' && !condition.value) {
              errors.push('urlContains 条件缺少匹配值');
            }
          }
          break;
      }

      // 检查选择器格式
      if (step.selector) {
        const selectorValidation = this.validateSelector(step.selector);
        if (!selectorValidation.valid) {
          warnings.push(`选择器可能有问题: ${selectorValidation.error}`);
        }
      }

      return { errors, warnings };
    });
  }

  // 验证执行状态
  validateExecutionState(state) {
    return this.validateObject(state, 'executionState');
  }



  // 通用对象验证
  validateObject(obj, type, customValidator) {
    const errors = [];
    const warnings = [];
    const rules = this.validationRules.get(type);

    if (!rules) {
      errors.push(`未知的验证类型: ${type}`);
      return { valid: false, errors, warnings };
    }

    // 检查必需字段
    rules.required.forEach(field => {
      if (!(field in obj)) {
        errors.push(`缺少必需字段: ${field}`);
      }
    });

    // 验证字段值
    Object.entries(obj).forEach(([field, value]) => {
      const validator = rules.validators[field];
      if (validator && !validator(value)) {
        errors.push(`字段 ${field} 的值无效`);
      }
    });

    // 执行自定义验证
    if (customValidator) {
      const customResult = customValidator(obj);
      errors.push(...customResult.errors);
      warnings.push(...customResult.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // 迁移配置
  async migrateConfig(config) {
    try {
      const fromVersion = config.version || '1.0';
      const toVersion = this.currentVersion;
      
      if (fromVersion === toVersion) {
        return { success: true, config, fromVersion, toVersion };
      }

      const migrationKey = `${fromVersion}->${toVersion}`;
      const migrationHandler = this.migrationHandlers.get(migrationKey);

      if (!migrationHandler) {
        return { 
          success: false, 
          error: `不支持从版本 ${fromVersion} 迁移到 ${toVersion}` 
        };
      }

      const migratedConfig = migrationHandler(config);
      migratedConfig.version = toVersion;

      return { 
        success: true, 
        config: migratedConfig, 
        fromVersion, 
        toVersion 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // 转换旧版流程格式
  convertLegacyFlow(oldFlow) {
    return {
      id: oldFlow.id || `legacy_${Date.now()}`,
      name: oldFlow.name || '迁移的流程',
      domain: oldFlow.domain || '*',
      description: oldFlow.description || '从旧版本迁移的流程',
      steps: oldFlow.steps || [],
      variables: oldFlow.variables || {},
      globalOptions: oldFlow.options || {},
      enabled: oldFlow.enabled !== false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // 验证域名格式
  isValidDomain(domain) {
    if (domain === '*') return true;
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  // 验证选择器格式
  validateSelector(selector) {
    try {
      // 在Service Worker环境中，我们只能做基本的语法检查
      if (typeof document === 'undefined') {
        // 基本的CSS选择器语法检查
        if (!selector || typeof selector !== 'string') {
          return { valid: false, error: '选择器必须是非空字符串' };
        }

        // 检查一些明显的语法错误
        if (selector.includes('::') && !selector.includes('::before') && !selector.includes('::after')) {
          return { valid: false, error: '伪元素选择器语法可能有误' };
        }

        return { valid: true };
      }

      // 在有document的环境中进行实际验证
      document.createElement('div').querySelector(selector);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // 提取使用的变量
  extractUsedVariables(steps) {
    const variables = new Set();
    const variableRegex = /\{\{(\w+)\}\}/g;

    steps.forEach(step => {
      if (step.value) {
        let match;
        while ((match = variableRegex.exec(step.value)) !== null) {
          variables.add(match[1]);
        }
      }
    });

    return Array.from(variables);
  }
}

// 导出单例
const automationValidator = new AutomationValidator();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = automationValidator;
} else if (typeof window !== 'undefined') {
  globalThis.automationValidator = automationValidator;
} else {
  // Service Worker环境
  globalThis.automationValidator = automationValidator;
}
