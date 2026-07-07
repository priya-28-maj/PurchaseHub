export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'none';
export type DocumentType = 'receipt' | 'warranty_card' | 'invoice' | 'repair_invoice';

export interface ProductDocument {
  _id: string;
  type: DocumentType;
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'AED' | 'SGD' | 'JPY';

export interface Product {
  _id: string;
  user: string;
  name: string;
  brand: string;
  category: string;
  purchasePrice: number;
  currency: CurrencyCode;
  purchaseDate: string;
  storeName: string;
  warrantyDurationMonths: number;
  warrantyExpiry: string | null;
  warrantyStatus: WarrantyStatus;
  remainingDays?: number | null;
  image?: string;
  notes?: string;
  documents: ProductDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface Repair {
  _id: string;
  user: string;
  product: string;
  date: string;
  serviceCenter: string;
  cost: number;
  description: string;
  invoiceUrl?: string;
  invoiceFileName?: string;
  createdAt: string;
}

export interface TimelineEvent {
  type: 'purchase' | 'warranty_start' | 'repair' | 'warranty_expiry';
  date: string;
  title: string;
  description?: string;
  cost?: number;
}

export interface DashboardStats {
  totalProducts: number;
  activeWarranties: number;
  expiringSoon: number;
  expiredWarranties: number;
}

export interface CurrencyAnalytics {
  currency: CurrencyCode;
  total: number;
  productCount: number;
  spendingByCategory: ChartItem[];
  spendingByBrand: ChartItem[];
}

export interface ChartItem {
  name: string;
  value: number;
}

export interface DashboardData {
  stats: DashboardStats;
  currencyAnalytics: CurrencyAnalytics[];
  recentUploads: Array<{
    productId: string;
    productName: string;
    documentType: string;
    fileName: string;
    url: string;
    uploadedAt: string;
  }>;
}

export interface OcrResult {
  productName: string;
  brand: string;
  category: string;
  purchaseDate: string;
  merchant: string;
  totalAmount: number;
  currency: CurrencyCode;
  itemCount?: number;
  notes?: string;
  warning?: string;
  rawText: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProductFormData {
  name: string;
  brand: string;
  category: string;
  purchasePrice: number;
  currency: CurrencyCode;
  purchaseDate: string;
  storeName: string;
  warrantyDurationMonths: number;
  notes: string;
}
