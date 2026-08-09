import * as Blockly from 'blockly';
import {vanillaInstructionsByName} from '../blocks/vanillaSchema';

export type DiagnosticLevel = 'error' | 'warning' | 'success';

export interface Diagnostic {
  level: DiagnosticLevel;
  message: string;
  blockId?: string;
  blockType?: string;
}

export interface GenerationResult {
  code: string;
  diagnostics: Diagnostic[];
  instructionCount: number;
}

interface ListDefinition {
  kind: 'fixed' | 'dynamic';
  name: string;
  cell: string;
  start: string;
  lengthRef: string;
  capacity?: string;
  blockId?: string;
}

interface FunctionDefinition {
  name: string;
  params: string[];
  body: Blockly.Block | null;
  blockId?: string;
}

interface InlineFunctionContext {
  functionName: string;
  args: Map<string, string>;
  returnTarget: string;
  returnLabel: string;
}

class MlogEmitter {
  private readonly instructions: string[] = [];
  private readonly diagnostics: Diagnostic[] = [];
  private readonly listDefinitions = new Map<string, ListDefinition>();
  private readonly functionDefinitions = new Map<string, FunctionDefinition>();
  private readonly inlineFunctionStack: InlineFunctionContext[] = [];
  private labelCounter = 0;
  private tempCounter = 0;

  constructor(private readonly workspace: Blockly.Workspace) {}

  generate(): GenerationResult {
    this.collectListDefinitions();
    this.collectFunctionDefinitions();

    const topBlocks = this.workspace.getTopBlocks(true);
    const statementRoots = topBlocks.filter((block) => !block.outputConnection);
    const danglingValueRoots = topBlocks.filter((block) => !!block.outputConnection);

    for (const block of danglingValueRoots) {
      this.warn('悬空的值积木不会影响生成的 mlog。', block);
    }

    for (const block of statementRoots) {
      this.emitStatementChain(block);
    }

    const instructionCount = this.instructions.filter(
      (line) => line.trim() && !line.trim().endsWith(':'),
    ).length;

    if (instructionCount > 1000) {
      this.warn(`已生成 ${instructionCount} 条指令。原版逻辑处理器每个程序最多只会执行 1000 条指令。`);
    }

    if (this.diagnostics.length === 0) {
      this.diagnostics.push({
        level: 'success',
        message: '生成成功，没有诊断信息。',
      });
    }

    return {
      code: this.instructions.join('\n'),
      diagnostics: this.diagnostics,
      instructionCount,
    };
  }

  private collectListDefinitions() {
    this.listDefinitions.clear();

    for (const block of this.workspace.getAllBlocks(false)) {
      if (block.type === 'mlog_list_define') {
        const name = this.rawSymbol(String(block.getFieldValue('NAME') || 'items'), 'items');
        this.registerListDefinition(name, {
          kind: 'fixed',
          name,
          cell: this.rawSymbol(String(block.getFieldValue('CELL') || 'cell1'), 'cell1'),
          start: this.rawSymbol(String(block.getFieldValue('START') || '0'), '0'),
          lengthRef: this.rawSymbol(String(block.getFieldValue('LENGTH') || '0'), '0'),
          blockId: block.id,
        }, block);
      }

      if (block.type === 'mlog_list_define_dynamic') {
        const name = this.rawSymbol(String(block.getFieldValue('NAME') || 'queue'), 'queue');
        this.registerListDefinition(name, {
          kind: 'dynamic',
          name,
          cell: this.rawSymbol(String(block.getFieldValue('CELL') || 'cell1'), 'cell1'),
          start: this.rawSymbol(String(block.getFieldValue('START') || '0'), '0'),
          lengthRef: this.variableName(block, 'LENGTH_VAR'),
          capacity: this.rawSymbol(String(block.getFieldValue('CAPACITY') || '64'), '64'),
          blockId: block.id,
        }, block);
      }
    }
  }

