export const kpiData = [
  { id: 'sessions' as const, value: '64.6K', delta: 4.2 },
  { id: 'pageViews' as const, value: '117.8K', delta: 6.8, ratio: '1.83' },
  { id: 'bounceRate' as const, value: '39.2%', delta: -1.4 },
  { id: 'avgDuration' as const, value: '2m 59s', delta: 2.1 },
];

export const trafficData = [
  { time: '00:00', sessions: 1200, pageViews: 2400 },
  { time: '04:00', sessions: 800, pageViews: 1600 },
  { time: '08:00', sessions: 3200, pageViews: 6400 },
  { time: '12:00', sessions: 4800, pageViews: 9600 },
  { time: '16:00', sessions: 6000, pageViews: 12000 },
  { time: '20:00', sessions: 4000, pageViews: 8000 },
];

export const activePagesData = [
  { path: '/', visitors: 77 },
  { path: '/about', visitors: 57 },
  { path: '/produits', visitors: 53 },
  { path: '/docs/api', visitors: 31 },
  { path: '/tarifs', visitors: 24 },
  { path: '/contact', visitors: 20 },
  { path: '/blog/analytics-2025', visitors: 18 },
];

export const topPagesData = [
  { rank: 1, name: 'Accueil', path: '/', views: 18400, evol: 7.7, avgDuration: '1m 42s' },
  { rank: 2, name: 'Produits', path: '/produits', views: 9800, evol: -3.6, avgDuration: '2m 18s' },
  { rank: 3, name: 'Blog — Analytics 2025', path: '/blog/analytics-2025', views: 7600, evol: 10.7, avgDuration: '4m 05s' },
  { rank: 4, name: 'Tarifs', path: '/tarifs', views: 6100, evol: 5.3, avgDuration: '1m 58s' },
  { rank: 5, name: 'Contact', path: '/contact', views: 4300, evol: -4.7, avgDuration: '0m 54s' },
  { rank: 6, name: 'Documentation API', path: '/docs/api', views: 3900, evol: 20.9, avgDuration: '5m 33s' },
];

export const trafficSourcesData = [
  { key: 'organic', value: 41, color: '#38bdf8' },
  { key: 'direct', value: 24, color: '#818cf8' },
  { key: 'social', value: 18, color: '#34d399' },
  { key: 'referral', value: 12, color: '#fb923c' },
  { key: 'email', value: 5, color: '#6b7280' },
];

export const devicesData = [
  { key: 'desktop', percentage: 54, icon: 'desktop' },
  { key: 'mobile', percentage: 38, icon: 'mobile' },
  { key: 'tablet', percentage: 8, icon: 'tablet' },
];
