import type { BasicBaseUnit, BasicPendingUnit, EvaluationLocation, EvaluationPhase, EvaluationResult, JSONValue, KeywordHandler, Draft, OutputUnit, JSONObject } from "./types.js";
import type { Schema, BasicOutput, BasicSuccessUnit, BasicFailUnit } from "./types.js";
import draft2020_12 from "./drafts/2020-12.js";
import { JSONPointer, AbsoluteJSONPointer } from "./utils/JSONPointer.js";
import { isUri, normalizeUri, parseUri, resolveUri } from "@hyperjump/uri";


export class Validator {
    private draft: Draft;
    private schemaRegistry: Record<string, Schema> = {};

    private isValidAnchorName(anchor: string): boolean {
        return /^[a-zA-Z_][a-zA-Z0-9\-_.]*$/.test(anchor);
    }

    private registerSchemaInternal(schema: Schema, retrievalUri: string) {
        if (!isUri(retrievalUri)) {
            throw new Error("invalid uri, uri must be correctly structured when using keywords like `$id` and `$anchor`");
        }

        if (Object.hasOwn(this.schemaRegistry, retrievalUri) && this.schemaRegistry[retrievalUri] !== schema) {
            throw new Error(`schema identifier "${retrievalUri}" already used in the schema registry`);
        }

        this.schemaRegistry[retrievalUri] = schema;
    }

    constructor(draft: Draft) {
        this.draft = draft;
    }


    private indexTraversal(schema: Schema, baseURI: string) {
        if (typeof schema === "boolean") {
            return;
        }

        let newBaseURI = baseURI;
        if (Object.hasOwn(schema, "$id")) {
            const resolvedURI = resolveUri(schema["$id"] as string, baseURI);
            
            if (parseUri(resolvedURI).fragment !== undefined) {
                throw new Error("URI in `$id` can't contain a URI fragment");
            }

            this.registerSchemaInternal(schema, resolvedURI);

            newBaseURI = resolvedURI;
        }

        if (Object.hasOwn(schema, "$anchor")) {
            if (!this.isValidAnchorName(schema["$anchor"] as string)) {
                throw new Error(`invalid anchor name: ${schema["$anchor"]}`);
            }

            const resolvedURI = newBaseURI + "#" + schema["$anchor"];

            this.registerSchemaInternal(schema, resolvedURI);
        }

        for (const [key, value] of Object.entries(schema)) {
            const keyword = this.draft.keywords[key];

            if (!keyword || keyword.valueType === "other") {
                continue;
            }
            
            if (keyword.valueType === "schema") {
                this.indexTraversal(value as Schema, newBaseURI);
            } else if (keyword.valueType === "schema-array") {
                (value as Schema[]).forEach((subschema) => this.indexTraversal(subschema, newBaseURI));
            } else if (keyword.valueType === "schema-map") {
                Object.values(value as Record<string, Schema>).forEach((subschema) => this.indexTraversal(subschema, newBaseURI));
            }
        }
    }


    registerSchema(schema: Schema, retrievalUri?: string): void {
        // (TASK) validate schema and make sure it's correct before you begin validation

        const rootId = typeof schema !== "boolean" && typeof schema["$id"] === "string"
            ? normalizeUri(schema["$id"])
            : undefined;

        const baseURI = rootId ?? retrievalUri;

        if (baseURI === undefined) {
            throw new Error("every registered schema must have a URI referring to it");
        }

        if (retrievalUri !== undefined) {
            this.registerSchemaInternal(schema, retrievalUri);
        }

        if (typeof schema === "boolean") {
            return;
        }

        this.indexTraversal(schema, baseURI);
    }

    unregisterSchema(uri: string): void {
        delete this.schemaRegistry[uri];
    }

    getAllRegisteredSchemaUris(): string[] {
        return Object.keys(this.schemaRegistry);
    }

    hasSchema(uri: string): boolean {
        return Object.hasOwn(this.schemaRegistry, uri);
    }


    validate(schema: Schema, instance: JSONValue): BasicOutput {
    // (TASK) validate schema and make sure it's correct before you begin validation

        const ctx: ValidationContext = new ValidationContext(this.draft, this.schemaRegistry);
        const isValid = ctx.evaluate(schema, instance, ctx.createRootLocation()).valid;

        return ctx.createOutput(isValid);
    }
}



