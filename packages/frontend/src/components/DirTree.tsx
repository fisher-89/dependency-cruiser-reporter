import { useMemo } from 'react';

import { useT } from '../i18n';
import type { GraphCombo, GraphNode, ProcessedGraph } from '../types';
import { ChevronDownIcon, ChevronRightIcon, SidebarToggleIcon } from './icons';

interface DirTreeProps {
  data: ProcessedGraph;
  expandedDirs: Set<string>;
  onToggleDir: (dir: string) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

interface DirTreeItemData {
  id: string;
  label: string;
  type: 'directory' | 'file';
  depth: number;
  children: DirTreeItemData[];
}

function buildDirTree(combos: GraphCombo[], nodes: GraphNode[]): DirTreeItemData[] {
  const comboMap = new Map<string, GraphCombo>();
  for (const combo of combos) {
    comboMap.set(combo.id, combo);
  }

  // Group nodes by their parent combo id
  const nodesByCombo = new Map<string | undefined, GraphNode[]>();
  for (const node of nodes) {
    const key = node.combo;
    const list = nodesByCombo.get(key);
    if (list) {
      list.push(node);
    } else {
      nodesByCombo.set(key, [node]);
    }
  }

  function buildChildren(parentCombo: string | undefined, depth: number): DirTreeItemData[] {
    const result: DirTreeItemData[] = [];

    // Add child combos (sub-directories)
    for (const combo of combos) {
      const comboParent = combo.combo;
      if (comboParent === parentCombo || (!comboParent && !parentCombo)) {
        result.push({
          id: combo.id,
          label: combo.label,
          type: 'directory',
          depth,
          children: buildChildren(combo.id, depth + 1),
        });
      }
    }

    // Add child nodes (files)
    const childNodes = nodesByCombo.get(parentCombo) ?? [];
    for (const node of childNodes) {
      result.push({
        id: node.id,
        label: node.label,
        type: node.node_type === 'directory' ? 'directory' : 'file',
        depth,
        children: [],
      });
    }

    // Sort: directories first, then files; alphabetical by label (case-insensitive) within each group
    result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    return result;
  }

  return buildChildren(undefined, 0);
}

function DirTreeItem({
  item,
  expandedDirs,
  onToggleDir,
  depth,
}: {
  item: DirTreeItemData;
  expandedDirs: Set<string>;
  onToggleDir: (dir: string) => void;
  depth: number;
}) {
  const { t } = useT();
  // Combo IDs are prefixed with "combo:" (e.g. "combo:src"), but expanded_dirs
  // uses raw paths (e.g. "src"). Strip the prefix so both sides match.
  const dirPath = item.id.startsWith('combo:') ? item.id.slice(6) : item.id;
  const isExpanded = expandedDirs.has(dirPath);
  const isDirectory = item.type === 'directory';
  const hasVisibleChildren = isDirectory && item.children.length > 0;

  const handleToggle = () => {
    onToggleDir(dirPath);
  };

  return (
    <div>
      <div
        style={{
          ...styles.treeRow,
          paddingLeft: 8 + depth * 16,
        }}
        title={item.label}
      >
        <span
          style={styles.toggleIcon}
          onClick={isDirectory ? handleToggle : undefined}
          onKeyDown={(e) => {
            if (isDirectory && e.key === 'Enter') {
              handleToggle();
            }
          }}
          role={isDirectory ? 'button' : undefined}
          tabIndex={isDirectory ? 0 : undefined}
          aria-label={
            isDirectory ? (isExpanded ? t('tree.collapse') : t('tree.expand')) : undefined
          }
          aria-expanded={isDirectory ? isExpanded : undefined}
        >
          {isDirectory ? isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon /> : null}
        </span>
        <span
          style={{
            ...styles.treeLabel,
            fontWeight: isDirectory ? 500 : 400,
          }}
        >
          {item.label}
        </span>
      </div>
      {isExpanded &&
        hasVisibleChildren &&
        item.children.map((child) => (
          <DirTreeItem
            key={child.id}
            item={child}
            expandedDirs={expandedDirs}
            onToggleDir={onToggleDir}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function DirTree({
  data,
  expandedDirs,
  onToggleDir,
  sidebarVisible,
  onToggleSidebar,
}: DirTreeProps) {
  const { t } = useT();

  const treeItems = useMemo(() => buildDirTree(data.combos, data.nodes), [data.combos, data.nodes]);

  if (!sidebarVisible) {
    return (
      <div style={styles.collapsedContainer}>
        <button
          type="button"
          style={styles.collapsedToggleBtn}
          onClick={onToggleSidebar}
          title={t('tree.toggleSidebar')}
          aria-label={t('tree.toggleSidebar')}
        >
          <SidebarToggleIcon direction="right" />
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>{t('tree.title')}</span>
        <button
          type="button"
          style={styles.headerToggleBtn}
          onClick={onToggleSidebar}
          title={t('tree.toggleSidebar')}
          aria-label={t('tree.toggleSidebar')}
        >
          <SidebarToggleIcon direction="left" />
        </button>
      </div>
      <div style={styles.treeContent}>
        {treeItems.length === 0 ? (
          <div style={styles.emptyState}>{t('graph.noData')}</div>
        ) : (
          treeItems.map((item) => (
            <DirTreeItem
              key={item.id}
              item={item}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 260,
    minWidth: 260,
    background: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  collapsedContainer: {
    width: 32,
    minWidth: 32,
    background: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  headerToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    borderRadius: 4,
  },
  treeContent: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 0',
  },
  treeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    cursor: 'default',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: 13,
    lineHeight: '22px',
    color: 'var(--color-text-secondary)',
  },
  toggleIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    flexShrink: 0,
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    borderRadius: 3,
  },
  treeLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text-primary)',
  },
  emptyState: {
    padding: '16px 12px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 13,
  },
};
