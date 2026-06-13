"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toOptionalStringArray = exports.toOptionalNumber = exports.toOptionalBooleanStrict = exports.toOptionalBoolean = exports.trimOptionalString = exports.toUppercaseString = exports.normalizeEmail = exports.trimString = void 0;
const TRUE_VALUES = new Set(['true', '1', 'yes']);
const FALSE_VALUES = new Set(['false', '0', 'no']);
const trimString = ({ value }) => typeof value === 'string' ? value.trim() : value;
exports.trimString = trimString;
const normalizeEmail = ({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
exports.normalizeEmail = normalizeEmail;
const toUppercaseString = ({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value;
exports.toUppercaseString = toUppercaseString;
const trimOptionalString = (params) => {
    const trimmedValue = (0, exports.trimString)(params);
    return trimmedValue === '' ? undefined : trimmedValue;
};
exports.trimOptionalString = trimOptionalString;
const toOptionalBoolean = ({ value }) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();
        if (TRUE_VALUES.has(normalizedValue)) {
            return true;
        }
        if (FALSE_VALUES.has(normalizedValue)) {
            return false;
        }
    }
    return value;
};
exports.toOptionalBoolean = toOptionalBoolean;
const toOptionalBooleanStrict = ({ value, }) => {
    if (value === undefined || value === '') {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return (0, exports.toOptionalBoolean)({ value });
};
exports.toOptionalBooleanStrict = toOptionalBooleanStrict;
const toOptionalNumber = ({ value }) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return Number(value);
};
exports.toOptionalNumber = toOptionalNumber;
const toOptionalStringArray = ({ value, }) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const values = normalizeStringArrayValue(value);
    return values.length === 0 ? undefined : values;
};
exports.toOptionalStringArray = toOptionalStringArray;
function normalizeStringArrayValue(value) {
    if (Array.isArray(value)) {
        return value.flatMap((item) => normalizeStringArrayValue(item));
    }
    if (typeof value !== 'string') {
        return [];
    }
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
        return [];
    }
    if (trimmedValue.startsWith('[')) {
        try {
            const parsedValue = JSON.parse(trimmedValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue
                    .filter((item) => typeof item === 'string')
                    .map((item) => item.trim())
                    .filter(Boolean);
            }
        }
        catch {
            return [trimmedValue];
        }
    }
    if (trimmedValue.includes(',')) {
        return trimmedValue
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [trimmedValue];
}
//# sourceMappingURL=dto-transformers.js.map