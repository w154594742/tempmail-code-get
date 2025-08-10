// 自动化流程配置模板
class AutomationTemplates {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  // 初始化模板
  initializeTemplates() {
    return {
      // Gmail注册流程模板
      gmail: {
        id: "gmail-registration-template",
        name: "Gmail注册流程",
        domain: "accounts.google.com",
        description: "Gmail账号注册的完整自动化流程，包含人机验证处理",
        steps: [
          {
            id: "step-1",
            type: "fillInput",
            name: "填入邮箱地址",
            description: "在邮箱输入框中填入生成的邮箱地址",
            selector: "input[type='email']",
            value: "{{email}}",
            options: {
              delay: 500,
              clearFirst: true,
              waitForElement: 3000
            }
          },
          {
            id: "step-2",
            type: "clickButton",
            name: "点击下一步",
            description: "点击下一步按钮继续",
            selector: "#identifierNext",
            options: {
              delay: 1000,
              waitForElement: 2000
            }
          },
          {
            id: "step-3",
            type: "humanVerification",
            name: "完成人机验证",
            description: "请手动完成Google的人机验证（reCAPTCHA或其他验证方式）",
            options: {
              timeout: 300000,
              checkInterval: 1000,
              skipable: false,
              retryable: true
            }
          },
          {
            id: "step-4",
            type: "waitForElement",
            name: "等待验证码输入框",
            description: "等待邮箱验证码输入框出现",
            selector: "input[name='code']",
            options: {
              timeout: 10000,
              checkInterval: 500
            }
          },
          {
            id: "step-5",
            type: "fillInput",
            name: "填入验证码",
            description: "填入从邮箱获取的验证码",
            selector: "input[name='code']",
            value: "{{code}}",
            options: { delay: 300 }
          },
          {
            id: "step-6",
            type: "clickButton",
            name: "完成注册",
            description: "点击完成按钮提交注册",
            selector: "#next",
            options: { delay: 1000 }
          }
        ],
        variables: {
          email: "{{email}}",
          code: "{{fetched_code}}"
        },
        globalOptions: {
          maxRetries: 3,
          retryInterval: 2000,
          pageLoadTimeout: 10000
        },
        enabled: true
      },

      // 通用注册表单模板
      generic: {
        id: "generic-registration-template",
        name: "通用注册表单",
        domain: "*",
        description: "适用于大多数网站的通用注册流程，包含多个可能的人机验证点",
        steps: [
          {
            id: "step-1",
            type: "fillInput",
            name: "填入邮箱",
            description: "在邮箱输入框中填入生成的邮箱地址",
            selector: "input[type='email'], input[name*='email'], input[id*='email']",
            value: "{{email}}",
            options: { delay: 500 }
          },
          {
            id: "step-2",
            type: "humanVerification",
            name: "注册前验证",
            description: "某些网站在填入邮箱后就需要完成人机验证",
            options: {
              timeout: 180000,
              skipable: true
            }
          },
          {
            id: "step-3",
            type: "clickButton",
            name: "点击注册/下一步",
            description: "点击注册或下一步按钮",
            selector: "button[type='submit'], input[type='submit'], .btn-next, .btn-register",
            options: { delay: 1000 }
          },
          {
            id: "step-4",
            type: "waitForElement",
            name: "等待验证码输入",
            description: "等待验证码输入框出现",
            selector: "input[name*='code'], input[name*='verify'], input[placeholder*='验证码']",
            options: { timeout: 15000 }
          },
          {
            id: "step-5",
            type: "fillInput",
            name: "填入验证码",
            description: "填入从邮箱获取的验证码",
            selector: "input[name*='code'], input[name*='verify'], input[placeholder*='验证码']",
            value: "{{code}}",
            options: { delay: 300 }
          },
          {
            id: "step-6",
            type: "humanVerification",
            name: "最终验证",
            description: "完成最终的人机验证后提交",
            options: {
              timeout: 180000,
              skipable: true
            }
          },
          {
            id: "step-7",
            type: "clickButton",
            name: "完成注册",
            description: "点击完成按钮提交注册",
            selector: ".btn-complete, .btn-finish, button:contains('完成'), button:contains('提交')",
            options: { delay: 1000 }
          }
        ],
        variables: {
          email: "{{email}}",
          code: "{{fetched_code}}"
        },
        globalOptions: {
          maxRetries: 3,
          retryInterval: 2000,
          pageLoadTimeout: 10000
        },
        enabled: true
      },

      // 简单注册流程模板
      simple: {
        id: "simple-registration-template",
        name: "简单注册+人机验证",
        domain: "example.com",
        description: "简单的注册流程，包含基本的邮箱填入和人机验证",
        steps: [
          {
            id: "step-1",
            type: "fillInput",
            name: "填入邮箱",
            description: "在邮箱输入框中填入生成的邮箱地址",
            selector: "#email",
            value: "{{email}}",
            options: { delay: 300 }
          },
          {
            id: "step-2",
            type: "humanVerification",
            name: "完成验证码",
            description: "请输入图片验证码或完成滑块验证",
            options: {
              timeout: 120000,
              skipable: true,
              autoDetect: true
            }
          },
          {
            id: "step-3",
            type: "clickButton",
            name: "提交注册",
            description: "点击提交按钮完成注册",
            selector: "#submit",
            options: { delay: 500 }
          }
        ],
        variables: {
          email: "{{email}}"
        },
        globalOptions: {
          maxRetries: 2,
          retryInterval: 1500,
          pageLoadTimeout: 8000
        },
        enabled: true
      },

      // 高级注册流程模板（包含新步骤类型）
      advanced: {
        id: "advanced-registration-template",
        name: "高级注册流程",
        domain: "*",
        description: "包含多种步骤类型的高级注册流程示例",
        steps: [
          {
            id: "step-1",
            type: "scroll",
            name: "滚动到注册区域",
            description: "滚动页面到注册表单区域",
            selector: ".registration-form",
            options: {
              behavior: "smooth",
              block: "center",
              delay: 500
            }
          },
          {
            id: "step-2",
            type: "fillInput",
            name: "填入邮箱",
            description: "在邮箱输入框中填入生成的邮箱地址",
            selector: "input[type='email']",
            value: "{{email}}",
            options: {
              delay: 500,
              typeSlowly: true,
              typeDelay: 100
            }
          },
          {
            id: "step-3",
            type: "conditional",
            name: "检查密码字段",
            description: "如果存在密码字段则填入",
            options: {
              condition: {
                type: "elementExists",
                selector: "input[type='password']"
              },
              trueSteps: [
                {
                  type: "fillInput",
                  selector: "input[type='password']",
                  value: "TempPassword123!",
                  options: { delay: 300 }
                }
              ]
            }
          },
          {
            id: "step-4",
            type: "hover",
            name: "悬停提交按钮",
            description: "悬停在提交按钮上以触发任何悬停效果",
            selector: "button[type='submit']",
            options: { delay: 1000 }
          },
          {
            id: "step-5",
            type: "humanVerification",
            name: "完成人机验证",
            description: "请完成任何出现的人机验证",
            options: {
              timeout: 300000,
              skipable: true,
              autoDetect: true,
              retryable: true
            }
          },
          {
            id: "step-6",
            type: "clickButton",
            name: "提交注册",
            description: "点击提交按钮",
            selector: "button[type='submit']",
            options: { delay: 1000 }
          },
          {
            id: "step-7",
            type: "waitForNavigation",
            name: "等待页面跳转",
            description: "等待注册成功后的页面跳转",
            options: {
              timeout: 15000,
              expectedUrl: "success"
            }
          }
        ],
        variables: {
          email: "{{email}}"
        },
        globalOptions: {
          maxRetries: 3,
          retryInterval: 2000,
          pageLoadTimeout: 10000
        },
        enabled: true
      }
    };
  }

