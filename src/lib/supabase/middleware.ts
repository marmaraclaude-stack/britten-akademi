import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Oturumu tazeler ve rota korumasını uygular.
 * Rol bilgisi JWT user_metadata'dan okunur (hesaplar yalnızca bizim
 * kontrolümüzdeki admin API ile açıldığı için güvenilirdir); sayfa
 * layout'ları ayrıca profiles tablosundan doğrular.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() token'ı Supabase Auth sunucusunda doğrular — getSession kullanma.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === '/giris';
  const wantsTeacher = path === '/ogretmen' || path.startsWith('/ogretmen/');
  const wantsStudent = path === '/ogrenci' || path.startsWith('/ogrenci/');

  const role = (user?.user_metadata?.role as string | undefined) ?? 'student';
  const home = role === 'teacher' ? '/ogretmen' : '/ogrenci';

  if (!user && (wantsTeacher || wantsStudent)) {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && wantsTeacher && role !== 'teacher') {
    const url = request.nextUrl.clone();
    url.pathname = '/ogrenci';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && wantsStudent && role === 'teacher') {
    const url = request.nextUrl.clone();
    url.pathname = '/ogretmen';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
