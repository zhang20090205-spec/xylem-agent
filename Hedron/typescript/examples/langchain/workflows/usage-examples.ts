/**
 * HBAR Yield Optimization Workflow - Usage Examples
 * 
 * This file demonstrates how to integrate the yield optimization workflow
 * into your WebSocket agent to provide personalized investment recommendations.
 */

import { Client } from '@hashgraph/sdk';
import { Context } from '../../../src/shared/configuration';
import { 
  HbarYieldOptimizationWorkflow, 
  YieldOptimizationProfile,
  EXAMPLE_SCENARIOS,
  createHbarYieldOptimizationWorkflow
} from './hbar-yield-optimization-workflow';

function formatRiskLevel(riskLevel: string): string {
  return ({ low: '低', medium: '中等', high: '高' } as Record<string, string>)[riskLevel] || riskLevel;
}

/**
 * Example 1: New User Scenario
 * User prompt: "I am a new user to the Hedera network, and I have a lot of hbar that I plan on keeping for 6-9 months. I want to find a way to optimize my returns."
 */
export async function handleNewUserYieldOptimization(
  client: Client,
  context: Context,
  userAccountId: string,
  hbarAmount: number
): Promise<string> {
  
  // Create workflow instance
  const workflow = createHbarYieldOptimizationWorkflow(client, context, userAccountId);
  
  // Define user profile based on their message
  const profile: YieldOptimizationProfile = {
    totalHbar: hbarAmount,
    timelineMonths: 8, // Middle of 6-9 month range
    riskTolerance: 'conservative', // New user = conservative
    experienceLevel: 'novice',
    liquidityPreference: 'high', // New users typically want flexibility
    userAccountId: userAccountId
  };

  try {
    // Get personalized recommendations
    const recommendation = await workflow.optimizeYieldStrategy(profile);
    
    // Format response for user
    return formatRecommendationResponse(recommendation, profile);
    
  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return `抱歉，分析收益机会时遇到错误。请确认 Hedera 账户有效后重试。错误：${error instanceof Error ? error.message : '未知错误'}`;
  }
}

/**
 * Example 2: Experienced User with Specific Requirements
 */
export async function handleExperiencedUserOptimization(
  client: Client,
  context: Context,
  userAccountId: string,
  requirements: {
    hbarAmount: number;
    timelineMonths: number;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    liquidityNeeds: 'high' | 'medium' | 'low';
  }
): Promise<string> {
  
  const workflow = createHbarYieldOptimizationWorkflow(client, context, userAccountId);
  
  const profile: YieldOptimizationProfile = {
    totalHbar: requirements.hbarAmount,
    timelineMonths: requirements.timelineMonths,
    riskTolerance: requirements.riskTolerance,
    experienceLevel: 'intermediate',
    liquidityPreference: requirements.liquidityNeeds,
    userAccountId: userAccountId
  };

  try {
    const recommendation = await workflow.optimizeYieldStrategy(profile);
    return formatDetailedRecommendationResponse(recommendation, profile);
    
  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return `分析市场时遇到问题。请稍后重试，或联系支持人员。错误：${error instanceof Error ? error.message : '未知错误'}`;
  }
}

/**
 * Example 3: Portfolio Rebalancing for Existing DeFi User
 */
export async function handlePortfolioRebalancing(
  client: Client,
  context: Context,
  userAccountId: string,
  currentHoldings: {
    availableHbar: number;
    bonzoDeposits: number;
    infinityPoolStake: number;
    otherPositions: number;
  }
): Promise<string> {
  
  const workflow = createHbarYieldOptimizationWorkflow(client, context, userAccountId);
  
  // Calculate total portfolio value
  const totalValue = currentHoldings.availableHbar + currentHoldings.bonzoDeposits + 
                    currentHoldings.infinityPoolStake + currentHoldings.otherPositions;
  
  const profile: YieldOptimizationProfile = {
    totalHbar: totalValue,
    timelineMonths: 12, // Assume longer timeline for rebalancing
    riskTolerance: 'moderate',
    experienceLevel: 'advanced', // Has existing positions
    liquidityPreference: 'medium',
    userAccountId: userAccountId
  };

  try {
    const recommendation = await workflow.optimizeYieldStrategy(profile);
    
    // Add rebalancing-specific analysis
    const rebalancingAnalysis = analyzeRebalancingNeeds(currentHoldings, recommendation);
    
    return formatRebalancingResponse(recommendation, profile, rebalancingAnalysis);
    
  } catch (error) {
    console.error('❌ Error analyzing portfolio:', error);
    return `未能完成投资组合分析。请确认账户信息后重试。错误：${error instanceof Error ? error.message : '未知错误'}`;
  }
}

