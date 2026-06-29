/**
 * Unit tests: icons -- new SVG icon components
 *
 * Tests that ChevronRightIcon, ChevronDownIcon, and SidebarToggleIcon render
 * with correct SVG attributes and use currentColor for stroke/fill.
 *
 * Coverage targets (from test-design.md):
 *   - F-36: ChevronRightIcon renders with width=16, height=16, viewBox="0 0 24 24"
 *   - F-37: ChevronDownIcon renders similar to ChevronRightIcon
 *   - F-38: SidebarToggleIcon renders double-chevron
 *   - F-39: SVG uses currentColor stroke
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';

import { ChevronDownIcon, ChevronRightIcon, SidebarToggleIcon } from './icons';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSvgElement(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector('svg');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('icons 组件 -- 新增 SVG 图标', () => {
  // ===========================================================================
  // F-36: ChevronRightIcon renders with correct SVG attributes
  // ===========================================================================
  it('F-36: ChevronRightIcon 渲染 SVG， width=16, height=16, viewBox="0 0 24 24"', () => {
    const { container } = render(<ChevronRightIcon />);
    const svg = getSvgElement(container);

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  // ===========================================================================
  // F-37: ChevronDownIcon renders correctly
  // ===========================================================================
  it('F-37: ChevronDownIcon 渲染 SVG，与 ChevronRightIcon 使用相同尺寸', () => {
    const { container } = render(<ChevronDownIcon />);
    const svg = getSvgElement(container);

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  // ===========================================================================
  // F-38: SidebarToggleIcon renders with direction variants
  // ===========================================================================
  it('F-38: SidebarToggleIcon 接受 direction prop，渲染对应方向的 SVG', () => {
    const { container: leftContainer } = render(<SidebarToggleIcon direction="left" />);
    const { container: rightContainer } = render(<SidebarToggleIcon direction="right" />);

    const leftSvg = getSvgElement(leftContainer);
    const rightSvg = getSvgElement(rightContainer);

    expect(leftSvg).toBeInTheDocument();
    expect(rightSvg).toBeInTheDocument();
    expect(leftSvg).toHaveAttribute('width', '16');
    expect(rightSvg).toHaveAttribute('width', '16');
  });

  // ===========================================================================
  // F-39: SVG uses currentColor for stroke
  // ===========================================================================
  it('F-39: SVG 元素使用 stroke="currentColor" 或 fill="currentColor"', () => {
    const { container: rightContainer } = render(<ChevronRightIcon />);
    const { container: downContainer } = render(<ChevronDownIcon />);
    const { container: toggleContainer } = render(<SidebarToggleIcon direction="left" />);

    // 所有新图标应有 stroke="currentColor"
    const rightSvg = getSvgElement(rightContainer);
    const downSvg = getSvgElement(downContainer);
    const toggleSvg = getSvgElement(toggleContainer);

    expect(rightSvg).toHaveAttribute('stroke', 'currentColor');
    expect(downSvg).toHaveAttribute('stroke', 'currentColor');
    expect(toggleSvg).toHaveAttribute('stroke', 'currentColor');
  });
});
