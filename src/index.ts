const storecolo = 'storecolo.edgestore.link'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const TargetColo = request.headers.get('Store-Colo')
		if (TargetColo) {
			return cachestore(request, ctx)
		}
		return cacheResponse(request, env, ctx, async (request, env, ctx) => {
			if (['PUT', 'DELETE'].includes(request.method))
				ctx.waitUntil(cachestore(request.clone(), ctx))
			return fetch(request, {
				headers: { 'Store-Colo': storecolo },
				cf: { resolveOverride: storecolo },
			})
		})
	}
}

async function cacheResponse(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	getResponse: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>
) {
	if (request.method === 'GET') {
		const cacheRquest = new Request(request.url)
		const response = await caches.default.match(cacheRquest)
		if (response && response.status === 200) {
			return response
		} else {
			const response = await getResponse(request, env, ctx)
			ctx.waitUntil(caches.default.put(request, response.clone()))
			return response
		}
	} else {
		return getResponse(request, env, ctx)
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