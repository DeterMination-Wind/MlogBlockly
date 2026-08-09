import type {DropdownOption} from './mindustryData';
import {
  applyClearOptions,
  blockFlagOptions,
  blockOptions,
  booleanOptions,
  conditionOpOptions,
  controlOptions,
  cutsceneActionOptions,
  drawTypeOptions,
  fetchTypeOptions,
  itemOptions,
  locateOptions,
  logicOpOptions,
  logicRuleOptions,
  lookupContentTypeOptions,
  markerControlOptions,
  markerTypeOptions,
  messageTypeOptions,
  radarSortOptions,
  radarTargetOptions,
  sensorPropertyOptions,
  setPropPropertyOptions,
  statusEffectOptions,
  teamOptions,
  tileLayerOptions,
  tileLayerSettableOptions,
  unitControlOptions,
  unitOptions,
  weatherOptions,
  zeroOneOptions,
} from './mindustryData';

export type VanillaCategory = 'io' | 'block' | 'operation' | 'control' | 'unit' | 'world';

export interface VanillaFieldSchema {
  name: string;
  defaultValue: string;
  options?: DropdownOption[];
}

export interface VanillaInstructionSchema {
  name: string;
  category: VanillaCategory;
  fields: VanillaFieldSchema[];
}

const text = (name: string, defaultValue: string): VanillaFieldSchema => ({name, defaultValue});

const dropdown = (
  name: string,
  defaultValue: string,
  options: DropdownOption[],
): VanillaFieldSchema => ({name, defaultValue, options});

export const vanillaCategoryMeta: Record<VanillaCategory, {name: string; colour: string}> = {
  io: {name: 'Vanilla I/O', colour: '#a08a8a'},
  block: {name: 'Vanilla Block', colour: '#d4816b'},
  operation: {name: 'Vanilla Operation', colour: '#877bad'},
  control: {name: 'Vanilla Control', colour: '#6bb2b2'},
  unit: {name: 'Vanilla Unit', colour: '#c7b59d'},
  world: {name: 'Vanilla World', colour: '#6b84d4'},
};

export const vanillaCategoryOrder: VanillaCategory[] = [
  'io',
  'block',
  'operation',
  'control',
  'unit',
  'world',
];