  private collectFunctionDefinitions() {
    this.functionDefinitions.clear();

    for (const block of this.workspace.getAllBlocks(false)) {
      if (block.type !== 'mlog_fun_define') {
        continue;
      }

      const name = this.rawSymbol(String(block.getFieldValue('NAME') || 'fn'), 'fn');
      const params: string[] = [];
      const seen = new Set<string>();

      for (let index = 1; block.getField(`PARAM${index}`); index += 1) {
        const param = this.optionalSymbol(String(block.getFieldValue(`PARAM${index}`) || ''));
        if (!param) {
          continue;
        }
        if (seen.has(param)) {
          this.warn(`fun '${name}' 的参数 '${param}' 重复，后面的同名参数已忽略。请给每个形参使用不同名称。`, block);
          continue;
        }
        seen.add(param);
        params.push(param);
      }

      this.registerFunctionDefinition(name, {
        name,
        params,
        body: block.getInputTargetBlock('DO'),
        blockId: block.id,
      }, block);
    }
  }

  private registerListDefinition(name: string, definition: ListDefinition, block: Blockly.Block) {
    const previous = this.listDefinitions.get(name);
    if (previous) {
      this.warn(`列表 '${name}' 重复定义，已使用第一处定义。`, block);
      return;
    }
    this.listDefinitions.set(name, definition);
  }

  private registerFunctionDefinition(name: string, definition: FunctionDefinition, block: Blockly.Block) {
    const previous = this.functionDefinitions.get(name);
    if (previous) {
      this.warn(`fun '${name}' 重复定义，已使用第一处定义。请重命名或删除重复的 fun。`, block);
      return;
    }
    this.functionDefinitions.set(name, definition);
  }

  private emitStatementChain(start: Blockly.Block | null) {
    let current: Blockly.Block | null = start;
    while (current) {
      this.emitStatement(current);
      current = current.getNextBlock();
    }
  }

  private emitStatement(block: Blockly.Block) {
    if (block.type.startsWith('vanilla_')) {
      this.emitVanilla(block);
      return;
    }

    switch (block.type) {
      case 'variables_set': {
        const variableName = this.variableName(block, 'VAR');
        const valueRef = this.valueFromInput(block, 'VALUE', '0');
        this.emit(`set ${variableName} ${valueRef}`);
        return;
      }
      case 'mlog_comment': {
        const text = (block.getFieldValue('TEXT') || '').trim();
        this.emit(`# ${text}`);
        return;
      }
      case 'mlog_print': {
        const valueRef = this.valueFromInput(block, 'VALUE', '0');
        this.emit(`print ${valueRef}`);
        return;
      }
      case 'mlog_print_flush': {
        const targetRef = this.valueFromInput(block, 'TARGET', 'message1');
        this.emit(`printflush ${targetRef}`);
        return;
      }
      case 'mlog_read': {
        const result = this.variableName(block, 'RESULT');
        const cellRef = this.valueFromInput(block, 'CELL', 'cell1');
        const addrRef = this.valueFromInput(block, 'ADDR', '0');
        this.emit(`read ${result} ${cellRef} ${addrRef}`);
        return;
      }
      case 'mlog_write': {
        const valueRef = this.valueFromInput(block, 'VALUE', '0');
        const cellRef = this.valueFromInput(block, 'CELL', 'cell1');
        const addrRef = this.valueFromInput(block, 'ADDR', '0');
        this.emit(`write ${valueRef} ${cellRef} ${addrRef}`);
        return;
      }
      case 'mlog_sensor': {
        const result = this.variableName(block, 'RESULT');
        const targetRef = this.valueFromInput(block, 'TARGET', '@unit');
        const property = this.rawSymbol(block.getFieldValue('PROP') || '@health', '@health');
        this.emit(`sensor ${result} ${targetRef} ${property}`);
        return;
      }
      case 'mlog_list_define': {
        return;
      }
      case 'mlog_list_define_dynamic': {
        const lengthVar = this.variableName(block, 'LENGTH_VAR');
        const initialLength = this.rawSymbol(String(block.getFieldValue('INITIAL_LENGTH') || '0'), '0');
        this.emit(`set ${lengthVar} ${initialLength}`);
        return;
      }
      case 'mlog_list_set': {
        this.emitListSet(block);
        return;
      }
      case 'mlog_list_push': {
        this.emitListPush(block);
        return;
      }
      case 'mlog_list_pop': {
        this.emitListPop(block);
        return;
      }
      case 'mlog_list_clear': {
        this.emitListClear(block);
        return;
      }
      case 'mlog_fun_define': {
        return;
      }
      case 'mlog_fun_call': {
        const result = this.emitInlineFunctionCall(block);
        const resultVar = this.variableName(block, 'RESULT');
        this.emit(`set ${resultVar} ${result}`);
        return;
      }
      case 'mlog_fun_return': {
        this.emitFunctionReturn(block);
        return;
      }
      case 'controls_if': {
        this.emitIf(block);
        return;
      }
      case 'controls_whileUntil': {
        this.emitWhile(block);
        return;
      }
      case 'controls_repeat_ext': {
        this.emitRepeat(block);
        return;
      }
      case 'mlog_for_range': {
        this.emitForRange(block);
        return;
      }
      case 'mlog_when': {
        this.emitWhen(block);
        return;
      }
      case 'mlog_end': {
        this.emit('end');
        return;
      }
      default: {
        this.error(`不支持的语句积木：${block.type}`, block);
      }
    }
  }

