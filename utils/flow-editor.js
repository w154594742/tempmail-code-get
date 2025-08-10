// 可视化流程编辑器
class FlowEditor {
  constructor() {
    this.currentFlow = null;
    this.selectedStep = null;
    this.draggedStep = null;
    this.stepCounter = 0;
    this.init();
  }

  init() {
    this.setupStepPalette();
    this.setupEventListeners();
    console.log('FlowEditor 初始化完成');
  }

  // 设置步骤调色板
  setupStepPalette() {
    this.stepTypes = {
      fillInput: {
        name: '填充输入框',
        icon: '📝',
        description: '在输入框中填入文本',
        color: '#4285f4',
        defaultOptions: { delay: 500 }
      },
      clickButton: {
        name: '点击按钮',
        icon: '👆',
        description: '点击按钮或链接',
        color: '#34a853',
        defaultOptions: { delay: 1000 }
      },
      waitForElement: {
        name: '等待元素',
        icon: '⏳',
        description: '等待页面元素出现',
        color: '#fbbc04',
        defaultOptions: { timeout: 10000 }
      },
      humanVerification: {
        name: '人机验证',
        icon: '🔐',
        description: '需要用户手动完成验证',
        color: '#ff9800',
        defaultOptions: { timeout: 300000, skipable: true }
      },
      delay: {
        name: '延迟等待',
        icon: '⏱️',
        description: '固定时间延迟',
        color: '#9c27b0',
        defaultOptions: { duration: 2000 }
      },
      scroll: {
        name: '滚动页面',
        icon: '📜',
        description: '滚动到指定位置或元素',
        color: '#00bcd4',
        defaultOptions: { behavior: 'smooth' }
      },
      hover: {
        name: '鼠标悬停',
        icon: '🖱️',
        description: '在元素上悬停鼠标',
        color: '#795548',
        defaultOptions: { delay: 1000 }
      },
      conditional: {
        name: '条件判断',
        icon: '🔀',
        description: '根据条件执行不同步骤',
        color: '#607d8b',
        defaultOptions: { condition: { type: 'elementExists' } }
      }
    };
  }

  // 设置事件监听器
  setupEventListeners() {
    // 拖拽相关事件将在UI中设置
  }