/**
 * Format basic recommendation response for new users
 */
function formatRecommendationResponse(recommendation: any, profile: YieldOptimizationProfile): string {
  let response = `🎯 **HBAR 收益优化建议**\n\n`;
  
  response += `基于你的 ${profile.totalHbar} HBAR 和 ${profile.timelineMonths} 个月周期，分析如下：\n\n`;
  
  response += `**🏆 推荐策略：${recommendation.strategy}**\n`;
  response += `预期总 APY：${recommendation.totalExpectedApy.toFixed(2)}%\n`;
  response += `风险等级：${formatRiskLevel(recommendation.riskLevel)}\n`;
  response += `预计配置时间：${recommendation.timeToExecute}\n\n`;
  
  response += `**💰 配置明细：**\n`;
  
  if (recommendation.allocation.bonzoFinance) {
    const bonzo = recommendation.allocation.bonzoFinance;
    response += `• **Bonzo Finance**: ${bonzo.amount} HBAR (${bonzo.expectedApy.toFixed(2)}% APY)\n`;
    response += `  └─ ${bonzo.reason}\n\n`;
  }
  
  if (recommendation.allocation.infinityPool) {
    const infinity = recommendation.allocation.infinityPool;
    response += `• **SaucerSwap Infinity Pool**：将约 ${(infinity.amount / 100).toFixed(0)} HBAR 兑换为 SAUCE（${infinity.expectedApy.toFixed(2)}% APY）\n`;
    response += `  └─ ${infinity.reason}\n\n`;
  }
  
  response += `**📋 下一步：**\n`;
  recommendation.nextSteps.forEach((step: string, index: number) => {
    response += `${index + 1}. ${step}\n`;
  });
  
  response += `\n**⚠️ 重要提示：**\n`;
  recommendation.considerations.forEach((consideration: string) => {
    response += `• ${consideration}\n`;
  });
  
  response += `\n*本建议基于当前市场情况和你的风险画像生成。投资前请务必自行研究。*`;
  
  return response;
}

/**
 * Format detailed recommendation with technical details
 */
function formatDetailedRecommendationResponse(recommendation: any, profile: YieldOptimizationProfile): string {
  let response = formatRecommendationResponse(recommendation, profile);
  
  response += `\n\n**🔧 技术执行步骤：**\n`;
  
  if (recommendation.allocation.bonzoFinance) {
    response += `\n**Bonzo Finance 配置：**\n`;
    response += `1. 访问 Bonzo Finance dApp 或使用 agent tools\n`;
    response += `2. 连接钱包并存入 ${recommendation.allocation.bonzoFinance.amount} HBAR\n`;
    response += `3. 获得会累积利息的 aWHBAR token\n`;
    response += `4. 监控收益，并在需要时提取\n`;
  }
  
  if (recommendation.allocation.infinityPool) {
    response += `\n**Infinity Pool 配置：**\n`;
    response += `1. 在 SaucerSwap DEX 将 HBAR swap 为 SAUCE\n`;
    response += `2. 在 Infinity Pool 中 stake SAUCE token\n`;
    response += `3. 获得代表 staking 仓位的 xSAUCE\n`;
    response += `4. 从交易费用和协议激励中获取奖励\n`;
  }
  
  if (recommendation.allocation.autoswapOrders) {
    response += `\n**AutoSwap Limit Orders：**\n`;
    response += `1. 设置自动化限价单，用于策略化入场\n`;
    response += `2. 在波动市场中使用定投式分批建仓\n`;
    response += `3. 监控订单执行并调整参数\n`;
  }
  
  return response;
}

/**
 * Analyze current portfolio and identify rebalancing opportunities
 */
