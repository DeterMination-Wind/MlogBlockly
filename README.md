# MlogBlockly

A standalone Blockly-based visual editor that generates vanilla Mindustry `mlog`.

## Commands

```powershell
npm install
npm run start
npm run build
```

## Current scope

- Blockly workspace with sugar blocks plus full vanilla instruction blocks except `jump`
- Live generation of vanilla `mlog`
- Structured control flow lowering with labels and `jump`
- Local autosave plus workspace JSON import/export

## Current sugar surface

- `if` / `if else`
- `while` / `until`
- `repeat(n)`
- `for (i in start..end)`
- `for (i in start until end)`
- `when (x)` with up to 3 explicit cases and optional `else`

## Vanilla compatibility

The toolbox includes a dedicated `原版块（除 jump）` category generated from Mindustry's `LogicIO` schema, covering every registered vanilla statement except `jump` and `noop`.

## Notes

- Output targets vanilla `mlog` directly.
- This project does not depend on `MlogSugar`.
