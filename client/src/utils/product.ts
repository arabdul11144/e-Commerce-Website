import type { Product } from '../types';
import { resolveApiUrl } from '../lib/api';

type ProductInput = Partial<Product> & {
  _id?: string;
  id?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function normalizeProduct(product: ProductInput): Product {
  const images = Array.isArray(product.images)
    ? product.images.filter(
        (image): image is string => typeof image === 'string' && image.length > 0
      ).map((image) => resolveApiUrl(image))
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
    price: toNumber(product.price),
    discountPrice:
      product.discountPrice === undefined
        ? undefined
        : toNumber(product.discountPrice),
    stock: Math.max(0, Math.trunc(toNumber(product.stock))),
    shortDescription: product.shortDescription ?? '',
    fullDescription: product.fullDescription ?? '',
    images,
    specifications:
      product.specifications && typeof product.specifications === 'object'
        ? product.specifications
        : {},
    featured: Boolean(product.featured),
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
