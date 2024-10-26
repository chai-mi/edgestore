export default async function cachestore(request: Request, ctx: ExecutionContext): Promise<Response> {
    const cacheRquest = new Request(request.url)
    switch (request.method) {
        case 'PUT':
            const cacheResponse = new Response(await request.bytes(), { headers: { 'Cache-Control': 's-maxage=86400' } })
            ctx.waitUntil(caches.default.put(cacheRquest, cacheResponse))
            return new Response(JSON.stringify({
                url: request.url,
                ttl: performance.now() + 86400 * 1000
            }))
        case 'DELETE':
            const deleted = await caches.default.delete(cacheRquest)
            return new Response(JSON.stringify({
                url: request.url
            }), { status: deleted ? 200 : 500 })
        case 'GET':
            const response = await caches.default.match(cacheRquest)
            if (!response) {
                return new Response('Resource does not exist or has expired', { status: 404 })
            } else {
                return new Response(response.body, { headers: { 'Content-Type': 'application/octet-stream' } })
            }
        default:
            return new Response(null, { status: 400 })
    }
}