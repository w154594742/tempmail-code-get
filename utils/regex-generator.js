/**
 * 正则表达式生成器
 * 根据正则表达式模式生成符合该模式的随机字符串
 */
class RegexGenerator {
  constructor(pattern, maxLength = 20) {
    this.pattern = pattern;
    this.maxLength = maxLength;
    this.maxQuantifierRepeat = 10; // 量词最大重复次数
  }

  /**
   * 生成符合正则模式的随机字符串
   */
  generate() {
    try {
      const result = this.parseAndGenerate(this.pattern);
      if (result.length > this.maxLength) {
        console.warn(`生成的字符串长度(${result.length})超过限制(${this.maxLength})，截断处理`);
        return result.substring(0, this.maxLength);
      }
      return result;
    } catch (error) {
      console.error('正则生成失败:', error);
      return this.getFallbackString();
    }
  }

  /**
   * 解析正则表达式并生成字符串
   */
  parseAndGenerate(pattern) {
    try {
      // 1. 词法分析：将正则分解为tokens
      const tokens = this.tokenize(pattern);

      // 2. 语法分析：将tokens组合成语法单元
      const syntaxUnits = this.parseSyntaxUnits(tokens);

      // 3. 生成：为每个语法单元生成字符
      return this.generateFromSyntaxUnits(syntaxUnits);
    } catch (error) {
      console.error('正则解析失败:', error);
      throw error;
    }
  }

