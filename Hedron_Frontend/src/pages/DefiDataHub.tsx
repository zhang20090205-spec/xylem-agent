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
  status: 'Consultado' | 'En proceso' | 'Requiere wallet';
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
    iconAlt: 'SaucerSwap logo',
    gradient: 'from-purple-500/90 via-blue-500/80 to-cyan-500/80',
    description:
      'Consulta TVL, volumen, farms y cotizaciones.',
    capabilities: [
      'Stats DEX + farming',
      'Cotizaciones QuoterV2',
      'Posiciones en pools',
    ],
    workflows: [
      'Selecciona el tipo de consulta',
      'Completa los campos requeridos',
      'Visualiza los resultados',
    ],
  },
  {
    id: 'bonzo',
    name: 'Bonzo Finance',
    iconSrc: '/BonzoIcon.png',
    iconAlt: 'Bonzo Finance logo',
    gradient: 'from-slate-800 via-emerald-500/80 to-emerald-400/80',
    description:
      'Dashboard y métricas de mercados.',
    capabilities: [
      'Dashboard + health factor',
      'Mercados y APYs',
      'Posiciones activas',
    ],
    workflows: [
      'Selecciona mercado',
      'Revisa métricas',
      'Analiza posiciones',
    ],
  },
  {
    id: 'autoswap',
    name: 'AutoSwapLimit',
    iconSrc: '/hedera-hbar-logo.png',
    iconAlt: 'AutoSwapLimit logo',
    gradient: 'from-orange-500/80 via-amber-500/80 to-yellow-500/70',
    description:
      'Consulta órdenes limitadas activas.',
    capabilities: [
      'Consulta de órdenes',
      'Estado y detalles',
      'Configuración del contrato',
    ],
    workflows: [
      'Selecciona tipo de consulta',
      'Revisa las órdenes activas',
      'Analiza el estado',
    ],
  },
];

