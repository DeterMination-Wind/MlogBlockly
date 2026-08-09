import * as Blockly from 'blockly';
import type {DropdownOption} from './mindustryData';

export type SuggestionsProvider = () => DropdownOption[];

export const appendSuggestionsDropdown = (
  input: Blockly.Input,
  block: Blockly.Block,
  targetFieldName: string,
  provider: SuggestionsProvider,
  placeholder = '选择',
) => {
  const menuGenerator = () => {
    const options = provider();
    return [[placeholder, '__noop__'], ...options] as DropdownOption[];
  };

  const dropdown = new Blockly.FieldDropdown(menuGenerator, (selected) => {
    if (selected && selected !== '__noop__') {
      block.setFieldValue(selected, targetFieldName);
    }
    return '__noop__';
  });

  input.appendField(dropdown);
  return dropdown;
};