function analyzeRebalancingNeeds(currentHoldings: any, recommendation: any): any {
  const analysis = {
    overAllocated: [] as string[],
    underAllocated: [] as string[],
    rebalanceActions: [] as string[]
  };
  
  // Compare current allocation vs recommended
  const totalValue = Object.values(currentHoldings).reduce((sum: number, val: any) => sum + val, 0);
  
  // Calculate current percentages
  const currentBonzoPercent = (currentHoldings.bonzoDeposits / totalValue) * 100;
  const currentInfinityPercent = (currentHoldings.infinityPoolStake / totalValue) * 100;
  
  // Calculate recommended percentages (simplified)
  const recBonzoAmount = recommendation.allocation.bonzoFinance?.amount || 0;
  const recInfinityAmount = recommendation.allocation.infinityPool?.amount || 0;
  const recTotal = recBonzoAmount + recInfinityAmount;
  
  if (recTotal > 0) {
    const recBonzoPercent = (recBonzoAmount / recTotal) * 100;
    const recInfinityPercent = (recInfinityAmount / recTotal) * 100;
    
    if (Math.abs(currentBonzoPercent - recBonzoPercent) > 10) {
      if (currentBonzoPercent > recBonzoPercent) {
        analysis.overAllocated.push('Bonzo Finance');
        analysis.rebalanceActions.push(`考虑从 Bonzo 撤出 ${(currentBonzoPercent - recBonzoPercent).toFixed(1)}% 仓位`);
      } else {
        analysis.underAllocated.push('Bonzo Finance');
        analysis.rebalanceActions.push(`考虑将 Bonzo 配置提高 ${(recBonzoPercent - currentBonzoPercent).toFixed(1)}%`);
      }
    }
  }
  
  return analysis;
}

/**
 * Format rebalancing-specific response
 */
function formatRebalancingResponse(recommendation: any, profile: YieldOptimizationProfile, rebalanceAnalysis: any): string {
  let response = `🔄 **投资组合再平衡分析**\n\n`;
  
  response += `当前投资组合价值：约 ${profile.totalHbar} HBAR\n\n`;
  
  response += formatRecommendationResponse(recommendation, profile);
  
  if (rebalanceAnalysis.rebalanceActions.length > 0) {
    response += `\n\n**🎯 再平衡操作：**\n`;
    rebalanceAnalysis.rebalanceActions.forEach((action: string, index: number) => {
      response += `${index + 1}. ${action}\n`;
    });
  }
  
  if (rebalanceAnalysis.overAllocated.length > 0) {
    response += `\n**📈 超配仓位：**\n`;
    rebalanceAnalysis.overAllocated.forEach((position: string) => {
      response += `• ${position}\n`;
    });
  }
  
  if (rebalanceAnalysis.underAllocated.length > 0) {
    response += `\n**📉 低配仓位：**\n`;
    rebalanceAnalysis.underAllocated.forEach((position: string) => {
      response += `• ${position}\n`;
    });
  }
  
  return response;
}

/**
 * Quick helper to demonstrate all example scenarios
 */