  private emitVanilla(block: Blockly.Block) {
    const name = block.type.replace(/^vanilla_/, '');
    const schema = vanillaInstructionsByName.get(name);
    if (!schema) {
      this.error(`未知的原版指令积木：${block.type}`, block);
      return;
    }

    const args = schema.fields.map((field) => String(block.getFieldValue(field.name) || '').trim());
    const lastNonEmptyIndex = [...args]
      .map((value, index) => ({value, index}))
      .filter((entry) => entry.value !== '')
      .map((entry) => entry.index)
      .pop();
    const finalIndex = lastNonEmptyIndex ?? -1;

    if (finalIndex >= 0) {
      for (let index = 0; index <= finalIndex; index += 1) {
        if (!args[index]) {
          this.warn(
            `原版积木 '${name}' 的中间参数 '${schema.fields[index].name}' 为空；Mindustry 会把后面的 token 左移。`,
            block,
          );
        }
      }
    }

    const tokens = [schema.name, ...args.slice(0, finalIndex + 1).filter((value) => value !== '')];
    this.emit(tokens.join(' ').trim());
  }

  private emitListSet(block: Blockly.Block) {
    const definition = this.requireListDefinition(block, 'LIST');
    if (!definition) {
      return;
    }
    const indexRef = this.valueFromInput(block, 'INDEX', '0');
    const valueRef = this.valueFromInput(block, 'VALUE', '0');
    const addr = this.emitListAddress(definition, indexRef);
    this.emit(`write ${valueRef} ${definition.cell} ${addr}`);
  }

  private emitListPush(block: Blockly.Block) {
    const definition = this.requireListDefinition(block, 'LIST');
    if (!definition) {
      return;
    }
    if (definition.kind !== 'dynamic') {
      this.error(`列表 '${definition.name}' 是定长列表，不支持 push。`, block);
      return;
    }
    const valueRef = this.valueFromInput(block, 'VALUE', '0');
    const addr = this.emitListAddress(definition, definition.lengthRef);
    this.emit(`write ${valueRef} ${definition.cell} ${addr}`);
    this.emit(`op add ${definition.lengthRef} ${definition.lengthRef} 1`);
  }

  private emitListPop(block: Blockly.Block) {
    const definition = this.requireListDefinition(block, 'LIST');
    if (!definition) {
      return;
    }
    if (definition.kind !== 'dynamic') {
      this.error(`列表 '${definition.name}' 是定长列表，不支持 pop。`, block);
      return;
    }
    const resultRef = this.variableName(block, 'RESULT');
    this.emit(`op sub ${definition.lengthRef} ${definition.lengthRef} 1`);
    const addr = this.emitListAddress(definition, definition.lengthRef);
    this.emit(`read ${resultRef} ${definition.cell} ${addr}`);
  }

