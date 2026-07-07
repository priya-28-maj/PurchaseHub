import { Response } from 'express';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { sendError } from '../utils/errors';
import { DEFAULT_CURRENCY, CurrencyCode } from '../utils/currency';

interface ChartItem {
  name: string;
  value: number;
}

function buildCharts(products: InstanceType<typeof Product>[]) {
  const spendingByCategory: Record<string, number> = {};
  const spendingByBrand: Record<string, number> = {};

  for (const product of products) {
    spendingByCategory[product.category] = (spendingByCategory[product.category] || 0) + product.purchasePrice;
    spendingByBrand[product.brand] = (spendingByBrand[product.brand] || 0) + product.purchasePrice;
  }

  const spendingByCategoryChart = Object.entries(spendingByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const spendingByBrandChart = Object.entries(spendingByBrand)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return { spendingByCategory: spendingByCategoryChart, spendingByBrand: spendingByBrandChart };
}

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const products = await Product.find({ user: userId });

    const totalProducts = products.length;
    const activeWarranties = products.filter((p) => p.warrantyStatus === 'active').length;
    const expiringSoon = products.filter((p) => p.warrantyStatus === 'expiring_soon').length;
    const expiredWarranties = products.filter((p) => p.warrantyStatus === 'expired').length;

    const currencyGroups = new Map<string, InstanceType<typeof Product>[]>();
    for (const product of products) {
      const currency = product.currency || DEFAULT_CURRENCY;
      if (!currencyGroups.has(currency)) currencyGroups.set(currency, []);
      currencyGroups.get(currency)!.push(product);
    }

    const currencyAnalytics = Array.from(currencyGroups.entries())
      .map(([currency, group]) => {
        const total = group.reduce((sum, p) => sum + p.purchasePrice, 0);
        const charts = buildCharts(group);
        return {
          currency: currency as CurrencyCode,
          total,
          productCount: group.length,
          ...charts,
        };
      })
      .sort((a, b) => b.total - a.total);

    const recentUploads = products
      .flatMap((p) =>
        p.documents.map((d) => ({
          productId: p._id,
          productName: p.name,
          documentType: d.type,
          fileName: d.fileName,
          url: d.url,
          uploadedAt: d.uploadedAt,
        }))
      )
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          activeWarranties,
          expiringSoon,
          expiredWarranties,
        },
        currencyAnalytics,
        recentUploads,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getCategories(req: AuthRequest, res: Response): Promise<void> {
  try {
    const categories = await Product.distinct('category', { user: req.user!.id });
    res.json({ success: true, data: categories.sort() });
  } catch (error) {
    sendError(res, error);
  }
}
