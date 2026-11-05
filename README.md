# MlogBlockly

> [NOTE] 若有反馈，请发送反馈到bugsoc@qq.com / If you have any feedback, please send it to bugsoc@qq.com

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

- Control: `if` / `if else`, `while` / `until`, `repeat(n)`, `for (i in start..end)`, `for (i in start until end)`, `when (x)` with up to 3 explicit cases and optional `else`
- Functions: `fun` define / call / `return` / `arg`
- Lists: `mlog_list_define`, `mlog_list_define_dynamic`, set / get / length / push / pop / clear
- Misc: `comment`, `symbol`, `global` (@-prefixed references)

## Vanilla compatibility

The toolbox includes six vanilla categories generated from Mindustry's `LogicIO` schema — `原版·输入输出`, `原版·建筑`, `原版·运算`, `原版·控制`, `原版·单位`, `原版·世界` — covering every registered vanilla statement except `jump` and `noop`.

## Notes

- Output targets vanilla `mlog` directly.
- This project does not depend on `MlogSugar`.
