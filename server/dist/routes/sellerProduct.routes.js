"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sellerProduct_controller_1 = require("../controllers/sellerProduct.controller");
const sellerAuth_middleware_1 = require("../middlewares/sellerAuth.middleware");
const router = express_1.default.Router();
router.get('/', sellerAuth_middleware_1.sellerProtect, sellerProduct_controller_1.listSellerProducts);
router.post('/', sellerAuth_middleware_1.sellerProtect, sellerProduct_controller_1.createSellerProduct);
router.post('/upload-image', sellerAuth_middleware_1.sellerProtect, sellerProduct_controller_1.uploadSellerProductImage);
router.put('/:id', sellerAuth_middleware_1.sellerProtect, sellerProduct_controller_1.updateSellerProduct);
router.delete('/:id', sellerAuth_middleware_1.sellerProtect, sellerProduct_controller_1.deleteSellerProduct);
exports.default = router;
