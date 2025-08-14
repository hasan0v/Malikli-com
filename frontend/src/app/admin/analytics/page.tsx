'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store/store';
import { useToast } from '@/components/ToastProvider';
import styles from './adminAnalytics.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

interface TopProduct { name: string; quantity: number; revenue: string; }
interface StatusBreakdown { order_status: string; count: number; }
interface TopPath { path: string; count: number; }
interface RevenuePoint { date: string; revenue: number; orders: number; }
interface ClickPoint { date: string; clicks: number; }

interface DashboardData {
  orders: {
    total_paid_orders: number;
    orders_today: number;
    orders_7d: number;
    orders_30d: number;
    revenue_total: string;
    revenue_today: string;
    revenue_7d: string;
    revenue_30d: string;
    average_order_value: number;
    status_breakdown: StatusBreakdown[];
    top_products: TopProduct[];
  };
  clicks: {
    total_clicks: number;
    clicks_today: number;
    clicks_24h: number;
    clicks_7d: number;
    top_paths_7d: TopPath[];
    timeseries_14d: ClickPoint[];
  };
  timeseries: {
    revenue_30d: RevenuePoint[];
    clicks_14d: ClickPoint[];
  };
  visitors?: {
    registered_total: number;
    registered_7d: number;
    anonymous_total: number;
    anonymous_7d: number;
  };
}

