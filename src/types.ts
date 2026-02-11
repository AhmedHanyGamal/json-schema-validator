import { ValidationContext } from "./validator.js";
import { JSONPointer, AbsoluteJSONPointer } from "./utils/JSONPointer.js";


export interface KeywordHandler {
    (schema: JSONValue, instance: JSONValue, context: ValidationContext): void;
}

export interface KeywordRegistry {
    [key: string]: KeywordHandler;
}



interface BasicBaseUnit {
    valid: boolean;
    evaluationPath: JSONPointer; // May change to AbsoluteJSONPointer, will see once I start working on `$ref`, `$dynamicRef` and similar keywords
    schemaLocation: AbsoluteJSONPointer; 
    instanceLocation: JSONPointer; 
}

export interface BasicSuccessUnit extends BasicBaseUnit {
    valid: true;
    annotations: Record<string, any>;
}

export interface BasicFailUnit extends BasicBaseUnit {
    valid: false;
    errors: Record<string, string>;
}

export type OutputUnit = BasicSuccessUnit | BasicFailUnit

export type BasicOutput = {
    valid: boolean;
    details: OutputUnit[];
}



export type JSONValue = null | boolean | number | string | JSONObject | JSONArray;

export type JSONArray = JSONValue[];

export type JSONObject = {
    [key: string]: JSONValue
}

export type Schema = JSONObject | boolean