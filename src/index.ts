import {IHTTPMethods, Router} from 'itty-router'
import {InteractionResponseType, InteractionType, verifyKey} from 'discord-interactions'
import lookup from './webster'
import {Definition} from "./dictionary";

const router = Router<Request, IHTTPMethods>()

type Command = {
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

interface Env {
    WORDS: KVNamespace;
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
        const word: string = message.data.options[0].value.toLowerCase();
        // Store word.
        await env.WORDS.put(word, Date.now().toString());

        try {
            var defs: Definition[] = await lookup(word, env.WEBSTER_API_KEY);
        } catch (e) {
            console.log("Webster lookup failed")
            return new Response('Failed to get the definition.', {status: 500});
        }

        if (defs.length == 0) {
            console.log(`No definitions for ${word}`)
            return new JsonResponse({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `No definitions for ${word}`,
                }
            });
        }

        const title: string = `**${word}**`
        let body: string = '';

        defs.forEach((def) => {
            let shortdefs: string = '';
            def.shortdefs.forEach((defStr) => {
                shortdefs += `> - ${defStr}\n`;
            });

            body += `__${def.partOfSpeech}__\n\n${shortdefs}\n`;
        });

        return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `${title}\n\n${body}\n\nYou trust the quality of what you know, not quantity.`
            }
        });
    }

    console.log('Invalid message type.')
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
        console.log(`Failed to send challenge: ${res.statusText}`)
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
                console.log('Bad request signature.')
                return new Response('Bad request signature.', {status: 401});
            }
        }
        return router.handle(request, env);
    },

    async scheduled(event: Event, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(sendChallenge(env));
    },
};
