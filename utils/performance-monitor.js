// 自动化性能监控和优化工具
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.executionHistory = [];
    this.performanceThresholds = {
      stepDuration: 10000, // 单步骤最大执行时间(ms)
      totalDuration: 300000, // 总执行时间最大值(ms)
      retryRate: 0.3, // 最大重试率
      errorRate: 0.1, // 最大错误率
      memoryUsage: 100 * 1024 * 1024 // 最大内存使用(bytes)
    };
    this.optimizationSuggestions = [];
    this.init();
  }

  init() {
    this.startMemoryMonitoring();
    console.log('PerformanceMonitor 初始化完成');
  }

  // 开始监控执行
  startExecution(executionId, flowConfig) {
    const execution = {
      id: executionId,
      flowId: flowConfig.id,
      flowName: flowConfig.name,
      totalSteps: flowConfig.steps.length,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      steps: [],
      metrics: {
        totalRetries: 0,
        totalErrors: 0,
        averageStepDuration: 0,
        peakMemoryUsage: 0,
        networkRequests: 0
      },
      status: 'running'
    };

    this.metrics.set(executionId, execution);
    this.recordMetric('executionStarted', { executionId, timestamp: Date.now() });
    
    return execution;
  }

  // 记录步骤开始
  recordStepStart(executionId, stepIndex, step) {
    const execution = this.metrics.get(executionId);
    if (!execution) return;

    const stepMetric = {
      index: stepIndex,
      id: step.id,
      name: step.name,
      type: step.type,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      retries: 0,
      errors: [],
      memoryBefore: this.getCurrentMemoryUsage(),
      status: 'running'
    };

    execution.steps[stepIndex] = stepMetric;
    this.recordMetric('stepStarted', { executionId, stepIndex, timestamp: Date.now() });
  }

  // 记录步骤完成
  recordStepComplete(executionId, stepIndex, result) {
    const execution = this.metrics.get(executionId);
    if (!execution || !execution.steps[stepIndex]) return;

    const stepMetric = execution.steps[stepIndex];
    stepMetric.endTime = Date.now();
    stepMetric.duration = stepMetric.endTime - stepMetric.startTime;
    stepMetric.memoryAfter = this.getCurrentMemoryUsage();
    stepMetric.status = 'completed';
    stepMetric.result = result;

    // 检查性能阈值
    if (stepMetric.duration > this.performanceThresholds.stepDuration) {
      this.addOptimizationSuggestion(executionId, 'slowStep', {
        stepIndex,
        stepName: stepMetric.name,
        duration: stepMetric.duration,
        threshold: this.performanceThresholds.stepDuration
      });
    }

    this.recordMetric('stepCompleted', { 
      executionId, 
      stepIndex, 
      duration: stepMetric.duration,
      timestamp: Date.now() 
    });
  }

  // 记录步骤错误
  recordStepError(executionId, stepIndex, error) {
    const execution = this.metrics.get(executionId);
    if (!execution || !execution.steps[stepIndex]) return;

    const stepMetric = execution.steps[stepIndex];
    stepMetric.errors.push({
      message: error.message,
      timestamp: Date.now()
    });
    stepMetric.status = 'error';

    execution.metrics.totalErrors++;
    
    this.recordMetric('stepError', { 
      executionId, 
      stepIndex, 
      error: error.message,
      timestamp: Date.now() 
    });
  }

  // 记录步骤重试
  recordStepRetry(executionId, stepIndex, attempt) {
    const execution = this.metrics.get(executionId);
    if (!execution || !execution.steps[stepIndex]) return;

    const stepMetric = execution.steps[stepIndex];
    stepMetric.retries++;
    execution.metrics.totalRetries++;

    this.recordMetric('stepRetry', { 
      executionId, 
      stepIndex, 
      attempt,
      timestamp: Date.now() 
    });
  }

  // 完成执行监控
  finishExecution(executionId, status = 'completed') {
    const execution = this.metrics.get(executionId);
    if (!execution) return;

    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    execution.status = status;

    // 计算平均步骤执行时间
    const completedSteps = execution.steps.filter(step => step && step.duration);
    if (completedSteps.length > 0) {
      execution.metrics.averageStepDuration = 
        completedSteps.reduce((sum, step) => sum + step.duration, 0) / completedSteps.length;
    }

    // 计算错误率和重试率
    execution.metrics.errorRate = execution.metrics.totalErrors / execution.totalSteps;
    execution.metrics.retryRate = execution.metrics.totalRetries / execution.totalSteps;

    // 检查整体性能
    this.analyzeExecutionPerformance(execution);

    // 保存到历史记录
    this.executionHistory.push(JSON.parse(JSON.stringify(execution)));
    
    // 限制历史记录数量
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-100);
    }

    this.recordMetric('executionFinished', { 
      executionId, 
      duration: execution.duration,
      status,
      timestamp: Date.now() 
    });

    return execution;
  }

  // 分析执行性能
  analyzeExecutionPerformance(execution) {
    // 检查总执行时间
    if (execution.duration > this.performanceThresholds.totalDuration) {
      this.addOptimizationSuggestion(execution.id, 'slowExecution', {
        duration: execution.duration,
        threshold: this.performanceThresholds.totalDuration,
        flowName: execution.flowName
      });
    }

    // 检查错误率
    if (execution.metrics.errorRate > this.performanceThresholds.errorRate) {
      this.addOptimizationSuggestion(execution.id, 'highErrorRate', {
        errorRate: execution.metrics.errorRate,
        threshold: this.performanceThresholds.errorRate,
        totalErrors: execution.metrics.totalErrors
      });
    }

    // 检查重试率
    if (execution.metrics.retryRate > this.performanceThresholds.retryRate) {
      this.addOptimizationSuggestion(execution.id, 'highRetryRate', {
        retryRate: execution.metrics.retryRate,
        threshold: this.performanceThresholds.retryRate,
        totalRetries: execution.metrics.totalRetries
      });
    }

    // 分析慢步骤
    const slowSteps = execution.steps.filter(step => 
      step && step.duration > this.performanceThresholds.stepDuration
    );
    
    if (slowSteps.length > 0) {
      this.addOptimizationSuggestion(execution.id, 'multipleSlowSteps', {
        slowStepsCount: slowSteps.length,
        slowSteps: slowSteps.map(step => ({
          name: step.name,
          duration: step.duration,
          type: step.type
        }))
      });
    }
  }

  // 添加优化建议
  addOptimizationSuggestion(executionId, type, data) {
    const suggestion = {
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      executionId,
      type,
      data,
      timestamp: Date.now(),
      priority: this.getSuggestionPriority(type),
      message: this.generateSuggestionMessage(type, data),
      actions: this.generateSuggestionActions(type, data)
    };

    this.optimizationSuggestions.push(suggestion);
  }

  // 获取建议优先级
  getSuggestionPriority(type) {
    const priorities = {
      slowExecution: 'high',
      highErrorRate: 'high',
      highRetryRate: 'medium',
      slowStep: 'medium',
      multipleSlowSteps: 'medium',
      memoryLeak: 'high',
      networkIssue: 'medium'
    };
    return priorities[type] || 'low';
  }

  // 生成建议消息
  generateSuggestionMessage(type, data) {
    switch (type) {
      case 'slowExecution':
        return `流程 "${data.flowName}" 执行时间过长 (${Math.round(data.duration/1000)}秒)，建议优化步骤配置`;
      case 'highErrorRate':
        return `错误率过高 (${Math.round(data.errorRate*100)}%)，建议检查选择器和页面兼容性`;
      case 'highRetryRate':
        return `重试率过高 (${Math.round(data.retryRate*100)}%)，建议增加等待时间或优化选择器`;
      case 'slowStep':
        return `步骤 "${data.stepName}" 执行缓慢 (${Math.round(data.duration/1000)}秒)`;
      case 'multipleSlowSteps':
        return `发现 ${data.slowStepsCount} 个执行缓慢的步骤，建议整体优化`;
      default:
        return '发现性能问题，建议优化';
    }
  }

  // 生成建议操作
  generateSuggestionActions(type, data) {
    switch (type) {
      case 'slowExecution':
        return [
          '减少不必要的延迟步骤',
          '优化选择器以提高查找速度',
          '考虑并行执行某些步骤'
        ];
      case 'highErrorRate':
        return [
          '检查选择器的准确性',
          '增加元素等待时间',
          '添加页面加载检查'
        ];
      case 'highRetryRate':
        return [
          '增加步骤间的延迟时间',
          '使用更稳定的选择器',
          '添加页面状态检查'
        ];
      case 'slowStep':
        return [
          '优化该步骤的选择器',
          '减少等待时间',
          '检查网络连接'
        ];
      default:
        return ['检查流程配置', '优化执行参数'];
    }
  }

  // 获取性能报告
  getPerformanceReport(executionId = null) {
    if (executionId) {
      const execution = this.metrics.get(executionId) || 
                       this.executionHistory.find(e => e.id === executionId);
      return this.generateExecutionReport(execution);
    } else {
      return this.generateOverallReport();
    }
  }

  // 生成单次执行报告
  generateExecutionReport(execution) {
    if (!execution) return null;

    return {
      execution: {
        id: execution.id,
        flowName: execution.flowName,
        duration: execution.duration,
        status: execution.status,
        completedSteps: execution.steps.filter(s => s && s.status === 'completed').length,
        totalSteps: execution.totalSteps
      },
      performance: {
        averageStepDuration: execution.metrics.averageStepDuration,
        errorRate: execution.metrics.errorRate,
        retryRate: execution.metrics.retryRate,
        peakMemoryUsage: execution.metrics.peakMemoryUsage
      },
      steps: execution.steps.map(step => step ? {
        name: step.name,
        type: step.type,
        duration: step.duration,
        retries: step.retries,
        status: step.status
      } : null).filter(Boolean),
      suggestions: this.optimizationSuggestions.filter(s => s.executionId === execution.id)
    };
  }

  // 生成整体报告
  generateOverallReport() {
    const recentExecutions = this.executionHistory.slice(-20);
    
    if (recentExecutions.length === 0) {
      return { message: '暂无执行数据' };
    }

    const totalExecutions = recentExecutions.length;
    const successfulExecutions = recentExecutions.filter(e => e.status === 'completed').length;
    const averageDuration = recentExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalExecutions;
    const averageErrorRate = recentExecutions.reduce((sum, e) => sum + (e.metrics.errorRate || 0), 0) / totalExecutions;

    return {
      summary: {
        totalExecutions,
        successRate: successfulExecutions / totalExecutions,
        averageDuration,
        averageErrorRate
      },
      trends: this.analyzeTrends(recentExecutions),
      topSuggestions: this.getTopSuggestions(),
      recommendations: this.generateOverallRecommendations(recentExecutions)
    };
  }

  // 分析趋势
  analyzeTrends(executions) {
    // 简化的趋势分析
    const recent = executions.slice(-5);
    const earlier = executions.slice(-10, -5);

    if (earlier.length === 0) return null;

    const recentAvgDuration = recent.reduce((sum, e) => sum + (e.duration || 0), 0) / recent.length;
    const earlierAvgDuration = earlier.reduce((sum, e) => sum + (e.duration || 0), 0) / earlier.length;

    return {
      durationTrend: recentAvgDuration > earlierAvgDuration ? 'increasing' : 'decreasing',
      durationChange: Math.abs(recentAvgDuration - earlierAvgDuration),
      performanceDirection: recentAvgDuration > earlierAvgDuration ? 'degrading' : 'improving'
    };
  }

  // 获取顶级建议
  getTopSuggestions(limit = 5) {
    return this.optimizationSuggestions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, limit);
  }

  // 生成整体建议
  generateOverallRecommendations(executions) {
    const recommendations = [];

    // 基于成功率的建议
    const successRate = executions.filter(e => e.status === 'completed').length / executions.length;
    if (successRate < 0.8) {
      recommendations.push({
        type: 'reliability',
        message: '执行成功率较低，建议检查流程配置和选择器稳定性'
      });
    }

    // 基于执行时间的建议
    const avgDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length;
    if (avgDuration > 120000) { // 2分钟
      recommendations.push({
        type: 'performance',
        message: '平均执行时间较长，建议优化步骤配置和减少不必要的等待'
      });
    }

    return recommendations;
  }

  // 内存监控
  startMemoryMonitoring() {
    if (typeof performance !== 'undefined' && performance.memory) {
      setInterval(() => {
        const memoryInfo = performance.memory;
        this.recordMetric('memoryUsage', {
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }, 5000);
    }
  }

  // 获取当前内存使用
  getCurrentMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  // 记录通用指标
  recordMetric(type, data) {
    // 这里可以发送到分析服务或本地存储
    console.debug(`[PerformanceMonitor] ${type}:`, data);
  }

  // 清理旧数据
  cleanup() {
    // 清理超过24小时的建议
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.optimizationSuggestions = this.optimizationSuggestions.filter(
      s => s.timestamp > oneDayAgo
    );

    // 清理旧的执行记录
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-50);
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
} else {
  globalThis.PerformanceMonitor = PerformanceMonitor;
}
