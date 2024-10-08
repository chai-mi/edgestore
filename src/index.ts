import cachestore from "./utils"

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const TargetColo = request.headers.get('Store-Colo')
		if (TargetColo) {
			return cachestore(request, ctx)
		}
		return fetch(request, {
			headers: { 'Store-Colo': env.storecolo },
			cf: { resolveOverride: env.storecolo },
		})
	}
}