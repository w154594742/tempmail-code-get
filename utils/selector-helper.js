// 选择器辅助工具
class SelectorHelper {
  constructor() {
    this.commonSelectors = {
      email: [
        'input[type="email"]',
        'input[name*="email"]',
        'input[id*="email"]',
        'input[placeholder*="email"]',
        'input[placeholder*="邮箱"]'
      ],
      password: [
        'input[type="password"]',
        'input[name*="password"]',
        'input[id*="password"]',
        'input[placeholder*="password"]',
        'input[placeholder*="密码"]'
      ],
      submit: [
        'button[type="submit"]',
        'input[type="submit"]',
        '.btn-submit',
        '.submit-btn',
        'button:contains("提交")',
        'button:contains("注册")',
        'button:contains("登录")',
        'button:contains("Submit")',
        'button:contains("Register")',
        'button:contains("Login")'
      ],
      verificationCode: [
        'input[name*="code"]',
        'input[name*="verify"]',
        'input[id*="code"]',
        'input[id*="verify"]',
        'input[placeholder*="验证码"]',
        'input[placeholder*="code"]',
        'input[placeholder*="verification"]'
      ]
    };
  }

  // 获取推荐的选择器
  getRecommendedSelectors(type) {
    return this.commonSelectors[type] || [];
  }

  // 生成智能选择器
  generateSmartSelector(element) {
    if (!element) return null;

    const selectors = [];

    // ID选择器（优先级最高）
    if (element.id) {
      selectors.push(`#${element.id}`);
    }

    // Name属性选择器
    if (element.name) {
      selectors.push(`[name="${element.name}"]`);
    }

    // 类选择器
    if (element.className) {
      const classes = element.className.split(' ').filter(cls => cls.trim());
      if (classes.length > 0) {
        selectors.push(`.${classes.join('.')}`);
      }
    }

    // 属性选择器
    const attributes = ['type', 'placeholder', 'data-testid', 'data-test'];
    attributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selectors.push(`[${attr}="${value}"]`);
      }
    });

    // 标签+属性组合选择器
    const tagName = element.tagName.toLowerCase();
    if (element.type) {
      selectors.push(`${tagName}[type="${element.type}"]`);
    }

    // 文本内容选择器（按钮等）
    if (['button', 'a', 'span'].includes(tagName)) {
      const text = element.textContent?.trim();
      if (text && text.length < 50) {
        selectors.push(`${tagName}:contains("${text}")`);
      }
    }

    // CSS路径选择器
    const cssPath = this.generateCSSPath(element);
    if (cssPath) {
      selectors.push(cssPath);
    }

    return selectors;
  }

  // 生成CSS路径
  generateCSSPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();

      // 添加ID
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // ID是唯一的，可以停止
      }

      // 添加类名
      if (current.className) {
        const classes = current.className.split(' ').filter(cls => cls.trim());
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }

      // 添加nth-child（如果需要）
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.nodeName === current.nodeName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = parent;

      // 限制路径长度
      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  // 验证选择器
  validateSelector(selector, document = window.document) {
    try {
      const elements = document.querySelectorAll(selector);
      return {
        valid: true,
        count: elements.length,
        unique: elements.length === 1,
        elements: Array.from(elements)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        count: 0,
        unique: false,
        elements: []
      };
    }
  }

  // 优化选择器
  optimizeSelector(selector, document = window.document) {
    const validation = this.validateSelector(selector, document);
    
    if (!validation.valid) {
      return { optimized: selector, reason: '选择器无效' };
    }

    if (validation.unique) {
      return { optimized: selector, reason: '选择器已经是唯一的' };
    }

    if (validation.count === 0) {
      return { optimized: selector, reason: '未找到匹配元素' };
    }

    // 尝试添加更具体的属性来使选择器唯一
    const elements = validation.elements;
    const firstElement = elements[0];

    // 尝试添加属性选择器
    const attributes = ['id', 'name', 'type', 'class', 'data-testid'];
    for (const attr of attributes) {
      const value = firstElement.getAttribute(attr);
      if (value) {
        const newSelector = `${selector}[${attr}="${value}"]`;
        const newValidation = this.validateSelector(newSelector, document);
        if (newValidation.unique) {
          return { optimized: newSelector, reason: `添加了${attr}属性` };
        }
      }
    }

    // 尝试添加nth-child
    const parent = firstElement.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(firstElement) + 1;
      const newSelector = `${selector}:nth-child(${index})`;
      const newValidation = this.validateSelector(newSelector, document);
      if (newValidation.unique) {
        return { optimized: newSelector, reason: '添加了nth-child' };
      }
    }

    return { optimized: selector, reason: '无法进一步优化' };
  }

  // 测试选择器在页面上的表现
  testSelector(selector, document = window.document) {
    const validation = this.validateSelector(selector, document);
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        suggestions: this.getSelectorSuggestions(selector)
      };
    }

    const elements = validation.elements;
    const results = elements.map(element => ({
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100),
      visible: this.isElementVisible(element),
      enabled: !element.disabled,
      rect: element.getBoundingClientRect()
    }));

    return {
      success: true,
      count: validation.count,
      unique: validation.unique,
      elements: results,
      recommendations: this.getRecommendations(selector, elements)
    };
  }

  // 获取选择器建议
  getSelectorSuggestions(selector) {
    const suggestions = [];
    
    // 常见错误修正
    if (selector.includes('::')) {
      suggestions.push('使用单冒号(:)而不是双冒号(::)用于伪类');
    }
    
    if (selector.includes(' > > ')) {
      suggestions.push('避免连续的子选择器');
    }
    
    if (selector.length > 100) {
      suggestions.push('选择器过长，考虑简化');
    }

    return suggestions;
  }

  // 获取推荐
  getRecommendations(selector, elements) {
    const recommendations = [];
    
    if (elements.length === 0) {
      recommendations.push('未找到匹配元素，检查选择器是否正确');
    } else if (elements.length > 1) {
      recommendations.push('找到多个元素，考虑添加更具体的属性');
    }
    
    const invisibleCount = elements.filter(el => !this.isElementVisible(el)).length;
    if (invisibleCount > 0) {
      recommendations.push(`${invisibleCount}个元素不可见，可能影响操作`);
    }
    
    const disabledCount = elements.filter(el => el.disabled).length;
    if (disabledCount > 0) {
      recommendations.push(`${disabledCount}个元素被禁用，无法操作`);
    }

    return recommendations;
  }

  // 检查元素是否可见
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           rect.width > 0 &&
           rect.height > 0;
  }
}

// 导出单例
const selectorHelper = new SelectorHelper();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = selectorHelper;
} else if (typeof window !== 'undefined') {
  globalThis.selectorHelper = selectorHelper;
} else {
  // Service Worker环境
  globalThis.selectorHelper = selectorHelper;
}
