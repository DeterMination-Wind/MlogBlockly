import * as Blockly from 'blockly';
import * as ZhHans from 'blockly/msg/zh-hans';
import {registerMlogBlocks} from './blocks/mlog';
import {registerVanillaBlocks} from './blocks/vanilla';
import {generateMlog} from './mlog/generator';
import {
  clearLocalStorage,
  loadFromLocalStorage,
  loadWorkspaceData,
  saveToLocalStorage,
  serializeWorkspace,
} from './serialization';
import {toolbox} from './toolbox';
import {
  getLogicLinks,
  getLogicLinksText,
  setLogicLinksFromText,
  subscribeLogicLinks,
} from './appState';
import './index.css';

Blockly.setLocale(ZhHans);
Object.assign(Blockly.Msg, {
  CONTROLS_IF_MSG_IF: 'if',
  CONTROLS_IF_MSG_THEN: 'then',
  CONTROLS_IF_MSG_ELSEIF: 'else if',
  CONTROLS_IF_MSG_ELSE: 'else',
  CONTROLS_IF_IF_TITLE_IF: 'if',
  CONTROLS_IF_ELSEIF_TITLE_ELSEIF: 'else if',
  CONTROLS_IF_ELSE_TITLE_ELSE: 'else',
  CONTROLS_REPEAT_TITLE: 'repeat %1',
  CONTROLS_REPEAT_INPUT_DO: 'do',
  CONTROLS_WHILEUNTIL_OPERATOR_WHILE: 'while',
  CONTROLS_WHILEUNTIL_OPERATOR_UNTIL: 'until',
  CONTROLS_WHILEUNTIL_INPUT_DO: 'do',
});
registerMlogBlocks();
registerVanillaBlocks();

const blocklyDiv = document.getElementById('blocklyDiv');
const codeNode = document.querySelector('#generatedCode code');
const diagnosticsDiv = document.getElementById('diagnostics');
const codeMeta = document.getElementById('codeMeta');
const diagnosticMeta = document.getElementById('diagnosticMeta');
const linksMeta = document.getElementById('linksMeta');
const logicLinksInput = document.getElementById('logicLinksInput') as HTMLTextAreaElement | null;
const newWorkspaceBtn = document.getElementById('newWorkspaceBtn');
const importWorkspaceBtn = document.getElementById('importWorkspaceBtn');
const exportWorkspaceBtn = document.getElementById('exportWorkspaceBtn');
const copyMlogBtn = document.getElementById('copyMlogBtn');
const downloadMlogBtn = document.getElementById('downloadMlogBtn');
const workspaceFileInput = document.getElementById('workspaceFileInput') as HTMLInputElement | null;

if (!blocklyDiv || !codeNode || !diagnosticsDiv || !codeMeta || !diagnosticMeta) {
  throw new Error('App shell is missing required DOM nodes.');
}

const workspace = Blockly.inject(blocklyDiv, {
  toolbox,
  media: 'media/',
  grid: {
    spacing: 24,
    length: 3,
    colour: '#d1d5db',
    snap: true,
  },
  zoom: {
    controls: true,
    wheel: true,
    startScale: 0.92,
    maxScale: 1.75,
    minScale: 0.35,
    scaleSpeed: 1.1,
  },
  move: {
    drag: true,
    wheel: true,
  },
  trashcan: true,
  renderer: 'geras',
});

const renderLinksMeta = (links: string[] = getLogicLinks()) => {
  if (linksMeta) {
    linksMeta.textContent = `${links.length} 个候选`;
  }
};

const diagnosticWarningId = 'mlog-generator';
let diagnosticWarningBlockIds = new Set<string>();

const runWithoutBlocklyEvents = (callback: () => void) => {
  const shouldReenable = Blockly.Events.isEnabled();
  if (shouldReenable) {
    Blockly.Events.disable();
  }

  try {
    callback();
  } finally {
    if (shouldReenable) {
      Blockly.Events.enable();
    }
  }
};

const locateDiagnosticBlock = (blockId: string) => {
  const svgWorkspace = workspace as Blockly.WorkspaceSvg;
  const block = svgWorkspace.getBlockById(blockId);
  if (!block) {
    diagnosticMeta.textContent = '找不到对应积木，可能已被删除';
    return;
  }

  svgWorkspace.centerOnBlock(blockId, true);
  block.select();
  svgWorkspace.highlightBlock(null);
  svgWorkspace.highlightBlock(blockId);
  window.setTimeout(() => {
    svgWorkspace.highlightBlock(blockId, false);
  }, 1600);
  diagnosticMeta.textContent = '已定位诊断积木';
};

const updateDiagnosticBlockWarnings = (items: ReturnType<typeof generateMlog>['diagnostics']) => {
  const svgWorkspace = workspace as Blockly.WorkspaceSvg;
  const messagesByBlockId = new Map<string, string[]>();

  items.forEach((item) => {
    if (!item.blockId || item.level === 'success') {
      return;
    }

    const messages = messagesByBlockId.get(item.blockId) ?? [];
    messages.push(`${item.level === 'error' ? '错误' : '警告'}：${item.message}`);
    messagesByBlockId.set(item.blockId, messages);
  });

  runWithoutBlocklyEvents(() => {
    diagnosticWarningBlockIds.forEach((blockId) => {
      svgWorkspace.getBlockById(blockId)?.setWarningText(null, diagnosticWarningId);
    });

    diagnosticWarningBlockIds = new Set<string>();
    messagesByBlockId.forEach((messages, blockId) => {
      const block = svgWorkspace.getBlockById(blockId);
      if (!block) {
        return;
      }
      block.setWarningText(messages.join('\n'), diagnosticWarningId);
      diagnosticWarningBlockIds.add(blockId);
    });
  });
};

