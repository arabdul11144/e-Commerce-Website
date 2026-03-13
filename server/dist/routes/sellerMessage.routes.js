"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sellerMessage_controller_1 = require("../controllers/sellerMessage.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const sellerAuth_middleware_1 = require("../middlewares/sellerAuth.middleware");
const router = express_1.default.Router();
router.post('/', auth_middleware_1.protect, sellerMessage_controller_1.sendMessageToSeller);
router.get('/', sellerAuth_middleware_1.sellerProtect, sellerMessage_controller_1.getSellerMessages);
router.put('/:id/read', sellerAuth_middleware_1.sellerProtect, sellerMessage_controller_1.markSellerMessageRead);
exports.default = router;
