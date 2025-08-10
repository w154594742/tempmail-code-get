// 智能选择器生成器
class SmartSelectorGenerator {
  constructor() {
    this.elementAnalyzer = new ElementAnalyzer();
    this.selectorOptimizer = new SelectorOptimizer();
    this.init();
  }

  init() {
    console.log('SmartSelectorGenerator 初始化完成');
  }

  // 🔑 从页面元素生成智能选择器
  async generateFromElement(tabId, elementInfo) {
    try {
      // 发送消息到content script获取元素详细信息
      const result = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {
          action: 'analyzeElement',
          elementInfo: elementInfo
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return this.generateSelectorsFromAnalysis(result.analysis);
    } catch (error) {
      console.error('生成选择器失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 从元素分析结果生成选择器
  generateSelectorsFromAnalysis(analysis) {
    const selectors = [];
    const element = analysis.element;

    // 1. ID选择器（最高优先级）
    if (element.id) {
      selectors.push({
        selector: `#${element.id}`,
        type: 'id',
        priority: 10,
        description: `通过ID选择: ${element.id}`,
        specificity: 100
      });
    }

    // 2. Name属性选择器
    if (element.name) {
      selectors.push({
        selector: `[name="${element.name}"]`,
        type: 'name',
        priority: 9,
        description: `通过name属性选择: ${element.name}`,
        specificity: 10
      });

      // 组合选择器：标签+name
      selectors.push({
        selector: `${element.tagName.toLowerCase()}[name="${element.name}"]`,
        type: 'tag-name',
        priority: 8,
        description: `通过标签和name属性选择`,
        specificity: 11
      });
    }

    // 3. 类选择器
    if (element.classList && element.classList.length > 0) {
      // 单个类
      element.classList.forEach(className => {
        selectors.push({
          selector: `.${className}`,
          type: 'class',
          priority: 7,
          description: `通过类选择: ${className}`,
          specificity: 10
        });
      });

      // 多个类组合
      if (element.classList.length > 1) {
        selectors.push({
          selector: `.${element.classList.join('.')}`,
          type: 'multi-class',
          priority: 8,
          description: `通过多个类选择`,
          specificity: element.classList.length * 10
        });
      }
    }

    // 4. 属性选择器
    const importantAttrs = ['type', 'placeholder', 'data-testid', 'data-test', 'role', 'title', 'alt', 'value'];
    importantAttrs.forEach(attr => {
      if (element.attributes && element.attributes[attr]) {
        selectors.push({
          selector: `[${attr}="${element.attributes[attr]}"]`,
          type: 'attribute',
          priority: 6,
          description: `通过${attr}属性选择`,
          specificity: 10
        });

        // 组合选择器：标签+属性
        selectors.push({
          selector: `${element.tagName.toLowerCase()}[${attr}="${element.attributes[attr]}"]`,
          type: 'tag-attribute',
          priority: 7,
          description: `通过标签和${attr}属性选择`,
          specificity: 11
        });
      }
    });

    // 4.1 位置选择器（nth-child, nth-of-type）
    if (analysis.parentInfo && analysis.parentInfo.childIndex !== undefined) {
      const childIndex = analysis.parentInfo.childIndex + 1; // CSS nth-child 从1开始

      selectors.push({
        selector: `${element.tagName.toLowerCase()}:nth-child(${childIndex})`,
        type: 'nth-child',
        priority: 5,
        description: `通过位置选择（第${childIndex}个子元素）`,
        specificity: 11
      });

      // 如果有父元素的类或ID，组合使用
      if (analysis.parentInfo.parentSelector) {
        selectors.push({
          selector: `${analysis.parentInfo.parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${childIndex})`,
          type: 'parent-nth-child',
          priority: 8,
          description: `通过父元素和位置选择`,
          specificity: 21
        });
      }
    }

    // 5. 文本内容选择器（适用于按钮、链接等）
    if (['button', 'a', 'span', 'div', 'label', 'li'].includes(element.tagName.toLowerCase())) {
      const text = element.textContent?.trim();
      if (text && text.length < 50 && text.length > 0) {
        // 使用XPath的contains函数，因为CSS不直接支持:contains
        selectors.push({
          selector: `//*[contains(text(), "${text}")]`,
          type: 'text-xpath',
          priority: 6,
          description: `通过文本内容选择: "${text}"`,
          specificity: 11
        });

        // 精确文本匹配
        selectors.push({
          selector: `//*[text()="${text}"]`,
          type: 'exact-text-xpath',
          priority: 7,
          description: `通过精确文本选择: "${text}"`,
          specificity: 12
        });
      }
    }

    // 5.1 相邻兄弟选择器
    if (analysis.parentInfo && analysis.parentInfo.childIndex > 0) {
      const prevSibling = element.previousElementSibling;
      if (prevSibling) {
        let prevSelector = prevSibling.tagName.toLowerCase();
        if (prevSibling.id) {
          prevSelector = `#${prevSibling.id}`;
        } else if (prevSibling.classList.length > 0) {
          prevSelector = `.${Array.from(prevSibling.classList).join('.')}`;
        }

        selectors.push({
          selector: `${prevSelector} + ${element.tagName.toLowerCase()}`,
          type: 'adjacent-sibling',
          priority: 6,
          description: '通过相邻兄弟元素选择',
          specificity: 12
        });
      }
    }

    // 5.2 通用兄弟选择器
    if (analysis.parentInfo && analysis.parentInfo.sameTagCount > 1) {
      const sameTagIndex = analysis.parentInfo.sameTagIndex + 1;
      selectors.push({
        selector: `${element.tagName.toLowerCase()}:nth-of-type(${sameTagIndex})`,
        type: 'nth-of-type',
        priority: 5,
        description: `通过同类型位置选择（第${sameTagIndex}个${element.tagName.toLowerCase()}）`,
        specificity: 11
      });
    }

    // 6. CSS路径选择器
    if (analysis.cssPath) {
      selectors.push({
        selector: analysis.cssPath,
        type: 'css-path',
        priority: 4,
        description: '通过CSS路径选择',
        specificity: analysis.cssPath.split(' ').length
      });
    }

    // 7. XPath选择器
    if (analysis.xpath) {
      selectors.push({
        selector: analysis.xpath,
        type: 'xpath',
        priority: 3,
        description: '通过XPath选择',
        specificity: 5
      });
    }

    // 8. 智能组合选择器
    const smartSelectors = this.generateSmartCombinations(element, analysis);
    selectors.push(...smartSelectors);

    // 排序和优化
    const optimizedSelectors = this.optimizeSelectors(selectors, analysis);

    return {
      success: true,
      selectors: optimizedSelectors,
      recommendations: this.generateRecommendations(optimizedSelectors, element)
    };
  }

  // 生成智能组合选择器
  generateSmartCombinations(element, analysis) {
    const combinations = [];

    // 标签+类型组合
    if (element.tagName && element.attributes?.type) {
      combinations.push({
        selector: `${element.tagName.toLowerCase()}[type="${element.attributes.type}"]`,
        type: 'tag-type',
        priority: 7,
        description: `通过标签和类型选择`,
        specificity: 11
      });
    }

    // 表单相关的智能选择器
    if (element.tagName.toLowerCase() === 'input') {
      const type = element.attributes?.type || 'text';
      
      // 根据类型生成语义化选择器
      const semanticSelectors = {
        'email': ['input[type="email"]', 'input[name*="email"]'],
        'password': ['input[type="password"]', 'input[name*="password"]'],
        'text': ['input[type="text"]'],
        'submit': ['input[type="submit"]', 'button[type="submit"]']
      };

      if (semanticSelectors[type]) {
        semanticSelectors[type].forEach(selector => {
          combinations.push({
            selector: selector,
            type: 'semantic',
            priority: 8,
            description: `语义化${type}选择器`,
            specificity: 11
          });
        });
      }
    }

    // 父子关系选择器
    if (analysis.parentInfo) {
      const parent = analysis.parentInfo;

      // 父元素ID + 子元素
      if (parent.id) {
        combinations.push({
          selector: `#${parent.id} ${element.tagName.toLowerCase()}`,
          type: 'parent-child',
          priority: 6,
          description: `通过父元素ID选择`,
          specificity: 101
        });

        // 父元素ID + 子元素位置
        if (parent.childIndex !== undefined) {
          const childIndex = parent.childIndex + 1;
          combinations.push({
            selector: `#${parent.id} > ${element.tagName.toLowerCase()}:nth-child(${childIndex})`,
            type: 'parent-id-position',
            priority: 9,
            description: `通过父元素ID和位置精确选择`,
            specificity: 111
          });
        }
      }

      // 父元素类 + 子元素
      if (parent.classList && parent.classList.length > 0) {
        const parentClass = parent.classList[0];
        combinations.push({
          selector: `.${parentClass} ${element.tagName.toLowerCase()}`,
          type: 'parent-class-child',
          priority: 5,
          description: `通过父元素类选择`,
          specificity: 11
        });

        // 父元素类 + 子元素类
        if (element.classList && element.classList.length > 0) {
          const childClass = element.classList[0];
          combinations.push({
            selector: `.${parentClass} .${childClass}`,
            type: 'parent-child-classes',
            priority: 8,
            description: `通过父子元素类选择`,
            specificity: 20
          });
        }

        // 父元素类 + 子元素位置
        if (parent.childIndex !== undefined) {
          const childIndex = parent.childIndex + 1;
          combinations.push({
            selector: `.${parentClass} > ${element.tagName.toLowerCase()}:nth-child(${childIndex})`,
            type: 'parent-class-position',
            priority: 8,
            description: `通过父元素类和位置选择`,
            specificity: 21
          });
        }
      }

      // 相邻兄弟选择器的增强版本
      if (parent.childIndex > 0) {
        const prevIndex = parent.childIndex;
        combinations.push({
          selector: `${element.tagName.toLowerCase()}:nth-child(${parent.childIndex + 1})`,
          type: 'precise-position',
          priority: 7,
          description: `通过精确位置选择（第${parent.childIndex + 1}个子元素）`,
          specificity: 11
        });
      }
    }

    // 属性组合选择器
    if (element.attributes) {
      const attrs = element.attributes;

      // 多属性组合
      const importantAttrs = ['type', 'name', 'id', 'class', 'placeholder', 'data-testid'];
      const availableAttrs = importantAttrs.filter(attr => attrs[attr]);

      if (availableAttrs.length >= 2) {
        // 两个属性组合
        for (let i = 0; i < availableAttrs.length - 1; i++) {
          for (let j = i + 1; j < availableAttrs.length; j++) {
            const attr1 = availableAttrs[i];
            const attr2 = availableAttrs[j];

            if (attr1 === 'class' || attr2 === 'class') continue; // 类已经单独处理

            combinations.push({
              selector: `[${attr1}="${attrs[attr1]}"][${attr2}="${attrs[attr2]}"]`,
              type: 'multi-attribute',
              priority: 8,
              description: `通过${attr1}和${attr2}属性组合选择`,
              specificity: 20
            });
          }
        }
      }
    }

    return combinations;
  }

  // 优化选择器列表
  optimizeSelectors(selectors, analysis) {
    // 去重
    const uniqueSelectors = selectors.filter((selector, index, self) => 
      index === self.findIndex(s => s.selector === selector.selector)
    );

    // 按优先级和特异性排序
    uniqueSelectors.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.specificity - b.specificity;
    });

    // 验证选择器的唯一性和有效性
    return uniqueSelectors.map(selectorInfo => ({
      ...selectorInfo,
      isUnique: this.checkUniqueness(selectorInfo.selector, analysis),
      isValid: this.validateSelector(selectorInfo.selector)
    }));
  }

  // 检查选择器唯一性
  checkUniqueness(selector, analysis) {
    // 这里可以通过content script检查选择器是否唯一
    // 简化实现，基于分析结果估算
    if (selector.startsWith('#')) return true; // ID通常是唯一的
    if (selector.includes('[name=')) return true; // name属性通常是唯一的
    return false; // 其他情况需要实际验证
  }

  // 验证选择器语法
  validateSelector(selector) {
    try {
      // 简单的CSS选择器语法验证
      if (selector.startsWith('//')) {
        // XPath选择器
        return true; // 简化验证
      } else {
        // CSS选择器
        document.createElement('div').querySelector(selector);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  // 生成推荐建议
  generateRecommendations(selectors, element) {
    const recommendations = [];

    // 找到最佳选择器
    const bestSelector = selectors.find(s => s.isUnique && s.isValid);
    if (bestSelector) {
      recommendations.push({
        type: 'best',
        message: `推荐使用: ${bestSelector.selector}`,
        reason: bestSelector.description
      });
    }

    // 稳定性建议
    const stableSelectors = selectors.filter(s => 
      s.type === 'id' || s.type === 'name' || s.type === 'data-testid'
    );
    if (stableSelectors.length > 0) {
      recommendations.push({
        type: 'stability',
        message: '建议优先使用ID、name或data-testid属性，这些选择器更稳定',
        selectors: stableSelectors.map(s => s.selector)
      });
    }

    // 性能建议
    const fastSelectors = selectors.filter(s => 
      s.type === 'id' || (s.type === 'class' && s.specificity <= 20)
    );
    if (fastSelectors.length > 0) {
      recommendations.push({
        type: 'performance',
        message: 'ID和简单类选择器性能最佳',
        selectors: fastSelectors.map(s => s.selector)
      });
    }

    // 维护性建议
    if (selectors.some(s => s.type === 'css-path' && s.specificity > 5)) {
      recommendations.push({
        type: 'maintenance',
        message: '避免使用过长的CSS路径，页面结构变化时容易失效',
        suggestion: '尝试使用更简单的选择器'
      });
    }

    return recommendations;
  }

  // 测试选择器在页面上的表现
  async testSelector(tabId, selector) {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {
          action: 'testSelector',
          selector: selector
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 生成常用选择器模板
  getCommonSelectorTemplates() {
    return {
      forms: {
        email: [
          'input[type="email"]',
          'input[name*="email"]',
          'input[id*="email"]',
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
          '#submit',
          'button:contains("提交")'
        ]
      },
      verification: [
        'input[name*="code"]',
        'input[name*="verify"]',
        'input[placeholder*="验证码"]',
        '.captcha-input',
        '#verification-code'
      ],
      navigation: [
        '.nav-link',
        '.menu-item',
        'a[href*="register"]',
        'button:contains("注册")',
        '.btn-register'
      ]
    };
  }

  // 根据元素类型获取推荐选择器
  getRecommendedSelectors(elementType) {
    const templates = this.getCommonSelectorTemplates();
    
    switch (elementType) {
      case 'email':
        return templates.forms.email;
      case 'password':
        return templates.forms.password;
      case 'submit':
        return templates.forms.submit;
      case 'verification':
        return templates.verification;
      case 'navigation':
        return templates.navigation;
      default:
        return [];
    }
  }
}

// 元素分析器辅助类
class ElementAnalyzer {
  analyzeElement(element) {
    return {
      tagName: element.tagName,
      id: element.id,
      classList: Array.from(element.classList),
      attributes: this.getAttributes(element),
      textContent: element.textContent?.trim(),
      cssPath: this.generateCSSPath(element),
      xpath: this.generateXPath(element),
      parentInfo: this.getParentInfo(element)
    };
  }

  getAttributes(element) {
    const attrs = {};
    for (let attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  generateCSSPath(element) {
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.split(' ').filter(cls => cls.trim());
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  generateXPath(element) {
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.nodeName.toLowerCase();
      path.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
      
      if (path.length >= 5) break;
    }

    return '//' + path.join('/');
  }

  getParentInfo(element) {
    const parent = element.parentElement;
    if (!parent) return null;

    // 获取元素在父元素中的位置
    const childIndex = Array.from(parent.children).indexOf(element);
    const sameTagSiblings = Array.from(parent.children).filter(child =>
      child.tagName === element.tagName
    );
    const sameTagIndex = sameTagSiblings.indexOf(element);

    // 生成父元素选择器
    let parentSelector = parent.tagName.toLowerCase();
    if (parent.id) {
      parentSelector = `#${parent.id}`;
    } else if (parent.classList.length > 0) {
      parentSelector = `.${Array.from(parent.classList).join('.')}`;
    }

    return {
      tagName: parent.tagName,
      id: parent.id,
      classList: Array.from(parent.classList),
      childCount: parent.children.length,
      childIndex: childIndex,
      sameTagIndex: sameTagIndex,
      sameTagCount: sameTagSiblings.length,
      parentSelector: parentSelector
    };
  }
}

// 选择器优化器辅助类
class SelectorOptimizer {
  optimize(selector) {
    // 简化选择器
    let optimized = selector;
    
    // 移除不必要的通用选择器
    optimized = optimized.replace(/\s*>\s*\*/g, ' > ');
    
    // 简化连续的类选择器
    optimized = optimized.replace(/\.([^.\s]+)\.([^.\s]+)/g, '.$1.$2');
    
    return optimized;
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartSelectorGenerator;
} else {
  globalThis.SmartSelectorGenerator = SmartSelectorGenerator;
}
