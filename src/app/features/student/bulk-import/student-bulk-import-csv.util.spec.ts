import { parseStudentBulkImportCsv } from './student-bulk-import-csv.util';

describe('parseStudentBulkImportCsv', () => {
  it('returns an empty array for a header-only or empty input', () => {
    expect(parseStudentBulkImportCsv('')).toEqual([]);
    expect(parseStudentBulkImportCsv('givenName,familyName')).toEqual([]);
  });

  it('parses a CREATE row (no studentNumber) with string and number fields', () => {
    const csv = [
      'originatingApplicationId,admissionYear,facultyCode,departmentId,programId,givenName,familyName,email,dateOfBirth',
      '11111111-1111-1111-1111-111111111111,2026,ENG,dept-1,prog-1,Jane,Doe,jane@x.com,2000-01-01',
    ].join('\n');

    const rows = parseStudentBulkImportCsv(csv);
    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual(
      jasmine.objectContaining({
        originatingApplicationId: '11111111-1111-1111-1111-111111111111',
        admissionYear: 2026,
        facultyCode: 'ENG',
        departmentId: 'dept-1',
        programId: 'prog-1',
        givenName: 'Jane',
        familyName: 'Doe',
        email: 'jane@x.com',
        dateOfBirth: '2000-01-01',
        studentNumber: null,
        expectedVersion: null,
      }),
    );
  });

  it('parses an UPDATE row (studentNumber + expectedVersion present)', () => {
    const csv = ['studentNumber,expectedVersion,contactEmail', 'STU-1,3,new@x.com'].join('\n');
    const rows = parseStudentBulkImportCsv(csv);
    expect(rows[0].studentNumber).toBe('STU-1');
    expect(rows[0].expectedVersion).toBe(3);
    expect(rows[0].contactEmail).toBe('new@x.com');
  });

  it('treats a blank cell as null, never an empty string', () => {
    const csv = ['givenName,familyName,mobile', 'Jane,Doe,'].join('\n');
    const rows = parseStudentBulkImportCsv(csv);
    expect(rows[0].mobile).toBeNull();
  });

  it('ignores unknown headers and treats a missing header as blank for every row', () => {
    const csv = ['givenName,unknownColumn', 'Jane,whatever'].join('\n');
    const rows = parseStudentBulkImportCsv(csv);
    expect(rows[0].givenName).toBe('Jane');
    expect(rows[0].familyName).toBeNull();
  });

  it('parses multiple rows independently', () => {
    const csv = ['givenName,familyName', 'Jane,Doe', 'John,Smith'].join('\n');
    const rows = parseStudentBulkImportCsv(csv);
    expect(rows.length).toBe(2);
    expect(rows[1].givenName).toBe('John');
  });

  it('trims whitespace and ignores blank lines', () => {
    const csv = ['givenName,familyName', '', '  Jane , Doe  ', ''].join('\n');
    const rows = parseStudentBulkImportCsv(csv);
    expect(rows.length).toBe(1);
    expect(rows[0].givenName).toBe('Jane');
    expect(rows[0].familyName).toBe('Doe');
  });
});
