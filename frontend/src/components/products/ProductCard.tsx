import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import WarrantyBadge from '../ui/Badge';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product._id}`}
      className="group block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft p-5
                 hover:shadow-card hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200 animate-slide-up"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-16 w-16 rounded-lg object-cover bg-slate-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
              <Package className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {product.name}
              </h3>
              <p className="text-sm text-slate-500">{product.brand} · {product.category}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatCurrency(product.purchasePrice, product.currency || 'USD')}</span>
              <span className="text-xs text-slate-400">{formatDate(product.purchaseDate)}</span>
            </div>
            <WarrantyBadge status={product.warrantyStatus} days={product.remainingDays} />
          </div>
        </div>
      </div>
    </Link>
  );
}
