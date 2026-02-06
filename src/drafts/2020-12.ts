import type { KeywordRegistry, Schema, JSONValue } from "../types.js";
import type { ValidationContext } from "../validator.js";


const draft: KeywordRegistry = {
    // "$schema": (schema: Schema, instance: JSONValue) => {},
    // "type": (schema: Schema, instance: JSONValue, ctx: ValidationContext) => {},
    "$schema": (schema: unknown, instance: JSONValue) => {},
    "type": (schema: unknown, instance: JSONValue, ctx: ValidationContext) => {
        if (typeof schema !== "string" && !(Array.isArray(schema) && schema.every((item) => typeof item === "string"))) {
            return; // the schema is wrong, since the value for the `type` keyword can only be either a string or an array of strings
            // (TASK) deal with this case in a more suitable manner
        }

        if(schema === "array" && Array.isArray(instance)) {
            return;
        }

        if (schema === "null" && instance === null) {
            return;
        }

        if (schema === "integer" && typeof instance === "number" && instance === Math.floor(instance)) {
            return;
        }

        if (schema === "object" && Array.isArray(instance)) {
            ctx.errors.push({valid: false})
            return;
        }

        if (schema === typeof instance) {
            return;
        }

        ctx.errors.push({valid: false});
    },
}



export default draft;