  private emitListClear(block: Blockly.Block) {
    const definition = this.requireListDefinition(block, 'LIST');
    if (!definition) {
      return;
    }
    if (definition.kind !== 'dynamic') {
      this.error(`列表 '${definition.name}' 是定长列表，不支持 clear。`, block);
      return;
    }
    this.emit(`set ${definition.lengthRef} 0`);
  }

  private emitListValue(block: Blockly.Block): string {
    const definition = this.requireListDefinition(block, 'LIST');
    if (!definition) {
      return '0';
    }
    const indexRef = this.valueFromInput(block, 'INDEX', '0');
    const addr = this.emitListAddress(definition, indexRef);
    const temp = this.newTemp('list_value');
    this.emit(`read ${temp} ${definition.cell} ${addr}`);
    return temp;
  }

  private emitListLength(block: Blockly.Block): string {
    const definition = this.requireListDefinition(block, 'LIST');
    if (!definition) {
      return '0';
    }
    return definition.lengthRef;
  }

  private emitListAddress(definition: ListDefinition, indexRef: string): string {
    const addrTemp = this.newTemp('list_addr');
    this.emit(`op add ${addrTemp} ${definition.start} ${indexRef}`);
    return addrTemp;
  }

  private requireListDefinition(block: Blockly.Block, fieldName: string): ListDefinition | null {
    const listName = this.rawSymbol(String(block.getFieldValue(fieldName) || 'list'), 'list');
    const definition = this.listDefinitions.get(listName);
    if (!definition) {
      this.error(`列表 '${listName}' 尚未定义。`, block);
      return null;
    }
    return definition;
  }

  private emitInlineFunctionCall(block: Blockly.Block): string {
    const name = this.rawSymbol(String(block.getFieldValue('NAME') || 'fn'), 'fn');
    const definition = this.functionDefinitions.get(name);
    if (!definition) {
      this.error(`找不到 fun '${name}'。请先添加同名 fun 定义，或从 call 的函数候选中选择已有 fun。`, block);
      return '0';
    }

    if (this.inlineFunctionStack.some((context) => context.functionName === name)) {
      this.error(`fun '${name}' 当前不能递归调用；fun 语法糖会在生成阶段内联展开。请改用 while/for 或拆成非递归逻辑。`, block);
      return '0';
    }

    const resultTemp = this.newTemp(`fun_${name}_result`);
    const returnLabel = this.newLabel(`fun_${name}_return`);
    const args = new Map<string, string>();

    definition.params.forEach((param, index) => {
      const inputName = `ARG${index + 1}`;
      const target = block.getInputTargetBlock(inputName);
      if (!target) {
        this.warn(`调用 fun '${name}' 时缺少参数 '${param}' 的输入，已使用 0。请给 call 补上这个参数。`, block);
        args.set(param, '0');
        return;
      }
      args.set(param, this.emitValue(target));
    });

    for (let index = definition.params.length + 1; block.getInput(`ARG${index}`); index += 1) {
      if (block.getInputTargetBlock(`ARG${index}`)) {
        this.warn(`调用 fun '${name}' 的第 ${index} 个参数没有对应形参，已忽略。请同步 call 或调整 fun 形参数量。`, block);
      }
    }

    if (!definition.body) {
      this.warn(`fun '${name}' 没有任何语句，call 将返回默认值 0。`, block);
    }

    this.emit(`set ${resultTemp} 0`);
    this.inlineFunctionStack.push({
      functionName: name,
      args,
      returnTarget: resultTemp,
      returnLabel,
    });
    this.emitStatementChain(definition.body);
    this.inlineFunctionStack.pop();
    this.emitLabel(returnLabel);

    return resultTemp;
  }

