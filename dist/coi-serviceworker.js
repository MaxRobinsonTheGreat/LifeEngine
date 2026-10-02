/*
 * Makes the page "cross-origin isolated" so browsers allow SharedArrayBuffer,
 * which the multi-threaded simulation engine needs. Static hosts such as
 * GitHub Pages can't send the required headers, so this service worker adds
 * them to every response:
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: credentialless  (CDN scripts keep working)
 * Registered from index.html. If isolation still isn't possible (e.g. a
 * browser without credentialless support), the game runs single-threaded.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    let request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin')
        return;
    // credentialless pages must load cross-origin no-cors resources (CDN
    // scripts, fonts) without cookies, or the browser blocks the response
    if (request.mode === 'no-cors')
        request = new Request(request, {credentials: 'omit'});
    event.respondWith(
        fetch(request).then((response) => {
            if (response.status === 0)
                return response; // opaque cross-origin response: can't modify
            const headers = new Headers(response.headers);
            headers.set('Cross-Origin-Opener-Policy', 'same-origin');
            headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        })
    );
});
