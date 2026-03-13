"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sellerAuth_controller_1 = require("../controllers/sellerAuth.controller");
const sellerAuth_middleware_1 = require("../middlewares/sellerAuth.middleware");
const router = express_1.default.Router();
router.post('/register', sellerAuth_controller_1.registerSeller);
router.post('/login', sellerAuth_controller_1.loginSeller);
router.get('/me', sellerAuth_middleware_1.sellerProtect, sellerAuth_controller_1.getSellerMe);
exports.default = router;