export const vanillaInstructions: VanillaInstructionSchema[] = [
  {name: 'read', category: 'io', fields: [text('output', 'result'), text('target', 'cell1'), text('address', '0')]},
  {name: 'write', category: 'io', fields: [text('input', 'result'), text('target', 'cell1'), text('address', '0')]},
  {name: 'draw', category: 'io', fields: [dropdown('type', 'clear', drawTypeOptions), text('x', '0'), text('y', '0'), text('p1', '0'), text('p2', '0'), text('p3', '0'), text('p4', '0')]},
  {name: 'print', category: 'io', fields: [text('value', '0')]},
  {name: 'printchar', category: 'io', fields: [text('value', '0')]},
  {name: 'format', category: 'io', fields: [text('value', '0')]},
  {name: 'drawflush', category: 'block', fields: [text('target', 'display1')]},
  {name: 'printflush', category: 'block', fields: [text('target', 'message1')]},
  {name: 'getlink', category: 'block', fields: [text('output', 'result'), text('address', '0')]},
  {name: 'control', category: 'block', fields: [dropdown('type', 'enabled', controlOptions), text('target', 'block1'), text('p1', '0'), text('p2', '0'), text('p3', '0'), text('p4', '0')]},
  {name: 'radar', category: 'block', fields: [dropdown('target1', 'enemy', radarTargetOptions), dropdown('target2', 'any', radarTargetOptions), dropdown('target3', 'any', radarTargetOptions), dropdown('sort', 'distance', radarSortOptions), text('radar', 'turret1'), text('sortOrder', '1'), text('output', 'result')]},
  {name: 'sensor', category: 'block', fields: [text('to', 'result'), text('from', 'block1'), dropdown('type', '@copper', sensorPropertyOptions)]},
  {name: 'set', category: 'operation', fields: [text('to', 'result'), text('from', '0')]},
  {name: 'op', category: 'operation', fields: [dropdown('op', 'add', logicOpOptions), text('dest', 'result'), text('a', '0'), text('b', '0')]},
  {name: 'select', category: 'operation', fields: [text('result', 'result'), dropdown('op', 'notEqual', conditionOpOptions), text('comp0', 'x'), text('comp1', 'false'), text('a', 'a'), text('b', 'b')]},
  {name: 'wait', category: 'control', fields: [text('value', '0.5')]},
  {name: 'stop', category: 'control', fields: []},
  {name: 'lookup', category: 'operation', fields: [dropdown('type', 'item', lookupContentTypeOptions), text('result', 'result'), text('id', '0')]},
  {name: 'packcolor', category: 'operation', fields: [text('result', 'result'), text('r', '1'), text('g', '0'), text('b', '0'), text('a', '1')]},
  {name: 'unpackcolor', category: 'operation', fields: [text('r', 'r'), text('g', 'g'), text('b', 'b'), text('a', 'a'), text('value', 'color')]},
  {name: 'end', category: 'control', fields: []},
  {name: 'ubind', category: 'unit', fields: [dropdown('type', '@poly', unitOptions)]},
  {name: 'ucontrol', category: 'unit', fields: [dropdown('type', 'move', unitControlOptions), text('p1', '0'), text('p2', '0'), text('p3', '0'), text('p4', '0'), text('p5', '0')]},
  {name: 'uradar', category: 'unit', fields: [dropdown('target1', 'enemy', radarTargetOptions), dropdown('target2', 'any', radarTargetOptions), dropdown('target3', 'any', radarTargetOptions), dropdown('sort', 'distance', radarSortOptions), text('radar', '0'), text('sortOrder', '1'), text('output', 'result')]},
  {name: 'ulocate', category: 'unit', fields: [dropdown('locate', 'building', locateOptions), dropdown('flag', 'core', blockFlagOptions), dropdown('enemy', 'true', booleanOptions), dropdown('ore', '@copper', itemOptions), text('outX', 'outx'), text('outY', 'outy'), text('outFound', 'found'), text('outBuild', 'building')]},
  {name: 'getblock', category: 'world', fields: [dropdown('layer', 'block', tileLayerOptions), text('result', 'result'), text('x', '0'), text('y', '0')]},
  {name: 'setblock', category: 'world', fields: [dropdown('layer', 'block', tileLayerSettableOptions), dropdown('block', '@air', blockOptions), text('x', '0'), text('y', '0'), dropdown('team', '@derelict', teamOptions), text('rotation', '0')]},
  {name: 'spawn', category: 'world', fields: [dropdown('type', '@dagger', unitOptions), text('x', '10'), text('y', '10'), text('rotation', '90'), dropdown('team', '@sharded', teamOptions), text('result', 'result')]},
  {name: 'status', category: 'world', fields: [dropdown('clear', 'false', applyClearOptions), dropdown('effect', 'wet', statusEffectOptions), text('unit', 'unit'), text('duration', '10')]},
  {name: 'weathersense', category: 'world', fields: [text('to', 'result'), dropdown('weather', '@rain', weatherOptions)]},
  {name: 'weatherset', category: 'world', fields: [dropdown('weather', '@rain', weatherOptions), dropdown('state', 'true', booleanOptions)]},
  {name: 'spawnwave', category: 'world', fields: [text('x', '0'), text('y', '0'), dropdown('natural', 'false', booleanOptions)]},
  {name: 'setrule', category: 'world', fields: [dropdown('rule', 'waveSpacing', logicRuleOptions), text('value', '10'), dropdown('p1', '@sharded', teamOptions), text('p2', '0'), text('p3', '100'), text('p4', '100')]},
  {name: 'message', category: 'world', fields: [dropdown('type', 'announce', messageTypeOptions), text('duration', '3'), text('outSuccess', '@wait')]},
  {name: 'cutscene', category: 'world', fields: [dropdown('action', 'pan', cutsceneActionOptions), text('p1', '100'), text('p2', '100'), text('p3', '0.06'), text('p4', '0')]},
  {name: 'effect', category: 'world', fields: [text('type', 'warn'), text('x', '0'), text('y', '0'), text('sizerot', '2'), text('color', '%ffaaff'), text('data', '')]},
  {name: 'explosion', category: 'world', fields: [dropdown('team', '@crux', teamOptions), text('x', '0'), text('y', '0'), text('radius', '5'), text('damage', '50'), dropdown('air', 'true', booleanOptions), dropdown('ground', 'true', booleanOptions), dropdown('pierce', 'false', booleanOptions), dropdown('effect', 'true', booleanOptions)]},
  {name: 'setrate', category: 'world', fields: [text('amount', '10')]},
  {name: 'fetch', category: 'world', fields: [dropdown('type', 'unit', fetchTypeOptions), text('result', 'result'), dropdown('team', '@sharded', teamOptions), text('index', '0'), text('extra', '@conveyor')]},
  {name: 'sync', category: 'world', fields: [text('variable', 'var')]},
  {name: 'clientdata', category: 'world', fields: [text('channel', '"frog"'), text('value', '"bar"'), dropdown('reliable', '0', zeroOneOptions)]},
  {name: 'getflag', category: 'world', fields: [text('result', 'result'), text('flag', '"flag"')]},
  {name: 'setflag', category: 'world', fields: [text('flag', '"flag"'), text('value', 'true')]},
  {name: 'setprop', category: 'world', fields: [dropdown('type', '@copper', setPropPropertyOptions), text('of', 'block1'), text('value', '0')]},
  {name: 'playsound', category: 'world', fields: [dropdown('positional', 'false', booleanOptions), text('id', '@sfx-pew'), text('volume', '1'), text('pitch', '1'), text('pan', '0'), text('x', '@thisx'), text('y', '@thisy'), dropdown('limit', 'true', booleanOptions)]},
  {name: 'setmarker', category: 'world', fields: [dropdown('type', 'pos', markerControlOptions), text('id', '0'), text('p1', '0'), text('p2', '0'), text('p3', '0')]},
  {name: 'makemarker', category: 'world', fields: [dropdown('type', 'shape', markerTypeOptions), text('id', '0'), text('x', '0'), text('y', '0'), dropdown('replace', 'true', booleanOptions)]},
  {name: 'localeprint', category: 'world', fields: [text('value', '0')]},
];

export const vanillaBlockType = (name: string) => `vanilla_${name}`;

export const vanillaInstructionsByName = new Map(
  vanillaInstructions.map((item) => [item.name, item]),
);

export const vanillaInstructionsByCategory = vanillaCategoryOrder.map((category) => ({
  category,
  instructions: vanillaInstructions.filter((instruction) => instruction.category === category),
}));
