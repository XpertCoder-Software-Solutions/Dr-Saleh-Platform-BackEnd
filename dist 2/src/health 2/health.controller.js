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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const prisma_service_1 = require("../database/prisma.service");
const DATABASE_HEALTH_TIMEOUT_MS = 5000;
let HealthController = class HealthController {
    healthCheckService;
    healthIndicatorService;
    memoryHealthIndicator;
    diskHealthIndicator;
    prismaService;
    constructor(healthCheckService, healthIndicatorService, memoryHealthIndicator, diskHealthIndicator, prismaService) {
        this.healthCheckService = healthCheckService;
        this.healthIndicatorService = healthIndicatorService;
        this.memoryHealthIndicator = memoryHealthIndicator;
        this.diskHealthIndicator = diskHealthIndicator;
        this.prismaService = prismaService;
    }
    check() {
        return this.healthCheckService.check([
            () => Promise.resolve({ app: { status: 'up' } }),
            () => this.checkDatabase(),
            () => this.memoryHealthIndicator.checkHeap('memory_heap', 300 * 1024 * 1024),
            () => this.diskHealthIndicator.checkStorage('storage', {
                path: '/',
                thresholdPercent: 0.9,
            }),
        ]);
    }
    async checkDatabase() {
        const check = this.healthIndicatorService.check('database');
        try {
            await this.withTimeout(this.prismaService.$queryRaw `SELECT 1`, DATABASE_HEALTH_TIMEOUT_MS);
            return check.up();
        }
        catch {
            return check.down(`Database did not respond within ${DATABASE_HEALTH_TIMEOUT_MS}ms`);
        }
    }
    async withTimeout(promise, timeoutMs) {
        let timeout;
        const timeoutPromise = new Promise((_resolve, reject) => {
            timeout = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        }
        finally {
            clearTimeout(timeout);
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        terminus_1.HealthIndicatorService,
        terminus_1.MemoryHealthIndicator,
        terminus_1.DiskHealthIndicator,
        prisma_service_1.PrismaService])
], HealthController);
//# sourceMappingURL=health.controller.js.map