import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Shield, AlertTriangle, Clock, FileText, Wallet } from 'lucide-react';
import { dashboardService } from '../services';
import { CurrencyAnalytics, DashboardData } from '../types';
import { StatCard } from '../components/ui/Card';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SpendingCharts from '../components/dashboard/SpendingCharts';
import { formatCurrency, formatDate, cn } from '../utils';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');

  useEffect(() => {
    dashboardService.getStats()
      .then((res) => {
        const dashboard = res.data.data;
        setData(dashboard);
        if (dashboard.currencyAnalytics.length > 0) {
          setSelectedCurrency(dashboard.currencyAnalytics[0].currency);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="text-slate-500 dark:text-slate-400">Failed to load dashboard.</p>;

  const { stats, currencyAnalytics, recentUploads } = data;
  const activeAnalytics: CurrencyAnalytics | undefined =
    currencyAnalytics.find((c) => c.currency === selectedCurrency) || currencyAnalytics[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of your purchases and warranties</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={stats.totalProducts} icon={<Package className="h-5 w-5" />} />
        <StatCard title="Active Warranties" value={stats.activeWarranties} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Expired" value={stats.expiredWarranties} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      {currencyAnalytics.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Spending Overview</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Analytics grouped by currency — no conversion applied</p>
            </div>
            {currencyAnalytics.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {currencyAnalytics.map((item) => (
                  <button
                    key={item.currency}
                    onClick={() => setSelectedCurrency(item.currency)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      selectedCurrency === item.currency
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    {item.currency}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currencyAnalytics.map((item) => (
              <Card
                key={item.currency}
                className={cn(
                  'cursor-pointer transition-all',
                  selectedCurrency === item.currency && 'ring-2 ring-brand-500 border-brand-300 dark:border-brand-600'
                )}
                onClick={() => setSelectedCurrency(item.currency)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total in {item.currency}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.total, item.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{item.productCount} product{item.productCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {activeAnalytics && (
            <SpendingCharts
              byCategory={activeAnalytics.spendingByCategory}
              byBrand={activeAnalytics.spendingByBrand}
              currency={activeAnalytics.currency}
            />
          )}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Uploads</h3>
          <Link to="/products" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium">
            View all
          </Link>
        </div>
        {recentUploads.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {recentUploads.map((upload, i) => (
              <Link
                key={i}
                to={`/products/${upload.productId}`}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{upload.fileName}</p>
                  <p className="text-xs text-slate-400">{upload.productName} · {formatDate(upload.uploadedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
