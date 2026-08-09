import * as Blockly from 'blockly';
import {getLogicLinks} from '../appState';
import {appendSuggestionsDropdown} from './fieldHelpers';
import {vanillaBlockType, vanillaCategoryMeta, vanillaInstructions} from './vanillaSchema';

const instructionLabels: Record<string, string> = {
  read: '读取',
  write: '写入',
  draw: '绘制',
  print: '打印',
  printchar: '打印字符',
  format: '格式化',
  drawflush: '刷新绘制',
  printflush: '刷新打印',
  getlink: '获取连接',
  control: '控制',
  radar: '雷达',
  sensor: '传感',
  set: '设值',
  op: '运算',
  select: '条件选择',
  wait: '等待',
  stop: '停止',
  lookup: '查询',
  packcolor: '打包颜色',
  unpackcolor: '解包颜色',
  end: '结束',
  ubind: '绑定单位',
  ucontrol: '单位控制',
  uradar: '单位雷达',
  ulocate: '单位定位',
  getblock: '读取方块',
  setblock: '设置方块',
  spawn: '生成单位',
  status: '状态',
  weathersense: '天气检测',
  weatherset: '设置天气',
  spawnwave: '生成波次',
  setrule: '设置规则',
  message: '消息',
  cutscene: '过场',
  effect: '特效',
  explosion: '爆炸',
  setrate: '设置速率',
  fetch: '获取',
  sync: '同步',
  clientdata: '客户端数据',
  getflag: '读取旗标',
  setflag: '设置旗标',
  setprop: '设置属性',
  playsound: '播放音效',
  setmarker: '设置标记',
  makemarker: '创建标记',
  localeprint: '本地化打印',
};

const fieldLabels: Record<string, string> = {
  output: '输出',
  input: '输入',
  target: '目标',
  address: '地址',
  type: '类型',
  x: 'X',
  y: 'Y',
  p1: '参数1',
  p2: '参数2',
  p3: '参数3',
  p4: '参数4',
  p5: '参数5',
  value: '值',
  to: '到',
  from: '来自',
  dest: '结果',
  result: '结果',
  a: 'A',
  b: 'B',
  target1: '目标1',
  target2: '目标2',
  target3: '目标3',
  sort: '排序',
  radar: '雷达源',
  sortOrder: '排序方向',
  op: '操作',
  comp0: '比较值1',
  comp1: '比较值2',
  r: 'R',
  g: 'G',
  locate: '定位类型',
  flag: '标记',
  enemy: '敌方',
  ore: '矿物',
  outX: '输出X',
  outY: '输出Y',
  outFound: '找到',
  outBuild: '建筑',
  layer: '层',
  block: '方块',
  team: '队伍',
  rotation: '旋转',
  clear: '模式',
  effect: '效果',
  weather: '天气',
  natural: '自然',
  rule: '规则',
  duration: '持续',
  outSuccess: '成功输出',
  action: '动作',
  sizerot: '尺寸/旋转',
  amount: '数值',
  index: '索引',
  extra: '附加',
  variable: '变量',
  channel: '频道',
  reliable: '可靠',
  of: '对象',
  positional: '定位播放',
  id: '编号',
  color: '颜色',
  limit: '限制',
  replace: '替换',
  unit: '单位',
  state: '状态值',
  data: '数据',
  radius: '半径',
  damage: '伤害',
  air: '对空',
  ground: '对地',
  pierce: '穿透',
  volume: '音量',
  pitch: '音高',
  pan: '声像',
};

const linkSuggestionFields = new Set([
  'read.target',
  'write.target',
  'drawflush.target',
  'printflush.target',
  'control.target',
  'radar.radar',
  'sensor.from',
  'setprop.of',
]);

const createStrictField = (field: (typeof vanillaInstructions)[number]['fields'][number]) => {
  if (field.options) {
    return new Blockly.FieldDropdown(field.options);
  }
  return new Blockly.FieldTextInput(field.defaultValue);
};

const linkOptions = () => getLogicLinks().map((link) => [link, link] as [string, string]);

const displayNameForInstruction = (name: string) => instructionLabels[name] ?? name;
const displayNameForField = (name: string) => fieldLabels[name] ?? name;

export const registerVanillaBlocks = () => {
  vanillaInstructions.forEach((instruction) => {
    Blockly.Blocks[vanillaBlockType(instruction.name)] = {
      init() {
        let input = this.appendDummyInput();
        input.appendField(displayNameForInstruction(instruction.name));

        instruction.fields.forEach((field, index) => {
          if (index > 0 && index % 3 === 0) {
            input = this.appendDummyInput();
          }

          input.appendField(displayNameForField(field.name));
          input.appendField(createStrictField(field), field.name);
          this.setFieldValue(field.defaultValue, field.name);

          if (!field.options && linkSuggestionFields.has(`${instruction.name}.${field.name}`)) {
            appendSuggestionsDropdown(input, this, field.name, linkOptions, '链接');
          }
        });

        this.setPreviousStatement(true);
        if (instruction.name !== 'end') {
          this.setNextStatement(true);
        }
        this.setColour(vanillaCategoryMeta[instruction.category].colour);
        this.setTooltip(`${displayNameForInstruction(instruction.name)} (${instruction.name})`);
        this.setHelpUrl('');
      },
    };
  });
};
