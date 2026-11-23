import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSessionUser } from "@/lib/users";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Commission Calculator",
  description: "Commission, collection and salary tracker for Area Sales Executive",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The login page must not show the sidebar or the app navigation.
  // cookies() is sync in Next 14 but returns a Promise in Next 15, so await
  // it — awaiting a non-Promise is harmless, so this works on both.
  const cookieStore = await cookies();
  // Load the fresh account (role and disabled flag come from the database,
  // never from the token). If the database is unreachable here, treat the
  // session as unknown — the page's own API calls will surface the 503.
  let sessionUser = null;
  try {
    sessionUser = await getSessionUser(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    sessionUser = null;
  }
  const authenticated = sessionUser !== null;

  // A disabled account must not stay inside the app: send it to the login
  // page (unless it is already on an auth page).
  if (!authenticated) {
    const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (cookieValue) {
      const pathname = (await headers()).get("x-pathname") ?? "";
      const onAuthPage = ["/login", "/signup", "/forgot", "/reset"].some((p) =>
        pathname.startsWith(p),
      );
      // Only redirect when we can tell this is a signed-but-disabled (or
      // deleted) session on a protected page. getSessionUser returns null
      // for an invalid signature too — but then the middleware has already
      // redirected, so reaching here with a cookie means disabled/deleted.
      if (!onAuthPage && pathname !== "") redirect("/login");
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#eef2f7] text-slate-800`}
      >
        {authenticated && sessionUser ? (
          <>
            <Sidebar isAdmin={sessionUser.role === "admin"} userName={sessionUser.name} />
            <main className="min-h-screen md:pl-64">
              <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
            </main>
          </>
        ) : (
          <main className="min-h-screen">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        )}
      </body>
    </html>
  );
}
