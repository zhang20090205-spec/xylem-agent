import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftCircle,
  BarChart3,
  RefreshCcw,
  Wallet,
} from 'lucide-react';
import TokenBalances from '../components/TokenBalances';
import ThemeToggle from '../components/ThemeToggle';
import WalletButton from '../components/WalletButton';

type ViewSwitcherProps = {
  className?: string;
};

type DefiDataHubProps = {
  address: string | null;
  isWalletConnected: boolean;
  connectionStatus: ReactNode;
  onBackToAgent: () => void;
  viewSwitcher?: (props?: ViewSwitcherProps) => ReactNode;
};

type QueryField =
  | {
      type: 'select';
      name: string;
      label: string;
      placeholder?: string;
      options: { label: string; value: string }[];
      defaultValue?: string;
    }
  | {
      type: 'text';
      name: string;
      label: string;
      placeholder?: string;
      defaultValue?: string;
    };

type QueryBlueprint = {
  id: string;
  label: string;
  description: string;
  fields: QueryField[];
};

type ResultPreview = {
  title: string;
  summary: string;
  highlights: { label: string; value: string }[];
  recommendation: string;
  nextSteps: string[];
};

type ActivityEntry = {
  id: string;
  source: string;
  query: string;
  status: '已查询' | '处理中' | '需要钱包';
  timestamp: string;
};

type DataSource = {
  id: 'saucerswap' | 'bonzo' | 'autoswap';
  name: string;
  iconSrc: string;
  iconAlt: string;
  gradient: string;
  description: string;
  capabilities: string[];
  workflows: string[];
};

const DATA_SOURCES: DataSource[] = [
  {
    id: 'saucerswap',
    name: 'SaucerSwap',
    iconSrc: '/SauceIcon.png',
    iconAlt: 'SaucerSwap 标志',
    gradient: 'from-purple-500/90 via-blue-500/80 to-cyan-500/80',
    description:
      '查询 TVL、交易量、farms 和报价。',
    capabilities: [
      'DEX + farming 统计',
      'QuoterV2 报价',
      'Pool 持仓',
    ],
    workflows: [
      '选择查询类型',
      '填写必填字段',
      '查看结果',
    ],
  },
  {
    id: 'bonzo',
    name: 'Bonzo Finance',
    iconSrc: '/BonzoIcon.png',
    iconAlt: 'Bonzo Finance 标志',
    gradient: 'from-slate-800 via-emerald-500/80 to-emerald-400/80',
    description:
      '查看看板和市场指标。',
    capabilities: [
      '看板 + 健康度',
      '市场与 APY',
      '活跃持仓',
    ],
    workflows: [
      '选择市场',
      '检查指标',
      '分析持仓',
    ],
  },
  {
    id: 'autoswap',
    name: 'AutoSwapLimit',
    iconSrc: '/hedera-hbar-logo.png',
    iconAlt: 'AutoSwapLimit 标志',
    gradient: 'from-orange-500/80 via-amber-500/80 to-yellow-500/70',
    description:
      '查询活跃限价单。',
    capabilities: [
      '订单查询',
      '状态与详情',
      '合约配置',
    ],
    workflows: [
      '选择查询类型',
      '查看活跃订单',
      '分析订单状态',
    ],
  },
];

