"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSellerProduct = exports.updateSellerProduct = exports.createSellerProduct = exports.uploadSellerProductImage = exports.listSellerProducts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const imageUpload_1 = require("../utils/imageUpload");
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;
function parsePositiveInteger(value, fallback) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return fallback;
    }
    return Math.trunc(parsedValue);
}
function buildPagination(totalItems, page, limit) {
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
function normalizePrice(value, fallback = 0) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return fallback;
    }
    return Number(numericValue);
}
function normalizeStock(value, fallback = 0) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return fallback;
    }
    return Math.trunc(numericValue);
}
function buildProductIdFilter(productId) {
    if (mongoose_1.default.Types.ObjectId.isValid(productId)) {
        return {
            $or: [{ _id: new mongoose_1.default.Types.ObjectId(productId) }, { id: productId }],
        };
    }
    return { id: productId };
}
function normalizeSpecifications(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return Object.entries(value).reduce((accumulator, [key, currentValue]) => {
        if (!key.trim()) {
            return accumulator;
        }
        accumulator[key] = String(currentValue ?? '').trim();
        return accumulator;
    }, {});
}
function normalizeProductType(value, featured, discountPrice, price) {
    if (value === 'featured' || value === 'sale' || value === 'normal') {
        return value;
    }
    if (featured) {
        return 'featured';
    }
    if (discountPrice !== undefined &&
        Number.isFinite(discountPrice) &&
        discountPrice >= 0 &&
        discountPrice < price) {
        return 'sale';
    }
    return 'normal';
}
async function normalizeImages(images, sellerId) {
    if (!Array.isArray(images)) {
        return [];
    }
    const normalizedImages = [];
    for (const [index, image] of images.entries()) {
        if (typeof image !== 'string') {
            continue;
        }
        const trimmedImage = image.trim();
        if (!trimmedImage) {
            continue;
        }
        if ((0, imageUpload_1.isDataImage)(trimmedImage)) {
            const uploadedImage = await (0, imageUpload_1.saveDataImage)(trimmedImage, ['products', sellerId], `product-${index + 1}`);
            normalizedImages.push(uploadedImage.url);
            continue;
        }
        if ((0, imageUpload_1.isStoredImagePath)(trimmedImage) || (0, imageUpload_1.isRemoteImageUrl)(trimmedImage)) {
            normalizedImages.push(trimmedImage);
        }
    }
    return normalizedImages;
}
function sanitizeProductPayload(payload, sellerId) {
    const price = normalizePrice(payload.price);
    const discountPrice = payload.discountPrice === undefined || payload.discountPrice === null || payload.discountPrice === ''
        ? undefined
        : normalizePrice(payload.discountPrice);
    const featured = Boolean(payload.featured);
    const productType = normalizeProductType(payload.productType, featured, discountPrice, price);
    return {
        name: String(payload.name || '').trim(),
        slug: String(payload.slug || '').trim(),
        sku: String(payload.sku || '').trim(),
        brand: String(payload.brand || '').trim(),
        category: (payload.category === 'Accessories' ? 'Accessories' : 'Laptops'),
        subcategory: typeof payload.subcategory === 'string' ? payload.subcategory.trim() : undefined,
        price,
        discountPrice,
        stock: normalizeStock(payload.stock),
        shortDescription: String(payload.shortDescription || '').trim(),
        fullDescription: String(payload.fullDescription || '').trim(),
        specifications: normalizeSpecifications(payload.specifications),
        featured: productType === 'featured',
        productType,
        rating: normalizePrice(payload.rating),
        reviewsCount: normalizeStock(payload.reviewsCount),
        seller: reqSellerIdPlaceholder(sellerId),
    };
}
function reqSellerIdPlaceholder(sellerId) {
    return new mongoose_1.default.Types.ObjectId(sellerId);
}
const listSellerProducts = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
        const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
        const filter = {
            seller: req.seller._id,
        };
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ name: regex }, { brand: regex }];
        }
        if (category && category !== 'All Categories') {
            filter.category = category;
        }
        const totalItems = await Product_1.default.countDocuments(filter);
        const pagination = buildPagination(totalItems, page, limit);
        const skip = (pagination.page - 1) * pagination.limit;
        const items = await Product_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pagination.limit);
        const summaryFilter = { seller: req.seller._id };
        const [totalProducts, inStock, lowStock, outOfStock] = await Promise.all([
            Product_1.default.countDocuments(summaryFilter),
            Product_1.default.countDocuments({ ...summaryFilter, stock: { $gt: 0 } }),
            Product_1.default.countDocuments({ ...summaryFilter, stock: { $gt: 0, $lt: 10 } }),
            Product_1.default.countDocuments({ ...summaryFilter, stock: { $lte: 0 } }),
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listSellerProducts = listSellerProducts;
const uploadSellerProductImage = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const { image } = req.body;
        if (!(0, imageUpload_1.isDataImage)(image)) {
            res.status(400).json({ message: 'Invalid image upload' });
            return;
        }
        const uploadedImage = await (0, imageUpload_1.saveDataImage)(image, ['products', req.seller._id.toString()], 'product');
        res.status(201).json({ url: uploadedImage.url });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadSellerProductImage = uploadSellerProductImage;
const createSellerProduct = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const sanitizedPayload = sanitizeProductPayload(req.body || {}, req.seller._id.toString());
        const images = await normalizeImages(req.body?.images, req.seller._id.toString());
        if (!sanitizedPayload.name ||
            !sanitizedPayload.slug ||
            !sanitizedPayload.sku ||
            !sanitizedPayload.brand ||
            !sanitizedPayload.shortDescription ||
            !sanitizedPayload.fullDescription) {
            res.status(400).json({ message: 'Please provide complete product details' });
            return;
        }
        const product = new Product_1.default({
            ...sanitizedPayload,
            images,
        });
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createSellerProduct = createSellerProduct;
const updateSellerProduct = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const product = await Product_1.default.findOne({
            ...buildProductIdFilter(String(req.params.id || '')),
            seller: req.seller._id,
        });
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        const sanitizedPayload = sanitizeProductPayload(req.body || {}, req.seller._id.toString());
        const images = await normalizeImages(req.body?.images === undefined ? product.images : req.body?.images, req.seller._id.toString());
        product.name = sanitizedPayload.name || product.name;
        product.slug = sanitizedPayload.slug || product.slug;
        product.sku = sanitizedPayload.sku || product.sku;
        product.brand = sanitizedPayload.brand || product.brand;
        product.category = sanitizedPayload.category;
        product.subcategory = sanitizedPayload.subcategory;
        product.price = sanitizedPayload.price;
        product.discountPrice = sanitizedPayload.discountPrice;
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateSellerProduct = updateSellerProduct;
const deleteSellerProduct = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const product = await Product_1.default.findOne({
            ...buildProductIdFilter(String(req.params.id || '')),
            seller: req.seller._id,
        });
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteSellerProduct = deleteSellerProduct;
