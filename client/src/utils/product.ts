import type { Product, ProductType } from '../types';
import { resolveApiUrl } from '../lib/api';

type ProductInput = Partial<Product> & {
  _id?: string;
  id?: string;
};

interface FormatCurrencyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: Intl.NumberFormatOptions['notation'];
  compactDisplay?: Intl.NumberFormatOptions['compactDisplay'];
}

function toNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeProductType(value: unknown): ProductType | undefined {
  if (value === 'featured' || value === 'sale' || value === 'normal') {
    return value;
  }

  return undefined;
}

export function getProductType(
  product: Pick<Product, 'productType' | 'featured' | 'discountPrice' | 'price'>
): ProductType {
  const explicitType = normalizeProductType(product.productType);

  if (explicitType) {
    return explicitType;
  }

  if (product.featured) {
    return 'featured';
  }

  if (
    typeof product.discountPrice === 'number' &&
    product.discountPrice >= 0 &&
    product.discountPrice < product.price
  ) {
    return 'sale';
  }

  return 'normal';
}

export function isFeaturedProduct(
  product: Pick<Product, 'productType' | 'featured' | 'discountPrice' | 'price'>
) {
  return getProductType(product) === 'featured';
}

export function isSaleProduct(
  product: Pick<Product, 'productType' | 'featured' | 'discountPrice' | 'price'>
) {
  return getProductType(product) === 'sale';
}

export function isBestDealProduct(
  product: Pick<Product, 'productType' | 'featured' | 'discountPrice' | 'price'>
) {
  return getProductType(product) !== 'normal';
}

export function normalizeCategoryValue(value: unknown) {
  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (normalizedValue.startsWith('laptop')) {
    return 'laptops' as const;
  }

  if (normalizedValue.startsWith('accessor')) {
    return 'accessories' as const;
  }

  return '' as const;
}

export function matchesProductCategory(product: Pick<Product, 'category'>, category: unknown) {
  const normalizedProductCategory = normalizeCategoryValue(product.category);
  const normalizedCategory = normalizeCategoryValue(category);

  if (!normalizedCategory) {
    return true;
  }

  return normalizedProductCategory === normalizedCategory;
}

export function getCategoryLabel(category: unknown) {
  const normalizedCategory = normalizeCategoryValue(category);

  if (normalizedCategory === 'laptops') {
    return 'Laptops';
  }

  if (normalizedCategory === 'accessories') {
    return 'Accessories';
  }

  return 'All Products';
}

export function normalizeProduct(product: ProductInput): Product {
  const price = toNumber(product.price);
  const discountPrice =
    product.discountPrice === undefined ? undefined : toNumber(product.discountPrice);
  const productType = getProductType({
    productType: normalizeProductType(
      (product as ProductInput & { productType?: unknown }).productType
    ),
    featured: Boolean(product.featured),
    discountPrice,
    price,
  });

  const images = Array.isArray(product.images)
    ? product.images
        .filter(
          (image): image is string => typeof image === 'string' && image.length > 0
        )
        .map((image) => resolveApiUrl(image))
    : [];

  return {
    id: String(product.id ?? product._id ?? ''),
    sellerId:
      typeof (product as ProductInput & { sellerId?: unknown }).sellerId === 'string'
        ? (product as ProductInput & { sellerId?: string }).sellerId
        : undefined,
    name: product.name ?? '',
    slug: product.slug ?? '',
    sku: product.sku ?? '',
    brand: product.brand ?? '',
    category: product.category === 'Accessories' ? 'Accessories' : 'Laptops',
    subcategory: product.subcategory,
    price,
    discountPrice,
    stock: Math.max(0, Math.trunc(toNumber(product.stock))),
    shortDescription: product.shortDescription ?? '',
    fullDescription: product.fullDescription ?? '',
    images,
    specifications:
      product.specifications && typeof product.specifications === 'object'
        ? product.specifications
        : {},
    featured: productType === 'featured',
    productType,
    rating: Math.max(0, toNumber(product.rating)),
    reviewsCount: Math.max(0, Math.trunc(toNumber(product.reviewsCount))),
  };
}

export function getProductRatingMeta(product: Pick<Product, 'rating' | 'reviewsCount'>) {
  const rating = Math.max(0, toNumber(product.rating));
  const normalizedReviewsCount = Math.max(
    0,
    Math.trunc(toNumber(product.reviewsCount))
  );

  return {
    rating,
    ratingLabel: rating === 0 ? '0' : rating.toFixed(1),
    reviewsCount: normalizedReviewsCount,
  };
}

export function formatCurrency(
  value: number,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    notation,
    compactDisplay,
  }: FormatCurrencyOptions = {}
) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    currencyDisplay: 'code',
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
    compactDisplay,
  }).format(safeValue);
}

export function formatCompactCurrency(value: number) {
  return formatCurrency(value, {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
