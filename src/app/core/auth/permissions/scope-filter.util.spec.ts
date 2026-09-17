import type { ScopeGrant } from './permission.types';
import { describeScope, filterByScope } from './scope-filter.util';

interface Row {
  readonly id: string;
  readonly departmentId: string;
}

const rows: readonly Row[] = [
  { id: '1', departmentId: 'dept-a' },
  { id: '2', departmentId: 'dept-b' },
  { id: '3', departmentId: 'dept-a' },
];

function grant(overrides: Partial<ScopeGrant> = {}): ScopeGrant {
  return {
    assignmentId: 'assign-1',
    roleId: 'role-1',
    roleName: 'Registrar',
    organizationNodeId: 'dept-a',
    ...overrides,
  };
}

describe('filterByScope', () => {
  it('returns nothing when there are zero scope grants (fail-closed)', () => {
    expect(filterByScope(rows, (r) => r.departmentId, [])).toEqual([]);
  });

  it('returns every row when any grant is global (organizationNodeId null)', () => {
    const grants = [grant({ organizationNodeId: null })];
    expect(filterByScope(rows, (r) => r.departmentId, grants)).toEqual(rows);
  });

  it('returns only rows matching a scoped grant node id', () => {
    const grants = [grant({ organizationNodeId: 'dept-a' })];
    const result = filterByScope(rows, (r) => r.departmentId, grants);
    expect(result.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('unions rows across multiple scoped grants', () => {
    const grants = [
      grant({ organizationNodeId: 'dept-a' }),
      grant({ organizationNodeId: 'dept-b', assignmentId: 'a2' }),
    ];
    const result = filterByScope(rows, (r) => r.departmentId, grants);
    expect(result.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('excludes a row whose node id resolves to null/undefined', () => {
    const looseRows = [...rows, { id: '4', departmentId: undefined as unknown as string }];
    const grants = [grant({ organizationNodeId: 'dept-a' })];
    const result = filterByScope(looseRows, (r) => r.departmentId, grants);
    expect(result.some((r) => r.id === '4')).toBeFalse();
  });
});

describe('describeScope', () => {
  it('describes an unresolved scope', () => {
    expect(describeScope([])).toBe('No organizational scope resolved');
  });

  it('describes a global grant', () => {
    expect(describeScope([grant({ organizationNodeId: null })])).toBe('All organizations');
  });

  it('describes a scoped grant with its role name(s)', () => {
    expect(describeScope([grant({ roleName: 'Department Head' })])).toBe(
      'Scoped to 1 organization node(s) via Department Head',
    );
  });
});
