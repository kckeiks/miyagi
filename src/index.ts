/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {Router, IHTTPMethods} from 'itty-router'
import {
    verifyKey,
    InteractionType,
    InteractionResponseType
} from 'discord-interactions'

const router = Router<Request, IHTTPMethods>()

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;
    DISCORD_PUBLIC_KEY: string;
}

type DiscordRequest = {
    type: InteractionType
}

type DiscordResponse = {
    type: InteractionResponseType
    data?: Object
}

class JsonResponse extends Response {
    constructor(body: DiscordResponse, init?: ResponseInit) {
        const jsonBody = JSON.stringify(body);
        init = init || {
            headers: {
                'content-type': 'application/json;charset=UTF-8',
            },
        };
        super(jsonBody, init);
    }
}

router.get('/', async (_request, _env) => {
    return new Response("Cheers!");
})

router.post('/', async (request: Request, _env) => {
    const message: DiscordRequest = await request.json();

    if (message.type === InteractionType.PING) {
        return new JsonResponse({
            type: InteractionResponseType.PONG,
        });
    }
    return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: "howdy"
        }
    });
})

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        if (request.method === 'POST') {
            const signature = request.headers.get('x-signature-ed25519') || '';
            const timestamp = request.headers.get('x-signature-timestamp') || '';
            const body = await request.clone().arrayBuffer();
            const isValidRequest = verifyKey(
                body,
                signature,
                timestamp,
                env.DISCORD_PUBLIC_KEY
            );
            if (!isValidRequest) {
                return new Response('Bad request signature.', {status: 401});
            }
        }
        return router.handle(request, env);
    },
};
