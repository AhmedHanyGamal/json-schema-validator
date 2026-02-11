export class JSONPointer {
    private segments: string[] = [];

    push(segment: string): void {
        this.segments.push(segment);
    }

    pop(): string | undefined {
        return this.segments.pop();
    }

    toString(): string {
        if (this.segments.length === 0) {
            return "";
        }

        const escapedSegments: string[] = this.segments.map((segment) => escape(segment))
        return '/' + escapedSegments.join('/');
    }

    constructor(jsonPointer?: string | string[]) {
        if (jsonPointer === undefined || jsonPointer === "") {
            return;
        }

        if (Array.isArray(jsonPointer)) {
            this.segments = [...jsonPointer];
            return;
        }
        
        if (!jsonPointer.startsWith('/')) {
            throw new Error("invalid json pointer: invalid format, add '/' at the start");
        }

        jsonPointer = jsonPointer.slice(1);
        this.segments = jsonPointer.split('/').map((segment) => unescape(segment));
    }


    fork(segment: string): JSONPointer {
        return new JSONPointer([...this.segments, segment]);
    }
}

export class AbsoluteJSONPointer {
    private uri: string = "";
    private fragmentSegments: string[] = [];

    push(segment: string): void {
        this.fragmentSegments.push(segment);
    }

    pop(): string | undefined {
        return this.fragmentSegments.pop();
    }

    toString(): string {
        const absoluteJSONPointer: string = this.uri + '#';

        if (this.fragmentSegments.length === 0) {
            return absoluteJSONPointer;
        }
        const escapedSegments = this.fragmentSegments.map((segment) => escape(segment));
        return absoluteJSONPointer + '/' + escapedSegments.join('/');
    }

    constructor(absoluteJsonPointer: string, segments?: string[]) {
        const hashIndex = absoluteJsonPointer.indexOf('#');

        if (hashIndex <= 0) {
            throw new Error("invalid absolute json pointer: either missing base uri or missing '#'");
        }

        const rawUri = absoluteJsonPointer.slice(0, hashIndex);
        let rawFragment = absoluteJsonPointer.slice(hashIndex + 1);

        this.uri = rawUri;

        const additionalSegments: string[] = segments === undefined? [] : segments;

        if (rawFragment === "") {
            this.fragmentSegments = additionalSegments;
            return;
        }

        if (!rawFragment.startsWith('/')) {
            throw new Error("invalid absolute json pointer: invalid fragment format, add '/' at the start");
        }
        
        rawFragment = rawFragment.slice(1);
        this.fragmentSegments = rawFragment.split('/').map((segment) => unescape(segment));
        this.fragmentSegments = [...this.fragmentSegments, ...additionalSegments];
    }

    fork(segment: string): AbsoluteJSONPointer {
        return new AbsoluteJSONPointer(this.uri + '#', [...this.fragmentSegments, segment]);
    }
}


const escape = (str: string): string => str.replaceAll('~', '~0').replaceAll('/', '~1');

const unescape = (str: string): string => {
    // for you savvy spec enjoyers out there
    if (str.search(/~(?![01])/) !== -1) {
        throw new Error("invalid unescape: `~` has to be followed by either 0 or 1");
        
    }

    return str.replaceAll('~1', '/').replaceAll('~0', '~');
}