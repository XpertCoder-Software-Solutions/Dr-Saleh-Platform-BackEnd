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
exports.CouponActionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const dto_transformers_1 = require("./dto-transformers");
class CouponActionDto {
    code;
    orderId;
}
exports.CouponActionDto = CouponActionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'WELCOME10', maxLength: 50 }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toCouponCode),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    (0, class_validator_1.Matches)(/^[A-Z0-9_-]+$/),
    __metadata("design:type", String)
], CouponActionDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CouponActionDto.prototype, "orderId", void 0);
//# sourceMappingURL=coupon-action.dto.js.map