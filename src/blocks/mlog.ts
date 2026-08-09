import * as Blockly from 'blockly';
import {getLogicLinks} from '../appState';
import {appendSuggestionsDropdown} from './fieldHelpers';
import {sensorPropertyOptions} from './mindustryData';

const definitions = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: 'mlog_comment',
    message0: '注释 %1',
    args0: [
      {
        type: 'field_input',
        name: 'TEXT',
        text: '注释',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: '输出一行 mlog 注释。',
    helpUrl: '',
  },
  {
    type: 'mlog_symbol',
    message0: '符号 %1',
    args0: [
      {
        type: 'field_input',
        name: 'SYMBOL',
        text: 'cell1',
      },
    ],
    output: null,
    colour: 36,
    tooltip: '原始 mlog 符号，例如 cell1、message1、switch1 或 @counter。',
    helpUrl: '',
  },
  {
    type: 'mlog_global',
    message0: '全局 %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'NAME',
        options: [
          ['@unit', '@unit'],
          ['@this', '@this'],
          ['@counter', '@counter'],
          ['@time', '@time'],
          ['@ipt', '@ipt'],
        ],
      },
    ],
    output: null,
    colour: 36,
    tooltip: '常用的 Mindustry 全局操作数。',
    helpUrl: '',
  },
  {
    type: 'mlog_print',
    message0: '打印 %1',
    args0: [
      {
        type: 'input_value',
        name: 'VALUE',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: '向逻辑文本缓冲区追加内容。',
    helpUrl: '',
  },
  {
    type: 'mlog_print_flush',
    message0: '打印刷新到 %1',
    args0: [
      {
        type: 'input_value',
        name: 'TARGET',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: '把逻辑文本缓冲区刷新到 message 或 display。',
    helpUrl: '',
  },
  {
    type: 'mlog_read',
    message0: '从 %2 地址 %3 读取到 %1',
    args0: [
      {
        type: 'field_variable',
        name: 'RESULT',
        variable: 'result',
      },
      {
        type: 'input_value',
        name: 'CELL',
      },
      {
        type: 'input_value',
        name: 'ADDR',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: '从内存方块读取一个值。',
    helpUrl: '',
  },
  {
    type: 'mlog_write',
    message0: '把 %1 写入 %2 地址 %3',
    args0: [
      {
        type: 'input_value',
        name: 'VALUE',
      },
      {
        type: 'input_value',
        name: 'CELL',
      },
      {
        type: 'input_value',
        name: 'ADDR',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: '向内存方块写入一个值。',
    helpUrl: '',
  },
  {
    type: 'mlog_sensor',
    message0: '传感 %2 的 %3 到 %1',
    args0: [
      {
        type: 'field_variable',
        name: 'RESULT',
        variable: 'sense',
      },
      {
        type: 'input_value',
        name: 'TARGET',
      },
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: sensorPropertyOptions,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: '读取单位或建筑的一项属性。',
    helpUrl: '',
  },
  {
    type: 'mlog_for_range',
    message0: 'for %1 in %2 %3 %4',
    args0: [
      {
        type: 'field_variable',
        name: 'VAR',
        variable: 'i',
      },
      {
        type: 'input_value',
        name: 'START',
      },
      {
        type: 'field_dropdown',
        name: 'BOUND',
        options: [
          ['..', 'INCLUSIVE'],
          ['until', 'UNTIL'],
        ],
      },
      {
        type: 'input_value',
        name: 'END',
      },
    ],
    message1: 'do %1',
    args1: [
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 280,
    tooltip: 'Kotlin 风格的 for 语法糖，步长固定为 +1。',
    helpUrl: '',
  },
  {
    type: 'mlog_end',
    message0: '结束程序',
    previousStatement: null,
    colour: 0,
    tooltip: '终止当前逻辑程序。',
    helpUrl: '',
  },
]);

const linkOptions = () => getLogicLinks().map((link) => [link, link] as [string, string]);
const listColour = '#8b5cf6';
const referenceColour = 36;
const functionColour = '#ec4899';

const controlColour = 280;
const defaultWhenExtraCaseCount = 2;

interface WhenMutatorState {
  extraCaseCount?: number;
  hasElse?: boolean;
}

interface MlogWhenBlock extends Blockly.Block {
  extraCaseCount_: number;
  elseCount_: number;
  updateShape_: () => void;
  rebuildShape_: () => void;
  reconnectChildBlocks_: (
    caseConnections: Array<Blockly.Connection | null>,
    statementConnections: Array<Blockly.Connection | null>,
    elseConnection: Blockly.Connection | null,
  ) => void;
}

interface MlogWhenCaseMutatorBlock extends Blockly.Block {
  valueConnection_?: Blockly.Connection | null;
  statementConnection_?: Blockly.Connection | null;
}

interface MlogWhenElseMutatorBlock extends Blockly.Block {
  statementConnection_?: Blockly.Connection | null;
}

const initSvgIfPossible = (block: Blockly.Block) => {
  const svgBlock = block as Blockly.BlockSvg & {initSvg?: () => void};
  svgBlock.initSvg?.();
};

const normalizeWhenExtraCaseCount = (count: number) => {
  return Math.max(0, Math.floor(Number.isFinite(count) ? count : defaultWhenExtraCaseCount));
};

const whenMutatorMixin = {
  extraCaseCount_: defaultWhenExtraCaseCount,
  elseCount_: 0,

  mutationToDom(this: MlogWhenBlock) {
    if (this.extraCaseCount_ === defaultWhenExtraCaseCount && !this.elseCount_) {
      return null;
    }
    const container = Blockly.utils.xml.createElement('mutation');
    if (this.extraCaseCount_ !== defaultWhenExtraCaseCount) {
      container.setAttribute('cases', String(this.extraCaseCount_));
    }
    if (this.elseCount_) {
      container.setAttribute('else', '1');
    }
    return container;
  },

  domToMutation(this: MlogWhenBlock, xmlElement: Element) {
    this.extraCaseCount_ = normalizeWhenExtraCaseCount(
      parseInt(xmlElement.getAttribute('cases') || String(defaultWhenExtraCaseCount), 10),
    );
    this.elseCount_ = xmlElement.getAttribute('else') === '1' ? 1 : 0;
    this.rebuildShape_();
  },

  saveExtraState(this: MlogWhenBlock): WhenMutatorState | null {
    if (this.extraCaseCount_ === defaultWhenExtraCaseCount && !this.elseCount_) {
      return null;
    }
    return {
      extraCaseCount: this.extraCaseCount_,
      hasElse: this.elseCount_ === 1,
    };
  },

  loadExtraState(this: MlogWhenBlock, state: WhenMutatorState) {
    this.extraCaseCount_ = normalizeWhenExtraCaseCount(
      state.extraCaseCount ?? defaultWhenExtraCaseCount,
    );
    this.elseCount_ = state.hasElse ? 1 : 0;
    this.updateShape_();
  },

  decompose(this: MlogWhenBlock, workspace: Blockly.Workspace) {
    const topBlock = workspace.newBlock('mlog_when_when');
    initSvgIfPossible(topBlock);
    let connection = topBlock.getInput('STACK')?.connection ?? null;

    for (let offset = 0; offset < this.extraCaseCount_; offset += 1) {
      const caseBlock = workspace.newBlock('mlog_when_case') as MlogWhenCaseMutatorBlock;
      initSvgIfPossible(caseBlock);
      if (connection && caseBlock.previousConnection) {
        connection.connect(caseBlock.previousConnection);
      }
      connection = caseBlock.nextConnection;
    }

    if (this.elseCount_) {
      const elseBlock = workspace.newBlock('mlog_when_else') as MlogWhenElseMutatorBlock;
      initSvgIfPossible(elseBlock);
      if (connection && elseBlock.previousConnection) {
        connection.connect(elseBlock.previousConnection);
      }
    }

    return topBlock;
  },

  compose(this: MlogWhenBlock, topBlock: Blockly.Block) {
    let clauseBlock = topBlock.getInputTargetBlock('STACK');
    const caseConnections: Array<Blockly.Connection | null> = [];
    const statementConnections: Array<Blockly.Connection | null> = [];
    let elseConnection: Blockly.Connection | null = null;

    this.extraCaseCount_ = 0;
    this.elseCount_ = 0;

    while (clauseBlock) {
      if (!clauseBlock.isInsertionMarker()) {
        switch (clauseBlock.type) {
          case 'mlog_when_case': {
            const caseBlock = clauseBlock as MlogWhenCaseMutatorBlock;
            this.extraCaseCount_ += 1;
            caseConnections.push(caseBlock.valueConnection_ ?? null);
            statementConnections.push(caseBlock.statementConnection_ ?? null);
            break;
          }
          case 'mlog_when_else': {
            const elseBlock = clauseBlock as MlogWhenElseMutatorBlock;
            this.elseCount_ = 1;
            elseConnection = elseBlock.statementConnection_ ?? null;
            break;
          }
          default:
            throw new TypeError(`Unknown when mutator block type: ${clauseBlock.type}`);
        }
      }
      clauseBlock = clauseBlock.getNextBlock();
    }

    this.updateShape_();
    this.reconnectChildBlocks_(caseConnections, statementConnections, elseConnection);
  },

  saveConnections(this: MlogWhenBlock, topBlock: Blockly.Block) {
    let clauseBlock = topBlock.getInputTargetBlock('STACK');
    let index = 2;

    while (clauseBlock) {
      if (!clauseBlock.isInsertionMarker()) {
        switch (clauseBlock.type) {
          case 'mlog_when_case': {
            const caseBlock = clauseBlock as MlogWhenCaseMutatorBlock;
            const caseInput = this.getInput(`CASE${index}`);
            const doInput = this.getInput(`DO${index}`);
            caseBlock.valueConnection_ = caseInput?.connection?.targetConnection ?? null;
            caseBlock.statementConnection_ = doInput?.connection?.targetConnection ?? null;
            index += 1;
            break;
          }
          case 'mlog_when_else': {
            const elseBlock = clauseBlock as MlogWhenElseMutatorBlock;
            const elseInput = this.getInput('ELSE');
            elseBlock.statementConnection_ = elseInput?.connection?.targetConnection ?? null;
            break;
          }
          default:
            throw new TypeError(`Unknown when mutator block type: ${clauseBlock.type}`);
        }
      }
      clauseBlock = clauseBlock.getNextBlock();
    }
  },

  rebuildShape_(this: MlogWhenBlock) {
    const caseConnections: Array<Blockly.Connection | null> = [];
    const statementConnections: Array<Blockly.Connection | null> = [];
    const elseConnection = this.getInput('ELSE')?.connection?.targetConnection ?? null;

    for (let index = 2; this.getInput(`CASE${index}`); index += 1) {
      const caseInput = this.getInput(`CASE${index}`);
      const doInput = this.getInput(`DO${index}`);
      caseConnections.push(caseInput?.connection?.targetConnection ?? null);
      statementConnections.push(doInput?.connection?.targetConnection ?? null);
    }

    this.updateShape_();
    this.reconnectChildBlocks_(caseConnections, statementConnections, elseConnection);
  },

  updateShape_(this: MlogWhenBlock) {
    if (this.getInput('ELSE')) {
      this.removeInput('ELSE');
    }
    for (let index = 2; this.getInput(`CASE${index}`); index += 1) {
      this.removeInput(`CASE${index}`);
      this.removeInput(`DO${index}`);
    }
    for (let offset = 0; offset < this.extraCaseCount_; offset += 1) {
      const index = offset + 2;
      this.appendValueInput(`CASE${index}`).appendField('case');
      this.appendStatementInput(`DO${index}`).appendField('do');
    }
    if (this.elseCount_) {
      this.appendStatementInput('ELSE').appendField('else');
    }
  },

  reconnectChildBlocks_(
    this: MlogWhenBlock,
    caseConnections: Array<Blockly.Connection | null>,
    statementConnections: Array<Blockly.Connection | null>,
    elseConnection: Blockly.Connection | null,
  ) {
    for (let offset = 0; offset < this.extraCaseCount_; offset += 1) {
      caseConnections[offset]?.reconnect(this, `CASE${offset + 2}`);
      statementConnections[offset]?.reconnect(this, `DO${offset + 2}`);
    }
    elseConnection?.reconnect(this, 'ELSE');
  },
};

const whenMutatorExtension = function (this: MlogWhenBlock) {
  this.extraCaseCount_ = defaultWhenExtraCaseCount;
  this.elseCount_ = 0;
  this.updateShape_();
};

const defaultFunParamNames = ['a', 'b'];

interface FunctionMutatorState {
  params?: string[];
}

interface FunctionCallState {
  args?: string[];
}

interface MlogFunDefineBlock extends Blockly.Block {
  paramNames_: string[];
  updateParamInputs_: (paramNames?: string[]) => void;
  getParamNames_: () => string[];
}

interface MlogFunParamMutatorBlock extends Blockly.Block {}

interface MlogFunCallBlock extends Blockly.Block {
  argNames_: string[];
  updateArgInputs_: (argNames?: string[]) => void;
  syncArguments_: () => void;
}

const normalizeFunSymbol = (raw: string) => raw.trim().replace(/\s+/g, '_');

const normalizeFunParamNames = (names: string[], fallbackNames: string[] = []) => {
  const source = names.length > 0 ? names : fallbackNames;
  return source.map((name, index) => String(name || '').trim() || `param${index + 1}`);
};

const sameStringArray = (left: string[], right: string[]) => {
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

const getFunDefinitionParamNames = (block: Blockly.Block): string[] => {
  const names: string[] = [];
  for (let index = 1; block.getField(`PARAM${index}`); index += 1) {
    const raw = String(block.getFieldValue(`PARAM${index}`) || '').trim();
    names.push(raw || `param${index}`);
  }
  return names;
};

const getEnclosingFunctionDefinitionBlock = (block: Blockly.Block | null): Blockly.Block | null => {
  let current: Blockly.Block | null = block;
  while (current) {
    if (current.type === 'mlog_fun_define') {
      return current;
    }
    current = current.getSurroundParent() ?? current.getParent();
  }
  return null;
};

const uniqueFunParamNames = (names: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  names.forEach((name) => {
    const normalized = String(name || '').trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const getWorkspaceFunctionNames = (
  workspace: Blockly.Workspace | null | undefined,
  excludeBlock?: Blockly.Block | null,
) => {
  if (!workspace) {
    return [];
  }

  const names: string[] = [];
  workspace.getAllBlocks(false).forEach((candidate) => {
    if (candidate.type !== 'mlog_fun_define' || candidate === excludeBlock) {
      return;
    }
    const name = String(candidate.getFieldValue('NAME') || '').trim();
    if (!name) {
      return;
    }
    names.push(name);
  });
  return uniqueFunParamNames(names);
};

const funNameOptions = (block: Blockly.Block | null, defaultName = 'sum') => {
  const currentValue = String(block?.getFieldValue('NAME') || defaultName).trim() || defaultName;
  return uniqueFunParamNames([
    ...getWorkspaceFunctionNames(block?.workspace, block),
    currentValue,
  ]).map((name) => [name, name] as [string, string]);
};

const getWorkspaceFunParamNames = (workspace: Blockly.Workspace | null | undefined) => {
  if (!workspace) {
    return [];
  }

  const names: string[] = [];
  workspace.getAllBlocks(false).forEach((candidate) => {
    if (candidate.type !== 'mlog_fun_define') {
      return;
    }
    names.push(...getFunDefinitionParamNames(candidate));
  });
  return uniqueFunParamNames(names);
};

const getAvailableFunArgOptions = (
  block: Blockly.Block | null,
  currentValue = defaultFunParamNames[0],
): Array<[string, string]> => {
  const enclosingFunction = getEnclosingFunctionDefinitionBlock(block);
  const localNames = enclosingFunction ? getFunDefinitionParamNames(enclosingFunction) : [];
  const workspaceNames = getWorkspaceFunParamNames(block?.workspace);
  const merged = uniqueFunParamNames([...localNames, ...workspaceNames, currentValue]);
  return (merged.length > 0 ? merged : [defaultFunParamNames[0]]).map((name) => [name, name] as [string, string]);
};

const funArgOptions = (block: Blockly.Block, defaultName = defaultFunParamNames[0]) => {
  const currentValue = String(block.getFieldValue('NAME') || defaultName).trim() || defaultName;
  return getAvailableFunArgOptions(block, currentValue);
};

const findFunctionDefinitionBlock = (workspace: Blockly.Workspace, name: string): Blockly.Block | null => {
  const targetName = normalizeFunSymbol(name);
  if (!targetName) {
    return null;
  }

  for (const block of workspace.getAllBlocks(false)) {
    if (block.type !== 'mlog_fun_define') {
      continue;
    }
    if (normalizeFunSymbol(String(block.getFieldValue('NAME') || '')) === targetName) {
      return block;
    }
  }

  return null;
};

const funMutatorMixin = {
  paramNames_: [...defaultFunParamNames],

  mutationToDom(this: MlogFunDefineBlock) {
    const params = this.getParamNames_();
    if (sameStringArray(params, defaultFunParamNames)) {
      return null;
    }
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('count', String(params.length));
    params.forEach((param) => {
      const child = Blockly.utils.xml.createElement('arg');
      child.setAttribute('name', param);
      container.appendChild(child);
    });
    return container;
  },

  domToMutation(this: MlogFunDefineBlock, xmlElement: Element) {
    const params: string[] = [];
    for (let index = 0; index < xmlElement.childNodes.length; index += 1) {
      const node = xmlElement.childNodes[index];
      if (node.nodeName.toLowerCase() !== 'arg') {
        continue;
      }
      const element = node as Element;
      params.push(String(element.getAttribute('name') || '').trim() || `param${params.length + 1}`);
    }

    const explicitCount = parseInt(xmlElement.getAttribute('count') || String(params.length), 10);
    const targetCount = Number.isFinite(explicitCount) ? Math.max(0, explicitCount) : params.length;
    while (params.length < targetCount) {
      params.push(`param${params.length + 1}`);
    }

    this.updateParamInputs_(normalizeFunParamNames(params, []));
  },

  saveExtraState(this: MlogFunDefineBlock): FunctionMutatorState | null {
    const params = this.getParamNames_();
    return sameStringArray(params, defaultFunParamNames)
      ? null
      : {params};
  },

  loadExtraState(this: MlogFunDefineBlock, state: FunctionMutatorState) {
    const params = Array.isArray(state.params)
      ? normalizeFunParamNames(state.params, [])
      : [...defaultFunParamNames];
    this.updateParamInputs_(params);
  },

  decompose(this: MlogFunDefineBlock, workspace: Blockly.Workspace) {
    const topBlock = workspace.newBlock('mlog_fun_params_container');
    initSvgIfPossible(topBlock);
    let connection = topBlock.getInput('STACK')?.connection ?? null;

    this.getParamNames_().forEach((paramName) => {
      const paramBlock = workspace.newBlock('mlog_fun_param') as MlogFunParamMutatorBlock;
      initSvgIfPossible(paramBlock);
      paramBlock.setFieldValue(paramName, 'NAME');
      if (connection && paramBlock.previousConnection) {
        connection.connect(paramBlock.previousConnection);
      }
      connection = paramBlock.nextConnection;
    });

    return topBlock;
  },

  compose(this: MlogFunDefineBlock, topBlock: Blockly.Block) {
    const params: string[] = [];
    let paramBlock = topBlock.getInputTargetBlock('STACK');

    while (paramBlock) {
      if (!paramBlock.isInsertionMarker()) {
        if (paramBlock.type !== 'mlog_fun_param') {
          throw new TypeError(`Unknown fun mutator block type: ${paramBlock.type}`);
        }
        const raw = String(paramBlock.getFieldValue('NAME') || '').trim();
        params.push(raw || `param${params.length + 1}`);
      }
      paramBlock = paramBlock.getNextBlock();
    }

    this.updateParamInputs_(params);
  },

  updateParamInputs_(this: MlogFunDefineBlock, paramNames?: string[]) {
    const nextParamNames = Array.isArray(paramNames)
      ? normalizeFunParamNames(paramNames, [])
      : this.getParamNames_();

    for (let index = 1; this.getInput(`PARAM_INPUT${index}`); index += 1) {
      this.removeInput(`PARAM_INPUT${index}`);
    }

    this.paramNames_ = [...nextParamNames];
    nextParamNames.forEach((paramName, index) => {
      const inputName = `PARAM_INPUT${index + 1}`;
      this.appendDummyInput(inputName)
        .appendField(`param${index + 1}`)
        .appendField(textField(paramName), `PARAM${index + 1}`);
      this.moveInputBefore(inputName, 'DO');
    });
  },

  getParamNames_(this: MlogFunDefineBlock) {
    const seed = Array.isArray(this.paramNames_) ? this.paramNames_ : defaultFunParamNames;
    const params = seed.map((paramName, index) => {
      const raw = String(this.getFieldValue(`PARAM${index + 1}`) || paramName || '').trim();
      return raw || `param${index + 1}`;
    });
    this.paramNames_ = [...params];
    return params;
  },
};

const funMutatorExtension = function (this: MlogFunDefineBlock) {
  this.paramNames_ = [...defaultFunParamNames];
  this.updateParamInputs_(this.paramNames_);
};

const textField = (text: string) => new Blockly.FieldTextInput(text);
const variableField = (name: string) => new Blockly.FieldVariable(name);

export const registerMlogBlocks = () => {
  Blockly.common.defineBlocks(definitions);

  Blockly.Blocks.mlog_link = {
    init() {
      const input = this.appendDummyInput();
      input.appendField('链接');
      input.appendField(textField('cell1'), 'LINK');
      appendSuggestionsDropdown(input, this, 'LINK', linkOptions, '候选');
      this.setOutput(true);
      this.setColour(referenceColour);
      this.setTooltip('从自定义 links 列表中选择或输入一个已连接建筑名。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_when_when = {
    init() {
      this.appendDummyInput().appendField('when');
      this.appendStatementInput('STACK');
      this.setColour(controlColour);
      this.contextMenu = false;
    },
  };

  Blockly.Blocks.mlog_when_case = {
    init() {
      this.appendDummyInput().appendField('case');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(controlColour);
      this.contextMenu = false;
    },
  };

  Blockly.Blocks.mlog_when_else = {
    init() {
      this.appendDummyInput().appendField('else');
      this.setPreviousStatement(true);
      this.setColour(controlColour);
      this.contextMenu = false;
    },
  };

  if (!Blockly.Extensions.isRegistered('mlog_when_mutator')) {
    Blockly.Extensions.registerMutator(
      'mlog_when_mutator',
      whenMutatorMixin,
      whenMutatorExtension,
      ['mlog_when_case', 'mlog_when_else'],
    );
  }

  Blockly.Blocks.mlog_when = {
    init(this: MlogWhenBlock) {
      this.appendValueInput('TARGET').appendField('when');
      this.appendValueInput('CASE1').appendField('case');
      this.appendStatementInput('DO1').appendField('do');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(controlColour);
      this.setTooltip('简化版 Kotlin 风格 when。');
      this.setHelpUrl('');
      Blockly.Extensions.apply('mlog_when_mutator', this, true);
    },
  };

  Blockly.Blocks.mlog_list_define = {
    init() {
      const input = this.appendDummyInput();
      input.appendField('定长列表');
      input.appendField(textField('items'), 'NAME');
      input.appendField('存储到');
      input.appendField(textField('cell1'), 'CELL');
      appendSuggestionsDropdown(input, this, 'CELL', linkOptions, '链接');
      input.appendField('起始');
      input.appendField(textField('0'), 'START');
      input.appendField('长度');
      input.appendField(textField('8'), 'LENGTH');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setInputsInline(true);
      this.setColour(listColour);
      this.setTooltip('声明一个定长列表，使用 memory cell/bank 作为底层存储。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_define_dynamic = {
    init() {
      let input = this.appendDummyInput();
      input.appendField('动态列表');
      input.appendField(textField('queue'), 'NAME');
      input.appendField('存储到');
      input.appendField(textField('cell1'), 'CELL');
      appendSuggestionsDropdown(input, this, 'CELL', linkOptions, '链接');
      input.appendField('起始');
      input.appendField(textField('0'), 'START');
      input = this.appendDummyInput();
      input.appendField('容量');
      input.appendField(textField('64'), 'CAPACITY');
      input.appendField('长度变量');
      input.appendField(variableField('queue_length'), 'LENGTH_VAR');
      input.appendField('初始长度');
      input.appendField(textField('0'), 'INITIAL_LENGTH');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(listColour);
      this.setTooltip('声明一个动态列表，并使用一个变量保存当前长度。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_set = {
    init() {
      this.appendDummyInput()
        .appendField('列表')
        .appendField(textField('items'), 'LIST');
      this.appendValueInput('INDEX').appendField('索引');
      this.appendValueInput('VALUE').appendField('设为');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setInputsInline(true);
      this.setColour(listColour);
      this.setTooltip('设置列表中的某一项。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_get = {
    init() {
      this.appendDummyInput()
        .appendField('列表')
        .appendField(textField('items'), 'LIST');
      this.appendValueInput('INDEX').appendField('索引');
      this.setInputsInline(true);
      this.setOutput(true);
      this.setColour(listColour);
      this.setTooltip('读取列表中的某一项。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_length = {
    init() {
      this.appendDummyInput()
        .appendField('列表')
        .appendField(textField('items'), 'LIST')
        .appendField('长度');
      this.setOutput(true);
      this.setColour(listColour);
      this.setTooltip('读取列表长度。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_push = {
    init() {
      this.appendDummyInput()
        .appendField('向列表')
        .appendField(textField('queue'), 'LIST')
        .appendField('追加');
      this.appendValueInput('VALUE');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setInputsInline(true);
      this.setColour(listColour);
      this.setTooltip('向动态列表末尾追加一项。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_pop = {
    init() {
      this.appendDummyInput()
        .appendField('从列表')
        .appendField(textField('queue'), 'LIST')
        .appendField('弹出到')
        .appendField(variableField('item'), 'RESULT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(listColour);
      this.setTooltip('从动态列表末尾弹出一项。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_list_clear = {
    init() {
      this.appendDummyInput()
        .appendField('清空动态列表')
        .appendField(textField('queue'), 'LIST');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(listColour);
      this.setTooltip('把动态列表长度重置为 0。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_fun_params_container = {
    init() {
      this.appendDummyInput().appendField('params');
      this.appendStatementInput('STACK');
      this.setColour(functionColour);
      this.contextMenu = false;
    },
  };

  Blockly.Blocks.mlog_fun_param = {
    init() {
      this.appendDummyInput()
        .appendField('param')
        .appendField(textField('a'), 'NAME');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(functionColour);
      this.contextMenu = false;
    },
  };

  if (!Blockly.Extensions.isRegistered('mlog_fun_mutator')) {
    Blockly.Extensions.registerMutator(
      'mlog_fun_mutator',
      funMutatorMixin,
      funMutatorExtension,
      ['mlog_fun_param'],
    );
  }

  Blockly.Blocks.mlog_fun_define = {
    init(this: MlogFunDefineBlock) {
      const input = this.appendDummyInput('TOP');
      input
        .appendField('fun')
        .appendField(textField('sum'), 'NAME');
      appendSuggestionsDropdown(input, this, 'NAME', () => funNameOptions(this, 'sum'), '函数');
      this.appendStatementInput('DO').appendField('do');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(functionColour);
      this.setTooltip('fun 语法糖：编译期内联展开，当前不支持递归。');
      this.setHelpUrl('');
      Blockly.Extensions.apply('mlog_fun_mutator', this, true);
    },
  };

  Blockly.Blocks.mlog_fun_call = {
    init(this: MlogFunCallBlock) {
      const input = this.appendDummyInput('TOP');
      input
        .appendField('call')
        .appendField(textField('sum'), 'NAME');
      appendSuggestionsDropdown(input, this, 'NAME', () => funNameOptions(this, 'sum'), '函数');
      this.appendDummyInput('RESULT_ROW')
        .appendField('->')
        .appendField(variableField('result'), 'RESULT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(functionColour);
      this.setTooltip('调用 fun 语法糖。调用会在生成阶段内联展开，返回值写入右侧变量。');
      this.setHelpUrl('');
      this.argNames_ = [...defaultFunParamNames];
      this.updateArgInputs_(this.argNames_);
    },

    mutationToDom(this: MlogFunCallBlock) {
      const args = Array.isArray(this.argNames_) ? this.argNames_ : defaultFunParamNames;
      if (sameStringArray(args, defaultFunParamNames)) {
        return null;
      }
      const container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('count', String(args.length));
      args.forEach((argName) => {
        const child = Blockly.utils.xml.createElement('arg');
        child.setAttribute('name', argName);
        container.appendChild(child);
      });
      return container;
    },

    domToMutation(this: MlogFunCallBlock, xmlElement: Element) {
      const args: string[] = [];
      for (let index = 0; index < xmlElement.childNodes.length; index += 1) {
        const node = xmlElement.childNodes[index];
        if (node.nodeName.toLowerCase() !== 'arg') {
          continue;
        }
        const element = node as Element;
        args.push(String(element.getAttribute('name') || '').trim() || `param${args.length + 1}`);
      }

      const explicitCount = parseInt(xmlElement.getAttribute('count') || String(args.length), 10);
      const targetCount = Number.isFinite(explicitCount) ? Math.max(0, explicitCount) : args.length;
      while (args.length < targetCount) {
        args.push(`param${args.length + 1}`);
      }

      this.updateArgInputs_(normalizeFunParamNames(args, []));
    },

    saveExtraState(this: MlogFunCallBlock): FunctionCallState | null {
      const args = Array.isArray(this.argNames_) ? this.argNames_ : defaultFunParamNames;
      return sameStringArray(args, defaultFunParamNames)
        ? null
        : {args: [...args]};
    },

    loadExtraState(this: MlogFunCallBlock, state: FunctionCallState) {
      const args = Array.isArray(state.args)
        ? normalizeFunParamNames(state.args, [])
        : [...defaultFunParamNames];
      this.updateArgInputs_(args);
    },

    updateArgInputs_(this: MlogFunCallBlock, argNames?: string[]) {
      const previousArgNames = Array.isArray(this.argNames_) ? this.argNames_ : [];
      const previousEntries: Array<{name: string; connection: Blockly.Connection | null}> = [];
      for (let index = 1; this.getInput(`ARG${index}`); index += 1) {
        previousEntries.push({
          name: previousArgNames[index - 1] || `param${index}`,
          connection: this.getInput(`ARG${index}`)?.connection?.targetConnection ?? null,
        });
      }
      for (let index = 1; this.getInput(`ARG${index}`); index += 1) {
        this.removeInput(`ARG${index}`);
      }

      const nextArgNames = Array.isArray(argNames)
        ? normalizeFunParamNames(argNames, [])
        : [...previousArgNames];
      this.argNames_ = [...nextArgNames];

      const usedIndices = new Set<number>();
      nextArgNames.forEach((argName, index) => {
        const inputName = `ARG${index + 1}`;
        this.appendValueInput(inputName)
          .appendField('arg')
          .appendField(argName);
        this.moveInputBefore(inputName, 'RESULT_ROW');

        let reconnectIndex = previousEntries.findIndex(
          (entry, entryIndex) => !usedIndices.has(entryIndex) && entry.name === argName && !!entry.connection,
        );
        if (
          reconnectIndex < 0 &&
          index < previousEntries.length &&
          !usedIndices.has(index) &&
          previousEntries[index].connection
        ) {
          reconnectIndex = index;
        }
        if (reconnectIndex >= 0) {
          usedIndices.add(reconnectIndex);
          previousEntries[reconnectIndex].connection?.reconnect(this, inputName);
        }
      });
    },

    syncArguments_(this: MlogFunCallBlock) {
      const workspace = this.workspace as Blockly.Workspace & {isFlyout?: boolean};
      if (!workspace || workspace.isFlyout) {
        return;
      }
      const definition = findFunctionDefinitionBlock(workspace, String(this.getFieldValue('NAME') || ''));
      if (!definition) {
        return;
      }
      const nextArgNames = getFunDefinitionParamNames(definition);
      const currentArgNames = Array.isArray(this.argNames_) ? this.argNames_ : [];
      if (!sameStringArray(currentArgNames, nextArgNames)) {
        this.updateArgInputs_(nextArgNames);
      }
    },

    onchange(this: MlogFunCallBlock) {
      this.syncArguments_();
    },
  };

  Blockly.Blocks.mlog_fun_return = {
    init() {
      this.appendValueInput('VALUE').appendField('return');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(functionColour);
      this.setTooltip('从当前 fun 返回一个值。');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks.mlog_fun_arg = {
    init() {
      const input = this.appendDummyInput();
      input
        .appendField('arg')
        .appendField(textField('a'), 'NAME');
      appendSuggestionsDropdown(input, this, 'NAME', () => funArgOptions(this), '参数');
      this.setOutput(true);
      this.setColour(functionColour);
      this.setTooltip('引用当前 fun 调用传入的参数。参数名需要与 fun 定义中的参数名一致。');
      this.setHelpUrl('');
    },
  };
};
