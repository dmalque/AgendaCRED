// @vitest-environment node
import { expect, it } from 'vitest';
import ExcelJS from 'exceljs';
it('writes and reads XLSX preserving leading zeros and treating text as text', async () => {
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet('Agenda');
  sheet.addRow(['IPRESS', 'Documento', 'Nombre']);
  sheet.addRow(['00005222', '00123456', '=not-a-formula']);
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(await workbook.xlsx.writeBuffer());
  expect(copy.worksheets[0].getCell('A2').value).toBe('00005222');
  expect(copy.worksheets[0].getCell('B2').value).toBe('00123456');
  expect(copy.worksheets[0].getCell('C2').type).toBe(ExcelJS.ValueType.String);
});
