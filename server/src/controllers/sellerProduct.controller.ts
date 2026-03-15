import { type Response } from 'express';
import mongoose from 'mongoose';
import Product, { type ProductType } from '../models/Product';
import { type SellerAuthRequest } from '../middlewares/sellerAuth.middleware';
import {
  isDataImage,
  isRemoteImageUrl,
  isStoredImagePath,
  saveDataImage,
} from '../utils/imageUpload';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.trunc(parsedValue);
}

function buildPagination(totalItems: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: safePage,
    limit,
    totalItems,
    totalPages,
    hasPrevPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

function normalizePrice(value: unknown, fallback = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Number(numericValue);
}

function normalizeStock(value: unknown, fallback = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.trunc(numericValue);
}

function buildProductIdFilter(productId: string) {
  if (mongoose.Types.ObjectId.isValid(productId)) {
    return {
      $or: [{ _id: new mongoose.Types.ObjectId(productId) }, { id: productId }],
    };
  }

  return { id: productId };
}

function normalizeSpecifications(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, currentValue]) => {
      if (!key.trim()) {
        return accumulator;
      }

      accumulator[key] = String(currentValue ?? '').trim();
      return accumulator;
    },
    {}
  );
}

function normalizeProductType(
  value: unknown,
  featured: boolean,
  discountPrice: number | undefined,
  price: number
): ProductType {
  if (value === 'featured' || value === 'sale' || value === 'normal') {
    return value;
  }

  if (featured) {
    return 'featured';
  }

  if (
    discountPrice !== undefined &&
    Number.isFinite(discountPrice) &&
    discountPrice >= 0 &&
    discountPrice < price
  ) {
    return 'sale';
  }

  return 'normal';
}

async function normalizeImages(images: unknown, sellerId: string) {
  if (!Array.isArray(images)) {
    return [] as string[];
  }

  const normalizedImages: string[] = [];

  for (const [index, image] of images.entries()) {
    if (typeof image !== 'string') {
      continue;
    }

    const trimmedImage = image.trim();

    if (!trimmedImage) {
      continue;
    }

    if (isDataImage(trimmedImage)) {
      const uploadedImage = await saveDataImage(
        trimmedImage,
        ['products', sellerId],
        `product-${index + 1}`
      );
      normalizedImages.push(uploadedImage.url);
      continue;
    }

    if (isStoredImagePath(trimmedImage) || isRemoteImageUrl(trimmedImage)) {
      normalizedImages.push(trimmedImage);
    }
  }

  return normalizedImages;
}

function sanitizeProductPayload(payload: Record<string, unknown>, sellerId: string) {
  const price = normalizePrice(payload.price);
  const discountPrice =
    payload.discountPrice === undefined || payload.discountPrice === null || payload.discountPrice === ''
      ? undefined
      : normalizePrice(payload.discountPrice);
  const fullDescription = String(payload.fullDescription || '').trim();
  const shortDescription = String(
    payload.shortDescription || fullDescription
  ).trim();
  const featured = Boolean(payload.featured);
  const productType = normalizeProductType(payload.productType, featured, discountPrice, price);

  return {
    name: String(payload.name || '').trim(),
    slug: String(payload.slug || '').trim(),
    sku: String(payload.sku || '').trim(),
    brand: String(payload.brand || '').trim(),
    category: (payload.category === 'Accessories' ? 'Accessories' : 'Laptops') as
      | 'Laptops'
      | 'Accessories',
    subcategory:
      typeof payload.subcategory === 'string' ? payload.subcategory.trim() : undefined,
    price,
    discountPrice,
    shippingFee: normalizePrice(payload.shippingFee),
    stock: normalizeStock(payload.stock),
    shortDescription,
    fullDescription,
    specifications: normalizeSpecifications(payload.specifications),
    featured: productType === 'featured',
    productType,
    rating: normalizePrice(payload.rating),
    reviewsCount: normalizeStock(payload.reviewsCount),
    seller: reqSellerIdPlaceholder(sellerId),
  };
}

function reqSellerIdPlaceholder(sellerId: string) {
  return new mongoose.Types.ObjectId(sellerId);
}

export const listSellerProducts = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const filter: Record<string, unknown> = {
      seller: req.seller._id,
    };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { brand: regex }];
    }

    if (category && category !== 'All Categories') {
      filter.category = category;
    }

    const totalItems = await Product.countDocuments(filter);
    const pagination = buildPagination(totalItems, page, limit);
    const skip = (pagination.page - 1) * pagination.limit;

    const items = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit);

    const summaryFilter = { seller: req.seller._id };

    const [totalProducts, inStock, lowStock, outOfStock] = await Promise.all([
      Product.countDocuments(summaryFilter),
      Product.countDocuments({ ...summaryFilter, stock: { $gt: 0 } }),
      Product.countDocuments({ ...summaryFilter, stock: { $gt: 0, $lt: 10 } }),
      Product.countDocuments({ ...summaryFilter, stock: { $lte: 0 } }),
    ]);

    res.json({
      items,
      summary: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
      },
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadSellerProductImage = async (
  req: SellerAuthRequest,
  res: Response
) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const { image } = req.body;

    if (!isDataImage(image)) {
      res.status(400).json({ message: 'Invalid image upload' });
      return;
    }

    const uploadedImage = await saveDataImage(
      image,
      ['products', req.seller._id.toString()],
      'product'
    );

    res.status(201).json({ url: uploadedImage.url });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSellerProduct = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const sanitizedPayload = sanitizeProductPayload(req.body || {}, req.seller._id.toString());
    const images = await normalizeImages(req.body?.images, req.seller._id.toString());

    if (
      !sanitizedPayload.name ||
      !sanitizedPayload.slug ||
      !sanitizedPayload.sku ||
      !sanitizedPayload.brand ||
      !sanitizedPayload.fullDescription
    ) {
      res.status(400).json({ message: 'Please provide complete product details' });
      return;
    }

    const product = new Product({
      ...sanitizedPayload,
      images,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSellerProduct = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const product = await Product.findOne({
      ...buildProductIdFilter(String(req.params.id || '')),
      seller: req.seller._id,
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const sanitizedPayload = sanitizeProductPayload(req.body || {}, req.seller._id.toString());
    const images = await normalizeImages(
      req.body?.images === undefined ? product.images : req.body?.images,
      req.seller._id.toString()
    );

    product.name = sanitizedPayload.name || product.name;
    product.slug = sanitizedPayload.slug || product.slug;
    product.sku = sanitizedPayload.sku || product.sku;
    product.brand = sanitizedPayload.brand || product.brand;
    product.category = sanitizedPayload.category;
    product.subcategory = sanitizedPayload.subcategory;
    product.price = sanitizedPayload.price;
    product.discountPrice = sanitizedPayload.discountPrice;
    product.shippingFee = sanitizedPayload.shippingFee;
    product.stock = sanitizedPayload.stock;
    product.shortDescription = sanitizedPayload.shortDescription || product.shortDescription;
    product.fullDescription = sanitizedPayload.fullDescription || product.fullDescription;
    product.specifications = sanitizedPayload.specifications;
    product.featured = sanitizedPayload.featured;
    product.productType = sanitizedPayload.productType;
    product.rating = sanitizedPayload.rating;
    product.reviewsCount = sanitizedPayload.reviewsCount;
    product.images = images;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSellerProduct = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const product = await Product.findOne({
      ...buildProductIdFilter(String(req.params.id || '')),
      seller: req.seller._id,
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