  private emitFunctionReturn(block: Blockly.Block) {
    const context = this.currentInlineFunctionContext();
    if (!context) {
      this.error('return 只能放在 fun 内部。请把它移动到对应 fun 的语句区域里。', block);
      return;
    }

    const valueRef = this.valueFromInput(block, 'VALUE', '0');
    this.emit(`set ${context.returnTarget} ${valueRef}`);
    this.emit(`jump ${context.returnLabel} always 0 0`);
  }

  private currentInlineFunctionContext(): InlineFunctionContext | null {
    return this.inlineFunctionStack.length > 0
      ? this.inlineFunctionStack[this.inlineFunctionStack.length - 1]
      : null;
  }

  private emitIf(block: Blockly.Block) {
    const endLabel = this.newLabel('if_end');
    let clauseIndex = 0;

    while (block.getInput(`IF${clauseIndex}`)) {
      const condition = this.valueFromInput(block, `IF${clauseIndex}`, '0');
      const hasMoreClauses = !!block.getInput(`IF${clauseIndex + 1}`);
      const hasElse = !!block.getInput('ELSE');
      const nextLabel = hasMoreClauses || hasElse ? this.newLabel(`if_next_${clauseIndex}`) : endLabel;

      this.emit(`jump ${nextLabel} equal ${condition} 0`);
      this.emitStatementChain(block.getInputTargetBlock(`DO${clauseIndex}`));
      this.emit(`jump ${endLabel} always 0 0`);
      if (nextLabel !== endLabel) {
        this.emitLabel(nextLabel);
      }
      clauseIndex += 1;
    }

    if (block.getInput('ELSE')) {
      this.emitStatementChain(block.getInputTargetBlock('ELSE'));
    }

    this.emitLabel(endLabel);
  }

  private emitWhile(block: Blockly.Block) {
    const mode = block.getFieldValue('MODE') || 'WHILE';
    const startLabel = this.newLabel('while_start');
    const endLabel = this.newLabel('while_end');

    this.emitLabel(startLabel);
    const condition = this.valueFromInput(block, 'BOOL', '0');
    const op = mode === 'UNTIL' ? 'notEqual' : 'equal';
    this.emit(`jump ${endLabel} ${op} ${condition} 0`);
    this.emitStatementChain(block.getInputTargetBlock('DO'));
    this.emit(`jump ${startLabel} always 0 0`);
    this.emitLabel(endLabel);
  }

  private emitRepeat(block: Blockly.Block) {
    const limitTemp = this.newTemp('repeat_limit');
    const indexTemp = this.newTemp('repeat_index');
    const condTemp = this.newTemp('repeat_cond');
    const startLabel = this.newLabel('repeat_start');
    const endLabel = this.newLabel('repeat_end');

    const timesRef = this.valueFromInput(block, 'TIMES', '0');
    this.emit(`set ${limitTemp} ${timesRef}`);
    this.emit(`set ${indexTemp} 0`);
    this.emitLabel(startLabel);
    this.emit(`op lessThan ${condTemp} ${indexTemp} ${limitTemp}`);
    this.emit(`jump ${endLabel} equal ${condTemp} 0`);
    this.emitStatementChain(block.getInputTargetBlock('DO'));
    this.emit(`op add ${indexTemp} ${indexTemp} 1`);
    this.emit(`jump ${startLabel} always 0 0`);
    this.emitLabel(endLabel);
  }

  private emitForRange(block: Blockly.Block) {
    const loopVar = this.variableName(block, 'VAR');
    const endTemp = this.newTemp('for_end');
    const condTemp = this.newTemp('for_cond');
    const startLabel = this.newLabel('for_start');
    const endLabel = this.newLabel('for_end');
    const boundMode = block.getFieldValue('BOUND') || 'INCLUSIVE';
    const compareOp = boundMode === 'UNTIL' ? 'lessThan' : 'lessThanEq';

    const startRef = this.valueFromInput(block, 'START', '0');
    const endRef = this.valueFromInput(block, 'END', '0');

    this.emit(`set ${loopVar} ${startRef}`);
    this.emit(`set ${endTemp} ${endRef}`);
    this.emitLabel(startLabel);
    this.emit(`op ${compareOp} ${condTemp} ${loopVar} ${endTemp}`);
    this.emit(`jump ${endLabel} equal ${condTemp} 0`);
    this.emitStatementChain(block.getInputTargetBlock('DO'));
    this.emit(`op add ${loopVar} ${loopVar} 1`);
    this.emit(`jump ${startLabel} always 0 0`);
    this.emitLabel(endLabel);
  }