  // 创建新流程
  createNewFlow(template = null) {
    if (template) {
      this.currentFlow = JSON.parse(JSON.stringify(template));
      this.currentFlow.id = this.generateId();
      this.currentFlow.createdAt = Date.now();
      this.currentFlow.updatedAt = Date.now();
    } else {
      this.currentFlow = {
        id: this.generateId(),
        name: '新建流程',
        domain: '*',
        description: '',
        steps: [],
        variables: {
          email: '{{generated_email}}',
          verificationCode: '{{fetched_code}}'
        },

        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
    
    this.stepCounter = this.currentFlow.steps.length;
    return this.currentFlow;
  }

  // 添加步骤
  addStep(stepType, position = -1) {
    const stepTemplate = this.stepTypes[stepType];
    if (!stepTemplate) {
      throw new Error(`未知的步骤类型: ${stepType}`);
    }

    const newStep = {
      id: `step-${++this.stepCounter}`,
      type: stepType,
      name: stepTemplate.name,
      description: stepTemplate.description,
      selector: '',
      value: '',
      options: { ...stepTemplate.defaultOptions }
    };

    if (position === -1) {
      this.currentFlow.steps.push(newStep);
    } else {
      this.currentFlow.steps.splice(position, 0, newStep);
    }

    this.currentFlow.updatedAt = Date.now();
    return newStep;
  }

  // 删除步骤
  removeStep(stepId) {
    const index = this.currentFlow.steps.findIndex(step => step.id === stepId);
    if (index !== -1) {
      this.currentFlow.steps.splice(index, 1);
      this.currentFlow.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  // 移动步骤
  moveStep(stepId, newPosition) {
    const currentIndex = this.currentFlow.steps.findIndex(step => step.id === stepId);
    if (currentIndex === -1) return false;

    const step = this.currentFlow.steps.splice(currentIndex, 1)[0];
    this.currentFlow.steps.splice(newPosition, 0, step);
    this.currentFlow.updatedAt = Date.now();
    return true;
  }

  // 更新步骤
  updateStep(stepId, updates) {
    const step = this.currentFlow.steps.find(step => step.id === stepId);
    if (!step) return false;

    Object.assign(step, updates);
    this.currentFlow.updatedAt = Date.now();
    return true;
  }

  // 复制步骤
  duplicateStep(stepId) {
    const step = this.currentFlow.steps.find(step => step.id === stepId);
    if (!step) return null;

    const duplicatedStep = JSON.parse(JSON.stringify(step));
    duplicatedStep.id = `step-${++this.stepCounter}`;
    duplicatedStep.name += ' (副本)';

    const index = this.currentFlow.steps.findIndex(step => step.id === stepId);
    this.currentFlow.steps.splice(index + 1, 0, duplicatedStep);
    this.currentFlow.updatedAt = Date.now();
    
    return duplicatedStep;
  }

  // 验证流程
  validateFlow() {
    const errors = [];
    const warnings = [];

    // 基本验证
    if (!this.currentFlow.name.trim()) {
      errors.push('流程名称不能为空');
    }

    if (this.currentFlow.steps.length === 0) {
      warnings.push('流程没有包含任何步骤');
    }

    // 步骤验证
    this.currentFlow.steps.forEach((step, index) => {
      const stepErrors = this.validateStep(step, index);
      errors.push(...stepErrors.errors);
      warnings.push(...stepErrors.warnings);
    });

    // 变量验证
    const usedVariables = this.extractUsedVariables();
    const definedVariables = Object.keys(this.currentFlow.variables || {});
    
    usedVariables.forEach(varName => {
      if (!definedVariables.includes(varName) && !['generated_email', 'fetched_code'].includes(varName)) {
        warnings.push(`使用了未定义的变量: ${varName}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 验证单个步骤
  validateStep(step, index) {
    const errors = [];
    const warnings = [];

    if (!step.name.trim()) {
      errors.push(`步骤 ${index + 1}: 名称不能为空`);
    }

    switch (step.type) {
      case 'fillInput':
        if (!step.selector.trim()) {
          errors.push(`步骤 ${index + 1}: 缺少选择器`);
        }
        if (!step.value.trim()) {
          errors.push(`步骤 ${index + 1}: 缺少填充值`);
        }
        break;
      case 'clickButton':
      case 'hover':
      case 'waitForElement':
        if (!step.selector.trim()) {
          errors.push(`步骤 ${index + 1}: 缺少选择器`);
        }
        break;
      case 'delay':
        if (!step.options?.duration || step.options.duration < 100) {
          warnings.push(`步骤 ${index + 1}: 延迟时间可能过短`);
        }
        break;
      case 'humanVerification':
        if (step.options?.timeout && step.options.timeout < 30000) {
          warnings.push(`步骤 ${index + 1}: 人机验证超时时间可能过短`);
        }
        break;
    }

    return { errors, warnings };
  }

  // 提取使用的变量
  extractUsedVariables() {
    const variables = new Set();
    const variableRegex = /\{\{(\w+)\}\}/g;

    this.currentFlow.steps.forEach(step => {
      if (step.value) {
        let match;
        while ((match = variableRegex.exec(step.value)) !== null) {
          variables.add(match[1]);
        }
      }
    });

    return Array.from(variables);
  }

  // 导出流程
  exportFlow() {
    return JSON.parse(JSON.stringify(this.currentFlow));
  }

  // 导入流程
  importFlow(flowData) {
    try {
      this.currentFlow = JSON.parse(JSON.stringify(flowData));
      this.stepCounter = this.currentFlow.steps.length;
      return true;
    } catch (error) {
      console.error('导入流程失败:', error);
      return false;
    }
  }

  // 生成选择器建议
  generateSelectorSuggestions(elementType) {
    const suggestions = {
      email: [
        'input[type="email"]',
        'input[name*="email"]',
        'input[id*="email"]',
        'input[placeholder*="email"]',
        '#email',
        '.email-input'
      ],
      password: [
        'input[type="password"]',
        'input[name*="password"]',
        'input[id*="password"]',
        '#password',
        '.password-input'
      ],
      submit: [
        'button[type="submit"]',
        'input[type="submit"]',
        '.btn-submit',
        '.submit-btn',
        '#submit',
        'button:contains("提交")',
        'button:contains("注册")'
      ],
      verificationCode: [
        'input[name*="code"]',
        'input[name*="verify"]',
        'input[id*="code"]',
        'input[placeholder*="验证码"]',
        '#verification-code',
        '.code-input'
      ]
    };

    return suggestions[elementType] || [];
  }

  // 生成ID
  generateId() {
    return `flow_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // 获取步骤类型信息
  getStepTypeInfo(stepType) {
    return this.stepTypes[stepType] || null;
  }

  // 获取所有步骤类型
  getAllStepTypes() {
    return Object.keys(this.stepTypes).map(type => ({
      type,
      ...this.stepTypes[type]
    }));
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlowEditor;
} else {
  globalThis.FlowEditor = FlowEditor;
}
