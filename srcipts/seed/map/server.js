"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapServer = mapServer;
var _schema_1 = require("@schema");
var drizzle_orm_1 = require("drizzle-orm");
function mapServer(port, db) {
    // @ts-ignore
    Bun.serve({
        port: port,
        // @ts-ignore
        fetch: function (request) {
            return __awaiter(this, void 0, void 0, function () {
                var url, lastProcessedId, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            url = new URL(request.url);
                            if (url.pathname === '/') {
                                // @ts-ignore
                                return [2 /*return*/, new Response(Bun.file('./scripts/seed/map/index.html'))];
                            }
                            if (url.pathname === '/map-client.js') {
                                // @ts-ignore
                                return [2 /*return*/, new Response(Bun.file('./scripts/seed/map/map-client.js'))];
                            }
                            if (url.pathname === '/scripts/seed/map/world.geo.json') {
                                // @ts-ignore
                                return [2 /*return*/, new Response(Bun.file('./scripts/seed/map/world.geo.json'))];
                            }
                            if (!(url.pathname === '/map-data')) return [3 /*break*/, 2];
                            lastProcessedId = parseInt(url.searchParams.get('lastProcessedId') || '0');
                            return [4 /*yield*/, db
                                    .select({
                                    location: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["json_build_object('x', ST_X(coalesce(", ", ", ")), 'y', ST_Y(coalesce(", ", ", ")))"], ["json_build_object('x', ST_X(coalesce(", ", ", ")), 'y', ST_Y(coalesce(", ", ", ")))"])), _schema_1.area.location, _schema_1.climb.location, _schema_1.area.location, _schema_1.climb.location),
                                    id: _schema_1.entity.id,
                                })
                                    .from(_schema_1.entity)
                                    .leftJoin(_schema_1.area, (0, drizzle_orm_1.eq)(_schema_1.entity.id, _schema_1.area.id))
                                    .leftJoin(_schema_1.climb, (0, drizzle_orm_1.eq)(_schema_1.entity.id, _schema_1.climb.id))
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gt)(_schema_1.entity.id, lastProcessedId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(_schema_1.entity.entityType, 'area'), (0, drizzle_orm_1.eq)(_schema_1.entity.entityType, 'climb'))))];
                        case 1:
                            data = _a.sent();
                            return [2 /*return*/, new Response(JSON.stringify(data), {
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                })];
                        case 2: return [2 /*return*/, new Response('Not Found', { status: 404 })];
                    }
                });
            });
        },
    });
    console.log("Map visualizer running at http://localhost:".concat(port, ".")
        + " Open this URL in your browser manually to see the map.");
}
var templateObject_1;
