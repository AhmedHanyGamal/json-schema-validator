import { ValidationContext } from "./validator.js";
// export type DraftKeywords = Record<string, Function>;

// export type DraftKeywordsContainer = Record<string, DraftKeywords>;


export interface Schema {
    // (TASK)

    [key: string]: unknown;
};

export interface KeywordHandler {
    // (schema: Schema, instance: JSONValue, context: ValidationContext): void;
    (schema: unknown, instance: JSONValue, context: ValidationContext): void;
}

export interface KeywordRegistry {
    [key: string]: KeywordHandler;
}

export interface ValidationError {
    valid: boolean;
    // (TASK)
}


export type JSONValue = null | boolean | number | string | JSONObject | JSONArray;

export type JSONArray = JSONValue[];

export type JSONObject = {
    [key: string]: JSONValue
}

export interface DetailedOutput {
    valid: boolean;
    // (TASK)
};