import * as Blockly from 'blockly';

const storageKey = 'mlogBlocklyWorkspace';

export const serializeWorkspace = (workspace: Blockly.Workspace) => {
  return Blockly.serialization.workspaces.save(workspace);
};

export const loadWorkspaceData = (
  workspace: Blockly.Workspace,
  data: unknown,
) => {
  Blockly.Events.disable();
  workspace.clear();
  Blockly.serialization.workspaces.load(
    data as Parameters<typeof Blockly.serialization.workspaces.load>[0],
    workspace,
    undefined,
  );
  Blockly.Events.enable();
};

export const saveToLocalStorage = (workspace: Blockly.Workspace) => {
  const data = serializeWorkspace(workspace);
  window.localStorage?.setItem(storageKey, JSON.stringify(data));
};

export const loadFromLocalStorage = (workspace: Blockly.Workspace) => {
  const data = window.localStorage?.getItem(storageKey);
  if (!data) {
    return false;
  }
  loadWorkspaceData(workspace, JSON.parse(data));
  return true;
};

export const clearLocalStorage = () => {
  window.localStorage?.removeItem(storageKey);
};
