"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sellerProfile_controller_1 = require("../controllers/sellerProfile.controller");
const sellerAuth_middleware_1 = require("../middlewares/sellerAuth.middleware");
const router = express_1.default.Router();
router.get('/', sellerAuth_middleware_1.sellerProtect, sellerProfile_controller_1.getSellerProfile);
router.put('/', sellerAuth_middleware_1.sellerProtect, sellerProfile_controller_1.updateSellerProfile);
router.put('/image', sellerAuth_middleware_1.sellerProtect, sellerProfile_controller_1.updateSellerProfileImage);
router.put('/password', sellerAuth_middleware_1.sellerProtect, sellerProfile_controller_1.changeSellerPassword);
exports.default = router;
