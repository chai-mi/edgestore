// Used for local development and testing, start command: npm run start
import cachestore from "./utils"

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        return cachestore(request, ctx)
    }
}