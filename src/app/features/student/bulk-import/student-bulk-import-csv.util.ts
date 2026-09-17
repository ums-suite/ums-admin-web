import type { StudentBulkImportRowInput } from '../student.types';

/**
 * ADMIN-16: client-side CSV -> {@link StudentBulkImportRowInput} parsing -- `ums-core`'s own
 * `StudentBulkImportRowInput` doc comment confirms "row parsing (e.g. CSV -> this shape) happens
 * client-side/upstream of this API; the endpoint accepts already-structured rows," so this app is
 * the one place that parsing has to happen, not a server-side upload-a-file step.
 *
 * Deliberately simple: a plain comma-split, no quoted-field/embedded-comma support -- a fuller CSV
 * grammar is a reasonable future enhancement, out of scope for this pass. The first line is the
 * header row; header names must match {@link StudentBulkImportRowInput}'s own field names exactly
 * (case-insensitive). An unknown header is ignored; a missing header is treated as blank for every
 * row. A blank cell becomes `null`, never an empty string, matching every field's own nullable
 * shape.
 */
const STRING_FIELDS = [
  'originatingApplicationId',
  'studentNumber',
  'facultyCode',
  'departmentId',
  'programId',
  'givenName',
  'familyName',
  'givenNameBn',
  'familyNameBn',
  'email',
  'mobile',
  'dateOfBirth',
  'nationalId',
  'contactEmail',
  'contactPhone',
  'photoUrl',
] as const;

const NUMBER_FIELDS = ['expectedVersion', 'admissionYear'] as const;

export function parseStudentBulkImportCsv(csvText: string): readonly StudentBulkImportRowInput[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((cell) => cell.trim());
    const byHeader = new Map<string, string>();
    headers.forEach((header, index) => byHeader.set(header.toLowerCase(), cells[index] ?? ''));

    const row: Record<string, string | number | null> = {};
    for (const field of STRING_FIELDS) {
      const raw = byHeader.get(field.toLowerCase()) ?? '';
      row[field] = raw === '' ? null : raw;
    }
    for (const field of NUMBER_FIELDS) {
      const raw = byHeader.get(field.toLowerCase()) ?? '';
      row[field] = raw === '' ? null : Number(raw);
    }

    return row as unknown as StudentBulkImportRowInput;
  });
}
