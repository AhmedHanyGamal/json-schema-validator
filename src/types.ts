import { ValidationContext } from "./validator.js";

export interface KeywordHandler {
    (schema: unknown, instance: JSONValue, context: ValidationContext): void;
}

export interface KeywordRegistry {
    [key: string]: KeywordHandler;
}


export type JSONValue = null | boolean | number | string | JSONObject | JSONArray;

export type JSONArray = JSONValue[];

export type JSONObject = {
    [key: string]: JSONValue
}

export type Schema = JSONObject | boolean