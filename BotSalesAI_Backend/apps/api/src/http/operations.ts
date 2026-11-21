import { RequestMethod, SetMetadata, type INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';

export const API_PREFIX = '/api/v2';
const OPERATION_ID = Symbol('contractOperation');
export const ContractOperation = (id: string): MethodDecorator => SetMetadata(OPERATION_ID, id);

export interface RegisteredRoute {
    method: string;
    path: string;
    operationId?: string;
    handler: string;
}

function paths(value: string | string[] | undefined): string[] {
    const values = Array.isArray(value) ? value : [value ?? ''];
    return values.map(value => value.replace(/^\/+|\/+$/g, ''));
}

export function registeredRoutes(app: INestApplication): RegisteredRoute[] {
    const scanner = new MetadataScanner();
    const routes: RegisteredRoute[] = [];
    for (const { metatype } of app.get(DiscoveryService).getControllers()) {
        if (!metatype) continue;
        const prototype = metatype.prototype;
        const controllerPaths = paths(Reflect.getMetadata(PATH_METADATA, metatype));
        for (const name of scanner.getAllMethodNames(prototype)) {
            const handler = prototype[name];
            const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
            if (method === undefined) continue;
            const operationId = Reflect.getMetadata(OPERATION_ID, handler) as string | undefined;
            for (const controllerPath of controllerPaths) {
                for (const routePath of paths(Reflect.getMetadata(PATH_METADATA, handler))) {
                    const path = '/' + [controllerPath, routePath].filter(Boolean).join('/')
                        .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
                    routes.push({ method: RequestMethod[method], path, operationId, handler: metatype.name + '.' + name });
                }
            }
        }
    }
    return routes;
}
