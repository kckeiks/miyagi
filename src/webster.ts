import {Definition, Definitions} from './dictionary';

type WebsterSchema = [WebsterDefinition]

type WebsterDefinition = {
    meta: string,
    fl: string,
    shortdef: [string],
}

/**
 * Looks up word using Webster API.
 * @throws {Error}
 */
export default async function lookup(word: string, key: string): Promise<Definition[]> {
    const res: Response = await fetch(
        `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${key}`,
        {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'GET',
        }
    );

    if (!res.ok) {
        throw new Error(await res.text())
    }

    const json: WebsterSchema = await res.json();
    const result: Definition[] = [];


    json.forEach((def) => {
        // If definition was not found, Webster API returns string array with suggestions.
        if (def.shortdef) {
            result.push({
                partOfSpeech: def.fl,
                shortdefs: def.shortdef
            });
        }
    });

    return result;
}