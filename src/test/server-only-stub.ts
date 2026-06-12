// Vitest stub for the `server-only` package. The real module throws when
// imported outside a React Server Component bundle; in unit tests we map it to
// this empty module so server-only logic helpers can be imported and tested.
export {};
