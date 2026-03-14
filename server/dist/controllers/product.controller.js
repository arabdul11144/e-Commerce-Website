"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getProductBySlug = exports.getProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const CUSTOMER_VISIBLE_STOCK_FILTER = { $gt: 0 };
const getProducts = async (req, res) => {
    try {
        const { q, category, brand, minPrice, maxPrice, sort, featured } = req.query;
        const filter = {
            stock: CUSTOMER_VISIBLE_STOCK_FILTER,
        };
        if (q && typeof q === 'string') {
            const regex = new RegExp(q, 'i');
            filter.$or = [{ name: regex }, { brand: regex }, { category: regex }];
        }
        if (category && typeof category === 'string') {
            filter.category = new RegExp(`^${category}$`, 'i');
        }
        if (brand && typeof brand === 'string') {
            const brands = brand.split(',').map((b) => b.trim());
            filter.brand = { $in: brands };
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = Number(minPrice);
            if (maxPrice)
                filter.price.$lte = Number(maxPrice);
        }
        if (featured === 'true') {
            filter.featured = true;
        }
        let sortOption = { featured: -1, createdAt: -1 };
        if (sort && typeof sort === 'string') {
            switch (sort) {
                case 'price_asc':
                    sortOption = { price: 1 };
                    break;
                case 'price_desc':
                    sortOption = { price: -1 };
                    break;
                case 'newest':
                    sortOption = { createdAt: -1 };
                    break;
                case 'rating':
                    sortOption = { rating: -1 };
                    break;
                default:
                    sortOption = { featured: -1, createdAt: -1 };
            }
        }
        const products = await Product_1.default.find(filter).sort(sortOption);
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProducts = getProducts;
const getProductBySlug = async (req, res) => {
    try {
        const product = await Product_1.default.findOne({
            slug: req.params.slug,
            stock: CUSTOMER_VISIBLE_STOCK_FILTER,
        });
        if (product) {
            res.json(product);
        }
        else {
            res.status(404).json({ message: 'Product not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProductBySlug = getProductBySlug;
const getProductById = async (req, res) => {
    try {
        const product = await Product_1.default.findOne({
            _id: req.params.id,
            stock: CUSTOMER_VISIBLE_STOCK_FILTER,
        });
        if (product) {
            res.json(product);
        }
        else {
            res.status(404).json({ message: 'Product not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProductById = getProductById;