  /**
   * 词法分析：将正则表达式分解为tokens
   */
  tokenize(pattern) {
    const tokens = [];
    let i = 0;

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === '[') {
        // 字符类 [a-z]
        const endIndex = pattern.indexOf(']', i);
        if (endIndex === -1) {
          throw new Error('字符类未正确闭合');
        }
        tokens.push({
          type: 'CHARACTER_CLASS',
          value: pattern.substring(i, endIndex + 1),
          startIndex: i,
          endIndex: endIndex
        });
        i = endIndex + 1;
      } else if (char === '\\') {
        // 转义序列 \d \w
        if (i + 1 >= pattern.length) {
          throw new Error('转义序列不完整');
        }
        tokens.push({
          type: 'ESCAPE_SEQUENCE',
          value: pattern.substring(i, i + 2),
          startIndex: i,
          endIndex: i + 1
        });
        i += 2;
      } else if (char === '{') {
        // 量词 {n} {n,m}
        const endIndex = pattern.indexOf('}', i);
        if (endIndex === -1) {
          throw new Error('量词未正确闭合');
        }
        tokens.push({
          type: 'QUANTIFIER',
          value: pattern.substring(i, endIndex + 1),
          startIndex: i,
          endIndex: endIndex
        });
        i = endIndex + 1;
      } else if (char === '+' || char === '*' || char === '?') {
        // 简单量词
        tokens.push({
          type: 'QUANTIFIER',
          value: char,
          startIndex: i,
          endIndex: i
        });
        i++;
      } else {
        // 普通字符
        tokens.push({
          type: 'LITERAL',
          value: char,
          startIndex: i,
          endIndex: i
        });
        i++;
      }
    }

    return tokens;
  }

  /**
   * 语法分析：将tokens组合成语法单元
   */
  parseSyntaxUnits(tokens) {
    const syntaxUnits = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];

      // 检查下一个token是否是量词
      if (nextToken && nextToken.type === 'QUANTIFIER') {
        // 组合成量化单元
        syntaxUnits.push({
          type: 'QUANTIFIED',
          element: token,
          quantifier: nextToken
        });
        i += 2; // 跳过两个token
      } else {
        // 单独的元素
        syntaxUnits.push({
          type: 'SINGLE',
          element: token
        });
        i++;
      }
    }

    return syntaxUnits;
  }

  /**
   * 生成：为每个语法单元生成字符
   */
  generateFromSyntaxUnits(syntaxUnits) {
    let result = '';

    for (const unit of syntaxUnits) {
      if (unit.type === 'QUANTIFIED') {
        // 量化单元：生成多个字符
        const count = this.getRandomCount(unit.quantifier.value);
        for (let i = 0; i < count; i++) {
          result += this.generateSingleChar(unit.element);
        }
      } else if (unit.type === 'SINGLE') {
        // 单个元素：生成一个字符
        result += this.generateSingleChar(unit.element);
      }
    }

    return result;
  }

  /**
   * 根据量词获取随机重复次数
   */
  getRandomCount(quantifier) {
    if (quantifier.startsWith('{') && quantifier.endsWith('}')) {
      // {n} 或 {n,m}
      const content = quantifier.slice(1, -1);
      return this.parseQuantifierContent(content);
    } else {
      // 简单量词
      switch (quantifier) {
        case '+':
          return Math.floor(Math.random() * this.maxQuantifierRepeat) + 1;
        case '*':
          return Math.floor(Math.random() * (this.maxQuantifierRepeat + 1));
        case '?':
          return Math.random() < 0.5 ? 0 : 1;
        default:
          return 1;
      }
    }
  }

  /**
   * 生成单个字符
   */
  generateSingleChar(elementToken) {
    switch (elementToken.type) {
      case 'CHARACTER_CLASS':
        return this.generateFromCharacterClass(elementToken.value.slice(1, -1));
      case 'ESCAPE_SEQUENCE':
        return this.generateFromEscapeSequence(elementToken.value);
      case 'LITERAL':
        return elementToken.value;
      default:
        throw new Error(`未知的元素类型: ${elementToken.type}`);
    }
  }

  /**
   * 从转义序列生成字符
   */
  generateFromEscapeSequence(escapeSequence) {
    const escapeChar = escapeSequence[1];

    switch (escapeChar) {
      case 'd':
        // 数字 [0-9]
        return this.generateFromCharacterClass('0-9');
      case 'w':
        // 单词字符 [a-zA-Z0-9_]
        return this.generateFromCharacterClass('a-zA-Z0-9_');
      default:
        // 其他转义字符直接返回
        return escapeChar;
    }
  }

  /**
   * 从字符类生成随机字符
   */
  generateFromCharacterClass(classContent) {
    let chars = '';

    // 处理范围 a-z A-Z 0-9
    const ranges = classContent.match(/([a-zA-Z0-9])-([a-zA-Z0-9])/g);
    if (ranges) {
      for (const range of ranges) {
        const [start, end] = range.split('-');
        const startCode = start.charCodeAt(0);
        const endCode = end.charCodeAt(0);
        
        for (let code = startCode; code <= endCode; code++) {
          chars += String.fromCharCode(code);
        }
      }
    }

    // 处理单独的字符（移除已处理的范围）
    let remaining = classContent;
    if (ranges) {
      for (const range of ranges) {
        remaining = remaining.replace(range, '');
      }
    }
    chars += remaining;

    if (chars.length === 0) {
      throw new Error('字符类为空');
    }

    return chars.charAt(Math.floor(Math.random() * chars.length));
  }



  /**
   * 解析量词内容 n 或 n,m，返回随机数量
   */
  parseQuantifierContent(content) {
    if (content.includes(',')) {
      const [minStr, maxStr] = content.split(',');
      const min = parseInt(minStr) || 0;
      const max = maxStr ? parseInt(maxStr) : this.maxQuantifierRepeat;
      const actualMax = Math.min(max, this.maxQuantifierRepeat);
      return Math.floor(Math.random() * (actualMax - min + 1)) + min;
    } else {
      const count = parseInt(content);
      return count;
    }
  }



  /**
   * 验证正则表达式模式
   */
  validatePattern(pattern) {
    try {
      // 基础语法检查
      if (!pattern || pattern.length === 0) {
        return { valid: false, error: '正则表达式不能为空' };
      }

      // 检查括号匹配
      let bracketCount = 0;
      let braceCount = 0;
      
      for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        if (bracketCount < 0 || braceCount < 0) {
          return { valid: false, error: '括号不匹配' };
        }
      }
      
      if (bracketCount !== 0) {
        return { valid: false, error: '字符类括号未正确闭合' };
      }
      
      if (braceCount !== 0) {
        return { valid: false, error: '量词括号未正确闭合' };
      }

      // 尝试生成一个示例来验证
      this.parseAndGenerate(pattern);
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * 获取回退字符串（当生成失败时使用）
   */
  getFallbackString() {
    return 'fallback' + Math.floor(Math.random() * 1000);
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegexGenerator;
} else if (typeof window !== 'undefined') {
  window.RegexGenerator = RegexGenerator;
}
