"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProductSchema = new mongoose_1.Schema({
    id: { type: String, unique: true, sparse: true },
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Seller' },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true },
    brand: { type: String, required: true },
    category: {
        type: String,
        enum: ['Laptops', 'Accessories'],
        required: true,
    },
    subcategory: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    stock: { type: Number, required: true, default: 0 },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    images: [{ type: String }],
    specifications: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            if (!ret.id || ret.id === ret._id?.toString()) {
                ret.id = ret._id?.toString();
            }
            if (ret.seller && typeof ret.seller?.toString === 'function') {
                ret.sellerId = ret.seller.toString();
            }
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
    },
});
exports.default = mongoose_1.default.model('Product', ProductSchema);
