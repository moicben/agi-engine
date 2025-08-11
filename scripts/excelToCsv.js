import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

/**
 * Convert XLSX to CSV
 * @param {string} xlsxPath - Relative path to the XLSX file
 * @param {string} csvPath - Relative path to the output CSV file
 */
export function excelToCsv(xlsxPath, csvPath) {
    try {
        // Resolve paths
        const xlsxFullPath = path.resolve(xlsxPath);
        const csvFullPath = path.resolve(csvPath);

        // Read the XLSX file
        const workbook = xlsx.readFile(xlsxFullPath);

        // Get the first sheet name
        const sheetName = workbook.SheetNames[0];

        // Convert the sheet to CSV
        const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);

        // Add BOM to handle special characters (e.g., accents)
        const csvDataWithBom = '\uFEFF' + csvData;

        // Write the CSV data to the output file
        fs.writeFileSync(csvFullPath, csvDataWithBom, 'utf8');

        console.log(`Conversion réussie : ${xlsxPath} -> ${csvPath}`);
    } catch (error) {
        console.error('Erreur lors de la conversion :', error.message);
    }
}

// Command-line usage
if (process.argv.length === 4) {
    const xlsxPath = process.argv[2];
    const csvPath = process.argv[3];
    excelToCsv(xlsxPath, csvPath);
} else {
    console.log('Usage : node excelToCsv.js "relative path xlsx" "relative path csv"');
}