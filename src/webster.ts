import {Definition} from './dictionary';

type WebsterSchema = [
    {
        meta: string,
        fl: string,
        shortdef: [string],
    }
]

/**
 * Looks up word using Webster API.
 * @throws {Error}
 */
export default async function lookup(word: string, key: string): Promise<Definition> {
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
    const result: Definition = [
        {
            word: word,
            partOfSpeech: json[0].fl,
            shortdef: [json[0].shortdef[0]]
        }
    ];

    return result;
}