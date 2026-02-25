import type { KeywordRegistry, Schema, JSONValue, BasicPendingUnit } from "../types.js";
import { ValidationContext } from "../validator.js";


const draft: KeywordRegistry = {
    "type": type_2020_12,
    "required": required_2020_12,
    "properties": properties_2020_12,
    "allOf": allOf_2020_12,
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
            presentProperties.push(key);
            const result = ctx.evaluate(value, instance[key]!, ctx.forkLocationFromOutputUnit(pendingUnit, ["properties", key], ["properties", key], [key])); // (TASK) update the JSON Pointer classes and update this filth

            if (!result) {
                isValid = false;
            }
        }
    })

    if (presentProperties.length !== 0) {
        pendingUnit.annotations["properties"] = presentProperties;
    }

    return isValid;
}


function allOf_2020_12(schemas: Schema[], instance: JSONValue, ctx: ValidationContext, pendingUnit: BasicPendingUnit): boolean {
    let isValid = true;
    schemas.forEach((subSchema, index) => {
        const result = ctx.evaluate(subSchema, instance, ctx.forkLocationFromOutputUnit(pendingUnit, [index.toString()], [index.toString()], []));

        if (!result) {
            isValid = false;
        }
    })

    return isValid;
}




export default draft;