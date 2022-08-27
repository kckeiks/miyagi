/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {IHTTPMethods, Router} from 'itty-router'
import {InteractionResponseType, InteractionType, verifyKey} from 'discord-interactions'
import lookup from './webster'
import {Definition} from "./dictionary";
import fetch from 'node-fetch';

const router = Router<Request, IHTTPMethods>()

export type Command = {
    name: string,
    description: string,
    value: string
}

type DiscordRequest = {
    type: InteractionType,
    data: {
        options: [Command]
    }
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

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    WORDS: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;
    WORDS_WEBHOOK_URL: string;
    DISCORD_PUBLIC_KEY: string;
    WEBSTER_API_KEY: string;
}

router.post('/', async (request: Request, env: Env) => {
    const message: DiscordRequest = await request.json();

    if (message.type === InteractionType.PING) {
        return new JsonResponse({
            type: InteractionResponseType.PONG,
        });
    }

    if (message.type === InteractionType.APPLICATION_COMMAND) {
        const word: string = message.data.options[0].value;
        // Store word.
        await env.WORDS.put(word, Date.now().toString());
        // Return definition.
        try {
            var def: Definition = await lookup(word, env.WEBSTER_API_KEY);
        } catch (e) {
            console.log("Webster lookup failed")
            return new Response('Failed to get the definition.', {status: 500});
        }

        return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `${word}: ${def[0].shortdef}.\nNow you must remember the word!`
            }
        });
    }

    return new Response('Bad Request.', {status: 400});
})

router.all('*', () => new Response('Not Found.', {status: 404}));

async function sendChallenge(env: Env): Promise<void> {
    const words = await env.WORDS.list();

    if (words.keys.length == 0) {
        console.log('No words found.');
        return;
    }

    const word = words.keys[Math.floor(Math.random() * words.keys.length)];
    const res: Response = await fetch(
        env.WORDS_WEBHOOK_URL,
        {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: `{"content": "Define ${word.name}."}`,
        });

    if (!res.ok) {
        console.log(res.statusText);
    }
}

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

    async scheduled(event: Event, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(sendChallenge(env));
    },
};
