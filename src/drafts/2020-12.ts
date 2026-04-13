import type { Schema, JSONValue, BasicPendingUnit, Draft } from "../types.js";
import { ValidationContext } from "../validator.js";


const draft: Draft = {
    phaseOrder: [ "phase1", "phase2", "phase3", "phase4" ], // phasing is INCREDIBLY IMPORTANT, choosing an incorrect phase for a keyword could destroy the entire system
    keywords: {
        "type": { phase: "phase1", handler: type_2020_12 },
        "required": { phase: "phase1", handler: required_2020_12 },
        "properties": { phase: "phase1", handler: properties_2020_12 },
        "patternProperties": { phase: "phase1", handler: patternProperties_2020_12 },
        "allOf": { phase: "phase3", handler: allOf_2020_12 },
        "anyOf": { phase: "phase3", handler: anyOf_2020_12 },
        "oneOf": { phase: "phase3", handler: oneOf_2020_12 },
        "additionalProperties": { phase: "phase2", handler: additionalProperties_2020_12},
    }
}



function type_2020_12(schema: (string | string[]), instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    if (typeof schema === "string") {
        const isValid = typeValidation(schema, instance);
        if (!isValid) {
            pendingUnit.errors["type"] = `instance type should be ${schema}, found ${instanceType(instance)}`;
            return false;
        }

        return true;
    }
    else {
        for (const allowedType of schema) {
            const isValid = typeValidation(allowedType, instance);
            if(isValid) {
                return true;
            }
        }

        pendingUnit.errors["type"] = `instance type should be ${schema}, found ${instanceType(instance)}`;
        return false;
    }
}

function typeValidation(schema: string, instance: JSONValue): boolean {
    if (schema === "string" && typeof instance === "string") {
        return true;
    }

    if (schema === "integer" && Number.isInteger(instance)) {
        return true;
    }

    if (schema === "number" && typeof instance === "number") {
        return true;
    }    

    if (schema === "object" && typeof instance === "object" && instance !== null && !Array.isArray(instance)) {
        return true;        
    }

    if(schema === "array" && Array.isArray(instance)) {
        return true;
    }

    if (schema === "boolean" && typeof instance === "boolean") {
        return true;
    }

    if (schema === "null" && instance === null) {
        return true;
    }

    return false;
}

function instanceType(instance: JSONValue): JSONValue {
    if (typeof instance === "string") {
        return "string";
    }

    if (Number.isInteger(instance)) {
        return "integer";
    }

    if (typeof instance === "number") {
        return "number";
    }    

    if (typeof instance === "object" && instance !== null && !Array.isArray(instance)) {
        return "object";        
    }

    if(Array.isArray(instance)) {
        return "array";
    }

    if (typeof instance === "boolean") {
        return "boolean";
    }

    if (instance === null) {
        return "null";
    }

    return "unknown";
}


function required_2020_12(schema: string[], instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    if(!(typeof instance === "object" && instance !== null && !Array.isArray(instance))) {
        return true;
    }

    const missingProperties: string[] = [];

    for (const requiredProperty of schema) {
        if (!Object.hasOwn(instance, requiredProperty)) {
            missingProperties.push(requiredProperty);
        }
    }

    if (missingProperties.length !== 0) {
        pendingUnit.errors["required"] = `Required properties [${missingProperties}] were not present`;
        return false;
    }

    return true;
}


function properties_2020_12(schema: Record<string, Schema>, instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    if (!(typeof instance === "object" && instance !== null && !Array.isArray(instance))) {
        return true;
    }

    let isValid = true;
    const presentProperties: string[] = [];
    Object.entries(schema).forEach(([key, value]) => {
        if (Object.hasOwn(instance, key)) {
            const result = ctx.evaluate(value, instance[key]!, ctx.forkLocationFromOutputUnit(pendingUnit, ["properties", key], ["properties", key], [key]));

            if (result.valid) {
                presentProperties.push(key);
            }
            else {
                isValid = false;
            }
        }
    })

    if (isValid) {
        pendingUnit.annotations["properties"] = presentProperties;
        presentProperties.forEach((property) => pendingUnit.evaluatedProperties.add(property));
    }

    return isValid;
}


function patternProperties_2020_12(schema: Record<string, Schema>, instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    if (!(typeof instance === "object" && instance !== null && !Array.isArray(instance))) {
        return true;
    }

    const instanceEntries = Object.entries(instance);
    const patterns = Object.entries(schema).map(([pattern, subSchema]) => ({ 
        pattern, 
        regex: new RegExp(pattern),
        schema: subSchema
    }))

    let isValid = true;
    const validatedProperties = new Set<string>();
    for (const [instanceKey, instanceValue] of instanceEntries) {
        for (const { pattern, regex, schema: subSchema} of patterns) {
            if (regex.test(instanceKey)) {
                const result = ctx.evaluate(subSchema, instanceValue, ctx.forkLocationFromOutputUnit(pendingUnit, [pattern], [pattern], [instanceKey]));

                if (result.valid) {
                    validatedProperties.add(instanceKey);
                }
                else {
                    isValid = false;
                }
            }
        }
    }

    if (isValid) {
        pendingUnit.annotations["patternProperties"] = [...validatedProperties];
        validatedProperties.forEach((property) => pendingUnit.evaluatedProperties.add(property));
    }

    return isValid;
}


