import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Redirect, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ContractOperation } from '../../../http/operations.js';
import { envelope, noStore } from '../../../http/response.js';
import { AuthService } from './auth-service.js';
import { authStartPipe, callbackPipe } from './contract.js';
import { loginCookie, loginLifetime, secureCookie, sessionCookie, sessionLifetime } from './session-tokens.js';

@Controller()
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Get('auth/csrf')
    @ContractOperation('getCsrfToken')
    async csrf(@Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { browser, token } = await this.auth.csrf(request.headers);
        response.setHeader('Set-Cookie', secureCookie(loginCookie, browser, loginLifetime));
        return envelope(response, { csrfToken: token });
    }

    @Post('auth/start')
    @HttpCode(200)
    @ContractOperation('beginLogin')
    async begin(@Body(authStartPipe) body: { returnTo: string }, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.auth.begin(request.headers, body.returnTo));
    }

    @Get('auth/callback')
    @Redirect()
    @ContractOperation('completeLogin')
    async callback(@Query(callbackPipe) query: { state: string }, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        if (request.method !== 'GET') throw new BadRequestException();
        const callback = new URL(request.url ?? '', 'https://callback.invalid');
        const { token, returnTo } = await this.auth.complete(request.headers, query.state, callback.search, String(response.getHeader('X-Request-Id')));
        response.setHeader('Set-Cookie', [
            secureCookie(sessionCookie, token, sessionLifetime),
            secureCookie(loginCookie, '', 0),
        ]);
        return { url: returnTo, statusCode: 302 };
    }

    @Get('session')
    @ContractOperation('getSession')
    async session(@Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.auth.session(request.headers));
    }

    @Post('auth/logout')
    @HttpCode(204)
    @ContractOperation('logout')
    async logout(@Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse): Promise<void> {
        noStore(response);
        await this.auth.logout(request.headers);
        response.setHeader('Set-Cookie', [secureCookie(sessionCookie, '', 0), secureCookie(loginCookie, '', 0)]);
    }
}