export async function demonstrateAllScenarios(client: Client, context: Context) {
  console.log('🚀 演示 HBAR 收益优化场景\n');
  
  // Example 1: Conservative new user
  console.log('📊 场景 1：保守型新用户');
  try {
    const result1 = await handleNewUserYieldOptimization(
      client, 
      context, 
      EXAMPLE_SCENARIOS.CONSERVATIVE_NEW_USER.userAccountId,
      EXAMPLE_SCENARIOS.CONSERVATIVE_NEW_USER.totalHbar
    );
    console.log(result1.substring(0, 200) + '...\n');
  } catch (error) {
    console.log(`场景 1 错误：${error}\n`);
  }
  
  // Example 2: Balanced experienced user
  console.log('📊 场景 2：均衡型有经验用户');
  try {
    const result2 = await handleExperiencedUserOptimization(
      client,
      context,
      EXAMPLE_SCENARIOS.BALANCED_EXPERIENCED.userAccountId,
      {
        hbarAmount: EXAMPLE_SCENARIOS.BALANCED_EXPERIENCED.totalHbar,
        timelineMonths: EXAMPLE_SCENARIOS.BALANCED_EXPERIENCED.timelineMonths,
        riskTolerance: EXAMPLE_SCENARIOS.BALANCED_EXPERIENCED.riskTolerance,
        liquidityNeeds: EXAMPLE_SCENARIOS.BALANCED_EXPERIENCED.liquidityPreference
      }
    );
    console.log(result2.substring(0, 200) + '...\n');
  } catch (error) {
    console.log(`场景 2 错误：${error}\n`);
  }
  
  // Example 3: Portfolio rebalancing
  console.log('📊 场景 3：投资组合再平衡');
  try {
    const result3 = await handlePortfolioRebalancing(
      client,
      context,
      EXAMPLE_SCENARIOS.AGGRESSIVE_WHALE.userAccountId,
      {
        availableHbar: 5000,
        bonzoDeposits: 8000,
        infinityPoolStake: 5000,
        otherPositions: 2000
      }
    );
    console.log(result3.substring(0, 200) + '...\n');
  } catch (error) {
    console.log(`场景 3 错误：${error}\n`);
  }
}

/**
 * Integration example for WebSocket agent
 */
export class YieldOptimizationIntegration {
  private workflow: HbarYieldOptimizationWorkflow;
  
  constructor(client: Client, context: Context, userAccountId: string) {
    this.workflow = createHbarYieldOptimizationWorkflow(client, context, userAccountId);
  }
  
  /**
   * Parse user message and determine if it's requesting yield optimization
   */
  async handleUserMessage(message: string, userAccountId: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    
    // Keywords that indicate yield optimization request
    const yieldKeywords = [
      'optimize returns', 'maximize yield', 'best apy', 'investment strategy',
      'where to stake', 'defi opportunities', 'earn interest', 'passive income',
      'bonzo or saucerswap', 'infinity pool', 'lending vs staking',
      '优化收益', '最大化收益', '最高 apy', '最佳 apy', '投资策略',
      '在哪里 stake', 'defi 机会', '赚利息', '被动收入',
      'bonzo 还是 saucerswap', '借贷还是 staking', '收益机会'
    ];
    
    const hasYieldKeywords = yieldKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!hasYieldKeywords) {
      return null; // Not a yield optimization request
    }
    
    // Extract HBAR amount if mentioned
    const hbarMatch = message.match(/(\d+[\d,]*)\s*hbar/i);
    const hbarAmount = hbarMatch ? parseInt(hbarMatch[1].replace(/,/g, '')) : 1000; // Default to 1000
    
    // Extract timeline if mentioned
    const timelineMatch = message.match(/(\d+)[-\s]*(\d+)?\s*(months?|个月|月)/i);
    const timelineMonths = timelineMatch ? parseInt(timelineMatch[1]) : 6; // Default to 6 months
    
    // Determine risk tolerance from message context
    let riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'conservative';
    if (lowerMessage.includes('aggressive') || lowerMessage.includes('high risk') || lowerMessage.includes('maximum') || message.includes('进取') || message.includes('高风险') || message.includes('最大化')) {
      riskTolerance = 'aggressive';
    } else if (lowerMessage.includes('moderate') || lowerMessage.includes('balanced') || message.includes('中等') || message.includes('均衡')) {
      riskTolerance = 'moderate';
    }
    
    // Determine experience level
    let experienceLevel: 'novice' | 'intermediate' | 'advanced' = 'novice';
    if (lowerMessage.includes('new user') || lowerMessage.includes('beginner') || message.includes('新手') || message.includes('新用户')) {
      experienceLevel = 'novice';
    } else if (lowerMessage.includes('experienced') || lowerMessage.includes('familiar') || message.includes('有经验') || message.includes('熟悉')) {
      experienceLevel = 'intermediate';
    } else if (lowerMessage.includes('expert') || lowerMessage.includes('advanced') || message.includes('专家') || message.includes('高级')) {
      experienceLevel = 'advanced';
    }
    
    // Generate recommendation
    return await handleNewUserYieldOptimization(
      this.workflow['client'], // Access private client
      this.workflow['context'], // Access private context
      userAccountId,
      hbarAmount
    );
  }
}
