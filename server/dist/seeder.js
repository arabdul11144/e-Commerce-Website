"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("./models/User"));
const Product_1 = __importDefault(require("./models/Product"));
const Order_1 = __importDefault(require("./models/Order"));
const Cart_1 = __importDefault(require("./models/Cart"));
const Wishlist_1 = __importDefault(require("./models/Wishlist"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
const extractMockData = () => {
    // Simple extraction of the mockProducts array from the mock.ts file (simplistic eval)
    const mockFilePath = path_1.default.join(__dirname, '../../client/src/data/mock.ts');
    const mockFileContent = fs_1.default.readFileSync(mockFilePath, 'utf-8');
    // A robust way would be to import if configured, or parse string. For simplicity:
    const arrayStart = mockFileContent.indexOf('const mockProducts: Product[] = [');
    const arrayEnd = mockFileContent.indexOf('export const mockBrands: Brand[] = [');
    const arrayString = mockFileContent.slice(arrayStart, arrayEnd)
        .replace('const mockProducts: Product[] = ', '')
        .trim()
        .slice(0, -1); // remove trailing semicolon
    // Remove comment lines and wrap unquoted keys to make it valid JSON just for seeding, or we can just evaluate it
    // Given we are running via ts-node, we can just import it directly!
    return require('../../client/src/data/mock.ts').mockProducts;
};
const importData = async () => {
    try {
        await connectDB();
        await Order_1.default.deleteMany();
        await Cart_1.default.deleteMany();
        await Wishlist_1.default.deleteMany();
        await Product_1.default.deleteMany();
        await User_1.default.deleteMany();
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash('admin123', salt);
        const createdUsers = await User_1.default.create([
            {
                firstName: 'Admin',
                lastName: 'User',
                name: 'Admin User',
                email: 'admin@example.com',
                phone: '+94770000001',
                password: hashedPassword,
                role: 'admin',
            },
            {
                firstName: 'John',
                lastName: 'Doe',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+94770000002',
                password: await bcryptjs_1.default.hash('user123', salt),
                role: 'user',
            }
        ]);
        const adminUser = createdUsers[0]._id;
        // We can simply import mock products if TS configured properly:
        // This script assumes we run it via ts-node which can parse the TS module.
        const { mockProducts } = require('../../client/src/data/mock');
        const sampleProducts = mockProducts.map((p) => {
            // Keep everything, map id to frontend id, but mongodb uses _id.
            // We stored id as unique string in Product schema.
            return { ...p };
        });
        await Product_1.default.insertMany(sampleProducts);
        console.log('Data Imported!');
        process.exit();
    }
    catch (error) {
        console.error(`Error during import: ${error}`);
        process.exit(1);
    }
};
const destroyData = async () => {
    try {
        await connectDB();
        await Order_1.default.deleteMany();
        await Cart_1.default.deleteMany();
        await Wishlist_1.default.deleteMany();
        await Product_1.default.deleteMany();
        await User_1.default.deleteMany();
        console.log('Data Destroyed!');
        process.exit();
    }
    catch (error) {
        console.error(`Error during destruction: ${error}`);
        process.exit(1);
    }
};
if (process.argv[2] === '-d') {
    destroyData();
}
else {
    importData();
}
