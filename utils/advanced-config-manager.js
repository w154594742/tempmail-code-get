// 高级配置管理器
class AdvancedConfigManager {
  constructor() {
    this.environments = new Map();
    this.profiles = new Map();
    this.currentEnvironment = 'default';
    this.currentProfile = 'default';
    this.configSchema = this.defineConfigSchema();
    this.init();
  }

  async init() {
    await this.loadEnvironments();
    await this.loadProfiles();
    await this.initializeDefaultConfigs();
    console.log('AdvancedConfigManager 初始化完成');
  }

  // 定义配置架构
  defineConfigSchema() {
    return {
      execution: {
        type: 'object',
        properties: {
          maxRetries: { type: 'number', min: 0, max: 10, default: 3 },
          retryInterval: { type: 'number', min: 500, max: 30000, default: 2000 },
          pageLoadTimeout: { type: 'number', min: 5000, max: 60000, default: 10000 },
          elementTimeout: { type: 'number', min: 1000, max: 30000, default: 5000 },
          stepDelay: { type: 'number', min: 0, max: 5000, default: 500 },
          parallelExecution: { type: 'boolean', default: false },
          failFast: { type: 'boolean', default: false }
        }
      },
      humanVerification: {
        type: 'object',
        properties: {
          defaultTimeout: { type: 'number', min: 30000, max: 600000, default: 300000 },
          autoDetection: { type: 'boolean', default: true },
          skipWhenPossible: { type: 'boolean', default: true },
          retryOnFailure: { type: 'boolean', default: true },
          maxRetries: { type: 'number', min: 0, max: 5, default: 2 },
          notificationSound: { type: 'boolean', default: true }
        }
      },

      security: {
        type: 'object',
        properties: {
          allowScriptExecution: { type: 'boolean', default: false },
          restrictDomains: { type: 'array', items: { type: 'string' }, default: [] },
          requireConfirmation: { type: 'boolean', default: true },
          logSensitiveData: { type: 'boolean', default: false },
          encryptStorage: { type: 'boolean', default: false }
        }
      },
      ui: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark', 'auto'], default: 'auto' },
          language: { type: 'string', enum: ['zh-CN', 'en-US'], default: 'zh-CN' },
          showAdvancedOptions: { type: 'boolean', default: false },
          compactMode: { type: 'boolean', default: false },
          animationsEnabled: { type: 'boolean', default: true },
          soundEnabled: { type: 'boolean', default: true }
        }
      },
      logging: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'], default: 'INFO' },
          maxEntries: { type: 'number', min: 100, max: 10000, default: 1000 },
          persistLogs: { type: 'boolean', default: true },
          exportFormat: { type: 'string', enum: ['json', 'csv', 'txt'], default: 'json' },
          includeStackTrace: { type: 'boolean', default: false }
        }
      }
    };
  }

  // 初始化默认配置
  async initializeDefaultConfigs() {
    // 默认环境
    if (!this.environments.has('default')) {
      const defaultEnv = {
        id: 'default',
        name: '默认环境',
        description: '标准配置环境',
        config: this.generateDefaultConfig(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.environments.set('default', defaultEnv);
      await this.saveEnvironment(defaultEnv);
    }

    // 开发环境
    if (!this.environments.has('development')) {
      const devEnv = {
        id: 'development',
        name: '开发环境',
        description: '用于开发和测试的配置',
        config: {
          ...this.generateDefaultConfig(),
          execution: {
            ...this.generateDefaultConfig().execution,
            maxRetries: 1,
            stepDelay: 1000
          },
          logging: {
            ...this.generateDefaultConfig().logging,
            level: 'DEBUG',
            includeStackTrace: true
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.environments.set('development', devEnv);
      await this.saveEnvironment(devEnv);
    }

    // 生产环境
    if (!this.environments.has('production')) {
      const prodEnv = {
        id: 'production',
        name: '生产环境',
        description: '用于生产环境的优化配置',
        config: {
          ...this.generateDefaultConfig(),
          execution: {
            ...this.generateDefaultConfig().execution,
            maxRetries: 5,
            retryInterval: 3000
          },
          security: {
            ...this.generateDefaultConfig().security,
            requireConfirmation: true,
            logSensitiveData: false
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.environments.set('production', prodEnv);
      await this.saveEnvironment(prodEnv);
    }
  }

  // 生成默认配置
  generateDefaultConfig() {
    const config = {};
    
    Object.keys(this.configSchema).forEach(section => {
      config[section] = {};
      Object.keys(this.configSchema[section].properties).forEach(key => {
        config[section][key] = this.configSchema[section].properties[key].default;
      });
    });
    
    return config;
  }

  // 创建环境
  async createEnvironment(envData) {
    const environment = {
      id: envData.id || this.generateId(),
      name: envData.name,
      description: envData.description || '',
      config: envData.config || this.generateDefaultConfig(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 验证配置
    const validation = this.validateConfig(environment.config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    this.environments.set(environment.id, environment);
    await this.saveEnvironment(environment);
    
    return environment;
  }

  // 更新环境
  async updateEnvironment(envId, updates) {
    const environment = this.environments.get(envId);
    if (!environment) {
      throw new Error(`环境不存在: ${envId}`);
    }

    // 合并更新
    Object.assign(environment, updates, { updatedAt: Date.now() });

    // 验证配置
    if (updates.config) {
      const validation = this.validateConfig(environment.config);
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }
    }

    await this.saveEnvironment(environment);
    return environment;
  }

  // 删除环境
  async deleteEnvironment(envId) {
    if (envId === 'default') {
      throw new Error('不能删除默认环境');
    }

    if (this.currentEnvironment === envId) {
      this.currentEnvironment = 'default';
    }

    this.environments.delete(envId);
    await this.removeEnvironmentFromStorage(envId);
  }

  // 切换环境
  async switchEnvironment(envId) {
    const environment = this.environments.get(envId);
    if (!environment) {
      throw new Error(`环境不存在: ${envId}`);
    }

    this.currentEnvironment = envId;
    await this.saveCurrentEnvironment();
    
    return environment;
  }

  // 创建配置文件
  async createProfile(profileData) {
    const profile = {
      id: profileData.id || this.generateId(),
      name: profileData.name,
      description: profileData.description || '',
      environmentId: profileData.environmentId || 'default',
      overrides: profileData.overrides || {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.profiles.set(profile.id, profile);
    await this.saveProfile(profile);
    
    return profile;
  }

  // 获取当前配置
  getCurrentConfig() {
    const environment = this.environments.get(this.currentEnvironment);
    const profile = this.profiles.get(this.currentProfile);
    
    if (!environment) {
      throw new Error(`当前环境不存在: ${this.currentEnvironment}`);
    }

    let config = JSON.parse(JSON.stringify(environment.config));
    
    // 应用配置文件覆盖
    if (profile && profile.overrides) {
      config = this.mergeConfigs(config, profile.overrides);
    }
    
    return config;
  }

  // 合并配置
  mergeConfigs(baseConfig, overrides) {
    const merged = JSON.parse(JSON.stringify(baseConfig));
    
    Object.keys(overrides).forEach(section => {
      if (merged[section]) {
        Object.assign(merged[section], overrides[section]);
      } else {
        merged[section] = overrides[section];
      }
    });
    
    return merged;
  }

  // 验证配置
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    Object.keys(this.configSchema).forEach(section => {
      if (!config[section]) {
        errors.push(`缺少配置节: ${section}`);
        return;
      }

      const sectionSchema = this.configSchema[section];
      Object.keys(sectionSchema.properties).forEach(key => {
        const value = config[section][key];
        const property = sectionSchema.properties[key];
        
        // 类型检查
        if (value !== undefined && typeof value !== property.type) {
          if (!(property.type === 'array' && Array.isArray(value))) {
            errors.push(`${section}.${key}: 类型错误，期望 ${property.type}`);
          }
        }
        
        // 范围检查
        if (property.type === 'number' && value !== undefined) {
          if (property.min !== undefined && value < property.min) {
            errors.push(`${section}.${key}: 值过小，最小值为 ${property.min}`);
          }
          if (property.max !== undefined && value > property.max) {
            errors.push(`${section}.${key}: 值过大，最大值为 ${property.max}`);
          }
        }
        
        // 枚举检查
        if (property.enum && value !== undefined) {
          if (!property.enum.includes(value)) {
            errors.push(`${section}.${key}: 无效值，允许的值为 ${property.enum.join(', ')}`);
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 导出配置
  exportConfig(format = 'json') {
    const exportData = {
      environments: Array.from(this.environments.values()),
      profiles: Array.from(this.profiles.values()),
      currentEnvironment: this.currentEnvironment,
      currentProfile: this.currentProfile,
      exportedAt: Date.now(),
      version: '2.0'
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'yaml':
        // 简化的YAML导出
        return this.toYAML(exportData);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  // 导入配置
  async importConfig(configData, format = 'json') {
    try {
      let data;
      
      switch (format) {
        case 'json':
          data = JSON.parse(configData);
          break;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }

      // 验证导入数据
      if (!data.environments || !Array.isArray(data.environments)) {
        throw new Error('无效的配置数据：缺少环境配置');
      }

      // 导入环境
      for (const env of data.environments) {
        const validation = this.validateConfig(env.config);
        if (!validation.valid) {
          console.warn(`环境 ${env.name} 配置验证失败:`, validation.errors);
          continue;
        }
        
        this.environments.set(env.id, env);
        await this.saveEnvironment(env);
      }

      // 导入配置文件
      if (data.profiles && Array.isArray(data.profiles)) {
        for (const profile of data.profiles) {
          this.profiles.set(profile.id, profile);
          await this.saveProfile(profile);
        }
      }

      return { success: true, message: '配置导入成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 获取配置建议
  getConfigRecommendations(context = {}) {
    const recommendations = [];
    const currentConfig = this.getCurrentConfig();

    // 基于使用场景的建议
    if (context.scenario === 'development') {
      recommendations.push({
        type: 'environment',
        message: '建议切换到开发环境以获得更详细的调试信息',
        action: 'switchEnvironment',
        target: 'development'
      });
    }

    // 基于性能的建议
    if (currentConfig.execution.maxRetries > 5) {
      recommendations.push({
        type: 'performance',
        message: '重试次数过多可能影响性能，建议优化选择器稳定性',
        action: 'updateConfig',
        target: 'execution.maxRetries',
        suggestedValue: 3
      });
    }

    // 基于安全的建议
    if (currentConfig.security.allowScriptExecution) {
      recommendations.push({
        type: 'security',
        message: '允许脚本执行存在安全风险，建议仅在必要时启用',
        action: 'updateConfig',
        target: 'security.allowScriptExecution',
        suggestedValue: false
      });
    }

    return recommendations;
  }

  // ========== 存储相关方法 ==========

  async loadEnvironments() {
    try {
      const result = await storageManager.getConfig('advancedConfig');
      if (result.environments) {
        result.environments.forEach(env => {
          this.environments.set(env.id, env);
        });
      }
    } catch (error) {
      console.warn('加载环境配置失败:', error);
    }
  }

  async loadProfiles() {
    try {
      const result = await storageManager.getConfig('advancedConfig');
      if (result.profiles) {
        result.profiles.forEach(profile => {
          this.profiles.set(profile.id, profile);
        });
      }
      
      this.currentEnvironment = result.currentEnvironment || 'default';
      this.currentProfile = result.currentProfile || 'default';
    } catch (error) {
      console.warn('加载配置文件失败:', error);
    }
  }

  async saveEnvironment(environment) {
    const config = await storageManager.getConfig('advancedConfig') || {};
    config.environments = config.environments || [];
    
    const index = config.environments.findIndex(env => env.id === environment.id);
    if (index !== -1) {
      config.environments[index] = environment;
    } else {
      config.environments.push(environment);
    }
    
    await storageManager.setConfig('advancedConfig', config);
  }

  async saveProfile(profile) {
    const config = await storageManager.getConfig('advancedConfig') || {};
    config.profiles = config.profiles || [];
    
    const index = config.profiles.findIndex(p => p.id === profile.id);
    if (index !== -1) {
      config.profiles[index] = profile;
    } else {
      config.profiles.push(profile);
    }
    
    await storageManager.setConfig('advancedConfig', config);
  }

  async saveCurrentEnvironment() {
    const config = await storageManager.getConfig('advancedConfig') || {};
    config.currentEnvironment = this.currentEnvironment;
    config.currentProfile = this.currentProfile;
    await storageManager.setConfig('advancedConfig', config);
  }

  async removeEnvironmentFromStorage(envId) {
    const config = await storageManager.getConfig('advancedConfig') || {};
    if (config.environments) {
      config.environments = config.environments.filter(env => env.id !== envId);
      await storageManager.setConfig('advancedConfig', config);
    }
  }

  // 辅助方法
  generateId() {
    return `config_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  toYAML(obj, indent = 0) {
    // 简化的YAML转换
    const spaces = ' '.repeat(indent);
    let yaml = '';
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 2)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          yaml += `${spaces}  - ${item}\n`;
        });
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    });
    
    return yaml;
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedConfigManager;
} else {
  globalThis.AdvancedConfigManager = AdvancedConfigManager;
}
