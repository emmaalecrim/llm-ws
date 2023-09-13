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

// TODO: parseCompletion => parses and validates completion data based on type