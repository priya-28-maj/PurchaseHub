import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartItem, CurrencyCode } from '../../types';
import Card from '../ui/Card';
import { formatCurrency, getCurrencySymbol } from '../../utils';

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

interface SpendingChartsProps {
  byCategory: ChartItem[];
  byBrand: ChartItem[];
  currency?: CurrencyCode;
}

export default function SpendingCharts({ byCategory, byBrand, currency = 'USD' }: SpendingChartsProps) {
  if (byCategory.length === 0 && byBrand.length === 0) {
    return null;
  }

  const symbol = getCurrencySymbol(currency);
  const formatValue = (value: number) => formatCurrency(value, currency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {byCategory.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Spending by Category</h3>
          <p className="text-xs text-slate-400 mb-4">Totals in {currency}</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {byCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatValue(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-3">
            {byCategory.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {item.name}
              </div>
            ))}
          </div>
        </Card>
      )}

      {byBrand.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Spending by Brand</h3>
          <p className="text-xs text-slate-400 mb-4">Totals in {currency}</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byBrand} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(v) => `${symbol}${v}`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatValue(value)} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