// Product interfaces (mirroring admin products minimal subset)
interface QuickProduct { id:number; name:string; slug:string; base_price:string; is_archived:boolean; created_at:string; }
interface QuickProductsPayload { count:number; results:QuickProduct[]; }

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders' | 'clicks'>('revenue');
  const [dateMode, setDateMode] = useState<'short' | 'full'>('short');
  const [isMobile, setIsMobile] = useState(false);
  // Quick product management state
  const [prodLoading, setProdLoading] = useState(false);
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<QuickProduct | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name:'', base_price:'', description:'' });
  const [archivingSlug, setArchivingSlug] = useState<string | null>(null);
  const PAGE_SIZE = 10;
  const { push: pushToast } = useToast();

  // Track viewport width to adjust chart scale for mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const prevDataRef = useRef<DashboardData | null>(null);

  // More resilient guard: avoid redirect while auth still initializing but token exists
  useEffect(() => {
    if (!isInitialized) return; // wait until store knows auth state
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (isInitialized && !isAuthenticated && !token) {
      router.push('/');
    } else if (isInitialized && isAuthenticated && user && !user.is_staff) {
      router.push('/');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  const loadData = async () => {
    if (!isAuthenticated || !user?.is_staff) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const resp = await fetch(`${API_BASE_URL}/analytics/dashboard/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to load analytics');
      const json = await resp.json();
      prevDataRef.current = json; // keep last successful snapshot
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const buildProductQuery = () => {
    const params = new URLSearchParams();
    params.set('page', String(productPage));
    params.set('page_size', String(PAGE_SIZE));
    if(productSearch.trim()) params.set('search', productSearch.trim());
    params.set('ordering','-created_at');
    return params.toString();
  };

  const loadProducts = useCallback(async()=>{
    if(!isAuthenticated || !user?.is_staff) return;
    setProdLoading(true);
    try {
      const q = buildProductQuery();
      const resp = await fetch(`${API_BASE_URL}/products/?${q}`);
      if(!resp.ok) throw new Error('Failed to load products');
      const json:QuickProductsPayload = await resp.json();
      setProducts(json.results);
      setProductTotal(json.count);
    } catch(e:any){
      pushToast(e.message || 'Product load failed','error');
    } finally { setProdLoading(false); }
  },[isAuthenticated, user, productPage, productSearch]);

  useEffect(()=>{ loadProducts(); },[loadProducts]);

  // debounce search
  useEffect(()=>{ const id=setTimeout(()=>{ setProductPage(1); loadProducts(); },400); return ()=>clearTimeout(id); },[productSearch]);

  const openCreateProduct = () => { setEditingProduct(null); setProductForm({name:'', base_price:'', description:''}); setShowProductForm(true); };
  const openEditProduct = (p:QuickProduct) => { setEditingProduct(p); setProductForm({ name:p.name, base_price:p.base_price, description:'' }); setShowProductForm(true); };
  const closeProductForm = () => { if(savingProduct) return; setShowProductForm(false); setEditingProduct(null); };

  const submitProduct = async() => {
    if(savingProduct) return; setSavingProduct(true);
    try {
      const payload:any = { name:productForm.name, base_price:productForm.base_price, description:productForm.description };
  const endpoint = editingProduct? `${API_BASE_URL}/admin/products/${editingProduct.slug}/` : `${API_BASE_URL}/admin/products/`;
      const method = editingProduct? 'PATCH':'POST';
      const resp = await fetch(endpoint,{ method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if(!resp.ok) throw new Error('Save failed');
      const saved:QuickProduct = await resp.json();
      setProducts(ps=> editingProduct? ps.map(p=> p.id===saved.id? {...p, ...saved}: p) : [saved, ...ps]);
      pushToast(editingProduct? 'Product updated':'Product created','success');
      setShowProductForm(false); setEditingProduct(null);
    }catch(e:any){ pushToast(e.message||'Save error','error'); }
    finally { setSavingProduct(false); }
  };

  const toggleArchive = async(p:QuickProduct) => {
    if(archivingSlug) return; setArchivingSlug(p.slug);
    const prev = p.is_archived;
    setProducts(ps=> ps.map(x=> x.slug===p.slug? {...x, is_archived: !prev}: x));
    try {
      const url = `${API_BASE_URL}/products/${p.slug}/${p.is_archived? 'unarchive':'archive'}/`;
      const resp = await fetch(url,{method:'POST'});
      if(!resp.ok) throw new Error('Action failed');
      pushToast(prev? 'Unarchived':'Archived','success');
    } catch(e:any){
      // rollback
      setProducts(ps=> ps.map(x=> x.slug===p.slug? {...x, is_archived: prev}: x));
      pushToast(e.message||'Archive failed','error');
    } finally { setArchivingSlug(null); }
  };

  useEffect(() => { loadData(); }, [isAuthenticated, user]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => loadData(), 60000);
    return () => clearInterval(id);
  }, [autoRefresh, isAuthenticated, user]);

  const displayData = data || prevDataRef.current; // show previous data during refresh
  // Always compute derived memo values (they safely handle null) BEFORE any conditional render to keep hook order stable.
  const revenueTrend = useMemo(() => {
    if (!displayData) return null;
    const today = Number(displayData.orders.revenue_today) || 0;
    const avgPrevDay = (Number(displayData.orders.revenue_7d) - today) / 6 || 0;
    if (!isFinite(avgPrevDay) || avgPrevDay === 0) return null;
    return ((today - avgPrevDay) / (avgPrevDay || 1)) * 100;
  }, [displayData]);
  const ordersTrend = useMemo(() => {
    if (!displayData) return null;
    const today = displayData.orders.orders_today || 0;
    const avgPrevDay = (displayData.orders.orders_7d - today) / 6 || 0;
    if (!isFinite(avgPrevDay) || avgPrevDay === 0) return null;
    return ((today - avgPrevDay) / (avgPrevDay || 1)) * 100;
  }, [displayData]);
  const clicksTrend = useMemo(() => {
    if (!displayData) return null;
    const today = displayData.clicks.clicks_today || 0;
    const avgPrevDay = (displayData.clicks.clicks_7d - today) / 6 || 0;
    if (!isFinite(avgPrevDay) || avgPrevDay === 0) return null;
    return ((today - avgPrevDay) / (avgPrevDay || 1)) * 100;
  }, [displayData]);
  const statusColors = useMemo(() => {
    const palette = ['#2563eb','#10b981','#f59e0b','#ef4444','#6366f1','#0d9488'];
    return (displayData?.orders.status_breakdown || []).reduce<Record<string,string>>((acc, s, i) => {acc[s.order_status] = palette[i % palette.length]; return acc;}, {});
  }, [displayData]);
  const donutGradient = useMemo(() => {
    if (!displayData) return '';
    const total = displayData.orders.status_breakdown.reduce((sum, s) => sum + s.count, 0) || 1;
    let accum = 0;
    const segments = displayData.orders.status_breakdown.map(s => {
      const start = accum / total * 100; accum += s.count; const end = accum / total * 100;
      return `${statusColors[s.order_status]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    return `conic-gradient(${segments.join(',')})`;
  }, [displayData, statusColors]);

  return (
    <div className={styles.wrapper}>
      {(!isInitialized || !isAuthenticated || !user?.is_staff) && (
        <div className={styles.loadingFull}>
          <div className={styles.spinner}></div>
          <span>{!isInitialized ? 'Initializing...' : 'Authenticating...'}</span>
        </div>
      )}
  {(isInitialized && isAuthenticated && user?.is_staff) && (
   <>
   <div className={styles.headerRow}>
        <h1>Analytics Dashboard</h1>
        <div className={styles.headerActions}>
          <button onClick={loadData} className={styles.refreshBtn}>Refresh</button>
          <label className={styles.autoRefreshLabel}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto Refresh
          </label>
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loadingBar}><div className={styles.loadingPulse}></div></div>}
      {displayData && (
        <>
          <section className={styles.kpis}>
            <Kpi label="Revenue (Today)" value={`€${displayData.orders.revenue_today}`} trend={revenueTrend} />
            <Kpi label="Revenue (7d)" value={`€${displayData.orders.revenue_7d}`} />
            <Kpi label="Orders (Today)" value={displayData.orders.orders_today} trend={ordersTrend} />
            <Kpi label="Orders (30d)" value={displayData.orders.orders_30d} />
            <Kpi label="AOV" value={`€${displayData.orders.average_order_value}`} />
            <Kpi label="Clicks (24h)" value={displayData.clicks.clicks_24h} trend={clicksTrend} />
            {displayData.visitors && (
              <Kpi label="Visitors (7d)" value={`${displayData.visitors.registered_7d + displayData.visitors.anonymous_7d}`} />
            )}
          </section>
          <section className={styles.mainCharts}>
            {!isMobile && (
            <div className={styles.bigChartCard}>
              <div className={styles.chartHeader}>
                <div className={styles.tabs}>
                  {['revenue','orders','clicks'].map(m => (
                    <button
                      key={m}
                      className={m===activeMetric?styles.tabActive:styles.tab}
                      onClick={()=>setActiveMetric(m as any)}
                    >{m.toUpperCase()}</button>
                  ))}
                </div>
                <div className={styles.chartControls}>
                  <button className={styles.toggleBtn} onClick={()=>setDateMode(d=> d==='short'?'full':'short')}>
                    {dateMode==='short'?'Show Full Dates':'Show Short Dates'}
                  </button>
                </div>
              </div>
              <LineChart
                data={activeMetric==='revenue'?displayData.timeseries.revenue_30d: activeMetric==='orders'?displayData.timeseries.revenue_30d: displayData.clicks.timeseries_14d}
                xKey="date"
                yKey={activeMetric==='revenue'?'revenue': activeMetric==='orders'?'orders':'clicks'}
                dateMode={dateMode}
                height={isMobile ? 150 : 220}
                color={activeMetric==='revenue'? '#2563eb': activeMetric==='orders'? '#10b981':'#4f46e5'}
              />
            </div>
            )}
            <div className={styles.sideCharts}>
              <div className={styles.chartCardSm}>
                <h3>Status Mix</h3>
                <div className={styles.donutWrap}>
                  <div className={styles.donut} style={{ background: donutGradient }} />
                  <ul className={styles.legend}>
                    {displayData.orders.status_breakdown.map(s => (
                      <li key={s.order_status}><span className={styles.legendSwatch} style={{background: statusColors[s.order_status]}}></span>{s.order_status} <em>{s.count}</em></li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className={styles.chartCardSm}>
                <h3>Clicks (14d)</h3>
                <SimpleBarChart data={displayData.clicks.timeseries_14d} xKey="date" yKey="clicks" height={isMobile ? 90 : 120} barColor="#4f46e5" dateMode={dateMode} />
              </div>
            </div>
          </section>

          <section className={styles.gridTwo}>
            <div className={styles.panel}>
              <h3>Quick Product Management</h3>
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'8px'}}>
                <input className={styles.quickInput} placeholder='Search products' value={productSearch} onChange={e=> setProductSearch(e.target.value)} />
                <button className={styles.refreshBtn} onClick={openCreateProduct}>New</button>
                <button className={styles.refreshBtn} onClick={loadProducts} disabled={prodLoading}>{prodLoading? 'Loading...':'Reload'}</button>
              </div>
              <div className={styles.quickListWrap}>
                {prodLoading && <div className={styles.loading}>Loading products…</div>}
                {!prodLoading && products.length===0 && <div className={styles.chartEmpty}>No products</div>}
                {!prodLoading && products.length>0 && (
                  <table className={styles.quickTable}>
                    <thead><tr><th>Name</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {products.map(p=> (
                        <tr key={p.id} className={p.is_archived? styles.archivedRow: ''}>
                          <td>{p.name}</td>
                          <td>{p.base_price}</td>
                          <td>{p.is_archived? 'Archived':'Active'}</td>
                          <td style={{display:'flex', gap:'4px'}}>
                            <button className={styles.miniBtn} onClick={()=>openEditProduct(p)}>Edit</button>
                            <button className={styles.miniBtn} disabled={archivingSlug===p.slug} onClick={()=>toggleArchive(p)}>{archivingSlug===p.slug? '...': p.is_archived? 'Unarchive':'Archive'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {productTotal>PAGE_SIZE && (
                  <div className={styles.paginationRow}>
                    <button disabled={productPage<=1 || prodLoading} onClick={()=> setProductPage(p=> Math.max(1,p-1))}>Prev</button>
                    <span>Page {productPage} / {Math.ceil(productTotal/PAGE_SIZE)||1}</span>
                    <button disabled={productPage>=Math.ceil(productTotal/PAGE_SIZE) || prodLoading} onClick={()=> setProductPage(p=> p+1)}>Next</button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.gridTwo}>
            <div className={styles.panel}>
              <h3>Status Breakdown</h3>
              <ul className={styles.listPlain}>
                {displayData.orders.status_breakdown.map(s => (
                  <li key={s.order_status}><span className={styles.statusDot} style={{background: statusColors[s.order_status]}}></span><span>{s.order_status}</span><span>{s.count}</span></li>
                ))}
              </ul>
            </div>
            <div className={styles.panel}>
              <h3>Top Products</h3>
              <ul className={styles.listPlain}>
                {displayData.orders.top_products.map(p => (
                  <li key={p.name}><span>{p.name}</span><span>{p.quantity}</span><span className={styles.revenueTag}>€{p.revenue}</span></li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.gridTwo}>
            <div className={styles.panel}>
              <h3>Top Paths (7d)</h3>
              <ul className={styles.listPlain}>
                {displayData.clicks.top_paths_7d.map(p => (
                  <li key={p.path}><span className={styles.path}>{p.path}</span><span>{p.count}</span></li>
                ))}
              </ul>
            </div>
            <div className={styles.panel}>
              <h3>Totals</h3>
              <ul className={styles.listPlain}>
                <li><span>Total Paid Orders</span><span>{displayData.orders.total_paid_orders}</span></li>
                <li><span>Total Revenue</span><span>€{displayData.orders.revenue_total}</span></li>
                <li><span>Total Clicks</span><span>{displayData.clicks.total_clicks}</span></li>
                {displayData.visitors && (
                  <>
                    <li><span>Registered Visitors (Total)</span><span>{displayData.visitors.registered_total}</span></li>
                    <li><span>Anonymous Visitors (Total)</span><span>{displayData.visitors.anonymous_total}</span></li>
                    <li><span>Total Visitors (7d)</span><span>{displayData.visitors.registered_7d + displayData.visitors.anonymous_7d}</span></li>
                  </>
                )}
              </ul>
            </div>
          </section>
          </>
        )}
        {showProductForm && (
          <div className={styles.drawerOverlay} onClick={closeProductForm}>
            <div className={styles.drawer} onClick={e=>e.stopPropagation()}>
              <div className={styles.drawerHeader}>
                <h2 style={{margin:0}}>{editingProduct? 'Edit Product':'New Product'}</h2>
                <button className={styles.closeBtn} onClick={closeProductForm}>×</button>
              </div>
              <div className={styles.formDrawer}>
                <div className={styles.fieldGroup}>
                  <label>Name</label>
                  <input className={styles.textInput} value={productForm.name} onChange={e=> setProductForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Base Price</label>
                  <input className={styles.textInput} value={productForm.base_price} onChange={e=> setProductForm(f=>({...f,base_price:e.target.value}))} />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Description</label>
                  <textarea className={styles.textarea} value={productForm.description} onChange={e=> setProductForm(f=>({...f,description:e.target.value}))} />
                </div>
                <div className={styles.formActions}>
                  <button className={styles.refreshBtn} disabled={savingProduct || !productForm.name || !productForm.base_price} onClick={submitProduct}>{savingProduct? 'Saving...': (editingProduct? 'Save Changes':'Create')}</button>
                  <button className={styles.toggleBtn} type='button' onClick={closeProductForm}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

interface BarChartProps { data: any[]; xKey: string; yKey: string; height?: number; barColor?: string; dateMode?: 'short' | 'full'; }
function SimpleBarChart({ data, xKey, yKey, height = 120, barColor = '#1f2937', dateMode='short' }: BarChartProps) {
  if (!data || data.length === 0) return <div className={styles.chartEmpty}>No data</div>;
  const maxVal = Math.max(...data.map(d => Number(d[yKey]) || 0), 1);
  const barWidth = Math.max(6, Math.floor(600 / data.length) - 4);
  const small = typeof window !== 'undefined' && window.innerWidth < 600;
  const showEvery = Math.ceil(data.length / (small?4:6)); // fewer labels on small screens
  return (
    <div className={styles.barChartWrapper}>
      <div className={`${styles.chartCanvas}`} style={{ height }}>
        {data.map((d, i) => {
          const val = Number(d[yKey]) || 0;
            const hPct = (val / maxVal) * 100;
            return (
              <div key={i} className={styles.barWrapper} title={`${d[xKey]}: ${val}`}>
                <div className={styles.bar} style={{ height: `${hPct}%`, width: barWidth, background: barColor }} />
              </div>
            );
        })}
      </div>
      <div className={styles.axisLabels}>
        {data.map((d,i)=> {
          if (i % showEvery !== 0 && i !== data.length-1) return <span key={i}></span>;
          const raw = String(d[xKey]);
          const label = dateMode==='short'? raw.slice(5) : raw; // short: MM-DD, full: YYYY-MM-DD
          return <span key={i}>{label}</span>;
        })}
      </div>
    </div>
  );
}

interface KpiProps { label: string; value: string | number; trend?: number | null; }
function Kpi({ label, value, trend }: KpiProps) {
  const trendRounded = trend != null ? (trend > 999 ? 999 : trend).toFixed(1) : null;
  const trendClass = trend != null ? (trend >= 0 ? styles.trendUp : styles.trendDown) : '';
  const isPositive = (trend ?? 0) >= 0;
  return (
    <div className={styles.kpiCard}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {trendRounded && trend != null && (
        <span className={`${styles.trend} ${trendClass}`}>{isPositive ? '▲' : '▼'} {trendRounded}%</span>
      )}
    </div>
  );
}

interface LineChartProps { data: any[]; xKey: string; yKey: string; height?: number; color?: string; dateMode?: 'short' | 'full'; }
function LineChart({ data, xKey, yKey, height = 200, color = '#2563eb', dateMode='short' }: LineChartProps) {
  if (!data || data.length === 0) return <div className={styles.chartEmpty}>No data</div>;
  const w = 640; // fixed logical width
  const h = height;
  const vals = data.map(d => Number(d[yKey]) || 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const stepX = w / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = h - ((Number(d[yKey]) - min) / range) * (h - 16) - 8; // padding
    return { x, y, raw: d };
  });
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const small = typeof window !== 'undefined' && window.innerWidth < 600;
  const showEvery = Math.ceil(points.length / (small?5:7)); // show fewer labels on small screens
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  return (
    <div className={styles.lineChartWrapper}>
      <div className={`${styles.chartScroll} ${styles.hideScrollbar}`}>
      <div className={styles.chartInner}>
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.lineChartSvg} preserveAspectRatio="none"
           style={{display:'block'}}
           onMouseLeave={()=>setHoverIdx(null)}>
        <defs>
          <linearGradient id="gradLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        <path d={`${path} L ${points[points.length-1].x},${h} L 0,${h} Z`} fill="url(#gradLine)" stroke="none" />
        {points.map((p,i)=>(
          <g key={i} onMouseEnter={()=>setHoverIdx(i)}>
            <circle cx={p.x} cy={p.y} r={hoverIdx===i?5:3} fill={color} className={styles.linePoint} />
            {hoverIdx===i && (
              <g transform={`translate(${p.x},${p.y})`}>
                <foreignObject x={-60} y={-50} width={120} height={48}>
                  <div className={styles.chartTooltip}>
                    <div>{dateMode==='short'? String(p.raw[xKey]).slice(5) : String(p.raw[xKey])}</div>
                    <div style={{fontWeight:600}}>{yKey}: {Number(p.raw[yKey]).toLocaleString()}</div>
                  </div>
                </foreignObject>
              </g>
            )}
          </g>
        ))}
  </svg>
  <div className={styles.lineAxisLabels}>
        {points.map((p,i)=> {
          if (i % showEvery !== 0 && i !== points.length-1) return <span key={i}></span>;
            const rawDate = String(p.raw[xKey]);
            const label = dateMode==='short'? rawDate.slice(5) : rawDate;
            return <span key={i}>{label}</span>;
        })}
      </div>
  </div>
  </div>
    </div>
  );
}
