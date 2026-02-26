import type { KeywordRegistry, Schema, JSONValue, BasicPendingUnit } from "../types.js";
import { ValidationContext } from "../validator.js";


const draft: KeywordRegistry = {
    "type": type_2020_12,
    "required": required_2020_12,
    "properties": properties_2020_12,
    "allOf": allOf_2020_12,
    "anyOf": anyOf_2020_12,
    "oneOf": oneOf_2020_12,
}



function type_2020_12(schema: (string | string[]), instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    if (typeof schema === "string") {
        const isValid = typeValidation(schema, instance);
        if (!isValid) {
            pendingUnit.errors["type"] = "incorrect instance type";
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

        pendingUnit.errors["type"] = "incorrect instance type";
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

    if (isValid && presentProperties.length !== 0) {
        pendingUnit.annotations["properties"] = presentProperties;
        presentProperties.forEach((property) => pendingUnit.evaluatedProperties.add(property));
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




export default draft;