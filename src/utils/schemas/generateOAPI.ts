import { generateSchema } from "@anatine/zod-openapi";
import { inputData } from "./completion";
import fs from "fs";


const inputSchema = generateSchema(inputData);
fs.writeFileSync("./src/utils/schemas/llm-ws.json", JSON.stringify({ inputSchema }, null, 2));