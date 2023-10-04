import csv = require("csvtojson");

// https://github.com/Keyang/node-csvtojson
export const csvToJson = async (csvString: string, headers: string[] | undefined = undefined): Promise<object[]> => csv({
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
        headers: ["emoji", "title", "text"]
    },
    classify: {
        headers: ["original_comment", "category", "is_harmful", "description", "emoji"]
    },
}

export function parseCompletion(type: "suggest" | "classify", str: string) {
    return csvToJson(str, parsers[type].headers)
}