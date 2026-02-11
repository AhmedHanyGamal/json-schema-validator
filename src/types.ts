import { ValidationContext } from "./validator.js";
import { JSONPointer, AbsoluteJSONPointer } from "./utils/JSONPointer.js";


export interface KeywordHandler {
    (schema: unknown, instance: JSONValue, context: ValidationContext): void;
}

export interface KeywordRegistry {
    [key: string]: KeywordHandler;
}



interface basicBaseUnit {
    valid: boolean;
    evaluationPath: JSONPointer; // May change to AbsoluteJSONPointer, will see once I start working on `$ref`, `$dynamicRef` and similar keywords
    schemaLocation: AbsoluteJSONPointer; 
    instanceLocation: JSONPointer; 
}

export interface basicSuccessUnit extends basicBaseUnit {
    valid: true;
    annotations: Record<string, any>;
}

export interface basicFailUnit extends basicBaseUnit {
    valid: false;
    errors: Record<string, string>;
}

export type outputUnit = basicSuccessUnit | basicFailUnit

export type basicOutput = {
    valid: boolean;
    details: outputUnit[];
}



export type JSONValue = null | boolean | number | string | JSONObject | JSONArray;

export type JSONArray = JSONValue[];

export type JSONObject = {
    [key: string]: JSONValue
}

export type Schema = JSONObject | boolean