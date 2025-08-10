// 自动化内容脚本 - 负责页面元素操作
class AutomationContentScript {
  constructor() {
    this.isActive = false;
    this.currentExecution = null;
    this.verificationUI = null;
    this.elementPicker = {
      active: false,
      overlay: null,
      tooltip: null,
      currentElement: null,
      originalCursor: null
    };
    this.init();
  }

  async init() {
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    console.log('AutomationContentScript 初始化完成');
  }

  // 处理消息
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'fillInput':
          await this.handleFillInput(message, sendResponse);
          break;
        case 'clickButton':
          await this.handleClickButton(message, sendResponse);
          break;
        case 'waitForElement':
          await this.handleWaitForElement(message, sendResponse);
          break;
        case 'checkPageReady':
          await this.handleCheckPageReady(message, sendResponse);
          break;
        case 'getPageInfo':
          await this.handleGetPageInfo(message, sendResponse);
          break;
        case 'scroll':
          await this.handleScroll(message, sendResponse);
          break;
        case 'hover':
          await this.handleHover(message, sendResponse);
          break;
        case 'selectOption':
          await this.handleSelectOption(message, sendResponse);
          break;
        case 'uploadFile':
          await this.handleUploadFile(message, sendResponse);
          break;
        case 'executeScript':
          await this.handleExecuteScript(message, sendResponse);
          break;
        case 'waitForNavigation':
          await this.handleWaitForNavigation(message, sendResponse);
          break;
        case 'checkElementExists':
          await this.handleCheckElementExists(message, sendResponse);
          break;
        case 'waitForPageStable':
          await this.handleWaitForPageStable(message, sendResponse);
          break;
        case 'waitForAjaxComplete':
          await this.handleWaitForAjaxComplete(message, sendResponse);
          break;
        case 'analyzeElement':
          await this.handleAnalyzeElement(message, sendResponse);
          break;
        case 'testSelector':
          await this.handleTestSelector(message, sendResponse);
          break;
        case 'highlightElement':
          await this.handleHighlightElement(message, sendResponse);
          break;
        case 'showHumanVerification':
          await this.handleShowHumanVerification(message, sendResponse);
          break;
        case 'hideHumanVerification':
          await this.handleHideHumanVerification(message, sendResponse);
          break;
        case 'ping':
          sendResponse({ success: true, message: 'pong' });
          break;
        case 'checkElementExists':
          await this.handleCheckElementExists(message, sendResponse);
          break;
        case 'checkElement':
          await this.handleCheckElement(message, sendResponse);
          break;
        case 'checkClickableElement':
          await this.handleCheckClickableElement(message, sendResponse);
          break;
        case 'startElementPicker':
          await this.handleStartElementPicker(message, sendResponse);
          break;
        case 'stopElementPicker':
          await this.handleStopElementPicker(message, sendResponse);
          break;
        default:
          sendResponse({ success: false, error: `未知操作: ${message.action}` });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 填充输入框
  async handleFillInput(message, sendResponse) {
    const { selector, value, options = {} } = message;

    console.log(`Content script收到fillInput请求:`);
    console.log(`选择器: ${selector}`);
    console.log(`值: ${value}`);
    console.log(`选项:`, options);

    try {
      // 等待元素出现
      console.log(`开始等待元素: ${selector}`);
      const element = await this.waitForElement(selector, options.waitForElement || 3000);
      console.log(`等待元素结果:`, element ? '找到元素' : '未找到元素');
      
      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      // 滚动到元素位置
      if (options.scrollIntoView !== false) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(300);
      }

      // 清空现有内容
      if (options.clearFirst !== false) {
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 模拟人工输入
      if (options.typeSlowly) {
        await this.typeSlowly(element, value, options.typeDelay || 100);
      } else {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      sendResponse({
        success: true,
        message: `成功填充输入框: ${selector}`,
        value: value
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 点击按钮
  async handleClickButton(message, sendResponse) {
    const { selector, options = {} } = message;
    
    try {
      // 等待元素出现
      const element = await this.waitForElement(selector, options.waitForElement || 3000);
      
      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      // 滚动到元素位置
      if (options.scrollIntoView !== false) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(300);
      }

      // 检查元素是否可点击
      if (element.disabled) {
        throw new Error('元素被禁用，无法点击');
      }

      // 模拟鼠标悬停
      if (options.hover !== false) {
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await this.sleep(100);
      }

      // 点击元素
      element.click();

      sendResponse({
        success: true,
        message: `成功点击元素: ${selector}`
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 等待元素出现
  async handleWaitForElement(message, sendResponse) {
    const { selector, options = {} } = message;
    
    try {
      const element = await this.waitForElement(
        selector, 
        options.timeout || 10000,
        options.checkInterval || 500
      );
      
      sendResponse({ 
        success: true, 
        found: !!element,
        message: element ? `元素已找到: ${selector}` : `元素未找到: ${selector}`
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 检查页面是否准备就绪
  async handleCheckPageReady(message, sendResponse) {
    try {
      const isReady = document.readyState === 'complete' && 
                     document.body && 
                     !document.querySelector('.loading, .spinner');
      
      sendResponse({ 
        success: true, 
        ready: isReady,
        readyState: document.readyState
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取页面信息
  async handleGetPageInfo(message, sendResponse) {
    try {
      const info = {
        url: window.location.href,
        domain: window.location.hostname,
        title: document.title,
        readyState: document.readyState,
        hasBody: !!document.body,
        timestamp: Date.now()
      };

      sendResponse({ success: true, info: info });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 滚动操作
  async handleScroll(message, sendResponse) {
    const { selector, options = {} } = message;

    try {
      if (selector) {
        // 滚动到指定元素
        const element = await this.waitForElement(selector, options.waitForElement || 3000);

        if (!element) {
          throw new Error(`未找到元素: ${selector}`);
        }

        element.scrollIntoView({
          behavior: options.behavior || 'smooth',
          block: options.block || 'center',
          inline: options.inline || 'nearest'
        });
      } else {
        // 滚动页面
        const x = options.x || 0;
        const y = options.y || 0;

        if (options.relative) {
          window.scrollBy(x, y);
        } else {
          window.scrollTo(x, y);
        }
      }

      // 延迟
      if (options.delay) {
        await this.sleep(options.delay);
      }

      sendResponse({
        success: true,
        message: '滚动操作完成'
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 鼠标悬停
  async handleHover(message, sendResponse) {
    const { selector, options = {} } = message;

    try {
      const element = await this.waitForElement(selector, options.waitForElement || 3000);

      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      // 滚动到元素位置
      if (options.scrollIntoView !== false) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(300);
      }

      // 触发鼠标悬停事件
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      element.dispatchEvent(new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      }));

      element.dispatchEvent(new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      }));

      sendResponse({
        success: true,
        message: `成功悬停元素: ${selector}`
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 选择下拉选项
  async handleSelectOption(message, sendResponse) {
    const { selector, value, options = {} } = message;

    try {
      const element = await this.waitForElement(selector, options.waitForElement || 3000);

      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      if (element.tagName.toLowerCase() !== 'select') {
        throw new Error('元素不是select下拉框');
      }

      // 滚动到元素位置
      if (options.scrollIntoView !== false) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(300);
      }

      // 选择选项
      let optionSelected = false;

      // 尝试按值选择
      for (let option of element.options) {
        if (option.value === value || option.text === value) {
          option.selected = true;
          optionSelected = true;
          break;
        }
      }

      if (!optionSelected) {
        throw new Error(`未找到匹配的选项: ${value}`);
      }

      // 触发change事件
      element.dispatchEvent(new Event('change', { bubbles: true }));

      // 延迟
      if (options.delay) {
        await this.sleep(options.delay);
      }

      sendResponse({
        success: true,
        message: `成功选择选项: ${value}`,
        value: value
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 文件上传
  async handleUploadFile(message, sendResponse) {
    const { selector, filePath, options = {} } = message;

    try {
      const element = await this.waitForElement(selector, options.waitForElement || 3000);

      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }

      if (element.type !== 'file') {
        throw new Error('元素不是文件输入框');
      }

      // 注意：由于安全限制，无法直接设置文件路径
      // 这里只能模拟点击，让用户手动选择文件
      element.click();

      sendResponse({
        success: true,
        message: '文件输入框已激活，请手动选择文件',
        note: '由于浏览器安全限制，无法自动设置文件路径'
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 执行自定义脚本
  async handleExecuteScript(message, sendResponse) {
    const { script, options = {} } = message;

    try {
      // 创建一个安全的执行环境
      const result = eval(`(function() { ${script} })()`);

      sendResponse({
        success: true,
        result: result,
        message: '脚本执行完成'
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 等待页面导航
  async handleWaitForNavigation(message, sendResponse) {
    const { expectedUrl, timeout = 10000, options = {} } = message;

    try {
      const startTime = Date.now();
      const initialUrl = window.location.href;

      // 等待URL变化
      const checkNavigation = () => {
        const currentUrl = window.location.href;

        // 检查是否发生了导航
        if (currentUrl !== initialUrl) {
          // 如果指定了期望的URL，检查是否匹配
          if (expectedUrl) {
            if (currentUrl.includes(expectedUrl)) {
              return { navigated: true, url: currentUrl };
            }
          } else {
            return { navigated: true, url: currentUrl };
          }
        }

        // 检查超时
        if (Date.now() - startTime >= timeout) {
          throw new Error('等待导航超时');
        }

        return null;
      };

      // 轮询检查
      const pollNavigation = () => {
        return new Promise((resolve, reject) => {
          const interval = setInterval(() => {
            try {
              const result = checkNavigation();
              if (result) {
                clearInterval(interval);
                resolve(result);
              }
            } catch (error) {
              clearInterval(interval);
              reject(error);
            }
          }, options.checkInterval || 500);
        });
      };

      const result = await pollNavigation();

      sendResponse({
        success: true,
        url: result.url,
        message: '页面导航完成'
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 检查元素是否存在
  async handleCheckElementExists(message, sendResponse) {
    const { selector } = message;

    try {
      const element = this.findElement(selector);

      sendResponse({
        success: true,
        exists: !!element,
        visible: element ? this.isElementVisible(element) : false
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 检查元素是否存在（简化版本，用于等待机制）
  async handleCheckElement(message, sendResponse) {
    const { selector } = message;

    try {
      const element = this.findElement(selector);
      sendResponse({
        exists: !!element
      });
    } catch (error) {
      sendResponse({ exists: false });
    }
  }

  // 检查元素是否存在且可点击
  async handleCheckClickableElement(message, sendResponse) {
    const { selector } = message;

    try {
      const element = this.findElement(selector);

      if (!element) {
        sendResponse({ clickable: false });
        return;
      }

      // 检查元素是否可点击
      const isClickable = !element.disabled &&
                         element.offsetParent !== null && // 元素可见
                         getComputedStyle(element).pointerEvents !== 'none';

      sendResponse({
        clickable: isClickable
      });
    } catch (error) {
      sendResponse({ clickable: false });
    }
  }

  // 等待页面稳定
  async handleWaitForPageStable(message, sendResponse) {
    const { timeout = 10000 } = message;

    try {
      const startTime = Date.now();
      let lastHeight = document.body.scrollHeight;
      let stableCount = 0;
      const requiredStableCount = 3; // 需要连续3次检查都稳定

      const checkStability = async () => {
        return new Promise((resolve) => {
          const interval = setInterval(() => {
            const currentHeight = document.body.scrollHeight;
            const currentTime = Date.now();

            // 检查超时
            if (currentTime - startTime >= timeout) {
              clearInterval(interval);
              resolve({ stable: false, reason: '超时' });
              return;
            }

            // 检查页面高度是否稳定
            if (currentHeight === lastHeight) {
              stableCount++;
              if (stableCount >= requiredStableCount) {
                clearInterval(interval);
                resolve({ stable: true });
                return;
              }
            } else {
              stableCount = 0;
              lastHeight = currentHeight;
            }
          }, 500);
        });
      };

      const result = await checkStability();

      if (result.stable) {
        sendResponse({
          success: true,
          message: '页面已稳定'
        });
      } else {
        throw new Error(`页面未稳定: ${result.reason}`);
      }

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 等待AJAX请求完成
  async handleWaitForAjaxComplete(message, sendResponse) {
    const { timeout = 10000 } = message;

    try {
      const startTime = Date.now();

      const checkAjax = () => {
        return new Promise((resolve) => {
          const interval = setInterval(() => {
            const currentTime = Date.now();

            // 检查超时
            if (currentTime - startTime >= timeout) {
              clearInterval(interval);
              resolve({ complete: false, reason: '超时' });
              return;
            }

            // 检查jQuery AJAX（如果存在）
            if (typeof window.jQuery !== 'undefined' && window.jQuery.active > 0) {
              return; // 还有活跃的jQuery AJAX请求
            }

            // 检查原生XMLHttpRequest（简单检查）
            // 注意：这个检查不是100%准确，因为无法直接监控所有XMLHttpRequest

            // 检查fetch请求（如果有自定义的全局计数器）
            if (window.activeFetchCount && window.activeFetchCount > 0) {
              return; // 还有活跃的fetch请求
            }

            // 检查页面加载状态
            if (document.readyState !== 'complete') {
              return; // 页面还在加载
            }

            clearInterval(interval);
            resolve({ complete: true });
          }, 200);
        });
      };

      const result = await checkAjax();

      if (result.complete) {
        sendResponse({
          success: true,
          message: 'AJAX请求已完成'
        });
      } else {
        throw new Error(`AJAX请求未完成: ${result.reason}`);
      }

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 🔑 分析页面元素（智能选择器生成）
  async handleAnalyzeElement(message, sendResponse) {
    const { elementInfo } = message;

    try {
      let element = null;

      // 根据不同的元素信息类型查找元素
      if (elementInfo.selector) {
        element = this.findElement(elementInfo.selector);
      } else if (elementInfo.coordinates) {
        element = document.elementFromPoint(elementInfo.coordinates.x, elementInfo.coordinates.y);
      } else if (elementInfo.xpath) {
        const result = document.evaluate(
          elementInfo.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        element = result.singleNodeValue;
      }

      if (!element) {
        throw new Error('未找到指定元素');
      }

      // 分析元素
      const analysis = this.analyzeElementDetails(element);

      sendResponse({
        success: true,
        analysis: analysis
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 测试选择器
  async handleTestSelector(message, sendResponse) {
    const { selector } = message;

    try {
      const elements = this.findAllElements(selector);
      const results = elements.map(element => ({
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.substring(0, 100),
        visible: this.isElementVisible(element),
        enabled: !element.disabled,
        rect: element.getBoundingClientRect()
      }));

      sendResponse({
        success: true,
        count: elements.length,
        unique: elements.length === 1,
        elements: results,
        recommendations: this.generateSelectorRecommendations(selector, elements)
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 高亮元素
  async handleHighlightElement(message, sendResponse) {
    const { selector, duration = 3000 } = message;

    try {
      const elements = this.findAllElements(selector);

      if (elements.length === 0) {
        throw new Error('未找到匹配元素');
      }

      // 高亮所有匹配的元素
      elements.forEach(element => {
        this.highlightElement(element, duration);
      });

      sendResponse({
        success: true,
        count: elements.length,
        message: `已高亮 ${elements.length} 个元素`
      });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // ========== 辅助方法 ==========

  // 等待元素出现
  async waitForElement(selector, timeout = 10000, checkInterval = 500) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = this.findElement(selector);

        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          resolve(null);
          return;
        }

        setTimeout(checkElement, checkInterval);
      };

      checkElement();
    });
  }

  // 慢速输入模拟
  async typeSlowly(element, text, delay = 100) {
    element.focus();
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      element.value += char;
      
      // 触发输入事件
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      
      await this.sleep(delay);
    }
    
    // 触发change事件
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 延迟等待
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 查找元素（支持多种选择器）
  findElement(selector) {
    // 尝试CSS选择器
    let element = document.querySelector(selector);
    if (element) return element;

    // 尝试XPath
    if (selector.startsWith('//') || selector.startsWith('./')) {
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      element = result.singleNodeValue;
      if (element) return element;
    }

    // 尝试文本匹配
    if (selector.includes(':contains(')) {
      const match = selector.match(/:contains\(['"](.+?)['"]\)/);
      if (match) {
        const text = match[1];
        const xpath = `//*[contains(text(), '${text}')]`;
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        element = result.singleNodeValue;
        if (element) return element;
      }
    }

    return null;
  }

  // 获取元素信息
  getElementInfo(element) {
    if (!element) return null;
    
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100),
      visible: this.isElementVisible(element),
      enabled: !element.disabled,
      rect: element.getBoundingClientRect()
    };
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

  // ========== 智能选择器生成相关方法 ==========

  // 分析元素详细信息
  analyzeElementDetails(element) {
    return {
      element: {
        tagName: element.tagName,
        id: element.id,
        classList: Array.from(element.classList),
        attributes: this.getElementAttributes(element),
        textContent: element.textContent?.trim(),
        innerHTML: element.innerHTML?.substring(0, 200),
        value: element.value,
        type: element.type,
        name: element.name,
        placeholder: element.placeholder
      },
      cssPath: this.generateCSSPath(element),
      xpath: this.generateXPath(element),
      parentInfo: this.getParentInfo(element),
      siblings: this.getSiblingInfo(element),
      position: this.getElementPosition(element),
      styles: this.getComputedStyles(element),
      accessibility: this.getAccessibilityInfo(element)
    };
  }

  // 获取元素属性
  getElementAttributes(element) {
    const attrs = {};
    for (let attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  // 生成CSS路径
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

      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  // 生成XPath
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

  // 获取父元素信息
  getParentInfo(element) {
    const parent = element.parentElement;
    if (!parent) return null;

    return {
      tagName: parent.tagName,
      id: parent.id,
      classList: Array.from(parent.classList),
      attributes: this.getElementAttributes(parent)
    };
  }

  // 获取兄弟元素信息
  getSiblingInfo(element) {
    const parent = element.parentElement;
    if (!parent) return { total: 0, index: 0 };

    const siblings = Array.from(parent.children);
    return {
      total: siblings.length,
      index: siblings.indexOf(element),
      sameTag: siblings.filter(s => s.tagName === element.tagName).length
    };
  }

  // 获取元素位置
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  }

  // 获取计算样式
  getComputedStyles(element) {
    const style = window.getComputedStyle(element);
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      position: style.position,
      zIndex: style.zIndex,
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily
    };
  }

  // 获取无障碍信息
  getAccessibilityInfo(element) {
    return {
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      ariaDescribedBy: element.getAttribute('aria-describedby'),
      ariaLabelledBy: element.getAttribute('aria-labelledby'),
      tabIndex: element.tabIndex,
      title: element.title
    };
  }

  // 查找所有匹配元素
  findAllElements(selector) {
    try {
      // 尝试CSS选择器
      return Array.from(document.querySelectorAll(selector));
    } catch (error) {
      // 尝试XPath
      if (selector.startsWith('//') || selector.startsWith('./')) {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        const elements = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          elements.push(result.snapshotItem(i));
        }
        return elements;
      }
      return [];
    }
  }

  // 生成选择器建议
  generateSelectorRecommendations(selector, elements) {
    const recommendations = [];

    if (elements.length === 0) {
      recommendations.push({
        type: 'error',
        message: '未找到匹配元素，请检查选择器语法'
      });
    } else if (elements.length > 1) {
      recommendations.push({
        type: 'warning',
        message: `找到 ${elements.length} 个匹配元素，建议使用更具体的选择器`
      });
    } else {
      recommendations.push({
        type: 'success',
        message: '选择器唯一匹配一个元素'
      });
    }

    // 检查元素可见性
    const visibleCount = elements.filter(el => this.isElementVisible(el)).length;
    if (visibleCount < elements.length) {
      recommendations.push({
        type: 'warning',
        message: `${elements.length - visibleCount} 个元素不可见，可能影响操作`
      });
    }

    return recommendations;
  }

  // 高亮元素
  highlightElement(element, duration = 3000) {
    // 创建高亮覆盖层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 999999;
      border: 3px solid #ff4444;
      background: rgba(255, 68, 68, 0.1);
      box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
      animation: automation-highlight 1s ease-in-out infinite alternate;
    `;

    // 添加动画样式
    if (!document.getElementById('automation-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'automation-highlight-style';
      style.textContent = `
        @keyframes automation-highlight {
          from { opacity: 0.3; }
          to { opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }

    // 定位覆盖层
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      overlay.style.left = (rect.left + window.scrollX - 3) + 'px';
      overlay.style.top = (rect.top + window.scrollY - 3) + 'px';
      overlay.style.width = (rect.width + 6) + 'px';
      overlay.style.height = (rect.height + 6) + 'px';
    };

    updatePosition();
    document.body.appendChild(overlay);

    // 监听滚动和窗口大小变化
    const updateHandler = () => updatePosition();
    window.addEventListener('scroll', updateHandler);
    window.addEventListener('resize', updateHandler);

    // 自动移除
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      window.removeEventListener('scroll', updateHandler);
      window.removeEventListener('resize', updateHandler);
    }, duration);
  }

  // 显示人机验证UI
  async handleShowHumanVerification(message, sendResponse) {
    try {
      const { step, executionId, timeout = 300000 } = message;

      // 如果已经有验证UI，先移除
      if (this.verificationUI) {
        this.hideVerificationUI();
      }

      // 创建验证UI
      this.createVerificationUI(step, executionId, timeout);

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 隐藏人机验证UI
  async handleHideHumanVerification(message, sendResponse) {
    try {
      this.hideVerificationUI();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 创建验证UI
  createVerificationUI(step, executionId, timeout) {
    // 创建对话框（可拖拽，初始位置右下角）
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      text-align: center;
      pointer-events: auto;
      border: 2px solid #4CAF50;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 0;
    `;

    // 创建可拖拽的标题栏
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      margin: 0 0 16px 0;
      border-radius: 6px 6px 0 0;
      cursor: move;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    `;
    titleBar.textContent = '🔐 人机验证';

    // 添加拖拽功能
    this.makeDraggable(dialog, titleBar);

    // 标题已在标题栏中，不需要单独创建

    // 创建描述
    const description = document.createElement('p');
    description.textContent = step.description || '请完成页面上的人机验证，然后点击下方的"继续"按钮';
    description.style.cssText = `
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    `;

    // 创建倒计时显示
    const countdown = document.createElement('div');
    countdown.style.cssText = `
      margin: 0 0 20px 0;
      color: #999;
      font-size: 12px;
    `;

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // 创建继续按钮
    const continueBtn = document.createElement('button');
    continueBtn.textContent = '✅ 继续执行';
    continueBtn.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    `;

    // 创建跳过按钮（如果允许）
    const skipBtn = document.createElement('button');
    skipBtn.textContent = '⏭️ 跳过';
    skipBtn.style.cssText = `
      background: #FF9800;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
      ${step.options?.skipable ? '' : 'display: none;'}
    `;

    // 不再创建取消按钮

    // 绑定事件
    continueBtn.addEventListener('click', () => {
      this.hideVerificationUI();
      chrome.runtime.sendMessage({
        action: 'continueAutomation',
        executionId: executionId
      });
    });

    skipBtn.addEventListener('click', () => {
      this.hideVerificationUI();
      chrome.runtime.sendMessage({
        action: 'skipVerificationStep',
        executionId: executionId
      });
    });

    // 不再绑定取消按钮事件

    // 组装UI
    buttonContainer.appendChild(continueBtn);
    if (step.options?.skipable) {
      buttonContainer.appendChild(skipBtn);
    }

    // 创建内容区域容器
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      padding: 0 20px 20px 20px;
    `;

    contentArea.appendChild(description);
    contentArea.appendChild(countdown);
    contentArea.appendChild(buttonContainer);

    dialog.appendChild(titleBar);
    dialog.appendChild(contentArea);

    // 添加对话框到页面
    document.body.appendChild(dialog);
    this.verificationUI = dialog;



    // 启动倒计时
    this.startCountdown(countdown, timeout);
  }

  // 使弹窗可拖拽
  makeDraggable(dialog, titleBar) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    titleBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      // 获取当前位置
      const rect = dialog.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      // 改变定位方式为绝对定位
      dialog.style.position = 'fixed';
      dialog.style.left = startLeft + 'px';
      dialog.style.top = startTop + 'px';
      dialog.style.bottom = 'auto';
      dialog.style.right = 'auto';

      // 添加拖动样式
      titleBar.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newLeft = startLeft + deltaX;
      const newTop = startTop + deltaY;

      // 限制在视窗内
      const maxLeft = window.innerWidth - dialog.offsetWidth;
      const maxTop = window.innerHeight - dialog.offsetHeight;

      dialog.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
      dialog.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        titleBar.style.cursor = 'move';
        document.body.style.userSelect = '';
      }
    });
  }

  // 隐藏验证UI
  hideVerificationUI() {
    if (this.verificationUI && this.verificationUI.parentNode) {
      this.verificationUI.parentNode.removeChild(this.verificationUI);
      this.verificationUI = null;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // 启动倒计时
  startCountdown(countdownElement, timeout) {
    let remaining = Math.floor(timeout / 1000);

    const updateCountdown = () => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      countdownElement.textContent = `剩余时间: ${minutes}:${seconds.toString().padStart(2, '0')}`;

      if (remaining <= 0) {
        this.hideVerificationUI();
        clearInterval(this.countdownInterval);
      }

      remaining--;
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  // 检查元素是否存在
  async handleCheckElementExists(message, sendResponse) {
    try {
      const { selector } = message;

      // 查找元素
      const element = document.querySelector(selector);
      const exists = element !== null;

      sendResponse({
        success: true,
        exists: exists,
        selector: selector
      });
    } catch (error) {
      sendResponse({
        success: false,
        exists: false,
        error: error.message
      });
    }
  }

  // 启动元素选择器
  async handleStartElementPicker(message, sendResponse) {
    try {
      if (this.elementPicker.active) {
        sendResponse({ success: false, error: '元素选择器已经激活' });
        return;
      }

      this.startElementPicker();
      sendResponse({ success: true, message: '元素选择器已启动' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 停止元素选择器
  async handleStopElementPicker(message, sendResponse) {
    try {
      this.stopElementPicker();
      sendResponse({ success: true, message: '元素选择器已停止' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 启动元素选择器
  startElementPicker() {
    if (this.elementPicker.active) return;

    this.elementPicker.active = true;
    this.elementPicker.originalCursor = document.body.style.cursor;

    // 创建覆盖层
    this.createPickerOverlay();

    // 创建提示框
    this.createPickerTooltip();

    // 绑定事件
    this.bindPickerEvents();

    // 设置鼠标样式
    document.body.style.cursor = 'crosshair';

    console.log('元素选择器已启动');
  }

  // 停止元素选择器
  stopElementPicker() {
    if (!this.elementPicker.active) return;

    this.elementPicker.active = false;

    // 移除覆盖层
    if (this.elementPicker.overlay) {
      this.elementPicker.overlay.remove();
      this.elementPicker.overlay = null;
    }

    // 移除提示框
    if (this.elementPicker.tooltip) {
      this.elementPicker.tooltip.remove();
      this.elementPicker.tooltip = null;
    }

    // 解绑事件
    this.unbindPickerEvents();

    // 恢复鼠标样式
    document.body.style.cursor = this.elementPicker.originalCursor || '';

    this.elementPicker.currentElement = null;

    console.log('元素选择器已停止');
  }

  // 创建选择器覆盖层
  createPickerOverlay() {
    this.elementPicker.overlay = document.createElement('div');
    this.elementPicker.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      background: rgba(0, 123, 255, 0.3);
      border: 2px solid #007bff;
      pointer-events: none;
      z-index: 999999;
      box-sizing: border-box;
    `;
    document.body.appendChild(this.elementPicker.overlay);
  }

  // 创建选择器提示框
  createPickerTooltip() {
    this.elementPicker.tooltip = document.createElement('div');
    this.elementPicker.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000000;
      max-width: 300px;
      word-break: break-all;
      display: none;
    `;
    document.body.appendChild(this.elementPicker.tooltip);
  }

  // 绑定选择器事件（强化拦截模式）
  bindPickerEvents() {
    this.pickerMouseMove = this.onPickerMouseMove.bind(this);
    this.pickerClick = this.onPickerClick.bind(this);
    this.pickerKeyDown = this.onPickerKeyDown.bind(this);

    document.addEventListener('mousemove', this.pickerMouseMove, true);
    // 强化事件拦截：同时监听多种鼠标事件，确保完全阻止页面元素触发
    document.addEventListener('mousedown', this.pickerClick, { capture: true, passive: false });
    document.addEventListener('click', this.pickerClick, { capture: true, passive: false });
    document.addEventListener('mouseup', this.pickerClick, { capture: true, passive: false });
    document.addEventListener('contextmenu', this.pickerClick, { capture: true, passive: false });
    document.addEventListener('keydown', this.pickerKeyDown, true);
  }

  // 解绑选择器事件
  unbindPickerEvents() {
    if (this.pickerMouseMove) {
      document.removeEventListener('mousemove', this.pickerMouseMove, true);
    }
    if (this.pickerClick) {
      // 移除所有鼠标事件监听
      document.removeEventListener('mousedown', this.pickerClick, { capture: true });
      document.removeEventListener('click', this.pickerClick, { capture: true });
      document.removeEventListener('mouseup', this.pickerClick, { capture: true });
      document.removeEventListener('contextmenu', this.pickerClick, { capture: true });
    }
    if (this.pickerKeyDown) {
      document.removeEventListener('keydown', this.pickerKeyDown, true);
    }
  }

  // 鼠标移动事件
  onPickerMouseMove(event) {
    if (!this.elementPicker.active) return;

    event.preventDefault();
    event.stopPropagation();

    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || element === this.elementPicker.currentElement) return;

    this.elementPicker.currentElement = element;
    this.updatePickerHighlight(element);
    this.updatePickerTooltip(element, event);
  }

  // 强化点击事件处理（完全阻止页面元素触发）
  onPickerClick(event) {
    if (!this.elementPicker.active) return;

    console.log('🖱️ automation-content 强化事件拦截触发，事件类型:', event.type);

    // 使用最强的事件阻止机制
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // 对于click和mouseup事件，只阻止不处理选择逻辑
    if (event.type === 'click' || event.type === 'mouseup' || event.type === 'contextmenu') {
      console.log('🖱️ automation-content 阻止', event.type, '事件传播');
      return false;
    }

    // 只在mousedown时处理元素选择逻辑
    if (event.type === 'mousedown') {
      const element = this.elementPicker.currentElement;
      if (!element) return false;

      // 使用统一的选择器生成
      const selectors = this.generateElementSelectors(element);

      // 发送选择结果到background
      chrome.runtime.sendMessage({
        action: 'elementSelected',
        element: {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent?.substring(0, 100),
          attributes: this.getElementAttributes(element)
        },
        selectors: selectors,
        position: {
          x: event.clientX,
          y: event.clientY
        }
      });

      // 停止选择器
      this.stopElementPicker();
    }

    return false;
  }

  // 键盘事件
  onPickerKeyDown(event) {
    if (!this.elementPicker.active) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.stopElementPicker();
    }
  }

  // 更新高亮显示
  updatePickerHighlight(element) {
    if (!this.elementPicker.overlay) return;

    const rect = element.getBoundingClientRect();
    const overlay = this.elementPicker.overlay;

    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  // 更新提示框
  updatePickerTooltip(element, event) {
    if (!this.elementPicker.tooltip) return;

    const tooltip = this.elementPicker.tooltip;
    const selector = this.generatePrimarySelector(element);

    tooltip.innerHTML = `
      <div><strong>${element.tagName.toLowerCase()}</strong></div>
      ${element.id ? `<div>id: ${element.id}</div>` : ''}
      ${element.className ? `<div>class: ${element.className}</div>` : ''}
      <div>selector: ${selector}</div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = (event.clientX + 10) + 'px';
    tooltip.style.top = (event.clientY + 10) + 'px';

    // 确保提示框不超出屏幕
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = (event.clientX - tooltipRect.width - 10) + 'px';
    }
    if (tooltipRect.bottom > window.innerHeight) {
      tooltip.style.top = (event.clientY - tooltipRect.height - 10) + 'px';
    }
  }

  // 生成元素选择器（统一使用智能选择器）
  generateElementSelectors(element) {
    // 优先使用element-selector.js的智能选择器
    if (window.elementSelector && typeof window.elementSelector.generateSmartSelectors === 'function') {
      console.log('使用统一的智能选择器生成');
      return window.elementSelector.generateSmartSelectors(element);
    }

    // 降级到原有方法（保持兼容性）
    console.log('降级使用原有选择器生成方法');
    return this.fallbackGenerateSelectors(element);
  }

  // 降级选择器生成方法（保持兼容性）
  fallbackGenerateSelectors(element) {
    const selectors = [];

    // 1. ID选择器
    if (element.id) {
      selectors.push({
        type: 'id',
        selector: `#${element.id}`,
        priority: 1,
        unique: this.isElementUnique(`#${element.id}`),
        description: 'ID选择器（推荐）'
      });
    }

    // 2. 类选择器
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        const classSelector = `.${classes.join('.')}`;
        selectors.push({
          type: 'class',
          selector: classSelector,
          priority: 2,
          unique: this.isElementUnique(classSelector),
          description: '类选择器'
        });
      }
    }

    // 3. 属性选择器
    const attributes = this.getElementAttributes(element);
    for (const [name, value] of Object.entries(attributes)) {
      if (name !== 'id' && name !== 'class') {
        const attrSelector = `[${name}="${value}"]`;
        selectors.push({
          type: 'attribute',
          selector: attrSelector,
          priority: 3,
          unique: this.isElementUnique(attrSelector),
          description: `属性选择器 (${name})`
        });
      }
    }

    // 4. 标签选择器
    const tagSelector = element.tagName.toLowerCase();
    selectors.push({
      type: 'tag',
      selector: tagSelector,
      priority: 4,
      unique: this.isElementUnique(tagSelector),
      description: '标签选择器'
    });

    // 5. CSS路径选择器
    const cssPath = this.generateCSSPath(element);
    selectors.push({
      type: 'path',
      selector: cssPath,
      priority: 5,
      unique: this.isElementUnique(cssPath),
      description: 'CSS路径选择器'
    });

    // 6. XPath选择器
    const xpath = this.generateXPath(element);
    selectors.push({
      type: 'xpath',
      selector: xpath,
      priority: 6,
      unique: this.isElementUnique(xpath),
      description: 'XPath选择器'
    });

    // 按唯一性和优先级排序
    return selectors.sort((a, b) => {
      if (a.unique && !b.unique) return -1;
      if (!a.unique && b.unique) return 1;
      return a.priority - b.priority;
    });
  }

  // 检查选择器唯一性
  isElementUnique(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      return elements.length === 1;
    } catch (e) {
      return false;
    }
  }

  // 生成主要选择器
  generatePrimarySelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }
    return this.generateCSSPath(element);
  }

  // 生成CSS路径
  generateCSSPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }

      if (current.className) {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }

      // 添加nth-child如果有兄弟元素
      const siblings = Array.from(current.parentNode?.children || []);
      const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // 生成XPath
  generateXPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        return `//*[@id="${current.id}"]`;
      }

      const siblings = Array.from(current.parentNode?.children || []);
      const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `[${index}]`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return '//' + path.join('/');
  }

  // 获取元素属性
  getElementAttributes(element) {
    const attributes = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }
}

// 创建实例
const automationContentScript = new AutomationContentScript();
