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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernoratesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const governorate_response_dto_1 = require("./dto/governorate-response.dto");
const locations_query_dto_1 = require("./dto/locations-query.dto");
const locations_service_1 = require("./locations.service");
let GovernoratesController = class GovernoratesController {
    locationsService;
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    findAll(query) {
        return this.locationsService.findGovernorates(query);
    }
};
exports.GovernoratesController = GovernoratesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List active governorates available for shipping.',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Governorates returned successfully.',
        type: governorate_response_dto_1.GovernorateListApiResponseDto,
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [locations_query_dto_1.LocationsQueryDto]),
    __metadata("design:returntype", void 0)
], GovernoratesController.prototype, "findAll", null);
exports.GovernoratesController = GovernoratesController = __decorate([
    (0, swagger_1.ApiTags)('Governorates'),
    (0, common_1.Controller)('governorates'),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], GovernoratesController);
//# sourceMappingURL=governorates.controller.js.map