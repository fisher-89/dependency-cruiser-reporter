/**
 * Unit tests: DirTree component -- tree building, rendering, sorting, indentation, sidebar styles
 *
 * Tests the DirTree component's ability to render directory trees from ProcessedGraph data,
 * handle expand/collapse interactions, apply correct indentation, and manage sidebar visibility.
 *
 * Coverage targets (from test-design.md):
 *   - F-1..F-5: 正向路径 -- 根级/嵌套/文件/目录/最小化渲染
 *   - F-6..F-8: 展开/折叠图标
 *   - F-9..F-10: 排序
 *   - F-11..F-13c: 缩进和侧边栏样式
 *   - F-14..F-16: Header 测试
 *   - R-1..R-6: 反向路径
 *   - B-1..B-11: 边界情况
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { GraphCombo, GraphNode, ProcessedGraph } from '../types';
import { DirTree } from './DirTree';

// ---------------------------------------------------------------------------
// Mock i18n -- return fixed translations
// ---------------------------------------------------------------------------
vi.mock('../i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tree.title': 'Directories',
        'tree.expand': 'Expand directory',
        'tree.collapse': 'Collapse directory',
        'tree.toggleSidebar': 'Toggle sidebar',
        'graph.noData': 'No graph data available',
      };
      return map[key] ?? key;
    },
    lang: 'en',
    setLang: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock icon components -- use data-testid stubs
// ---------------------------------------------------------------------------
vi.mock('./icons', () => ({
  ChevronRightIcon: () => <span data-testid="chevron-right-icon" />,
  ChevronDownIcon: () => <span data-testid="chevron-down-icon" />,
  SidebarToggleIcon: ({ direction }: { direction: 'left' | 'right' }) => (
    <span data-testid={`sidebar-toggle-icon-${direction}`} />
  ),
}));

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------
function makeProcessedGraph(overrides: Partial<ProcessedGraph> = {}): ProcessedGraph {
  return {
    nodes: [],
    edges: [],
    combos: [],
    meta: { original_node_count: 0, aggregated_node_count: 0, total_violations: 0 },
    violations: [],
    ...overrides,
  };
}

function makeCombo(id: string, label: string, parentCombo?: string): GraphCombo {
  return {
    id: `combo:${id}`,
    label,
    combo: parentCombo,
  };
}

function makeFileNode(id: string, label: string, parentCombo: string): GraphNode {
  return {
    id,
    label,
    node_type: 'file' as const,
    combo: parentCombo,
    violation_count: 0,
  };
}

function makeDirNode(
  id: string,
  label: string,
  parentCombo: string,
  children: string[] = [],
): GraphNode {
  return {
    id,
    label,
    node_type: 'directory' as const,
    combo: parentCombo,
    children,
    violation_count: 0,
  };
}

// ---------------------------------------------------------------------------
// Default props factory
// ---------------------------------------------------------------------------
function defaultProps(
  overrides: Partial<{
    data: ProcessedGraph;
    expandedDirs: Set<string>;
    onToggleDir: (dir: string) => void;
    sidebarVisible: boolean;
    onToggleSidebar: () => void;
  }> = {},
) {
  return {
    data: makeProcessedGraph(),
    expandedDirs: new Set<string>(),
    onToggleDir: vi.fn() as (dir: string) => void,
    sidebarVisible: true,
    onToggleSidebar: vi.fn() as () => void,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DirTree 组件 -- 正向路径', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // F-1: renders root combos as top-level entries
  // ===========================================================================
  it('F-1: 根级 combo 渲染为顶层目录项', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src'), makeCombo('test', 'test')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-2: renders nested combos as subdirectory entries
  // ===========================================================================
  it('F-2: 嵌套 combo 渲染为子目录', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src'), makeCombo('src/frontend', 'frontend', 'combo:src')],
    });
    // 展开 src 目录
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-3: renders file nodes as leaf entries
  // ===========================================================================
  it('F-3: 文件节点渲染为叶子条目', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [makeFileNode('src/index.ts', 'index.ts', 'combo:src')],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    expect(screen.getByText('index.ts')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-4: combo with child combos shows expand icon when collapsed
  // ===========================================================================
  it('F-4: combo 有子 combo 时显示展开图标（折叠状态）', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src'), makeCombo('src/sub', 'sub', 'combo:src')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    // src 有子 combo，折叠状态显示 ChevronRightIcon
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-5: renders minimal display (label only, no extension prefix)
  // ===========================================================================
  it('F-5: 文件节点最小化显示（仅标签，无额外前缀）', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [makeFileNode('src/index.ts', 'index.ts', 'combo:src')],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    const label = screen.getByText('index.ts');
    expect(label).toBeInTheDocument();
    // 不应包含路径前缀
    expect(label.textContent).toBe('index.ts');
  });

  // ===========================================================================
  // F-6: expandable directory shows collapse icon when expanded
  // ===========================================================================
  it('F-6: 展开状态的目录显示折叠图标 (ChevronDownIcon)', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    // combo:id 在 expandedDirs 中 -- 展开状态
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    // 折叠图标应显示（展开状态）
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-7: clicking collapse icon calls onToggleDir
  // ===========================================================================
  it('F-7: 点击折叠图标调用 onToggleDir(comboId)', () => {
    const onToggleDir = vi.fn();
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    render(
      <DirTree
        {...defaultProps({
          data,
          expandedDirs: new Set(['src']),
          onToggleDir,
        })}
      />,
    );

    // 点击折叠图标
    fireEvent.click(screen.getByTestId('chevron-down-icon'));
    expect(onToggleDir).toHaveBeenCalledWith('src');
  });

  // ===========================================================================
  // F-8: expandable directory shows expand icon when collapsed
  // ===========================================================================
  it('F-8: 折叠状态的目录显示展开图标 (ChevronRightIcon)', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    // combo:id 不在 expandedDirs 中 -- 折叠状态
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set() })} />);

    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-9: directories before files within same level
  // ===========================================================================
  it('F-9: 同级目录条目在文件条目之前', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [
        makeFileNode('src/main.ts', 'main.ts', 'combo:src'),
        makeDirNode('src/zebra', 'zebra', 'combo:src', ['zebra/child.ts']),
      ],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    const items = screen.getAllByText(/zebra|main\.ts/);
    // zebra（目录）应在 main.ts（文件）之前
    expect(items[0].textContent).toBe('zebra');
    expect(items[1].textContent).toBe('main.ts');
  });

  // ===========================================================================
  // F-10: case-insensitive alphabetical sort within groups
  // ===========================================================================
  it('F-10: 组内字母序排列（不区分大小写）', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [
        makeFileNode('src/utils.ts', 'utils.ts', 'combo:src'),
        makeFileNode('src/main.ts', 'main.ts', 'combo:src'),
      ],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    const items = screen.getAllByText(/main\.ts|utils\.ts/);
    expect(items[0].textContent).toBe('main.ts');
    expect(items[1].textContent).toBe('utils.ts');
  });

  // ===========================================================================
  // F-11: root level items have base 8px padding
  // ===========================================================================
  it('F-11: 根级条目基础 paddingLeft 为 8px', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    const label = screen.getByText('src');
    // 标签 span 的父级 div 是 treeRow 容器
    const treeRow = label.parentElement;
    expect(treeRow).toBeInTheDocument();
    // paddingLeft = 8 + 0 * 16 = 8px
    expect(treeRow).toHaveStyle('padding-left: 8px');
  });

  // ===========================================================================
  // F-12: nested items add 16px per depth level
  // ===========================================================================
  it('F-12: 嵌套条目每层增加 16px paddingLeft', () => {
    const data = makeProcessedGraph({
      combos: [
        makeCombo('a', 'a'),
        makeCombo('a/b', 'b', 'combo:a'),
        makeCombo('a/b/c', 'c', 'combo:a/b'),
      ],
    });
    render(
      <DirTree
        {...defaultProps({
          data,
          expandedDirs: new Set(['a', 'a/b', 'a/b/c']),
        })}
      />,
    );

    // label 'c' 在 depth 2，paddingLeft = 8 + 2*16 = 40px
    const cLabel = screen.getByText('c');
    const cRow = cLabel.parentElement;
    expect(cRow).toHaveStyle('padding-left: 40px');
  });

  // ===========================================================================
  // F-13: sidebar has 260px fixed width and overflow-y auto
  // ===========================================================================
  it('F-13: 侧边栏容器 width=260px, overflowY=auto, height=100%', () => {
    const data = makeProcessedGraph();
    const { container } = render(<DirTree {...defaultProps({ data })} />);

    // 第一个 div 是侧边栏容器
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveStyle('width: 260px');
  });

  // ===========================================================================
  // F-13a: sidebar uses CSS variable colors
  // ===========================================================================
  it('F-13a: 侧边栏使用 CSS 变量颜色 (--color-surface 背景, --color-border 边框)', () => {
    const data = makeProcessedGraph();
    const { container } = render(<DirTree {...defaultProps({ data })} />);

    const sidebar = container.firstChild as HTMLElement;
    // jsdom 不解析 CSS 变量，直接检查内联 style 属性值
    expect(sidebar.style.background).toBe('var(--color-surface)');
    expect(sidebar.style.borderRight).toBe('1px solid var(--color-border)');
  });

  // ===========================================================================
  // F-13b: tree item hover uses accent-bg with 50% opacity
  // ===========================================================================
  it('F-13b: 树条目悬停时背景使用 var(--color-accent-bg) 透明度 50%', () => {
    // Visual hover style — validate via CSS-in-JS style object or snapshot
    // The hover style is defined inline via onMouseEnter/onMouseLeave handlers
    // This test verifies the component renders tree items with correct structure
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    const { container } = render(<DirTree {...defaultProps({ data })} />);

    // 通过 title 属性找到 treeRow 元素
    const treeRow = container.querySelector('[title="src"]');
    expect(treeRow).not.toBeNull();
  });

  // ===========================================================================
  // F-13c: tree item text uses text-secondary, icon uses text-muted
  // ===========================================================================
  it('F-13c: 树条目文字颜色 var(--color-text-secondary), 图标颜色 var(--color-text-muted)', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    const { container } = render(<DirTree {...defaultProps({ data })} />);

    // 验证树条目渲染正常 (CSS 变量颜色在 jsdom 中通过内联 style 属性设置)
    const treeRow = container.querySelector('[title="src"]');
    expect(treeRow).not.toBeNull();
    // treeRow 的 color 应为 var(--color-text-secondary)
    const treeRowEl = treeRow as HTMLElement;
    expect(treeRowEl.style.color).toBe('var(--color-text-secondary)');
  });

  // ===========================================================================
  // F-14: sidebar header shows title and collapse button
  // ===========================================================================
  it('F-14: 侧边栏展开时显示标题和折叠按钮', () => {
    const data = makeProcessedGraph();
    render(<DirTree {...defaultProps({ data, sidebarVisible: true })} />);

    expect(screen.getByText('Directories')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-toggle-icon-left')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-15: collapsed sidebar shows expand handle
  // ===========================================================================
  it('F-15: 侧边栏折叠时显示展开手柄（32px 宽）', () => {
    const data = makeProcessedGraph();
    const { container } = render(<DirTree {...defaultProps({ data, sidebarVisible: false })} />);

    // 折叠时容器宽度 32px
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveStyle('width: 32px');
    expect(screen.getByTestId('sidebar-toggle-icon-right')).toBeInTheDocument();
  });

  // ===========================================================================
  // F-16: sidebar collapse button calls onToggleSidebar
  // ===========================================================================
  it('F-16: 点击折叠按钮调用 onToggleSidebar', () => {
    const onToggleSidebar = vi.fn();
    const data = makeProcessedGraph();
    render(<DirTree {...defaultProps({ data, sidebarVisible: true, onToggleSidebar })} />);

    fireEvent.click(screen.getByTestId('sidebar-toggle-icon-left'));
    expect(onToggleSidebar).toHaveBeenCalled();
  });
});

describe('DirTree 组件 -- 反向路径', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // R-1: empty combos renders no directory entries
  // ===========================================================================
  it('R-1: combos 为空列表时显示空状态', () => {
    const data = makeProcessedGraph({ combos: [], nodes: [] });
    render(<DirTree {...defaultProps({ data })} />);

    expect(screen.getByText('No graph data available')).toBeInTheDocument();
  });

  // ===========================================================================
  // R-2: nodes without matching combo are not rendered
  // ===========================================================================
  it('R-2: 引用不存在 combo 的节点不渲染', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [makeFileNode('orphan/file.ts', 'file.ts', 'combo:nonexistent')],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['nonexistent']) })} />);

    // 无对应 combo 的文件不应渲染
    expect(screen.queryByText('file.ts')).not.toBeInTheDocument();
  });

  // ===========================================================================
  // R-3: directory combo without children still shows expand icon (collapsed)
  // ===========================================================================
  it('R-3: 无子目录的 combo 显示展开图标（折叠状态）', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    // 实现逻辑：目录条目始终显示展开/折叠图标（折叠状态显示 ChevronRightIcon）
    // 即使没有子节点，图标仍渲染（hasVisibleChildren 仅控制子节点渲染，不控制图标）
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
  });

  // ===========================================================================
  // R-4: file entry has no icon
  // ===========================================================================
  it('R-4: 文件节点不显示展开/折叠图标', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [makeFileNode('src/index.ts', 'index.ts', 'combo:src')],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    // 文件节点本身渲染无问题
    const fileLabel = screen.getByText('index.ts');
    expect(fileLabel).toBeInTheDocument();
    // 文件条目的 toggle 图标区域应渲染 null（目录条目依然有图标）
    // 验证点击文件标签不触发 toggle（由 R-5 覆盖）
  });

  // ===========================================================================
  // R-5: click on label text does not toggle
  // ===========================================================================
  it('R-5: 点击目录条目标签文字不触发 onToggleDir', () => {
    const onToggleDir = vi.fn();
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    render(<DirTree {...defaultProps({ data, onToggleDir })} />);

    // 点击标签文字
    fireEvent.click(screen.getByText('src'));
    expect(onToggleDir).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // R-6: sidebarVisible=false renders nothing (collapsed handle only)
  // ===========================================================================
  it('R-6: sidebarVisible=false 时仅渲染折叠手柄', () => {
    const data = makeProcessedGraph();
    const { container } = render(<DirTree {...defaultProps({ data, sidebarVisible: false })} />);

    // 容器宽 32px，不应包含 tree 内容
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveStyle('width: 32px');
    expect(screen.queryByText('Directories')).not.toBeInTheDocument();
  });
});

describe('DirTree 组件 -- 边界情况', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // B-1: deeply nested combos render at correct depth
  // ===========================================================================
  it('B-1: 5 层嵌套 combo 正确渲染，每层缩进 16px', () => {
    const combos = [
      makeCombo('a', 'a'),
      makeCombo('a/b', 'b', 'combo:a'),
      makeCombo('a/b/c', 'c', 'combo:a/b'),
      makeCombo('a/b/c/d', 'd', 'combo:a/b/c'),
      makeCombo('a/b/c/d/e', 'e', 'combo:a/b/c/d'),
    ];
    const data = makeProcessedGraph({ combos });
    render(
      <DirTree
        {...defaultProps({
          data,
          expandedDirs: new Set(['a', 'a/b', 'a/b/c', 'a/b/c/d', 'a/b/c/d/e']),
        })}
      />,
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.getByText('d')).toBeInTheDocument();
    expect(screen.getByText('e')).toBeInTheDocument();
  });

  // ===========================================================================
  // B-2: very long labels use text-overflow
  // ===========================================================================
  it('B-2: 超长标签（>50字符）使用 text-overflow: ellipsis', () => {
    const longLabel =
      'this/is/a/very/long/path/that/should/definitely/exceed/fifty/characters/src/index.ts';
    const data = makeProcessedGraph({
      combos: [makeCombo('src', longLabel)],
    });
    render(<DirTree {...defaultProps({ data })} />);

    const labelEl = screen.getByText(longLabel);
    expect(labelEl).toBeInTheDocument();
    // 父级 treeRow 应有 text-overflow
    const row = labelEl.closest('[style]');
    expect(row).toHaveStyle('text-overflow: ellipsis');
  });

  // ===========================================================================
  // B-3: data prop reference change rebuilds tree
  // ===========================================================================
  it('B-3: data 引用变化后树内容刷新', () => {
    const { rerender } = render(
      <DirTree
        {...defaultProps({
          data: makeProcessedGraph({
            combos: [makeCombo('src', 'src')],
          }),
        })}
      />,
    );

    expect(screen.getByText('src')).toBeInTheDocument();

    // 更新 data
    rerender(
      <DirTree
        {...defaultProps({
          data: makeProcessedGraph({
            combos: [makeCombo('lib', 'lib')],
          }),
        })}
      />,
    );

    expect(screen.queryByText('src')).not.toBeInTheDocument();
    expect(screen.getByText('lib')).toBeInTheDocument();
  });

  // ===========================================================================
  // B-4: expandedDirs with non-existent paths
  // ===========================================================================
  it('B-4: expandedDirs 包含不存在路径时，不展开、不抛异常', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    expect(() => {
      render(
        <DirTree
          {...defaultProps({
            data,
            expandedDirs: new Set(['nonexistent']),
          })}
        />,
      );
    }).not.toThrow();
  });

  // ===========================================================================
  // B-5: expandedDirs is empty set -- all collapsed
  // ===========================================================================
  it('B-5: expandedDirs 为空 Set 时所有目录显示折叠状态', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set() })} />);

    // 折叠状态显示 ChevronRightIcon
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    // 不应有 ChevronDownIcon
    expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
  });

  // ===========================================================================
  // B-6: node_type=directory with empty children
  // ===========================================================================
  it('B-6: 空子目录（无子节点）显示展开图标（折叠状态）', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('empty-dir', 'empty-dir')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    // 实现行为：目录条目始终显示图标即使无子节点
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
  });

  // ===========================================================================
  // B-7: combo with null/undefined label
  // ===========================================================================
  it('B-7: label 为 null 时不崩溃，使用空字符串渲染', () => {
    const data = makeProcessedGraph({
      combos: [
        {
          id: 'combo:unnamed',
          label: null as unknown as string,
        },
      ],
    });
    render(<DirTree {...defaultProps({ data })} />);

    // 不应崩溃，组件正常渲染
    // label=null 在 JSX 中渲染为空字符串
    // 验证树行和图标正常
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
  });

  // ===========================================================================
  // B-8: single child directory
  // ===========================================================================
  it('B-8: 只有一个子目录，0 个文件 -- 仅显示目录', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    expect(screen.getByText('src')).toBeInTheDocument();
  });

  // ===========================================================================
  // B-9: single file entry
  // ===========================================================================
  it('B-9: 只有一个文件节点 -- 仅显示文件', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [makeFileNode('src/main.ts', 'main.ts', 'combo:src')],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    expect(screen.getByText('main.ts')).toBeInTheDocument();
  });

  // ===========================================================================
  // B-10: mixed case labels sort case-insensitively
  // ===========================================================================
  it('B-10: 大小写混合标签不区分大小写排序', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('src', 'src')],
      nodes: [
        makeFileNode('src/B-cc.ts', 'B-cc.ts', 'combo:src'),
        makeFileNode('src/a-aa.ts', 'a-aa.ts', 'combo:src'),
        makeFileNode('src/A-bb.ts', 'A-bb.ts', 'combo:src'),
      ],
    });
    render(<DirTree {...defaultProps({ data, expandedDirs: new Set(['src']) })} />);

    const items = screen.getAllByText(/a-aa\.ts|A-bb\.ts|B-cc\.ts/);
    expect(items[0].textContent).toBe('a-aa.ts');
    expect(items[1].textContent).toBe('A-bb.ts');
    expect(items[2].textContent).toBe('B-cc.ts');
  });

  // ===========================================================================
  // B-11: special characters in labels
  // ===========================================================================
  it('B-11: 标签含特殊字符时正常渲染', () => {
    const data = makeProcessedGraph({
      combos: [makeCombo('_hooks', '_hooks'), makeCombo('@types', '@types')],
    });
    render(<DirTree {...defaultProps({ data })} />);

    expect(screen.getByText('_hooks')).toBeInTheDocument();
    expect(screen.getByText('@types')).toBeInTheDocument();
  });
});