  private emitWhen(block: Blockly.Block) {
    const endLabel = this.newLabel('when_end');
    const targetTemp = this.newTemp('when_target');
    const targetRef = this.valueFromInput(block, 'TARGET', '0');
    this.emit(`set ${targetTemp} ${targetRef}`);

    const activeCases: number[] = [];
    for (let index = 1; block.getInput(`CASE${index}`) && block.getInput(`DO${index}`); index += 1) {
      const hasCase = !!block.getInputTargetBlock(`CASE${index}`);
      const hasBody = !!block.getInputTargetBlock(`DO${index}`);
      if (hasCase || hasBody) {
        activeCases.push(index);
      }
    }

    if (activeCases.length === 0 && !block.getInputTargetBlock('ELSE')) {
      this.warn('when ?????? case???? else?', block);
    }

    activeCases.forEach((index, casePosition) => {
      const caseRef = this.valueFromInput(block, `CASE${index}`, '0');
      const nextLabel = casePosition === activeCases.length - 1 && !block.getInputTargetBlock('ELSE')
        ? endLabel
        : this.newLabel(`when_next_${index}`);

      this.emit(`jump ${nextLabel} notEqual ${targetTemp} ${caseRef}`);
      this.emitStatementChain(block.getInputTargetBlock(`DO${index}`));
      this.emit(`jump ${endLabel} always 0 0`);
      if (nextLabel !== endLabel) {
        this.emitLabel(nextLabel);
      }
    });

    this.emitStatementChain(block.getInputTargetBlock('ELSE'));
    this.emitLabel(endLabel);
  }

  private valueFromInput(
    block: Blockly.Block,
    inputName: string,
    fallback: string,
  ): string {
    const target = block.getInputTargetBlock(inputName);
    if (!target) {
      this.warn(`积木 ${block.type} 缺少输入 '${inputName}'，已使用 ${fallback}。`, block);
      return fallback;
    }
    return this.emitValue(target);
  }

