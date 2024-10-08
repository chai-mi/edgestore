import cachestore from "./utils"

const storecolo = 'storecolo.edgestore.link'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const TargetColo = request.headers.get('Store-Colo')
		if (TargetColo) {
			return cachestore(request, ctx)
		}
		return fetch(request, {
			headers: { 'Store-Colo': storecolo },
			cf: { resolveOverride: storecolo },
		})
	}
}