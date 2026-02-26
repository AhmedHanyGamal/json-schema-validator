// import type {DraftKeywordsContainer} from "./types.js"
import type { BasicBaseUnit, BasicPendingUnit, EvaluationLocation, EvaluationResult, JSONValue, KeywordHandler, KeywordRegistry, OutputUnit } from "./types.js";
import type { Schema, BasicOutput, BasicSuccessUnit, BasicFailUnit } from "./types.js";
import draft2020_12 from "./drafts/2020-12.js";
import { JSONPointer, AbsoluteJSONPointer } from "./utils/JSONPointer.js";

// const draftContainer: DraftKeywordsContainer = {"2020-12": draft2020_12}

let draft: KeywordRegistry = draft2020_12;


export function validate(schema: Schema, instance: JSONValue): BasicOutput {

    // (TASK) validate schema and make sure it's correct before you begin validation

    
    const ctx: ValidationContext = new ValidationContext()
    const isValid = ctx.evaluate(schema, instance, ctx.createRootLocation()).valid;

    return ctx.createOutput(isValid);
}



export class ValidationContext {
    details: OutputUnit[] = []


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
        for (const [keyword, schemaValue] of Object.entries(schema)) {
            const handler: KeywordHandler | undefined = draft[keyword];

            if(!handler) { // (TASK) deal with this case in a more suitable manner
                continue;
            }

            const result = handler(schemaValue, instance, this, pendingUnit);

            if (!result) {
                isValid = false;
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

    createRootLocation(): EvaluationLocation {
        const evaluationPath: JSONPointer = new JSONPointer();
        const schemaLocation: AbsoluteJSONPointer = new AbsoluteJSONPointer("https://json-default/base#");
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
}