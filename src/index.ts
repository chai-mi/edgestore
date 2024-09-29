const storecolo = 'sg.jiangzhexin.xyz'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const TargetColo = request.headers.get('Store-Colo')
		if (!TargetColo) {
			return fetch(request, {
				headers: { 'Store-Colo': storecolo },
				cf: { resolveOverride: storecolo },
			})
		}
		return cachestore(request, ctx)
	}
}

async function cachestore(request: Request, ctx: ExecutionContext): Promise<Response> {
	const cacheRquest = new Request(request.url)
	switch (request.method) {
		case 'PUT':
			const cacheResponse = new Response(await request.bytes(), { headers: { 'Cache-Control': 's-maxage=604800' } })
			ctx.waitUntil(caches.default.put(cacheRquest, cacheResponse))
			return new Response(JSON.stringify({
				url: request.url,
				ttl: 604800
			}))
		case 'DELETE':
			const deleted = await caches.default.delete(cacheRquest)
			return new Response(JSON.stringify({
				url: request.url,
				deleteStatus: deleted
			}), { status: deleted ? 200 : 500 })
		case 'GET':
			return await caches.default.match(cacheRquest) || new Response('Resource does not exist or has expired', { status: 404 })
		default:
			return new Response(null, { status: 400 })
	}
}