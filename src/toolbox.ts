import {vanillaBlockType, vanillaInstructionsByCategory} from './blocks/vanillaSchema';

const vanillaCategoryNames = {
  io: '原版·输入输出',
  block: '原版·建筑',
  operation: '原版·运算',
  control: '原版·控制',
  unit: '原版·单位',
  world: '原版·世界',
} as const;

const vanillaCategoryColors = {
  io: '#a08a8a',
  block: '#d4816b',
  operation: '#877bad',
  control: '#6bb2b2',
  unit: '#c7b59d',
  world: '#6b84d4',
} as const;

const vanillaContents = vanillaInstructionsByCategory.map(({category, instructions}) => ({
  kind: 'category',
  name: vanillaCategoryNames[category],
  colour: vanillaCategoryColors[category],
  contents: instructions.map((instruction) => ({
    kind: 'block',
    type: vanillaBlockType(instruction.name),
  })),
}));

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '程序',
      colour: '#2563eb',
      contents: [
        {
          kind: 'block',
          type: 'mlog_comment',
          fields: {
            TEXT: 'tick update',
          },
        },
        {
          kind: 'block',
          type: 'mlog_print',
          inputs: {
            VALUE: {
              shadow: {
                type: 'text',
                fields: {
                  TEXT: '你好 mlog',
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_print_flush',
          inputs: {
            TARGET: {
              shadow: {
                type: 'mlog_link',
                fields: {
                  LINK: 'message1',
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_read',
          inputs: {
            CELL: {
              shadow: {
                type: 'mlog_link',
                fields: {
                  LINK: 'cell1',
                },
              },
            },
            ADDR: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_write',
          inputs: {
            VALUE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
            CELL: {
              shadow: {
                type: 'mlog_link',
                fields: {
                  LINK: 'cell1',
                },
              },
            },
            ADDR: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_sensor',
          inputs: {
            TARGET: {
              shadow: {
                type: 'mlog_global',
                fields: {
                  NAME: '@unit',
                },
              },
            },
          },
          fields: {
            PROP: '@health',
          },
        },
        {
          kind: 'block',
          type: 'mlog_end',
        },
      ],
    },
    {
      kind: 'category',
      name: '控制语法糖',
      colour: '#7c3aed',
      contents: [
        {
          kind: 'block',
          type: 'controls_if',
        },
        {
          kind: 'block',
          type: 'controls_whileUntil',
        },
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: {
            TIMES: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 5,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_for_range',
          inputs: {
            START: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
            END: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 9,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_when',
          inputs: {
            TARGET: {
              shadow: {
                type: 'variables_get',
                fields: {
                  VAR: 'mode',
                },
              },
            },
            CASE1: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
            CASE2: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
            CASE3: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 2,
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '函数',
      colour: '#ec4899',
      contents: [
        {
          kind: 'block',
          type: 'mlog_fun_define',
          extraState: {
            params: ['a', 'b'],
          },
          fields: {
            NAME: 'sum',
            PARAM1: 'a',
            PARAM2: 'b',
          },
        },
        {
          kind: 'block',
          type: 'mlog_fun_call',
          extraState: {
            args: ['a', 'b'],
          },
          fields: {
            NAME: 'sum',
            RESULT: 'result',
          },
          inputs: {
            ARG1: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
            ARG2: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 2,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_fun_return',
          inputs: {
            VALUE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_fun_arg',
          fields: {
            NAME: 'a',
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '表达式',
      colour: '#0f766e',
      contents: [
        {
          kind: 'block',
          type: 'math_number',
          fields: {
            NUM: 1,
          },
        },
        {
          kind: 'block',
          type: 'text',
          fields: {
            TEXT: '文本',
          },
        },
        {
          kind: 'block',
          type: 'logic_boolean',
          fields: {
            BOOL: 'TRUE',
          },
        },
        {
          kind: 'block',
          type: 'math_arithmetic',
          inputs: {
            A: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
            B: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 2,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'logic_compare',
          inputs: {
            A: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
            B: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'logic_operation',
          inputs: {
            A: {
              shadow: {
                type: 'logic_boolean',
                fields: {
                  BOOL: 'TRUE',
                },
              },
            },
            B: {
              shadow: {
                type: 'logic_boolean',
                fields: {
                  BOOL: 'FALSE',
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '列表',
      colour: '#8b5cf6',
      contents: [
        {
          kind: 'block',
          type: 'mlog_list_define',
          fields: {
            NAME: 'items',
            CELL: 'cell1',
            START: '0',
            LENGTH: '8',
          },
        },
        {
          kind: 'block',
          type: 'mlog_list_define_dynamic',
          fields: {
            NAME: 'queue',
            CELL: 'cell1',
            START: '0',
            CAPACITY: '64',
            INITIAL_LENGTH: '0',
          },
        },
        {
          kind: 'block',
          type: 'mlog_list_set',
          inputs: {
            INDEX: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
            VALUE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_list_get',
          inputs: {
            INDEX: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_list_length',
        },
        {
          kind: 'block',
          type: 'mlog_list_push',
          inputs: {
            VALUE: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'mlog_list_pop',
        },
        {
          kind: 'block',
          type: 'mlog_list_clear',
        },
      ],
    },
    {
      kind: 'category',
      name: '引用',
      colour: '#d97706',
      contents: [
        {
          kind: 'block',
          type: 'mlog_symbol',
          fields: {
            SYMBOL: 'cell1',
          },
        },
        {
          kind: 'block',
          type: 'mlog_link',
          fields: {
            LINK: 'message1',
          },
        },
        {
          kind: 'block',
          type: 'mlog_global',
          fields: {
            NAME: '@unit',
          },
        },
      ],
    },
    ...vanillaContents,
    {
      kind: 'sep',
    },
    {
      kind: 'category',
      name: '变量',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',
    },
  ],
};
