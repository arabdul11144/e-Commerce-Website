"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDataImage = isDataImage;
exports.isStoredImagePath = isStoredImagePath;
exports.isRemoteImageUrl = isRemoteImageUrl;
exports.saveDataImage = saveDataImage;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MIME_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
function isDataImage(value) {
    return typeof value === 'string' && value.startsWith('data:image/');
}
function isStoredImagePath(value) {
    return typeof value === 'string' && value.startsWith('/uploads/');
}
function isRemoteImageUrl(value) {
    return (typeof value === 'string' &&
        (value.startsWith('http://') || value.startsWith('https://')));
}
async function saveDataImage(dataImage, folderSegments, filePrefix) {
    const matches = dataImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid image format');
    }
    const mimeType = matches[1].toLowerCase();
    const extension = MIME_TO_EXTENSION[mimeType];
    if (!extension) {
        throw new Error('Unsupported image type');
    }
    const buffer = Buffer.from(matches[2], 'base64');
    if (!buffer.length) {
        throw new Error('Invalid image data');
    }
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('Image size must be 5MB or less');
    }
    const uploadsRoot = path_1.default.join(process.cwd(), 'uploads');
    const targetDirectory = path_1.default.join(uploadsRoot, ...folderSegments);
    await fs_1.promises.mkdir(targetDirectory, { recursive: true });
    const fileName = `${filePrefix}-${(0, crypto_1.randomUUID)()}.${extension}`;
    const filePath = path_1.default.join(targetDirectory, fileName);
    await fs_1.promises.writeFile(filePath, buffer);
    return {
        url: ['/uploads', ...folderSegments, fileName].join('/').replace(/\\/g, '/'),
        size: buffer.length,
        mimeType,
    };
}