  // 获取所有模板
  getAllTemplates() {
    return Object.values(this.templates);
  }

  // 获取指定模板
  getTemplate(templateId) {
    return Object.values(this.templates).find(template => template.id === templateId);
  }

  // 根据域名获取推荐模板
  getRecommendedTemplates(domain) {
    const templates = this.getAllTemplates();
    const recommendations = [];

    // 精确匹配
    const exactMatch = templates.filter(template => template.domain === domain);
    if (exactMatch.length > 0) {
      recommendations.push(...exactMatch);
    }

    // 通用模板
    const genericTemplates = templates.filter(template => template.domain === '*');
    recommendations.push(...genericTemplates);

    return recommendations;
  }

  // 创建基于模板的新流程
  createFlowFromTemplate(templateId, customizations = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    // 深拷贝模板
    const newFlow = JSON.parse(JSON.stringify(template));
    
    // 生成新的ID
    newFlow.id = `flow_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // 应用自定义配置
    if (customizations.name) {
      newFlow.name = customizations.name;
    }
    
    if (customizations.domain) {
      newFlow.domain = customizations.domain;
    }
    
    if (customizations.description) {
      newFlow.description = customizations.description;
    }

    // 应用步骤自定义
    if (customizations.steps) {
      customizations.steps.forEach((stepCustomization, index) => {
        if (newFlow.steps[index]) {
          Object.assign(newFlow.steps[index], stepCustomization);
        }
      });
    }

    // 应用变量自定义
    if (customizations.variables) {
      Object.assign(newFlow.variables, customizations.variables);
    }

    // 应用全局选项自定义
    if (customizations.globalOptions) {
      Object.assign(newFlow.globalOptions, customizations.globalOptions);
    }

    // 设置时间戳
    newFlow.createdAt = Date.now();
    newFlow.updatedAt = Date.now();

    return newFlow;
  }

  // 验证模板
  validateTemplate(template) {
    const errors = [];

    if (!template.id) errors.push('缺少模板ID');
    if (!template.name) errors.push('缺少模板名称');
    if (!template.steps || template.steps.length === 0) errors.push('缺少执行步骤');

    // 验证步骤
    template.steps?.forEach((step, index) => {
      if (!step.type) errors.push(`步骤${index + 1}: 缺少步骤类型`);
      if (!step.name) errors.push(`步骤${index + 1}: 缺少步骤名称`);
      
      // 验证特定步骤类型
      switch (step.type) {
        case 'fillInput':
          if (!step.selector) errors.push(`步骤${index + 1}: fillInput缺少选择器`);
          if (!step.value) errors.push(`步骤${index + 1}: fillInput缺少填充值`);
          break;
        case 'clickButton':
          if (!step.selector) errors.push(`步骤${index + 1}: clickButton缺少选择器`);
          break;
        case 'waitForElement':
          if (!step.selector) errors.push(`步骤${index + 1}: waitForElement缺少选择器`);
          break;
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// 导出单例
const automationTemplates = new AutomationTemplates();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = automationTemplates;
} else if (typeof window !== 'undefined') {
  globalThis.automationTemplates = automationTemplates;
} else {
  // Service Worker环境
  globalThis.automationTemplates = automationTemplates;
}
