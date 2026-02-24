import { NextRequest, NextResponse } from "next/server";

const SENSITIVE_PREFIXES = ["/admin", "/api/admin", "/auth/callback", "/login"];

const SUSPICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /nmap/i,
  /masscan/i,
  /python-requests/i,
  /curl\//i,
  /wget\//i,
  /go-http-client/i,
  /powershell/i,
  /httpclient/i,
];

function isSensitivePath(pathname: string) {
  return SENSITIVE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isSuspiciousUserAgent(userAgent: string) {
  return SUSPICIOUS_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function writeAccessLog(
  request: NextRequest,
  requestId: string,
  decision: "allow" | "blocked_bot"
) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const log = {
    ts: new Date().toISOString(),
    requestId,
    decision,
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search,
    ip: getClientIp(request),
    ua: userAgent.slice(0, 256),
    referer: request.headers.get("referer") ?? "",
  };
  console.info(JSON.stringify(log));
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") ?? "";

  if (isSensitivePath(pathname)) {
    const missingUa = userAgent.trim().length === 0;
    const suspiciousUa = isSuspiciousUserAgent(userAgent);

    if (missingUa || suspiciousUa) {
      writeAccessLog(request, requestId, "blocked_bot");

      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden" },
          {
            status: 403,
            headers: {
              "x-request-id": requestId,
            },
          }
        );
      }

      return new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-request-id": requestId,
        },
      });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  const verboseLogEnabled = process.env.ADMIN_VERBOSE_REQUEST_LOG === "1";
  if (verboseLogEnabled) {
    writeAccessLog(request, requestId, "allow");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
