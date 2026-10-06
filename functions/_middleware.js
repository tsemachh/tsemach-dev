// www.tsemach.dev → tsemach.dev (301, כולל נתיב ו-query string)
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.tsemach.dev') {
    url.hostname = 'tsemach.dev';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
