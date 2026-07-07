import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Package } from 'lucide-react';
import { productService, dashboardService } from '../services';
import { Product } from '../types';
import ProductCard from '../components/products/ProductCard';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [warrantyStatus, setWarrantyStatus] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (warrantyStatus) params.warrantyStatus = warrantyStatus;

      const res = await productService.getAll(params);
      setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dashboardService.getCategories().then((res) => setCategories(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [search, category, warrantyStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Products</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{products.length} items in your vault</p>
        </div>
        <Link to="/products/new">
          <Button><Plus className="h-4 w-4" /> Add Product</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products, brands, stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          className="sm:w-48"
        />
        <Select
          value={warrantyStatus}
          onChange={(e) => setWarrantyStatus(e.target.value)}
          options={[
            { value: '', label: 'All Warranties' },
            { value: 'active', label: 'Active' },
            { value: 'expiring_soon', label: 'Expiring Soon' },
            { value: 'expired', label: 'Expired' },
            { value: 'none', label: 'No Warranty' },
          ]}
          className="sm:w-48"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No products yet"
          description="Start building your digital vault by adding your first product."
          action={
            <Link to="/products/new">
              <Button><Plus className="h-4 w-4" /> Add Product</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
