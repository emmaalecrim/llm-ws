import csv = require("csvtojson");
import { output as classifyOut } from "../utils/schemas/classify"
import { output as suggestOut } from "../utils/schemas/suggest"
import logger from "./logging";


// https://github.com/Keyang/node-csvtojson
export const csvToJson = async (csvString: string, headers: string[] | undefined = undefined): Promise<any> => csv({
    noheader: true,
    escape: "\\",
    headers,
}).fromString(csvString);


export function isJSON(str: string) {
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
}

export const parsers = {
    suggest: {
        headers: ["emoji", "title", "text"],
        validator: (json: classifyOut) => suggestOut.parse(json),
    },
    classify: {
        headers: ["original_comment", "category", "is_harmful", "description", "emoji"],
        validator: (json: classifyOut) => classifyOut.parse(json),
    },
}

export async function parseCompletion(type: "suggest" | "classify", str: string) {
    const json = await csvToJson(str, parsers[type].headers)
    logger({ json })
    return parsers[type].validator(json)
}