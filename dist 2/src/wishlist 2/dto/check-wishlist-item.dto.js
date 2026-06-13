"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckWishlistItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class CheckWishlistItemDto {
    itemType;
    itemId;
}
exports.CheckWishlistItemDto = CheckWishlistItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.WishlistItemType,
        enumName: 'WishlistItemType',
        example: client_1.WishlistItemType.BOOK,
    }),
    (0, class_validator_1.IsEnum)(client_1.WishlistItemType),
    __metadata("design:type", String)
], CheckWishlistItemDto.prototype, "itemType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CheckWishlistItemDto.prototype, "itemId", void 0);
//# sourceMappingURL=check-wishlist-item.dto.js.map