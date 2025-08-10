// 元素选择器 - 用于选择器助手功能

class ElementSelector {
  constructor() {
    this.isActive = false;
    this.selectedElement = null;
    this.overlay = null;
    this.preciseOverlay = null;
    this.tooltip = null;
    this.onElementSelected = null;
    this.nestedElements = null;
    this.currentNestedIndex = 0;
    this.mutationObserver = null;
    this.init();
  }

  init() {
    this.createOverlay();
    this.createTooltip();
    this.bindEvents();
  }

  // 创建覆盖层
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'element-selector-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 999999;
      border: 2px solid #ff4444;
      background: rgba(255, 68, 68, 0.15);
      box-shadow: 0 0 15px rgba(255, 68, 68, 0.6);
      display: none;
      transition: all 0.05s ease;
      border-radius: 2px;
    `;

    // 创建精确选择模式的细边框覆盖层
    this.preciseOverlay = document.createElement('div');
    this.preciseOverlay.id = 'element-selector-precise-overlay';
    this.preciseOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 999998;
      border: 1px dashed #00ff00;
      background: rgba(0, 255, 0, 0.05);
      display: none;
      transition: all 0.05s ease;
    `;
  }

  // 创建提示框
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'element-selector-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      max-width: 400px;
      text-align: center;
    `;
    this.tooltip.innerHTML = `
      <div style="margin-bottom: 8px;">🎯 选择器助手已激活 (增强F12模式)</div>
      <div style="font-size: 12px; opacity: 0.8;">
        <strong>鼠标选择</strong>：移动鼠标到元素上，点击选择<br>
        <strong>键盘选择</strong>：回车键/空格键选择当前高亮元素<br>
        <strong>取消</strong>：按 ESC 键退出选择模式
      </div>
    `;
  }

  // 绑定事件
  bindEvents() {
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('ElementSelector: 收到消息', message);

      if (message.action === 'startElementSelection') {
        console.log('ElementSelector: 开始启动元素选择');
        this.startSelection();
        sendResponse({ success: true });
      } else if (message.action === 'stopElementSelection') {
        console.log('ElementSelector: 停止元素选择');
        this.stopSelection();
        sendResponse({ success: true });
      }
    });

    // 键盘事件（增强版）
    this.handleKeyPress = (e) => {
      if (!this.isActive) return;

      if (e.key === 'Escape') {
        console.log('⌨️ ESC键按下，停止选择');
        this.stopSelection();
      } else if (e.key === 'Enter' || e.key === ' ') {
        // 回车键或空格键选择当前高亮的元素
        console.log('⌨️ 回车/空格键按下，选择当前高亮元素');
        e.preventDefault();
        e.stopPropagation();

        if (this.selectedElement && !this.isOurElement(this.selectedElement)) {
          console.log('⌨️ 通过键盘选择元素:', this.selectedElement.tagName);
          this.selectElement(this.selectedElement);
        }
      }
    };

    // 滚轮事件（简化版 - 不处理）
    this.handleWheel = (e) => {
      // 简化版不处理滚轮事件
      return;
    };

    // 鼠标移动事件（增强的F12模式，支持动态元素）
    this.handleMouseMove = (e) => {
      if (!this.isActive) return;

      // 使用增强的元素检测方法
      const element = this.getElementAtPoint(e.clientX, e.clientY);

      if (!element) return;

      // 过滤掉选择器相关的元素
      if (this.isOurElement(element)) return;

      this.highlightElement(element);
    };

    // 强化鼠标事件拦截（完全阻止页面元素触发）
    this.handleMouseDown = (e) => {
      if (!this.isActive) return;

      console.log('🖱️ 强化事件拦截触发，事件类型:', e.type, '坐标:', e.clientX, e.clientY);

      // 使用最强的事件阻止机制
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // 对于click和mouseup事件，只阻止不处理选择逻辑
      if (e.type === 'click' || e.type === 'mouseup' || e.type === 'contextmenu') {
        console.log('🖱️ 阻止', e.type, '事件传播');
        return false;
      }

      // 只在mousedown时处理元素选择逻辑
      if (e.type === 'mousedown') {
        this.processElementSelection(e);
      }

      return false;
    };

    // 处理元素选择逻辑
    this.processElementSelection = (e) => {
      // 使用增强的元素检测方法
      const element = this.getElementAtPoint(e.clientX, e.clientY);

      if (!element) {
        console.log('🖱️ 未检测到元素');
        return;
      }

      if (!this.isOurElement(element)) {
        console.log('🖱️ 选择元素:', element.tagName, element.className);
        this.selectElement(element);
      } else {
        console.log('🖱️ 跳过选择器元素');
      }
    };

    // 滚动事件
    this.handleScroll = () => {
      if (this.isActive && this.selectedElement) {
        this.updateOverlayPosition(this.selectedElement);
      }
    };

    // 窗口大小变化事件
    this.handleResize = () => {
      if (this.isActive && this.selectedElement) {
        this.updateOverlayPosition(this.selectedElement);
      }
    };
  }

  // 开始选择
  startSelection() {
    if (this.isActive) return;

    this.isActive = true;

    // 添加覆盖层和提示框到页面
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.preciseOverlay);
    document.body.appendChild(this.tooltip);
    console.log('ElementSelector: 覆盖层和提示框已添加到页面');

    // 显示提示框
    this.tooltip.style.display = 'block';
    console.log('ElementSelector: 提示框已显示');

    // 绑定事件监听器（使用捕获阶段，确保能捕获动态元素的事件）
    document.addEventListener('keydown', this.handleKeyPress, { capture: true, passive: false });
    document.addEventListener('mousemove', this.handleMouseMove, { capture: true, passive: false });

    // 强化事件拦截：同时监听多种鼠标事件，确保完全阻止页面元素触发
    document.addEventListener('mousedown', this.handleMouseDown, { capture: true, passive: false });
    document.addEventListener('click', this.handleMouseDown, { capture: true, passive: false });
    document.addEventListener('mouseup', this.handleMouseDown, { capture: true, passive: false });
    document.addEventListener('contextmenu', this.handleMouseDown, { capture: true, passive: false });

    document.addEventListener('wheel', this.handleWheel, { capture: true, passive: false });
    document.addEventListener('scroll', this.handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', this.handleResize, { capture: true, passive: true });

    console.log('🎯 事件监听器已绑定（强化拦截模式）');



    // 改变鼠标样式
    document.body.style.cursor = 'crosshair';
    console.log('ElementSelector: 鼠标样式已改变');

    // 启动MutationObserver监听动态元素
    this.startMutationObserver();
  }

  // 停止选择
  stopSelection() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.selectedElement = null;
    
    // 移除事件监听器
    document.removeEventListener('keydown', this.handleKeyPress, { capture: true });
    document.removeEventListener('mousemove', this.handleMouseMove, { capture: true });

    // 移除所有鼠标事件监听
    document.removeEventListener('mousedown', this.handleMouseDown, { capture: true });
    document.removeEventListener('click', this.handleMouseDown, { capture: true });
    document.removeEventListener('mouseup', this.handleMouseDown, { capture: true });
    document.removeEventListener('contextmenu', this.handleMouseDown, { capture: true });

    document.removeEventListener('wheel', this.handleWheel, { capture: true });
    document.removeEventListener('scroll', this.handleScroll, { capture: true });
    window.removeEventListener('resize', this.handleResize, { capture: true });
    
    // 隐藏覆盖层和提示框
    if (this.overlay.parentNode) {
      this.overlay.style.display = 'none';
      this.overlay.parentNode.removeChild(this.overlay);
    }

    if (this.preciseOverlay.parentNode) {
      this.preciseOverlay.style.display = 'none';
      this.preciseOverlay.parentNode.removeChild(this.preciseOverlay);
    }

    if (this.tooltip.parentNode) {
      this.tooltip.style.display = 'none';
      this.tooltip.parentNode.removeChild(this.tooltip);
    }

    // 清理嵌套元素信息框
    const nestedInfo = document.getElementById('nested-elements-info');
    if (nestedInfo) {
      nestedInfo.remove();
    }

    // 清理嵌套元素状态
    this.nestedElements = null;
    this.currentNestedIndex = 0;

    // 恢复鼠标样式
    document.body.style.cursor = '';

    // 停止MutationObserver
    this.stopMutationObserver();
  }

  // 启动MutationObserver监听动态元素
  startMutationObserver() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 新添加的元素现在可以被选择器检测到
            }
          });
        }
      });
    });

    // 开始观察整个文档的变化
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  // 停止MutationObserver
  stopMutationObserver() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }



  // 增强的元素检测方法，支持动态元素和iframe
  getElementAtPoint(x, y) {
    console.log('🔍 检测坐标:', x, y);

    // 首先尝试标准方法
    let element = document.elementFromPoint(x, y);
    console.log('🔍 标准检测到的元素:', element?.tagName, element?.className, element?.id);

    // 如果检测到iframe，尝试获取iframe内的元素
    if (element && element.tagName === 'IFRAME') {
      console.log('🔍 检测到iframe:', element.src || element.getAttribute('src'));

      try {
        const iframeDoc = element.contentDocument || element.contentWindow.document;
        if (iframeDoc) {
          // 计算iframe内的相对坐标
          const iframeRect = element.getBoundingClientRect();
          const relativeX = x - iframeRect.left;
          const relativeY = y - iframeRect.top;

          console.log('🔍 iframe内相对坐标:', relativeX, relativeY);

          const iframeElement = iframeDoc.elementFromPoint(relativeX, relativeY);
          console.log('🔍 iframe内检测到的元素:', iframeElement?.tagName, iframeElement?.className);

          if (iframeElement && iframeElement !== iframeDoc.documentElement && iframeElement !== iframeDoc.body) {
            element = iframeElement;
            console.log('🔍 使用iframe内的元素');
          }
        } else {
          console.log('🔍 无法访问iframe文档');
        }
      } catch (e) {
        // 跨域iframe，无法访问内容
        console.log('🔍 跨域iframe，无法访问内容:', e.message);

        // 检查是否是Cloudflare验证iframe
        if (this.isCloudflareChallenge(element)) {
          console.log('🔍 检测到Cloudflare验证iframe');
          element.setAttribute('data-cloudflare-challenge', 'true');
          element.setAttribute('data-selector-hint', 'Cloudflare验证框');
        } else {
          // 对于其他跨域iframe，添加通用标记
          element.setAttribute('data-cross-origin-iframe', 'true');
        }
      }
    }

    // 检查Shadow DOM
    if (element && element.shadowRoot) {
      console.log('🔍 检测到Shadow DOM');
      try {
        const shadowElement = element.shadowRoot.elementFromPoint(x, y);
        if (shadowElement) {
          console.log('🔍 Shadow DOM内检测到的元素:', shadowElement.tagName);
          element = shadowElement;
        }
      } catch (e) {
        console.log('🔍 无法访问Shadow DOM:', e.message);
      }
    }

    // 特殊处理：如果检测到的是body或html，尝试更精确的检测
    if (element && (element.tagName === 'BODY' || element.tagName === 'HTML')) {
      console.log('🔍 检测到body/html，尝试更精确的检测');

      // 获取所有在该坐标点的元素
      const elementsFromPoint = document.elementsFromPoint(x, y);
      console.log('🔍 该坐标点的所有元素:', elementsFromPoint.map(el => `${el.tagName}${el.className ? '.' + el.className.split(' ')[0] : ''}${el.id ? '#' + el.id : ''}`));

      // 找到第一个不是body/html的有意义元素
      for (const el of elementsFromPoint) {
        if (el.tagName !== 'BODY' && el.tagName !== 'HTML' && !this.isOurElement(el)) {
          // 优先选择交互元素
          if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            console.log('🔍 找到交互元素:', el.tagName, el.className, el.textContent?.trim().substring(0, 20));
            element = el;
            break;
          }
          // 或者有点击事件的元素
          if (el.onclick || el.getAttribute('onclick') || el.style.cursor === 'pointer') {
            console.log('🔍 找到可点击元素:', el.tagName, el.className);
            element = el;
            break;
          }
          // 或者有特定类名的元素
          if (el.className && (el.className.includes('button') || el.className.includes('btn') || el.className.includes('click'))) {
            console.log('🔍 找到按钮样式元素:', el.tagName, el.className);
            element = el;
            break;
          }
        }
      }

      // 如果还是没找到合适的元素，使用第一个非body/html元素
      if (element && (element.tagName === 'BODY' || element.tagName === 'HTML')) {
        for (const el of elementsFromPoint) {
          if (el.tagName !== 'BODY' && el.tagName !== 'HTML' && !this.isOurElement(el)) {
            console.log('🔍 使用备用元素:', el.tagName, el.className);
            element = el;
            break;
          }
        }
      }
    }

    // 最终检查：如果还是body/html，提供备用方案
    if (element && (element.tagName === 'BODY' || element.tagName === 'HTML')) {
      console.log('⚠️ 警告：仍然检测到body/html，可能存在覆盖层或特殊情况');

      // 尝试查找附近的可交互元素
      const nearbyElements = this.findNearbyInteractiveElements(x, y, 50);
      if (nearbyElements.length > 0) {
        console.log('🔍 找到附近的可交互元素:', nearbyElements.map(el => `${el.tagName}.${el.className}`));
        element = nearbyElements[0];
      }
    }

    console.log('🔍 最终选择的元素:', element?.tagName, element?.className, element?.id, element?.textContent?.trim().substring(0, 30));
    return element;
  }

  // 检测是否是Cloudflare验证iframe
  isCloudflareChallenge(iframe) {
    if (!iframe || iframe.tagName !== 'IFRAME') return false;

    const src = iframe.src || iframe.getAttribute('src') || '';
    const title = iframe.title || iframe.getAttribute('title') || '';
    const id = iframe.id || '';
    const className = iframe.className || '';

    // 检查常见的Cloudflare验证特征
    return src.includes('challenges.cloudflare.com') ||
           src.includes('cloudflare.com') ||
           title.toLowerCase().includes('cloudflare') ||
           title.toLowerCase().includes('challenge') ||
           title.toLowerCase().includes('verification') ||
           id.includes('cf-') ||
           className.includes('cf-') ||
           className.includes('cloudflare') ||
           // 检查父元素是否有Cloudflare相关的类名或ID
           this.hasCloudflareParent(iframe);
  }

  // 检查父元素是否有Cloudflare相关标识
  hasCloudflareParent(element) {
    let parent = element.parentElement;
    let depth = 0;

    while (parent && depth < 5) {
      const className = parent.className || '';
      const id = parent.id || '';

      if (className.includes('cf-') ||
          className.includes('cloudflare') ||
          className.includes('challenge') ||
          id.includes('cf-') ||
          id.includes('cloudflare')) {
        return true;
      }

      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  // 查找附近的可交互元素
  findNearbyInteractiveElements(centerX, centerY, radius) {
    const interactiveElements = [];
    const allElements = document.querySelectorAll('button, a, input, [onclick], [role="button"], .btn, .button');

    for (const el of allElements) {
      if (this.isOurElement(el)) continue;

      const rect = el.getBoundingClientRect();
      const elementCenterX = rect.left + rect.width / 2;
      const elementCenterY = rect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(elementCenterX - centerX, 2) +
        Math.pow(elementCenterY - centerY, 2)
      );

      if (distance <= radius && rect.width > 0 && rect.height > 0) {
        interactiveElements.push({
          element: el,
          distance: distance,
          text: el.textContent?.trim() || el.value || el.alt || ''
        });
      }
    }

    // 按距离排序
    interactiveElements.sort((a, b) => a.distance - b.distance);
    return interactiveElements.map(item => item.element);
  }

  // 检查是否是我们的选择器元素
  isOurElement(element) {
    if (!element) return true;

    return element === this.overlay ||
           element === this.tooltip ||
           element === this.preciseOverlay ||
           element.id?.includes('element-selector') ||
           element.classList?.contains('nested-elements-info');
  }



  // 获取元素描述
  getElementDescription(element) {
    const parts = [];

    if (element.id) {
      parts.push(`id="${element.id}"`);
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 2);
      if (classes.length > 0) {
        parts.push(`class="${classes.join(' ')}${classes.length < element.classList.length ? '...' : ''}"`);
      }
    }

    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length <= 30) {
      parts.push(`"${text}"`);
    } else if (text && text.length > 30) {
      parts.push(`"${text.substring(0, 27)}..."`);
    }

    return parts.join(' ');
  }

  // 高亮元素（简化版）
  highlightElement(element) {
    this.selectedElement = element;
    this.updateOverlayPosition(element);
    this.overlay.style.display = 'block';
  }

  // 更新覆盖层位置（简化版）
  updateOverlayPosition(element) {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.overlay.style.left = (rect.left + scrollX - 2) + 'px';
    this.overlay.style.top = (rect.top + scrollY - 2) + 'px';
    this.overlay.style.width = (rect.width + 4) + 'px';
    this.overlay.style.height = (rect.height + 4) + 'px';
  }

  // 选择元素
  selectElement(element) {
    const elementInfo = this.analyzeElement(element);

    // 生成智能选择器
    const smartSelectors = this.generateSmartSelectors(element);
    elementInfo.smartSelectors = smartSelectors;

    // 停止选择模式
    this.stopSelection();

    // 发送选择结果到background
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      elementInfo: elementInfo
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('发送元素选择结果失败:', chrome.runtime.lastError);
      }
    });
  }

  // 分析元素
  analyzeElement(element) {
    const rect = element.getBoundingClientRect();

    const elementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      classList: Array.from(element.classList),
      attributes: this.getElementAttributes(element),
      textContent: element.textContent?.trim().substring(0, 100),
      innerHTML: element.innerHTML?.substring(0, 200),
      value: element.value,
      type: element.type,
      name: element.name,
      placeholder: element.placeholder,
      href: element.href,
      src: element.src,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      cssPath: this.generateCSSPath(element),
      xpath: this.generateXPath(element),
      parentInfo: this.getParentInfo(element),
      siblingInfo: this.getSiblingInfo(element)
    };

    // 特殊处理：Cloudflare验证iframe
    if (element.hasAttribute('data-cloudflare-challenge')) {
      elementInfo.specialType = 'cloudflare-challenge';
      elementInfo.description = 'Cloudflare人机验证框';
      elementInfo.recommendedSelectors = [
        'iframe[src*="cloudflare"]',
        'iframe[title*="cloudflare" i]',
        'iframe[title*="challenge" i]',
        '.cf-challenge iframe',
        '[data-cloudflare-challenge]'
      ];
    }

    // 特殊处理：跨域iframe
    if (element.hasAttribute('data-cross-origin-iframe')) {
      elementInfo.specialType = 'cross-origin-iframe';
      elementInfo.description = '跨域iframe（无法访问内容）';
    }

    return elementInfo;
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

  // 🔑 生成智能选择器（核心新功能）
  generateSmartSelectors(element) {
    const selectors = [];

    // 1. ID选择器（最高优先级）
    if (element.id) {
      const idSelector = `#${element.id}`;
      selectors.push({
        selector: idSelector,
        type: 'id',
        priority: 1,
        unique: this.isUnique(idSelector),
        stable: true,
        description: 'ID选择器（推荐）'
      });
    }

    // 2. 智能类选择器
    if (element.className) {
      const smartClassSelector = this.generateSmartClassSelector(element);
      if (smartClassSelector) {
        selectors.push(smartClassSelector);
      }
    }

    // 3. 属性选择器
    const attrSelectors = this.generateAttributeSelectors(element);
    selectors.push(...attrSelectors);

    // 4. 优化的CSS路径
    const cssPath = this.generateOptimizedCSSPath(element);
    selectors.push({
      selector: cssPath,
      type: 'path',
      priority: 5,
      unique: this.isUnique(cssPath),
      stable: false,
      description: 'CSS路径选择器'
    });

    // 5. XPath选择器
    const xpath = this.generateXPath(element);
    selectors.push({
      selector: xpath,
      type: 'xpath',
      priority: 6,
      unique: this.isUnique(xpath),
      stable: false,
      description: 'XPath选择器'
    });

    // 按优先级和唯一性排序
    return selectors.sort((a, b) => {
      // 唯一的选择器优先
      if (a.unique && !b.unique) return -1;
      if (!a.unique && b.unique) return 1;
      // 稳定的选择器优先
      if (a.stable && !b.stable) return -1;
      if (!a.stable && b.stable) return 1;
      // 按优先级排序
      return a.priority - b.priority;
    });
  }

  // 选择器唯一性验证
  isUnique(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      return elements.length === 1;
    } catch (e) {
      return false;
    }
  }

  // 生成智能类选择器
  generateSmartClassSelector(element) {
    const classes = element.className.split(' ').filter(cls => cls.trim());
    if (classes.length === 0) return null;

    // 尝试不同的类组合，找到唯一的选择器
    const tagName = element.tagName.toLowerCase();

    // 1. 尝试单个类
    for (const cls of classes) {
      const selector = `${tagName}.${cls}`;
      if (this.isUnique(selector)) {
        return {
          selector: selector,
          type: 'class',
          priority: 2,
          unique: true,
          stable: true,
          description: `类选择器 (.${cls})`
        };
      }
    }

    // 2. 尝试多个类组合
    const multiClassSelector = `${tagName}.${classes.join('.')}`;
    return {
      selector: multiClassSelector,
      type: 'class',
      priority: 2,
      unique: this.isUnique(multiClassSelector),
      stable: true,
      description: '多类选择器'
    };
  }

  // 生成属性选择器
  generateAttributeSelectors(element) {
    const selectors = [];
    const attributes = this.getElementAttributes(element);
    const tagName = element.tagName.toLowerCase();

    // 优先考虑的属性
    const priorityAttrs = ['name', 'type', 'data-testid', 'data-test', 'role'];

    for (const attr of priorityAttrs) {
      if (attributes[attr]) {
        const selector = `${tagName}[${attr}="${attributes[attr]}"]`;
        selectors.push({
          selector: selector,
          type: 'attribute',
          priority: 3,
          unique: this.isUnique(selector),
          stable: true,
          description: `属性选择器 (${attr})`
        });
      }
    }

    return selectors;
  }

  // 生成优化的CSS路径
  generateOptimizedCSSPath(element) {
    const path = [];
    let current = element;
    let depth = 0;
    const maxDepth = 6; // 限制路径深度

    while (current && current.nodeType === Node.ELEMENT_NODE && depth < maxDepth) {
      let selector = current.nodeName.toLowerCase();

      // 如果有ID，直接使用并停止
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }

      // 添加有意义的类
      if (current.className) {
        const classes = current.className.split(' ')
          .filter(cls => cls.trim() && !cls.match(/^(ng-|ui-|js-)/)) // 过滤框架类
          .slice(0, 2); // 最多取2个类
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }

      // 添加nth-child（仅在必要时）
      const parent = current.parentElement;
      if (parent && depth > 0) { // 不为根元素添加nth-child
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
      depth++;
    }

    return path.join(' > ');
  }

  // 获取父元素信息
  getParentInfo(element) {
    const parent = element.parentElement;
    if (!parent) return null;

    return {
      tagName: parent.tagName.toLowerCase(),
      id: parent.id,
      className: parent.className,
      classList: Array.from(parent.classList)
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
}

// 创建实例
function initializeElementSelector() {
  try {
    const elementSelector = new ElementSelector();

    // 将实例暴露到全局，方便调试
    window.elementSelector = elementSelector;
  } catch (error) {
    console.error('ElementSelector实例创建失败:', error);
  }
}

// 确保DOM加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeElementSelector);
} else {
  initializeElementSelector();
}
