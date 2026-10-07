# Research

## R1 — asyncHandler

- **Finding**: Express 5.2 (`router` 2.x) calls `next(err)` when a handler returns a rejected promise.
- **Decision**: no wrapper; an integration test pins the behaviour. Floating (never-returned) promises are a lint error since #75.

## R2 — 500 details in development

- **Decision**: never. The stack is in the log; a body field present only in development is one config mistake from production.

## R3 — Code vocabulary

- **Decision**: snake_case, as #6 already shipped.

## R4 — pg errors

- **Decision**: map by `code` (`23505`, `23503`, `22P02`) on any error object; no import of `pg` types needed. Messages are generic — pg messages contain table, column and constraint names.
