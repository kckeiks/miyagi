import {STASH} from './commands.js';
import fetch from 'node-fetch';

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const testGuildId = process.env.DISCORD_TEST_GUILD_ID;
const commandId = process.env.COMMAND_ID;

if (!token) {
    throw new Error('The DISCORD_TOKEN environment variable is required.');
}

if (!applicationId) {
    throw new Error(
        'The DISCORD_APPLICATION_ID environment variable is required.'
    );
}

async function registerGuildCommands() {
    if (!testGuildId) {
        throw new Error(
            'The DISCORD_TEST_GUILD_ID environment variable is required.'
        );
    }
    const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${testGuildId}/commands`;
    const res = await sendCommand(url, 'PUT', JSON.stringify([STASH]));
    const json = await res.json();
    console.log(json);
    json.forEach(async (cmd) => {
        const response = await fetch(
            `https://discord.com/api/v10/applications/${applicationId}/guilds/${testGuildId}/commands/${cmd.id}`
        );
        if (!response.ok) {
            console.error(`Problem removing command ${cmd.id}`);
        }
    });
}

async function getGuildCommands() {
    const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${testGuildId}/commands`;
    const res = await sendCommand(url, 'GET');
    const json = await res.json();
    console.log(json)
}

async function deleteGuildCommands() {
    if (!commandId) {
        throw new Error('The DISCORD_TOKEN environment variable is required.');
    }
    const url = `https://discord.com/api/v10/applications/${applicationId}/commands/${commandId}`;
    const res = await sendCommand(url, 'DELETE');
    const json = await res.json();
    console.log(json)
}

async function sendCommand(url, method, body?) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${token}`,
        },
        method: method,
    };

    if (typeof body !== 'undefined') {
        options["body"] = body;
    }

    const res = await fetch(url, options);

    if (!res.ok) {
        console.error('fetch failed');
        const text = await res.text();
        console.error(text);
    }
    return res;
}

getGuildCommands().then(
    (_) => {
        console.log('success')
    },
    (reason) => {
        console.log(reason)
    },
);
