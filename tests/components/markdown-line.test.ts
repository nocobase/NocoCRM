import { describe, expect, it } from 'vitest';
import {
  keepLineBreaks,
  markdownLine,
} from '../../client/components/crm/line-breaks.js';

describe('long text as Markdown', () => {
  it('reads as one line of plain text where a line is all there is', () => {
    expect(
      markdownLine(
        '**准备要点**\n- 梳理方案\n- 准备材料\n\n见[官网](https://a.example) 和 `code`，*斜体*，snake_case_name',
      ),
    ).toBe('准备要点 梳理方案 准备材料 见官网 和 code，斜体，snake_case_name');
    expect(markdownLine('## 标题\n> 引用\n1. 第一')).toBe('标题 引用 第一');
  });

  it('keeps the line breaks a person typed', () => {
    expect(keepLineBreaks('第一行\n第二行\n\n新段落')).toBe(
      '第一行  \n第二行\n\n新段落',
    );
  });
});
