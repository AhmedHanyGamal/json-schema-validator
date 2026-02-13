// import type {DraftKeywordsContainer} from "./types.js"
import type { BasicPendingUnit, JSONValue, KeywordHandler, KeywordRegistry, OutputUnit } from "./types.js";
import type { Schema, BasicOutput, BasicSuccessUnit, BasicFailUnit } from "./types.js";
import draft2020_12 from "./drafts/2020-12.js";
import { JSONPointer, AbsoluteJSONPointer } from "./utils/JSONPointer.js";

// const draftContainer: DraftKeywordsContainer = {"2020-12": draft2020_12}

let draft: KeywordRegistry = draft2020_12;


export function validate(schema: Schema, instance: JSONValue): BasicOutput {

    
    const ctx: ValidationContext = new ValidationContext()
    validateSchema(schema, instance, ctx);



    return {
        valid: true,
        details: []
    };
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
}


export class ValidationContext {
    details: OutputUnit[] = []

    evaluationPath: JSONPointer = new JSONPointer();
    schemaLocation: AbsoluteJSONPointer = new AbsoluteJSONPointer("https://json-default/base#");
    instanceLocation: JSONPointer = new JSONPointer();



    validateSchema(schema: Schema, instance: JSONValue, ctx: ValidationContext) {
        validateSchema(schema, instance, ctx);
    }

    createUnit(valid?: boolean): BasicPendingUnit {
        return {
            valid: valid ?? true,
            evaluationPath: this.evaluationPath.fork(),
            schemaLocation: this.schemaLocation.fork(),
            instanceLocation: this.instanceLocation.fork(),
            errors: {},
            annotations: {}
        }
    }

    processAndAddUnit(basicUnit: BasicPendingUnit): void {
        if (this.isEmptyObject(basicUnit.errors)) {
            this.details.push({
                valid: true,
                evaluationPath: basicUnit.evaluationPath.fork(),
                schemaLocation: basicUnit.schemaLocation.fork(),
                instanceLocation: basicUnit.instanceLocation.fork(),
                annotations: {...basicUnit.annotations}
            })
        }
        else {
            this.details.push({
                valid: false,
                evaluationPath: basicUnit.evaluationPath.fork(),
                schemaLocation: basicUnit.schemaLocation.fork(),
                instanceLocation: basicUnit.instanceLocation.fork(),
                errors: {...basicUnit.errors}
            })
        }
    }


    private isEmptyObject(obj: object): boolean {
        return Object.keys(obj).length === 0;
    }
}