const QUERY_BLUEPRINTS: Record<DataSource['id'], QueryBlueprint[]> = {
  saucerswap: [
    {
      id: 'dex-stats',
      label: 'Estadísticas DEX',
      description: 'TVL, volumen, fees y posiciones globales.',
      fields: [
        {
          type: 'select',
          name: 'dataset',
          label: 'Dataset',
          options: [
            { label: 'Estadísticas generales', value: 'stats' },
            { label: 'Mis farms', value: 'account_farms' },
            { label: 'Infinity Pool', value: 'infinity_pool' },
          ],
          defaultValue: 'stats',
        },
      ],
    },
    {
      id: 'quote-builder',
      label: 'Cotización swap',
      description: 'Previsualiza rutas y exchange rate.',
      fields: [
        {
          type: 'text',
          name: 'inputToken',
          label: 'Token origen',
          placeholder: '0.0.456858 (USDC)',
        },
        {
          type: 'text',
          name: 'outputToken',
          label: 'Token destino',
          placeholder: '0.0.1183558 (SAUCE)',
        },
        {
          type: 'text',
          name: 'amount',
          label: 'Monto',
          placeholder: '1000',
        },
      ],
    },
  ],
  bonzo: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Snapshot de salud y mercados.',
      fields: [
        {
          type: 'select',
          name: 'market',
          label: 'Mercado',
          options: [
            { label: 'Todos', value: 'all' },
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
      label: 'Mis órdenes',
      description: 'Consulta órdenes activas.',
      fields: [
        {
          type: 'select',
          name: 'queryMode',
          label: 'Tipo de consulta',
          options: [
            { label: 'Lista de órdenes', value: 'getUserOrders' },
            { label: 'Con detalles', value: 'getUserOrdersWithDetails' },
          ],
          defaultValue: 'getUserOrders',
        },
      ],
    },
    {
      id: 'config-check',
      label: 'Configuración',
      description: 'Parámetros del contrato.',
      fields: [],
    },
  ],
};

const WORKFLOW_STEPS = [
  {
    title: '1. Conecta wallet',
    detail: 'Para consultar información de tu cuenta.',
  },
  {
    title: '2. Selecciona fuente',
    detail: 'Elige entre SaucerSwap, Bonzo o AutoSwapLimit.',
  },
  {
    title: '3. Configura consulta',
    detail: 'Completa los campos necesarios.',
  },
  {
    title: '4. Visualiza resultados',
    detail: 'Obtén la información solicitada.',
  },
];

const INITIAL_ACTIVITY: ActivityEntry[] = [
  {
    id: 'log-1',
    source: 'SaucerSwap',
    query: 'Estadísticas DEX',
    status: 'Consultado',
    timestamp: '08:42',
  },
  {
    id: 'log-2',
    source: 'Bonzo Finance',
    query: 'Dashboard',
    status: 'Requiere wallet',
    timestamp: '08:15',
  },
  {
    id: 'log-3',
    source: 'AutoSwapLimit',
    query: 'Mis órdenes',
    status: 'En proceso',
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
      status: isWalletConnected ? 'Consultado' : 'Requiere wallet',
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
        ? 'Revisa el estado de las órdenes y sus expiraciones.'
        : selectedSource.id === 'bonzo'
          ? 'Analiza el health factor y los APYs disponibles.'
          : 'Verifica las métricas y cotizaciones actuales.';

    const nextSteps =
      selectedSource.id === 'saucerswap'
        ? ['Revisar TVL y volumen', 'Analizar posiciones en farms', 'Comparar cotizaciones']
        : selectedSource.id === 'bonzo'
          ? ['Verificar health factor', 'Comparar APYs entre mercados', 'Revisar posiciones activas']
          : ['Revisar órdenes pendientes', 'Verificar fechas de expiración', 'Analizar precios trigger'];

    setResultPreview({
      title: activePreset.label,
      summary,
      highlights,
      recommendation,
      nextSteps,
    });
  };

  return (
    <div className="min-h-screen bg-theme-bg-primary dark:bg-gray-900 text-theme-text-primary transition-colors duration-300">
      <header className="border-b border-theme-border-primary dark:border-gray-800 bg-theme-bg-secondary/80 dark:bg-gray-900/80 backdrop-blur px-6 lg:px-10 py-3 sticky top-0 z-20">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">Xylem Data Hub</h1>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-theme-text-secondary mt-0.5">
                  Consulta DeFi sin depender del agente
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {viewSwitcher?.({ className: 'hidden md:flex' })}
              <button
                onClick={onBackToAgent}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                <ArrowLeftCircle size={16} />
                Agente
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
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-theme-border-primary text-theme-text-secondary">
                <Wallet size={12} />
                <span>Conecta wallet</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-10 py-6 space-y-6">
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
                className={`relative h-full w-full text-left rounded-xl border p-4 transition-all ${
                  isActive
                    ? 'border-transparent ring-2 ring-emerald-400'
                    : 'border-theme-border-primary dark:border-gray-800 hover:border-theme-border-primary/60'
                }`}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${source.gradient} opacity-10`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={source.iconSrc}
                      alt={source.iconAlt}
                      className="h-8 w-8 rounded-lg border border-theme-border-primary/40 dark:border-gray-700/40 bg-theme-bg-primary/40 object-contain p-1"
                      loading="lazy"
                    />
                    {isActive && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500 text-white">
                        Activo
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold mt-2">{source.name}</h2>
                  <p className="text-xs text-theme-text-secondary mt-1 line-clamp-2">{source.description}</p>
                  <ul className="mt-2 space-y-1 text-xs text-theme-text-secondary">
                    {source.capabilities.slice(0, 3).map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 rounded-full bg-emerald-400 flex-shrink-0" />
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
          <div className="rounded-xl border border-theme-border-primary dark:border-gray-800 bg-theme-bg-secondary/40 dark:bg-gray-900/60 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold">{selectedSource.name}</h3>
                <p className="text-xs text-theme-text-secondary mt-0.5">{activePreset.description}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {queryPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setActivePresetId(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      preset.id === activePreset.id
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-theme-border-primary dark:border-gray-700 text-theme-text-secondary hover:text-theme-text-primary'
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
                    <span className="font-medium text-theme-text-secondary">{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.name] ?? ''}
                        onChange={(event) => handleFieldChange(field.name, event.target.value)}
                        className="bg-theme-bg-primary/80 dark:bg-gray-800 border border-theme-border-primary dark:border-gray-700 rounded-lg px-2.5 py-2 text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                        className="bg-theme-bg-primary/80 dark:bg-gray-800 border border-theme-border-primary dark:border-gray-700 rounded-lg px-2.5 py-2 text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    )}
                  </label>
                ))
              ) : (
                <div className="col-span-2 py-4 text-center text-xs text-theme-text-secondary">
                  No requiere parámetros adicionales
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setResultPreview(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-theme-border-primary dark:border-gray-700 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={handlePreview}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center gap-1.5"
              >
                <RefreshCcw size={14} />
                Consultar
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-theme-border-primary dark:border-gray-800 bg-theme-bg-secondary/60 dark:bg-gray-900/70 p-4 flex flex-col gap-3">
            <div>
              <h4 className="text-sm font-semibold">Flujo sugerido</h4>
            </div>
            <ol className="space-y-2">
              {selectedSource.workflows.map((step, idx) => (
                <li key={step} className="flex gap-2 text-xs text-theme-text-secondary">
                  <span className="font-medium text-emerald-400 flex-shrink-0">{idx + 1}.</span>
                  <span>{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid lg:grid-cols-[2fr_1fr] gap-4">
          <div className="rounded-xl border border-theme-border-primary dark:border-gray-800 bg-theme-bg-secondary/40 dark:bg-gray-900/60 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-semibold">Resultados</h4>
              <div className="flex gap-2">
                <button className="px-2.5 py-1 text-xs rounded-lg border border-theme-border-primary dark:border-gray-700 text-theme-text-secondary hover:text-theme-text-primary">
                  Copiar
                </button>
                <button className="px-2.5 py-1 text-xs rounded-lg border border-theme-border-primary dark:border-gray-700 text-theme-text-secondary hover:text-theme-text-primary">
                  Exportar
                </button>
              </div>
            </div>

            {resultPreview ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-theme-bg-primary/60 dark:bg-gray-900/70 border border-theme-border-primary dark:border-gray-800 p-3">
                  <h5 className="text-sm font-semibold">{resultPreview.title}</h5>
                  <p className="text-xs text-theme-text-secondary mt-1">{resultPreview.summary}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  {resultPreview.highlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="rounded-lg border border-theme-border-primary dark:border-gray-800 p-2.5"
                    >
                      <p className="text-xs text-theme-text-secondary">
                        {highlight.label}
                      </p>
                      <p className="text-sm font-semibold mt-0.5 break-all">{highlight.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-emerald-300/40 dark:border-emerald-400/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                    {resultPreview.recommendation}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-emerald-700/80 dark:text-emerald-100/90">
                    {resultPreview.nextSteps.map((step) => (
                      <li key={step} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 flex-shrink-0" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center gap-2 text-theme-text-secondary text-xs py-8">
                <BarChart3 size={24} className="text-theme-text-secondary/60" />
                <p>Realiza una consulta para ver resultados</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-theme-border-primary dark:border-gray-800 bg-theme-bg-secondary/60 dark:bg-gray-900/70 p-4">
              <h4 className="text-sm font-semibold mb-3">Pasos operativos</h4>
              <div className="space-y-2">
                {WORKFLOW_STEPS.map((step) => (
                  <div key={step.title} className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{step.title}</p>
                      <p className="text-xs text-theme-text-secondary mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-theme-border-primary dark:border-gray-800 bg-theme-bg-secondary/60 dark:bg-gray-900/70 p-4">
              <h4 className="text-sm font-semibold mb-3">Últimas ejecuciones</h4>
              <ul className="space-y-2 text-xs">
                {activityLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-theme-border-primary dark:border-gray-800 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-theme-text-primary truncate">{entry.source}</p>
                      <p className="text-theme-text-secondary truncate">{entry.query}</p>
                    </div>
                    <div className="flex flex-col items-end text-xs flex-shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          entry.status === 'Consultado'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : entry.status === 'Requiere wallet'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-blue-500/15 text-blue-500'
                        }`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-theme-text-secondary mt-0.5">{entry.timestamp}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DefiDataHub;
