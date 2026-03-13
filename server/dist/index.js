"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const sellerAuth_routes_1 = __importDefault(require("./routes/sellerAuth.routes"));
const sellerMessage_routes_1 = __importDefault(require("./routes/sellerMessage.routes"));
const sellerProfile_routes_1 = __importDefault(require("./routes/sellerProfile.routes"));
const sellerProduct_routes_1 = __importDefault(require("./routes/sellerProduct.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/wishlist.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce';
// Connect to MongoDB
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => console.log('MongoDB successfully connected'))
    .catch((err) => console.log('MongoDB connection error:', err));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/seller/auth', sellerAuth_routes_1.default);
app.use('/api/seller/messages', sellerMessage_routes_1.default);
app.use('/api/seller/profile', sellerProfile_routes_1.default);
app.use('/api/seller/products', sellerProduct_routes_1.default);
app.use('/api/products', product_routes_1.default);
app.use('/api/cart', cart_routes_1.default);
app.use('/api/wishlist', wishlist_routes_1.default);
app.use('/api/orders', order_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// Error Middlewares
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