  private emitValue(block: Blockly.Block): string {
    switch (block.type) {
      case 'math_number': {
        const raw = String(block.getFieldValue('NUM') ?? '0').trim();
        return raw || '0';
      }
      case 'text': {
        return JSON.stringify(block.getFieldValue('TEXT') || '');
      }
      case 'logic_boolean': {
        return block.getFieldValue('BOOL') === 'TRUE' ? '1' : '0';
      }
      case 'variables_get': {
        return this.variableName(block, 'VAR');
      }
      case 'mlog_symbol': {
        return this.rawSymbol(block.getFieldValue('SYMBOL') || 'cell1', 'cell1');
      }
      case 'mlog_link': {
        return this.rawSymbol(block.getFieldValue('LINK') || 'cell1', 'cell1');
      }
      case 'mlog_global': {
        return this.rawSymbol(block.getFieldValue('NAME') || '@unit', '@unit');
      }
      case 'mlog_list_get': {
        return this.emitListValue(block);
      }
      case 'mlog_list_length': {
        return this.emitListLength(block);
      }
      case 'mlog_fun_arg': {
        const context = this.currentInlineFunctionContext();
        if (!context) {
          this.error('arg 只能放在 fun 内部，并由 call 内联展开时读取参数。请不要把 arg 当作顶层值积木使用。', block);
          return '0';
        }
        const name = this.rawSymbol(String(block.getFieldValue('NAME') || 'arg'), 'arg');
        const value = context.args.get(name);
        if (!value) {
          this.warn(`fun '${context.functionName}' 没有名为 '${name}' 的参数，已使用 0。请检查 arg 下拉选择，或在 fun 形参里添加该参数。`, block);
          return '0';
        }
        return value;
      }
      case 'math_arithmetic': {
        const left = this.valueFromInput(block, 'A', '0');
        const right = this.valueFromInput(block, 'B', '0');
        const opMap: Record<string, string> = {
          ADD: 'add',
          MINUS: 'sub',
          MULTIPLY: 'mul',
          DIVIDE: 'div',
          POWER: 'pow',
        };
        const op = opMap[block.getFieldValue('OP') || 'ADD'];
        if (!op) {
          this.error(`不支持的算术模式：${block.getFieldValue('OP')}`, block);
          return '0';
        }
        const temp = this.newTemp('math');
        this.emit(`op ${op} ${temp} ${left} ${right}`);
        return temp;
      }
      case 'logic_compare': {
        const left = this.valueFromInput(block, 'A', '0');
        const right = this.valueFromInput(block, 'B', '0');
        const opMap: Record<string, string> = {
          EQ: 'equal',
          NEQ: 'notEqual',
          LT: 'lessThan',
          LTE: 'lessThanEq',
          GT: 'greaterThan',
          GTE: 'greaterThanEq',
        };
        const op = opMap[block.getFieldValue('OP') || 'EQ'];
        if (!op) {
          this.error(`不支持的比较模式：${block.getFieldValue('OP')}`, block);
          return '0';
        }
        const temp = this.newTemp('cmp');
        this.emit(`op ${op} ${temp} ${left} ${right}`);
        return temp;
      }
      case 'logic_operation': {
        const left = this.valueFromInput(block, 'A', '0');
        const right = this.valueFromInput(block, 'B', '0');
        const opMap: Record<string, string> = {
          AND: 'land',
          OR: 'or',
        };
        const op = opMap[block.getFieldValue('OP') || 'AND'];
        if (!op) {
          this.error(`不支持的逻辑运算模式：${block.getFieldValue('OP')}`, block);
          return '0';
        }
        const temp = this.newTemp('logic');
        this.emit(`op ${op} ${temp} ${left} ${right}`);
        return temp;
      }
      case 'logic_negate': {
        const input = this.valueFromInput(block, 'BOOL', '0');
        const temp = this.newTemp('not');
        this.emit(`op equal ${temp} ${input} 0`);
        return temp;
      }
      default: {
        this.error(`不支持的值积木：${block.type}`, block);
        return '0';
      }
    }
  }

  private variableName(block: Blockly.Block, fieldName: string): string {
    const field = block.getField(fieldName);
    const raw = field?.getText() || field?.getValue() || 'unnamed';
    return this.rawSymbol(String(raw), 'unnamed');
  }

  private optionalSymbol(raw: string): string | null {
    const value = raw.trim().replace(/\s+/g, '_');
    return value ? value : null;
  }

  private rawSymbol(raw: string, fallback: string): string {
    const value = raw.trim().replace(/\s+/g, '_');
    return value || fallback;
  }

  private emit(line: string) {
    this.instructions.push(line);
  }

  private emitLabel(label: string) {
    this.instructions.push(`${label}:`);
    this.instructions.push('noop');
  }

  private newTemp(hint: string): string {
    const suffix = this.tempCounter++;
    return `__mlogb_${hint}_${suffix}`;
  }

  private newLabel(hint: string): string {
    const suffix = this.labelCounter++;
    return `__mlogb_${hint}_${suffix}`;
  }

  private warn(message: string, block?: Blockly.Block | null) {
    this.diagnostics.push({
      level: 'warning',
      message,
      blockId: block?.id,
      blockType: block?.type,
    });
  }

  private error(message: string, block?: Blockly.Block | null) {
    this.diagnostics.push({
      level: 'error',
      message,
      blockId: block?.id,
      blockType: block?.type,
    });
  }
}

export const generateMlog = (workspace: Blockly.Workspace): GenerationResult => {
  return new MlogEmitter(workspace).generate();
};
