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
exports.CreateBookFormatDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const dto_transformers_1 = require("./dto-transformers");
class CreateBookFormatDto {
    formatType;
    sku;
    stock;
    weight;
    priceEGP;
    discountPriceEGP;
    priceUSD;
    discountPriceUSD;
    audioDuration;
}
exports.CreateBookFormatDto = CreateBookFormatDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.BookFormatType,
        example: client_1.BookFormatType.Physical,
        description: 'Use Physical, Digital, or Audio.',
    }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toBookFormatType),
    (0, class_validator_1.IsEnum)(client_1.BookFormatType),
    __metadata("design:type", String)
], CreateBookFormatDto.prototype, "formatType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'BOOK-001-PHYSICAL',
        description: 'Allowed only for Physical formats.',
    }),
    (0, class_transformer_1.Transform)(dto_transformers_1.trimString),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBookFormatDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 25,
        description: 'Required for Physical formats. Not allowed for Digital/Audio.',
    }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "stock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 0.4,
        description: 'Allowed only for Physical formats.',
    }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 450 }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "priceEGP", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 350 }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "discountPriceEGP", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 20 }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "priceUSD", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 15 }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "discountPriceUSD", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 180,
        description: 'Required for Audio formats. Not allowed for Physical/Digital.',
    }),
    (0, class_transformer_1.Transform)(dto_transformers_1.toOptionalNumber),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateBookFormatDto.prototype, "audioDuration", void 0);
//# sourceMappingURL=create-book-format.dto.js.map