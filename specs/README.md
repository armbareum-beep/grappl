# Spec-Driven Development Guide

## What is Spec-Driven Development?
Every new feature begins with a written spec — before any code is written. The spec defines the problem, desired behavior, and test cases. Code only follows once the spec is approved.

## Workflow

```
1. SPEC     Write specs/<area>/<feature>.spec.md using _template.md
            Get spec reviewed and set Status → Approved

2. TESTS    Write failing tests that reference spec TC IDs
            - Web: lib/*.test.ts or components/*.test.tsx (Vitest)
            - KMP: mobile/composeApp/src/commonTest/...Test.kt
            Confirm tests are RED (failing) before writing implementation

3. IMPLEMENT  Write code until tests go GREEN

4. PR       Open a PR that includes: spec doc + tests + implementation
            Reference the spec file in the PR description
            CI must pass (tests.yml) before merge
```

## File Naming
- Spec docs: `specs/<area>/<feature-name>.spec.md`
- Web tests: co-located with source, e.g. `lib/api-lessons.test.ts`
- KMP tests: `mobile/composeApp/src/commonTest/kotlin/com/grapplay/app/.../FeatureTest.kt`

## Status Values
Use these status values in the spec header:

| Status | Meaning |
|---|---|
| Draft | Work in progress, not ready for review |
| Review | Ready for team review |
| Approved | Approved — implementation may begin |
| In Progress | Being implemented |
| Done | Feature shipped and verified |

## Rules
- No feature PR is merged without a corresponding spec with Status: Approved
- Spec and tests must be in the same PR as the implementation
- Tests must pass in CI before merge

## Running Tests

**Web (Vitest):**
```bash
npm run test          # run once
npm run test:watch    # watch mode
npm run test:ui       # browser UI
npm run test:coverage # coverage report
```

**KMP (kotlin.test):**
```bash
cd mobile
./gradlew :composeApp:testDebugUnitTest
```