const QUERY_BLUEPRINTS: Record<DataSource['id'], QueryBlueprint[]> = {
  saucerswap: [
    {
      id: 'dex-stats',
      label: 'DEX 统计',
      description: 'TVL、交易量、费用和全局持仓。',
      fields: [
        {
          type: 'select',
          name: 'dataset',
          label: '数据集',
          options: [
            { label: '通用统计', value: 'stats' },
            { label: '我的 farms', value: 'account_farms' },
            { label: 'Infinity Pool', value: 'infinity_pool' },
          ],
          defaultValue: 'stats',
        },
      ],
    },
    {
      id: 'quote-builder',
      label: 'Swap 报价',
      description: '预览路径和兑换汇率。',
      fields: [
        {
          type: 'text',
          name: 'inputToken',
          label: '输入 token',
          placeholder: '0.0.456858 (USDC)',
        },
        {
          type: 'text',
          name: 'outputToken',
          label: '输出 token',
          placeholder: '0.0.1183558 (SAUCE)',
        },
        {
          type: 'text',
          name: 'amount',
          label: '数量',
          placeholder: '1000',
        },
      ],
    },
  ],
  bonzo: [
    {
      id: 'dashboard',
      label: 'Bonzo 看板',
      description: '账户健康度和市场快照。',
      fields: [
        {
          type: 'select',
          name: 'market',
          label: '市场',
          options: [
            { label: '全部', value: 'all' },
            { label: 'WHBAR', value: 'whbar' },
            { label: 'SAUCE', value: 'sauce' },
            { label: 'xSAUCE', value: 'xsauce' },
            { label: 'USDC', value: 'usdc' },
          ],
          defaultValue: 'all',
        },
      ],
    },
  ],
  autoswap: [
    {
      id: 'orders',
      label: '我的订单',
      description: '查询活跃订单。',
      fields: [
        {
          type: 'select',
          name: 'queryMode',
          label: '查询类型',
          options: [
            { label: '订单列表', value: 'getUserOrders' },
            { label: '包含详情', value: 'getUserOrdersWithDetails' },
          ],
          defaultValue: 'getUserOrders',
        },
      ],
    },
    {
      id: 'config-check',
      label: '配置',
      description: '合约参数。',
      fields: [],
    },
  ],
};

const WORKFLOW_STEPS = [
  {
    title: '1. 连接钱包',
    detail: '用于查询你的账户信息。',
  },
  {
    title: '2. 选择数据源',
    detail: '从 SaucerSwap、Bonzo 或 AutoSwapLimit 中选择。',
  },
  {
    title: '3. 配置查询',
    detail: '填写所需字段。',
  },
  {
    title: '4. 查看结果',
    detail: '获取请求的信息。',
  },
];

const INITIAL_ACTIVITY: ActivityEntry[] = [
  {
    id: 'log-1',
    source: 'SaucerSwap',
    query: 'DEX 统计',
    status: '已查询',
    timestamp: '08:42',
  },
  {
    id: 'log-2',
    source: 'Bonzo Finance',
    query: 'Bonzo 看板',
    status: '需要钱包',
    timestamp: '08:15',
  },
  {
    id: 'log-3',
    source: 'AutoSwapLimit',
    query: '我的订单',
    status: '处理中',
    timestamp: '07:55',
  },
];