function allOf_2020_12(schemas: Schema[], instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    let isValid = true;
    let evaluatedProperties: Set<string> = new Set();
    let evaluatedItems: Set<number> = new Set();
    schemas.forEach((subSchema, index) => {
        const result = ctx.evaluate(subSchema, instance, ctx.forkLocationFromOutputUnit(pendingUnit, [index.toString()], [index.toString()], []));

        if (result.valid) {
            evaluatedProperties = ctx.unionEvaluatedProperties(evaluatedProperties, result.unit.evaluatedProperties);
            evaluatedItems = ctx.unionEvaluatedItems(evaluatedItems, result.unit.evaluatedItems);
        }
        else {
            isValid = false;
        }
    })

    if (isValid) {
        pendingUnit.evaluatedProperties = ctx.unionEvaluatedProperties(pendingUnit.evaluatedProperties, evaluatedProperties);
        pendingUnit.evaluatedItems = ctx.unionEvaluatedItems(pendingUnit.evaluatedItems, evaluatedItems);
    }

    return isValid;
}


function anyOf_2020_12(schemas: Schema[], instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    let isValid = false;
    let evaluatedProperties: Set<string> = new Set();
    let evaluatedItems: Set<number> = new Set();
    schemas.forEach((subSchema, index) => {
        const result = ctx.evaluate(subSchema, instance, ctx.forkLocationFromOutputUnit(pendingUnit, [index.toString()], [index.toString()], []));

        if (result.valid) {
            isValid = true;
            evaluatedProperties = ctx.unionEvaluatedProperties(evaluatedProperties, result.unit.evaluatedProperties);
            evaluatedItems = ctx.unionEvaluatedItems(evaluatedItems, result.unit.evaluatedItems);
        }
    })

    if (isValid) {
        pendingUnit.evaluatedProperties = ctx.unionEvaluatedProperties(pendingUnit.evaluatedProperties, evaluatedProperties);
        pendingUnit.evaluatedItems = ctx.unionEvaluatedItems(pendingUnit.evaluatedItems, evaluatedItems);
    }

    return isValid;
}


function oneOf_2020_12(schemas: Schema[], instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    let validSubSchemas = 0;
    let evaluatedProperties: Set<string> = new Set();
    let evaluatedItems: Set<number> = new Set();
    schemas.forEach((subSchema, index) => {
        const result = ctx.evaluate(subSchema, instance, ctx.forkLocationFromOutputUnit(pendingUnit, [index.toString()], [index.toString()], []));

        if (result.valid) {
            validSubSchemas++;
            evaluatedProperties = ctx.unionEvaluatedProperties(evaluatedProperties, result.unit.evaluatedProperties);
            evaluatedItems = ctx.unionEvaluatedItems(evaluatedItems, result.unit.evaluatedItems);
        }
    })

    const isValid = validSubSchemas === 1;

    if (isValid) {
        pendingUnit.evaluatedProperties = ctx.unionEvaluatedProperties(pendingUnit.evaluatedProperties, evaluatedProperties);
        pendingUnit.evaluatedItems = ctx.unionEvaluatedItems(pendingUnit.evaluatedItems, evaluatedItems);
    }

    return isValid;
}


function additionalProperties_2020_12(schema: Schema, instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    if (!(typeof instance === "object" && instance !== null && !Array.isArray(instance))) {
        return true;
    }

    const evaluatedProperties: Set<string> = new Set<string>([...(pendingUnit.annotations["properties"] ?? []), ...(pendingUnit.annotations["patternProperties"] ?? [])]);

    let isValid = true;
    const validAdditionalProperties: string[] = [];
    for (const [instanceKey, instanceValue] of Object.entries(instance)) {
        if (evaluatedProperties.has(instanceKey)) {
            continue;
        }

        const result = ctx.evaluate(schema, instanceValue, ctx.forkLocationFromOutputUnit(pendingUnit, ["additionalProperties"], ["additionalProperties"], [instanceKey]));

        if (result.valid) {
            validAdditionalProperties.push(instanceKey);
        }
        else {
            isValid = false;
        }
    }

    if (isValid) {
        pendingUnit.annotations["additionalProperties"] = validAdditionalProperties;
        validAdditionalProperties.forEach((property) => pendingUnit.evaluatedProperties.add(property));
    }

    return isValid;
}


export default draft;