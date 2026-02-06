// import type {DraftKeywordsContainer} from "./types.js"
import type { JSONValue, KeywordHandler, KeywordRegistry, ValidationError } from "./types.js";
import type { Schema, DetailedOutput } from "./types.js";
import draft2020_12 from "./drafts/2020-12.js";

// const draftContainer: DraftKeywordsContainer = {"2020-12": draft2020_12}

let draft: KeywordRegistry = draft2020_12;


export function validate(schema: Schema, instance: JSONValue): DetailedOutput {
    // if (schema["$schema"]) {
    //     draft = draft["$schema"](schema["$schema"]);
    // }

    // if (schema["type"]) {
    //     draft["type"]
    // }

    const ctx: ValidationContext = new ValidationContext()
    validateSchema(schema, instance, ctx);


    

    const output: DetailedOutput = {
        valid: ctx.errors.length === 0
    }

    return output;
}


function validateSchema(schema: Schema, instance: JSONValue, ctx: ValidationContext) {
    if (schema === null) {
        return;
    }

    for (const [keyword, schemaValue] of Object.entries(schema)) {
        const handler: KeywordHandler | undefined = draft[keyword];

        if(!handler) {
            continue;
        }

        handler(schemaValue, instance, ctx);
    }
    // (CHECK POINT)
}


export class ValidationContext {
    errors: ValidationError[] = [];
    annotations: any;

    instanceLocation: any;
    schemaLocation: any;
    // constructor(parameters) {
        
    // }

    validateSchema(schema: Schema, instance: JSONValue, ctx: ValidationContext) {
        validateSchema(schema, instance, ctx);
    }
}