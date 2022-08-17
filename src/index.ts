/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import {Router, Route, IHTTPMethods} from 'itty-router'
import {
    verifyKey,
    InteractionType,
    InteractionResponseType
} from 'discord-interactions'

const router = Router<void, IHTTPMethods>()

class JsonResponse extends Response {
    constructor(body, init) {
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

router.post('/', async (request, _env) => {
    const message = await request.json();
    console.log(message);

    if (message.type === InteractionType.PING) {
        // The `PING` message is used during the initial webhook handshake, and is
        // required to configure the webhook in the developer portal.
        console.log('Handling Ping request');
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

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        if (request.method === 'POST') {
            // Using the incoming headers, verify this request actually came from discord.
            const signature = request.headers.get('x-signature-ed25519');
            const timestamp = request.headers.get('x-signature-timestamp');
            console.log(signature, timestamp, env.DISCORD_PUBLIC_KEY);
            const body = await request.clone().arrayBuffer();
            const isValidRequest = verifyKey(
                body,
                signature,
                timestamp,
                env.DISCORD_PUBLIC_KEY
            );
            if (!isValidRequest) {
                console.error('Invalid Request');
                return new Response('Bad request signature.', {status: 401});
            }
        }

        return router.handle(request, env);
    },
};
