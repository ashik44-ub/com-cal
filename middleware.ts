import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, parseSessionCookie } from '@/lib/auth';

const PUBLIC_PAGES = new Set(['/login', '/signup', '/forgot', '/reset']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the layout know the current path (used to avoid redirecting an
  // already-disabled session away from the auth pages themselves).
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);

  const session = await parseSessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublicPage = PUBLIC_PAGES.has(pathname);
  const isAuthApi = pathname.startsWith('/api/auth/');

  if (!session) {
    if (isPublicPage || isAuthApi) return NextResponse.next({ request: { headers } });
    // API routes get a 401 instead of a redirect so fetch() callers can tell.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only areas: the role comes from the signed token here; the API
  // routes re-check the fresh role from the database on every call.
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (pathname.startsWith('/api/admin/') && session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Protect every page and every /api/* route except the auth pages and
  // the auth API routes. Static assets and the favicon are public.
  matcher: [
    '/((?!login|signup|forgot|reset|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
