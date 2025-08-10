# 临时邮箱验证码获取工具

一个现代化的Chrome侧边栏扩展，专为自动生成临时邮箱并获取验证码而设计。支持多域名配置和Cloudflare域名转发，提供持久化的侧边栏体验。

## 📥 快速下载

[![GitHub release](https://img.shields.io/github/v/release/w154594742/tempmail-code-get)](https://github.com/w154594742/tempmail-code-get/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/w154594742/tempmail-code-get/total)](https://github.com/w154594742/tempmail-code-get/releases)

**🔗 [下载最新版本 CRX 文件](https://github.com/w154594742/tempmail-code-get/releases/latest)**

## ✨ 核心特性

### 🎯 智能邮箱生成
- **格式**: 姓氏+名字+6位随机数字@域名 (如: `lindagarcia123456@domain1.com`)
- **姓名库**: 内置100个英文姓氏和100个英文名字，确保高度随机性
- **多域名支持**: 配置多个域名，随机选择使用
- **域名格式**: 支持中文逗号（，）和英文逗号（,）分隔

### 🔐 自动验证码获取
- **实时获取**: 自动从目标邮箱获取最新验证码
- **智能解析**: 自动识别邮件中的验证码
- **状态跟踪**: 实时显示获取状态和时间戳
- **停止控制**: 支持中途停止获取操作

### 📱 侧边栏体验
- **持久显示**: 侧边栏保持打开，不会因点击页面而关闭
- **便捷访问**: 始终在浏览器右侧可见，随时可用
- **多标签页共享**: 在不同标签页间保持状态
- **原生集成**: 与Chrome浏览器完美集成
- **空间优化**: 不占用主页面空间，提高工作效率

### 📊 历史记录管理
- **邮箱历史**: 保存最多1000个邮箱记录
- **验证码历史**: 保存最多100个验证码记录
- **快速查看**: 一键查看和复制历史记录
- **自动清理**: 超出限制时自动删除最旧记录

## 🚀 快速开始

### 安装方法

#### 方法一：下载CRX安装包（推荐）

1. **下载CRX文件**:
   - 访问 [Releases页面](https://github.com/w154594742/tempmail-code-get/releases)
   - 下载最新版本的 `tempmail-code-get.crx` 文件

2. **安装扩展**:
   - 打开Chrome浏览器，进入 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 将下载的 `.crx` 文件拖拽到扩展页面
   - 点击"添加扩展程序"确认安装

#### 方法二：源码安装

1. **下载源码**: 克隆或下载此项目到本地
2. **开启开发者模式**: Chrome浏览器 → 扩展程序 → 开启"开发者模式"
3. **加载扩展**: 点击"加载已解压的扩展程序" → 选择项目文件夹
4. **完成安装**: 扩展图标出现在工具栏

### 基础配置

1. **打开侧边栏**: 点击扩展图标，侧边栏在右侧打开
2. **点击设置按钮** (⚙️) 打开配置页面
3. **配置域名**: 输入您的域名列表，如 `domain1.com,domain2.com`
4. **设置目标邮箱**: 输入实际的临时邮箱地址，如 `user123@tempmail.plus`
5. **配置PIN码**: 输入您的tempmail.plus PIN码
6. **保存配置**: 点击保存按钮完成配置

### 使用流程

1. **打开侧边栏**: 点击扩展图标打开侧边栏
2. **生成邮箱**: 点击"生成新邮箱"按钮
3. **复制邮箱**: 点击📋按钮复制邮箱地址
4. **使用邮箱**: 在需要的网站注册或验证
5. **获取验证码**: 点击"获取验证码"按钮
6. **复制验证码**: 点击📋按钮复制验证码
7. **持续使用**: 侧边栏保持打开，可随时切换标签页使用

## ⚙️ 配置说明

### 邮箱域名配置
- **可用域名**: 多个域名用逗号分隔，如 `domain1.com,domain2.com,domain3.com`
- **目标邮箱**: 所有域名邮件通过CF转发到此邮箱地址
- **域名格式**: 不需要包含@符号，系统会自动添加
- **配置帮助**: 点击域名配置旁的❓图标查看详细的Cloudflare配置指南

### PIN码设置
- **PIN码**: 您的tempmail.plus PIN码，用于访问临时邮箱服务
- **明文显示**: 为方便查看和修改，PIN码以明文形式显示

### 内置配置
- **API地址**: 固定为 `https://tempmail.plus/api`，无需配置
- **重试设置**: 自动重试5次，间隔3秒，超时10秒
- **历史记录**: 邮箱历史最多1000个，验证码历史最多100个

## 🛠️ 技术架构

### 项目结构
```
├── manifest.json          # Chrome扩展配置 (Manifest V3)
├── background.js          # 后台服务脚本
├── popup/                 # Popup界面 (保留兼容性)
│   ├── popup.html         # 界面结构
│   ├── popup.css          # 界面样式
│   └── popup.js           # 界面逻辑
├── sidepanel/             # 侧边栏界面 (主要界面)
│   ├── flow-manager-sidebar.html  # 侧边栏结构
│   ├── flow-manager-sidebar.css   # 侧边栏样式
│   └── flow-manager-sidebar.js    # 侧边栏逻辑
├── options/               # 流程管理页面
│   ├── flow-manager.html  # 完整流程管理界面
│   ├── flow-manager.css   # 管理界面样式
│   └── flow-manager.js    # 管理界面逻辑
├── content/               # 内容脚本
│   ├── automation-content.js      # 自动化内容脚本
│   └── element-selector.js        # 元素选择器
├── utils/                 # 核心工具
│   ├── storage.js         # 存储管理
│   ├── email-generator.js # 邮箱生成
│   ├── api.js            # API接口
│   ├── automation-*.js   # 自动化相关工具
│   └── ...               # 其他工具类
├── templates/             # 流程模板
└── icons/                # 图标资源
```

### 核心模块
- **StorageManager**: 简化的配置和数据存储管理
- **EmailGenerator**: 智能邮箱地址生成 (100个姓氏+100个名字)
- **ApiManager**: tempmail.plus API交互 (固定API地址)
- **BackgroundService**: 侧边栏管理和后台任务处理

### 技术特性
- **Chrome V3**: 完全兼容最新扩展规范
- **侧边栏API**: 使用chrome.sidePanel提供持久化体验
- **本地存储**: 使用chrome.storage.local安全存储
- **模块化设计**: 清晰的代码组织结构
- **响应式设计**: 专为侧边栏窄屏优化的UI
- **错误处理**: 完善的异常处理机制

## 🎯 使用场景

### Cloudflare域名转发详细配置

#### 步骤1：准备域名
1. **购买域名**: 在任意域名注册商购买域名（如：example1.com, example2.com）
2. **添加到Cloudflare**: 将域名添加到Cloudflare管理
3. **更新DNS**: 将域名的DNS服务器指向Cloudflare

#### 步骤2：配置邮件转发
1. **进入Cloudflare控制台** → 选择域名 → **Email** → **Email Routing**
2. **启用Email Routing**: 点击"Enable Email Routing"
3. **添加目标邮箱**:
   - 点击"Destination addresses" → "Add destination"
   - 输入您的tempmail.plus邮箱地址（如：user123@tempmail.plus）
   - 验证邮箱地址
4. **创建转发规则**:
   - 点击"Routing rules" → "Create rule"
   - **Matcher**: 选择"Catch-all address"
   - **Action**: 选择"Send to an email"
   - **Destination**: 选择您的tempmail.plus邮箱
   - 点击"Save"

#### 步骤3：验证配置
1. **检查MX记录**: 确保Cloudflare自动添加了MX记录
2. **测试转发**: 发送测试邮件到 test@yourdomain.com
3. **确认接收**: 在tempmail.plus中查看是否收到邮件

#### 步骤4：工具配置
1. **打开扩展设置页面**
2. **配置域名**: 在"可用域名"中输入您的域名（逗号分隔）
   ```
   example1.com,example2.com,example3.com
   ```
3. **设置目标邮箱**: 输入您的tempmail.plus邮箱地址
4. **配置PIN码**: 输入您的tempmail.plus PIN码
5. **保存设置**: 点击保存按钮

#### 使用示例
配置完成后，工具会生成如下格式的邮箱：
- `johnsmith123456@example1.com`
- `maryjohnson789012@example2.com`
- `davidwilson345678@example3.com`

所有发送到这些邮箱的邮件都会自动转发到您的tempmail.plus邮箱。

### 批量注册
- 支持快速生成大量不同的邮箱地址
- 历史记录功能便于管理已使用的邮箱
- 验证码自动获取提高效率

### 隐私保护
- 使用临时邮箱保护真实邮箱地址
- 本地存储确保数据安全
- 支持随时清理历史记录

## 🔧 开发指南

### 环境要求
- Chrome 88+ 浏览器
- 支持Manifest V3的扩展环境

### 调试方法
- **侧边栏界面**: 打开侧边栏 → 右键 → 检查
- **后台脚本**: 扩展管理 → 检查视图 → Service Worker
- **设置页面**: 设置页面 → F12开发者工具

### 自定义开发
1. 修改`utils/email-generator.js`中的姓名列表
2. 调整`utils/storage.js`中的默认配置
3. 自定义`popup/popup.css`中的界面样式

## 📝 更新日志

### v1.1.0 (当前版本)
- ✅ **侧边栏模式**: 改为Chrome侧边栏，提供持久化体验
- ✅ **简化配置**: 移除复杂配置，只保留核心设置
- ✅ **UI优化**: 专为侧边栏优化的响应式设计
- ✅ **固定API**: 内置tempmail.plus API地址，简化配置
- ✅ **布局优化**: 按钮与卡片宽度完全匹配
- ✅ **Cloudflare指南**: 详细的域名转发配置说明

### v1.0.0
- ✅ 智能邮箱生成 (姓氏+名字+6位数字格式)
- ✅ 自动验证码获取
- ✅ 多域名配置支持
- ✅ 独立窗口模式
- ✅ 历史记录管理
- ✅ 完整配置系统
- ✅ Cloudflare转发支持

### 计划功能
- 🔄 邮箱模板自定义
- 🔄 验证码格式识别优化
- 🔄 批量操作支持
- 🔄 数据导入导出功能

## ⚠️ 注意事项

### 使用限制
- 需要有效的tempmail.plus PIN码
- 依赖目标邮箱服务的稳定性
- 验证码获取速度取决于邮件服务响应时间
- Chrome侧边栏工具栏按钮无法隐藏（浏览器限制）

### 安装说明
- **CRX安装**: 需要开启Chrome开发者模式才能安装CRX文件
- **安全提示**: Chrome可能显示"无法验证此扩展程序"的警告，这是正常现象
- **更新方式**: 新版本发布时，下载新的CRX文件重新安装即可
- **数据保留**: 重新安装时会保留之前的配置和历史记录

### 隐私安全
- 所有数据仅存储在本地浏览器中
- 不会上传任何个人信息到服务器
- 建议定期清理历史记录

### 免责声明
- 本工具仅供学习和合法用途使用
- 请遵守相关网站的服务条款
- 使用本工具产生的后果由用户自行承担

## 🤝 支持与反馈

如有问题或建议，欢迎通过以下方式联系：

### GitHub
- **🐛 [报告问题](https://github.com/w154594742/tempmail-code-get/issues)**: 遇到Bug或错误
- **💡 [功能建议](https://github.com/w154594742/tempmail-code-get/issues)**: 提出新功能想法
- **� [下载更新](https://github.com/w154594742/tempmail-code-get/releases)**: 获取最新版本
- **⭐ [Star项目](https://github.com/w154594742/tempmail-code-get)**: 支持项目发展

### 贡献代码
- Fork项目并提交Pull Request
- 参与代码审查和讨论
- 帮助改进文档和测试

---

**感谢使用临时邮箱验证码获取工具！** 🎉
