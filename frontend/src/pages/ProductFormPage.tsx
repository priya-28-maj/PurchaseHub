import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Scan, Upload, ArrowLeft } from 'lucide-react';
import { productService, ocrService } from '../services';
import { CATEGORIES, parseOcrDate, CURRENCIES } from '../utils';
import { CurrencyCode } from '../types';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const EMPTY_FORM = {
  name: '',
  brand: '',
  category: 'Other',
  purchasePrice: '',
  currency: 'USD' as CurrencyCode,
  purchaseDate: new Date().toISOString().split('T')[0],
  storeName: '',
  warrantyDurationMonths: '12',
  notes: '',
};

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrApplied, setOcrApplied] = useState(false);
  const [scanWarning, setScanWarning] = useState('');
  const [scanPreview, setScanPreview] = useState<{ rawText: string } | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isEditing) return;
    ocrService.getStatus()
      .then((res) => {
        const { ready, message } = res.data.data;
        if (!ready && message) setScanWarning(message);
      })
      .catch(() => {});
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !id) return;

    productService.getById(id)
      .then((res) => {
        const p = res.data.data;
        setForm({
          name: p.name,
          brand: p.brand,
          category: p.category,
          purchasePrice: String(p.purchasePrice),
          currency: p.currency || 'USD',
          purchaseDate: p.purchaseDate.split('T')[0],
          storeName: p.storeName,
          warrantyDurationMonths: String(p.warrantyDurationMonths),
          notes: p.notes || '',
        });
        if (p.image) setImagePreview(p.image);
      })
      .catch(() => navigate('/products'))
      .finally(() => setFetching(false));
  }, [id, isEditing, navigate]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError('');
    setScanWarning('');
    try {
      const res = await ocrService.scanReceipt(file);
      const data = res.data.data;

      setForm((prev) => ({
        ...prev,
        name: data.productName || prev.name,
        brand: data.brand || prev.brand || (data.merchant ? data.merchant.split(' ')[0] : ''),
        category: CATEGORIES.includes(data.category as typeof CATEGORIES[number]) ? data.category : prev.category,
        storeName: data.merchant || prev.storeName,
        purchasePrice: data.totalAmount ? String(data.totalAmount) : prev.purchasePrice,
        currency: data.currency || prev.currency,
        purchaseDate: data.purchaseDate ? parseOcrDate(data.purchaseDate) : prev.purchaseDate,
        notes: data.notes
          || (data.itemCount && data.itemCount > 1 ? `Receipt contains ${data.itemCount} items` : prev.notes),
      }));
      setScanPreview({ rawText: data.rawText || '' });
      if (data.warning) setScanWarning(data.warning);
      setOcrApplied(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Receipt scan failed. Try a clearer photo or fill in the form manually.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (image) formData.append('image', image);

      if (isEditing && id) {
        await productService.update(id, formData);
        navigate(`/products/${id}`);
      } else {
        const res = await productService.create(formData);
        navigate(`/products/${res.data.data._id}`);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || `Failed to ${isEditing ? 'update' : 'create'} product`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (isEditing && id) navigate(`/products/${id}`);
            else navigate(-1);
          }}
          className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditing ? 'Update your product details' : 'Scan a receipt or enter details manually'}
          </p>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        {!isEditing && scanWarning && !ocrApplied && (
          <div className="mx-6 mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            {scanWarning}
          </div>
        )}
        {!isEditing && (
          <div className="border-b border-slate-200 dark:border-slate-800 bg-brand-50 dark:bg-brand-900/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Scan Receipt</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upload a receipt image to auto-fill details</p>
              </div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={scanning}>
                <Scan className="h-4 w-4" /> Scan Receipt
              </Button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleReceiptScan} />
            </div>
            {ocrApplied && (
              <div className="mt-3 space-y-2">
                <div className="rounded-lg px-3 py-2 text-sm border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  Receipt scanned — verify store, total, date, and product name before saving.
                </div>
                {scanWarning && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                    {scanWarning}
                  </div>
                )}
                {scanPreview?.rawText && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {showRawText ? 'Hide' : 'Show'} scanned text from receipt
                    </button>
                    {showRawText && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {scanPreview.rawText}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Product Name" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            <Input label="Brand" value={form.brand} onChange={(e) => updateField('brand', e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Input label="Store Name" value={form.storeName} onChange={(e) => updateField('storeName', e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Purchase Price" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => updateField('purchasePrice', e.target.value)} required />
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code} — ${c.label}` }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={(e) => updateField('purchaseDate', e.target.value)} required />
            <Input label="Warranty (months)" type="number" min="0" value={form.warrantyDurationMonths} onChange={(e) => updateField('warrantyDurationMonths', e.target.value)} />
          </div>

          <Textarea label="Notes" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} placeholder="Optional notes about this product..." />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Product Image</label>
            <div
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Click to upload image</span>
                </>
              )}
            </div>
            {isEditing && imagePreview && !image && (
              <p className="mt-1.5 text-xs text-slate-400">Upload a new image to replace the current one</p>
            )}
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageChange} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(isEditing && id ? `/products/${id}` : '/products')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Save Changes' : 'Save Product'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
