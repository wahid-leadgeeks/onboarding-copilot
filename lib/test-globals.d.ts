declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect<T>(actual: T): { toBe(expected: T): void; toEqual(expected: unknown): void; toStrictEqual(expected: unknown): void; toHaveLength(expected: number): void; not: { toBe(expected: T): void } };
