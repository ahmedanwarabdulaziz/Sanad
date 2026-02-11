import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './navigation';

const nextIntlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
    return nextIntlMiddleware(request);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
