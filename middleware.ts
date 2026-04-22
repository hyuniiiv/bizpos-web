import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Fine-grained auth is enforced per route with getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const isStoreAdmin = request.nextUrl.pathname.startsWith('/store/admin')
  const isClientAdmin = request.nextUrl.pathname.startsWith('/client/admin')
  const isLogin = request.nextUrl.pathname.startsWith('/login')

  if ((isStoreAdmin || isClientAdmin) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (isLogin && user) {
    const portalUrl = request.nextUrl.clone()
    portalUrl.pathname = '/portal'
    return NextResponse.redirect(portalUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/store/admin/:path*', '/client/admin/:path*', '/login'],
}
