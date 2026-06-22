// ESLint flat config (ESLint 9 / Next 16).
//
// Replaces the legacy `.eslintrc.json` (+ the removed `next lint` command).
// Mirrors the previous `extends: next/core-web-vitals` by spreading the flat
// config that eslint-config-next 16 ships, and ignores non-app code (build
// output, the legacy port, and Deno edge functions which use a different
// runtime/globals).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "OLD APP/**",
      "yieldbase/**",
      "supabase/**",
      // local-only migration workspace (gitignored: dumps, scripts, creds)
      "migration/**",
      "public/**",
      // shadcn/ui primitives are vendored copy-paste code (CLAUDE.md: never
      // modify them) — don't lint them.
      "src/components/ui/**",
    ],
  },
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 turns on react-hooks v6's React-Compiler rules at
    // error level. They flag idiomatic patterns this project relies on (lazy
    // effect init, the documented window.location.href redirect — see
    // .claude/rules/frontend.md). Keep them as visible warnings rather than
    // build-breaking errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