const DefiDataHub = ({
  address,
  isWalletConnected,
  connectionStatus,
  onBackToAgent,
  viewSwitcher,
}: DefiDataHubProps) => {
  const [selectedSourceId, setSelectedSourceId] = useState<DataSource['id']>('saucerswap');
  const [activePresetId, setActivePresetId] = useState<string>(QUERY_BLUEPRINTS.saucerswap[0].id);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [resultPreview, setResultPreview] = useState<ResultPreview | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(INITIAL_ACTIVITY);

  const selectedSource = useMemo(
    () => DATA_SOURCES.find((source) => source.id === selectedSourceId)!,
    [selectedSourceId],
  );

  const queryPresets = QUERY_BLUEPRINTS[selectedSourceId];
  const activePreset = useMemo(
    () => queryPresets.find((preset) => preset.id === activePresetId) ?? queryPresets[0],
    [queryPresets, activePresetId],
  );

  useEffect(() => {
    const defaults = activePreset.fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.name] = field.defaultValue ?? '';
      return acc;
    }, {});
    setFormValues(defaults);
  }, [selectedSourceId, activePreset]);

  const handleFieldChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreview = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newEntry: ActivityEntry = {
      id: crypto.randomUUID(),
      source: selectedSource.name,
      query: activePreset.label,
      status: isWalletConnected ? '已查询' : '需要钱包',
      timestamp,
    };

    setActivityLog((prev) => [newEntry, ...prev.slice(0, 4)]);

    const summary = `${selectedSource.name}: ${activePreset.description}`;
    const highlights = activePreset.fields.slice(0, 3).map((field) => ({
      label: field.label,
      value: formValues[field.name] || '—',
    }));

    const recommendation =
      selectedSource.id === 'autoswap'
        ? '检查订单状态和过期时间。'
        : selectedSource.id === 'bonzo'
          ? '分析 health factor 和可用 APY。'
          : '核对当前指标和报价。';

    const nextSteps =
      selectedSource.id === 'saucerswap'
        ? ['查看 TVL 和交易量', '分析 farms 持仓', '比较报价']
        : selectedSource.id === 'bonzo'
          ? ['检查 health factor', '比较各市场 APY', '查看活跃持仓']
          : ['查看待处理订单', '检查过期时间', '分析触发价格'];

    setResultPreview({
      title: activePreset.label,
      summary,
      highlights,
      recommendation,
      nextSteps,
    });
  };

  return (
    <div className="ether-shell min-h-screen text-white transition-colors duration-300">
      <div className="ether-content min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/12 bg-[#0e2530]/48 px-6 py-4 backdrop-blur-xl lg:px-10">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="ether-serif text-3xl text-white/90">Xylem agent 数据中心</h1>
                  <span className="ether-micro border border-orange-100/20 bg-orange-200/10 px-2 py-0.5 text-orange-50/80">
                    BETA
                  </span>
                </div>
                <p className="ether-micro ether-faint mt-1">
                  DIRECT DEFI FREQUENCY / 不依赖 agent，直接查询 DeFi 数据
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {viewSwitcher?.({ className: 'hidden md:flex' })}
              <button
                onClick={onBackToAgent}
                className="ether-button inline-flex items-center gap-1.5 px-3 py-2"
              >
                <ArrowLeftCircle size={16} />
                AI 助手
              </button>
              <ThemeToggle />
              <WalletButton />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              {connectionStatus}
            </div>
            {isWalletConnected && address ? (
              <div className="flex items-center gap-2 flex-wrap">
                <TokenBalances accountId={address} variant="compact" />
              </div>
            ) : (
              <div className="ether-micro ether-label flex items-center gap-1.5 border border-dashed border-white/16 px-2.5 py-1">
                <Wallet size={12} />
                <span>连接钱包</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-6 px-6 py-6 lg:px-10">
        <section className="grid lg:grid-cols-3 gap-3">
          {DATA_SOURCES.map((source) => {
            const isActive = source.id === selectedSourceId;

            return (
              <button
                key={source.id}
                onClick={() => {
                  setSelectedSourceId(source.id);
                  const firstBlueprint = QUERY_BLUEPRINTS[source.id][0];
                  setActivePresetId(firstBlueprint.id);
                }}
                className={`ether-panel relative h-full w-full overflow-hidden p-4 text-left transition-all ${
                  isActive
                    ? 'border-orange-100/38 ring-1 ring-orange-100/24'
                    : 'hover:border-white/26'
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${source.gradient} ${
                    isActive ? 'opacity-[0.18]' : 'opacity-[0.1]'
                  }`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={source.iconSrc}
                      alt={source.iconAlt}
                      className="h-8 w-8 border border-white/20 bg-white/10 object-contain p-1"
                      loading="lazy"
                    />
                    {isActive && (
                      <span className="ether-micro bg-white/12 px-2 py-0.5 text-white/84">
                        ON AIR
                      </span>
                    )}
                  </div>
                  <h2 className="ether-serif mt-3 text-2xl text-white/90">{source.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-white/58">{source.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-white/58">
                    {source.capabilities.slice(0, 3).map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-orange-200/80" />
                        <span className="line-clamp-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </section>

        <section className="grid lg:grid-cols-[2fr_1fr] gap-4">
          <div className="ether-panel p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="ether-serif text-2xl text-white/90">{selectedSource.name}</h3>
                <p className="ether-micro ether-faint mt-1">{activePreset.description}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {queryPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setActivePresetId(preset.id)}
                    className={`ether-button px-3 py-1.5 ${
                      preset.id === activePreset.id
                        ? 'border-orange-100/42 bg-white/12 text-white'
                        : ''
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {activePreset.fields.length > 0 ? (
                activePreset.fields.map((field) => (
                  <label key={field.name} className="flex flex-col gap-1.5 text-xs">
                    <span className="ether-micro ether-label">{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.name] ?? ''}
                        onChange={(event) => handleFieldChange(field.name, event.target.value)}
                        className="ether-field px-2.5 py-2 text-sm"
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formValues[field.name] ?? ''}
                        onChange={(event) => handleFieldChange(field.name, event.target.value)}
                        placeholder={field.placeholder}
                        className="ether-field px-2.5 py-2 text-sm"
                      />
                    )}
                  </label>
                ))
              ) : (
                <div className="ether-micro ether-faint col-span-2 py-4 text-center">
                  不需要额外参数
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setResultPreview(null)}
                className="ether-button px-3 py-1.5"
              >
                清空
              </button>
              <button
                onClick={handlePreview}
                className="ether-button flex items-center gap-1.5 px-3 py-1.5"
              >
                <RefreshCcw size={14} />
                查询
              </button>
            </div>
          </div>

          <div className="ether-panel flex flex-col gap-3 p-4">
            <div>
              <h4 className="ether-micro text-white/82">SUGGESTED FLOW / 建议流程</h4>
            </div>
            <ol className="space-y-2">
              {selectedSource.workflows.map((step, idx) => (
                <li key={step} className="flex gap-2 text-xs text-white/58">
                  <span className="flex-shrink-0 font-medium text-orange-100/82">{idx + 1}.</span>
                  <span>{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid lg:grid-cols-[2fr_1fr] gap-4">
          <div className="ether-panel p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="ether-micro text-white/82">OUTPUT / 结果</h4>
              <div className="flex gap-2">
                <button className="ether-button px-2.5 py-1">
                  复制
                </button>
                <button className="ether-button px-2.5 py-1">
                  导出
                </button>
              </div>
            </div>

            {resultPreview ? (
              <div className="mt-3 space-y-3">
                <div className="border border-white/12 bg-white/6 p-3">
                  <h5 className="text-sm font-semibold text-white/88">{resultPreview.title}</h5>
                  <p className="mt-1 text-xs text-white/56">{resultPreview.summary}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  {resultPreview.highlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="border border-white/12 bg-white/5 p-2.5"
                    >
                      <p className="ether-micro ether-faint">
                        {highlight.label}
                      </p>
                      <p className="mt-1 break-all text-sm font-semibold text-white/86">{highlight.value}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-emerald-100/20 bg-emerald-300/10 p-3">
                  <p className="text-xs font-semibold text-emerald-50/88">
                    {resultPreview.recommendation}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-emerald-50/72">
                    {resultPreview.nextSteps.map((step) => (
                      <li key={step} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-emerald-100/82" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center gap-2 py-8 text-xs text-white/52">
                <BarChart3 size={24} className="text-white/38" />
                <p>执行查询后将在这里看到结果</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="ether-panel p-4">
              <h4 className="ether-micro mb-3 text-white/82">OPERATING STEPS / 操作步骤</h4>
              <div className="space-y-2">
                {WORKFLOW_STEPS.map((step) => (
                  <div key={step.title} className="flex gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-100/82" />
                    <div>
                      <p className="text-xs font-semibold text-white/82">{step.title}</p>
                      <p className="mt-0.5 text-xs text-white/54">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ether-panel p-4">
              <h4 className="ether-micro mb-3 text-white/82">RECENT LOG / 最近执行</h4>
              <ul className="space-y-2 text-xs">
                {activityLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 border border-white/10 bg-white/5 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white/82">{entry.source}</p>
                      <p className="truncate text-white/48">{entry.query}</p>
                    </div>
                    <div className="flex flex-col items-end text-xs flex-shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          entry.status === '已查询'
                            ? 'bg-emerald-300/12 text-emerald-100'
                            : entry.status === '需要钱包'
                              ? 'bg-orange-300/12 text-orange-100'
                              : 'bg-sky-300/12 text-sky-100'
                        }`}
                      >
                        {entry.status}
                      </span>
                      <span className="mt-0.5 text-white/42">{entry.timestamp}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
};

export default DefiDataHub;
