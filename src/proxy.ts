import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Check for Authorization header (our API uses Bearer tokens)
  const authHeader = request.headers.get('authorization');
  const hasToken = authHeader && authHeader.startsWith('Bearer ');

  // Also check for token in cookies as fallback
  const cookieToken = request.cookies.get('auth_token')?.value;

  const isAuthenticated = hasToken || cookieToken;

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password') ||
    request.nextUrl.pathname.startsWith('/verify-otp');

  const isPublicPage = request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/');

  // Always allow access to auth pages - let client-side handle validation
  // This prevents issues with stale cookies blocking access to login
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Always allow access to public pages
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    // Auth routes
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/:path*',
    '/verify-otp/:path*',
    // API routes (for potential client-side auth checks)
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ],
}; 