export class ValidationContext {
    private draft: Draft;
    private schemaRegistry: Record<string, Schema>;
    private details: OutputUnit[] = []

    constructor(draft: Draft, schemaRegistry: Record<string, Schema>) {
        this.draft = draft;
        this.schemaRegistry = schemaRegistry;
    }

    evaluate(schema: Schema, instance: JSONValue, evaluationLocation: EvaluationLocation): EvaluationResult {
        const pendingUnit: BasicPendingUnit = this.createUnit(evaluationLocation);

        if (schema === true || schema === null) {
            this.finalizeUnit(pendingUnit, true);
            return {
                valid: true,
                unit: pendingUnit
            };
        }

        if (schema === false) {
            this.finalizeUnit(pendingUnit, false);
            return {
                valid:false, 
                unit: pendingUnit
            };
        }

        
        let isValid = true;
        for (const phase of this.draft.phaseOrder) {
            for (const [keyword, schemaValue] of Object.entries(schema)) {
                const entry = this.draft.keywords[keyword];
                if (!entry) { // (TASK) deal with this case in a more suitable manner
                    continue;
                }
                
                const { phase: keywordPhase, handler } = entry;
                
                if (keywordPhase !== phase) {
                    continue;
                }

                const keywordLocation = this.forkLocation(evaluationLocation, [keyword], [keyword], []);

                const result = handler(schemaValue, instance, this, pendingUnit, keywordLocation);
                
                if (!result) {
                    isValid = false;
                }
            }
        }


        this.finalizeUnit(pendingUnit, isValid);
        return {
            valid: isValid,
            unit: pendingUnit
        };
    }


    createUnit(evaluationLocation: EvaluationLocation): BasicPendingUnit {
        return {
            evaluationPath: evaluationLocation.evaluationPath.fork(),
            schemaLocation: evaluationLocation.schemaLocation.fork(),
            instanceLocation: evaluationLocation.instanceLocation.fork(),
            errors: {},
            annotations: {},
            evaluatedProperties: new Set<string>(),
            evaluatedItems: new Set<number>(),
        }
    }

    unionEvaluatedProperties(set1: Set<string>, set2: Set<string>): Set<string> {
        return new Set([...set1, ...set2]);
    }

    unionEvaluatedItems(set1: Set<number>, set2: Set<number>): Set<number> {
        return new Set([...set1, ...set2].sort());
    }

    finalizeUnit(basicUnit: BasicPendingUnit, isValid: boolean): void {
        if (isValid) {
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

    createOutput(isValid: boolean): BasicOutput {
        if (isValid) {
            return {
                valid: true,
                details: this.details.filter((unit) => unit.valid === true)
            }
        }
        else {
            return {
                valid: false,
                details: this.details.filter((unit) => unit.valid === false)
            }
        }
    }

    // (TASK) Determine whether to use `isUri` here or not
    createRootLocation(baseURI?: string): EvaluationLocation {
        const evaluationPath: JSONPointer = new JSONPointer();
        const schemaLocation: AbsoluteJSONPointer = new AbsoluteJSONPointer(baseURI ?? "https://json-default/base#");
        const instanceLocation: JSONPointer = new JSONPointer();
        
        return { evaluationPath, schemaLocation, instanceLocation };
    }
    
    forkLocation(evaluationLocation: EvaluationLocation, evaluationPathSegment: string[], schemaLocationSegment: string[], instanceLocationSegment: string[]): EvaluationLocation {
        const evaluationPath = evaluationLocation.evaluationPath.fork(...evaluationPathSegment);
        const schemaLocation = evaluationLocation.schemaLocation.fork(...schemaLocationSegment);
        const instanceLocation = evaluationLocation.instanceLocation.fork(...instanceLocationSegment);
        
        return { evaluationPath, schemaLocation, instanceLocation };
    }
    
    forkLocationFromOutputUnit(unit: BasicBaseUnit, evaluationPathSegment: string[], schemaLocationSegment: string[], instanceLocationSegment: string[]): EvaluationLocation {
        const evaluationLocation: EvaluationLocation = { 
            evaluationPath: unit.evaluationPath, 
            schemaLocation: unit.schemaLocation, 
            instanceLocation: unit.instanceLocation 
        }
        
        return this.forkLocation(evaluationLocation, evaluationPathSegment, schemaLocationSegment, instanceLocationSegment);
    }

    getSchema(uri: string): Schema | undefined {
        return this.schemaRegistry[uri];
    }
}