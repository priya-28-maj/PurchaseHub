import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Upload, Plus, Wrench, Package, Pencil,
} from 'lucide-react';
import { productService, repairService } from '../services';
import { Product, Repair, TimelineEvent } from '../types';
import { formatCurrency, formatDate, getRemainingDaysText } from '../utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import WarrantyBadge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DocumentList from '../components/products/DocumentList';
import ProductTimeline from '../components/products/ProductTimeline';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairModal, setRepairModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [repairForm, setRepairForm] = useState({ date: '', serviceCenter: '', cost: '', description: '' });
  const [docType, setDocType] = useState('receipt');
  const [submitting, setSubmitting] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const repairInvoiceRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [productRes, repairsRes, timelineRes] = await Promise.all([
        productService.getById(id),
        repairService.getAll(id),
        productService.getTimeline(id),
      ]);
      setProduct(productRes.data.data);
      setRepairs(repairsRes.data.data);
      setTimeline(timelineRes.data.data);
    } catch {
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Delete this product permanently?')) return;
    await productService.delete(id);
    navigate('/products');
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);
      const res = await productService.uploadDocument(id, formData);
      setProduct(res.data.data);
      setDocModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!id) return;
    const res = await productService.deleteDocument(id, docId);
    setProduct(res.data.data);
  };

  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(repairForm).forEach(([k, v]) => formData.append(k, v));
      const invoice = repairInvoiceRef.current?.files?.[0];
      if (invoice) formData.append('invoice', invoice);

      await repairService.create(id, formData);
      setRepairModal(false);
      setRepairForm({ date: '', serviceCenter: '', cost: '', description: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRepair = async (repairId: string) => {
    if (!id || !confirm('Delete this repair record?')) return;
    await repairService.delete(id, repairId);
    fetchData();
  };

  if (loading) return <LoadingSpinner />;
  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/products')} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-4">
            {product.image ? (
              <img src={product.image} alt={product.name} className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <Package className="h-7 w-7" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.name}</h1>
              <p className="text-slate-500 dark:text-slate-400">{product.brand} · {product.category}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/products/${product._id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handleDelete} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Purchase Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-slate-400">Price</dt><dd className="font-medium text-slate-900 mt-0.5">{formatCurrency(product.purchasePrice, product.currency || 'USD')}</dd></div>
              <div><dt className="text-slate-400">Purchase Date</dt><dd className="font-medium text-slate-900 mt-0.5">{formatDate(product.purchaseDate)}</dd></div>
              <div><dt className="text-slate-400">Store</dt><dd className="font-medium text-slate-900 mt-0.5">{product.storeName}</dd></div>
              <div><dt className="text-slate-400">Warranty</dt><dd className="mt-0.5"><WarrantyBadge status={product.warrantyStatus} days={product.remainingDays} /></dd></div>
              {product.warrantyExpiry && (
                <div><dt className="text-slate-400">Expires</dt><dd className="font-medium text-slate-900 mt-0.5">{formatDate(product.warrantyExpiry)} · {getRemainingDaysText(product.remainingDays)}</dd></div>
              )}
            </dl>
            {product.notes && (
              <div className="mt-4 pt-4 border-t border-surface-border">
                <p className="text-sm text-slate-500">{product.notes}</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
              <Button size="sm" variant="secondary" onClick={() => setDocModal(true)}>
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
            <DocumentList documents={product.documents} onDelete={handleDeleteDoc} />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Repair History</h3>
              <Button size="sm" variant="secondary" onClick={() => setRepairModal(true)}>
                <Plus className="h-4 w-4" /> Add Repair
              </Button>
            </div>
            {repairs.length === 0 ? (
              <p className="text-sm text-slate-500">No repairs recorded.</p>
            ) : (
              <div className="space-y-3">
                {repairs.map((repair) => (
                  <div key={repair._id} className="flex items-start gap-3 rounded-lg border border-surface-border p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">{repair.serviceCenter}</p>
                        <span className="text-xs text-slate-400">{formatDate(repair.date)}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{repair.description}</p>
                      <p className="text-sm font-medium text-slate-700 mt-1">{formatCurrency(repair.cost, product.currency || 'USD')}</p>
                      {repair.invoiceUrl && (
                        <a href={repair.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                          View invoice
                        </a>
                      )}
                    </div>
                    <button onClick={() => handleDeleteRepair(repair._id)} className="text-slate-400 hover:text-red-500 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Product Timeline</h3>
            <ProductTimeline events={timeline} currency={product.currency || 'USD'} />
          </Card>
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal open={docModal} onClose={() => setDocModal(false)} title="Upload Document">
        <div className="space-y-4">
          <SelectDocType value={docType} onChange={setDocType} />
          <div
            onClick={() => docInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-surface-border p-8 cursor-pointer hover:border-brand-300 transition-colors"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            <p className="text-sm text-slate-500">Click to select file (PDF, JPG, PNG)</p>
          </div>
          <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadDoc} />
          {submitting && <p className="text-sm text-brand-600">Uploading...</p>}
        </div>
      </Modal>

      {/* Add Repair Modal */}
      <Modal open={repairModal} onClose={() => setRepairModal(false)} title="Add Repair Record">
        <form onSubmit={handleAddRepair} className="space-y-4">
          <Input label="Date" type="date" value={repairForm.date} onChange={(e) => setRepairForm({ ...repairForm, date: e.target.value })} required />
          <Input label="Service Center" value={repairForm.serviceCenter} onChange={(e) => setRepairForm({ ...repairForm, serviceCenter: e.target.value })} required />
          <Input label="Cost" type="number" step="0.01" min="0" value={repairForm.cost} onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })} required />
          <Textarea label="Description" value={repairForm.description} onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })} required rows={3} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Repair Invoice (optional)</label>
            <input ref={repairInvoiceRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setRepairModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Repair</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SelectDocType({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const types = [
    { value: 'receipt', label: 'Receipt' },
    { value: 'warranty_card', label: 'Warranty Card' },
    { value: 'invoice', label: 'Invoice' },
  ];

  return (
    <div className="flex gap-2">
      {types.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === t.value ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
