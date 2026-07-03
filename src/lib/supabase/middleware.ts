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

  // getUser() token'ı Supabase Auth sunucusunda doğrular; getSession kullanma.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === '/giris';
  const wantsTeacher = path === '/ogretmen' || path.startsWith('/ogretmen/');
  const wantsStudent = path === '/ogrenci' || path.startsWith('/ogrenci/');

  const role = (user?.user_metadata?.role as string | undefined) ?? 'student';
  const home = role === 'teacher' ? '/ogretmen' : '/ogrenci';

  // Yönlendirme yanıtları, tazelenen oturum çerezlerini de taşımalı;
  // aksi hâlde döndürülen token kaybolur ve kullanıcı düşebilir.
  const redirectWithCookies = (url: URL) => {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => res.cookies.set(cookie));
    return res;
  };

  if (!user && (wantsTeacher || wantsStudent)) {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    url.search = '';
    url.searchParams.set('next', path);
    return redirectWithCookies(url);
  }

  if (user && isAuthPage) {
    // Derin bağlantıyı koru: ?next= geçerli ve role uygunsa oraya dön
    const next = request.nextUrl.searchParams.get('next');
    const validNext =
      next &&
      next.startsWith('/') &&
      !next.startsWith('//') &&
      next.startsWith(home);
    const url = request.nextUrl.clone();
    url.pathname = validNext ? next : home;
    url.search = '';
    return redirectWithCookies(url);
  }

  if (user && wantsTeacher && role !== 'teacher') {
    const url = request.nextUrl.clone();
    url.pathname = '/ogrenci';
    url.search = '';
    return redirectWithCookies(url);
  }

  if (user && wantsStudent && role === 'teacher') {
    const url = request.nextUrl.clone();
    url.pathname = '/ogretmen';
    url.search = '';
    return redirectWithCookies(url);
  }

  return supabaseResponse;
}