const renderDiagnostics = (items: ReturnType<typeof generateMlog>['diagnostics']) => {
  updateDiagnosticBlockWarnings(items);
  diagnosticsDiv.innerHTML = '';
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = `diagnostic diagnostic-${item.level}`;

    const header = document.createElement('div');
    header.className = 'diagnostic-header';

    const title = document.createElement('strong');
    title.textContent = item.level === 'success'
      ? '正常'
      : item.level === 'warning'
        ? '警告'
        : '错误';
    header.append(title);

    if (item.blockId) {
      const locateButton = document.createElement('button');
      locateButton.type = 'button';
      locateButton.className = 'diagnostic-action';
      locateButton.textContent = '定位积木';
      locateButton.setAttribute('aria-label', `定位 ${item.blockType ?? '对应'} 积木`);
      locateButton.addEventListener('click', () => locateDiagnosticBlock(item.blockId!));
      header.append(locateButton);
    }

    const body = document.createElement('p');
    body.textContent = item.blockType
      ? `${item.message}（${item.blockType}）`
      : item.message;

    article.append(header, body);
    fragment.append(article);
  });

  diagnosticsDiv.append(fragment);
};

let latestCode = '';

const refreshOutput = () => {
  const result = generateMlog(workspace as Blockly.Workspace);
  latestCode = result.code;
  codeNode.textContent = result.code || '# 空工作区';
  codeMeta.textContent = `${result.instructionCount} 条指令`;

  const errorCount = result.diagnostics.filter((item) => item.level === 'error').length;
  const warningCount = result.diagnostics.filter((item) => item.level === 'warning').length;
  if (errorCount > 0) {
    diagnosticMeta.textContent = `${errorCount} 个错误，${warningCount} 个警告`;
  } else if (warningCount > 0) {
    diagnosticMeta.textContent = `${warningCount} 个警告`;
  } else {
    diagnosticMeta.textContent = '就绪';
  }

  renderDiagnostics(result.diagnostics);
};

if (logicLinksInput) {
  logicLinksInput.value = getLogicLinksText();
  logicLinksInput.addEventListener('input', () => {
    setLogicLinksFromText(logicLinksInput.value);
    renderLinksMeta();
  });
}

subscribeLogicLinks((links) => {
  if (logicLinksInput && document.activeElement !== logicLinksInput) {
    logicLinksInput.value = links.join('\n');
  }
  renderLinksMeta(links);
});
renderLinksMeta();

if (!loadFromLocalStorage(workspace as Blockly.Workspace)) {
  const variableMap = (workspace as Blockly.Workspace).getVariableMap();
  const counterVariable = variableMap.createVariable('counter');
  const svgWorkspace = workspace as Blockly.WorkspaceSvg;
  const setBlock = svgWorkspace.newBlock('variables_set') as Blockly.BlockSvg;
  const number = svgWorkspace.newBlock('math_number') as Blockly.BlockSvg;

  setBlock.setFieldValue(counterVariable.getId(), 'VAR');
  number.setFieldValue('0', 'NUM');

  number.initSvg();
  number.render();
  setBlock.initSvg();
  setBlock.render();
  setBlock.getInput('VALUE')?.connection?.connect(number.outputConnection);
  setBlock.moveBy(48, 48);
}

refreshOutput();

workspace.addChangeListener((event: Blockly.Events.Abstract) => {
  if (event.isUiEvent) {
    return;
  }
  saveToLocalStorage(workspace as Blockly.Workspace);
});

workspace.addChangeListener((event: Blockly.Events.Abstract) => {
  if (event.isUiEvent || event.type === Blockly.Events.FINISHED_LOADING || workspace.isDragging()) {
    return;
  }
  refreshOutput();
});

newWorkspaceBtn?.addEventListener('click', () => {
  Blockly.Events.disable();
  workspace.clear();
  Blockly.Events.enable();
  clearLocalStorage();
  refreshOutput();
});

importWorkspaceBtn?.addEventListener('click', () => {
  workspaceFileInput?.click();
});

workspaceFileInput?.addEventListener('change', async () => {
  const file = workspaceFileInput.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  const data = JSON.parse(text);
  loadWorkspaceData(workspace as Blockly.Workspace, data);
  refreshOutput();
  workspaceFileInput.value = '';
});

exportWorkspaceBtn?.addEventListener('click', () => {
  const data = serializeWorkspace(workspace as Blockly.Workspace);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mlog-workspace.json';
  link.click();
  URL.revokeObjectURL(url);
});

copyMlogBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(latestCode);
    diagnosticMeta.textContent = '已复制 mlog';
  } catch {
    diagnosticMeta.textContent = '复制失败';
  }
});

downloadMlogBtn?.addEventListener('click', () => {
  const blob = new Blob([latestCode], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'program.mlog';
  link.click();
  URL.revokeObjectURL(url);
});
