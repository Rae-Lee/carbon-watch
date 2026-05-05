/**
 * Company Data Transformer
 * 
 * This script implements Phase 1 (item 3) of the data source roadmap:
 * - Reads raw CSV files from raw-data/
 * - Transforms data into unified JSON schema for UI layer
 * - Outputs to app/assets/data/ directory
 * 
 * ## Usage
 * 
 * ```bash
 * npm run transform-company-data
 * ```
 * 
 * ## Input
 * 
 * - **Source 1**: `raw-data/I. 總表（易讀版）.csv` - Basic company data
 * - **Source 2**: `raw-data/I. 總表（進階版）.csv` - Advanced company data
 * - **Source 3**: `raw-data/I. 總表各欄數值分級.csv` - Grade mapping for numeric fields
 * 
 * ## Output
 * 
 * ### Company List (`app/assets/data/company-list.json`)
 * 
 * Merged data from basic and advanced company tables.
 * 
 * ### Company Grade Map (`app/assets/data/company-grade-map.json`)
 * 
 * Grade mapping for numeric fields:
 * 
 * ```typescript
 * interface GradeMap {
 *   [欄位名稱: string]: Array<{
 *     max?: number;
 *     min?: number;
 *     label: string;
 *   }>;
 * }
 * ```
 * 
 * ### Region List (`app/assets/data/region-list.json`)
 * 
 * Array of unique 代表縣市 values, ordered by geographic location (north to south, west to east).
 * 
 * ### Industry List (`app/assets/data/industry-list.json`)
 * 
 * Array of 產業分類 with counts, ordered by count descending:
 * 
 * ```typescript
 * Array<{ industry: string; count: number }>
 * ```
 * 
 * ## Implementation Notes
 * 
 * - Uses CSV parser that handles quoted fields and special characters
 * - Merges basic and advanced data by company name (公司)
 * - Logs all operations for transparency and traceability
 * - Follows the data source roadmap (Phase 1, item 3)
 * - missing abbr: 國巨, 彩晶, 穩懋, 永豐實, 唐榮公司, 中碳, 中環, 精金, 台燿, 晶碩, 台達化, 台耀, 環泰, 台鹽, 台半
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './lib/logger.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const RAW_DATA_DIR = join(__dirname, '..', 'raw-data');
const OUTPUT_DIR = join(__dirname, '..', 'app', 'assets', 'data');

/**
 * Parse CSV string to array of objects
 */
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current);
  
  return result;
}

/**
 * Parse a number string from CSV (handles commas and whitespace)
 */
function parseNumber(value: string): number | undefined {
  if (!value || value === '') return undefined;
  // Remove commas and whitespace
  const cleaned = value.replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Grade definition interface
 */
interface GradeDefinition {
  max?: number;
  min?: number;
  label: string;
}

/**
 * Grade map interface
 */
type GradeMap = Record<string, GradeDefinition[]>;

/**
 * Transform grade map data
 */
function transformGradeMap(rawData: Record<string, string>[]): GradeMap {
  const gradeMap: GradeMap = {};
  
  for (const row of rawData) {
    const 欄位名稱 = row['欄位名稱'];
    const 分級名稱 = row['分級名稱'];
    
    if (!欄位名稱 || !分級名稱) {
      continue;
    }
    
    if (!gradeMap[欄位名稱]) {
      gradeMap[欄位名稱] = [];
    }
    
    const grade: GradeDefinition = {
      label: 分級名稱,
    };
    
    const minValue = parseNumber(row['最小值']);
    const maxValue = parseNumber(row['最大值']);
    
    if (minValue !== undefined) {
      grade.min = minValue;
    }
    if (maxValue !== undefined) {
      grade.max = maxValue;
    }
    
    gradeMap[欄位名稱].push(grade);
  }
  
  return gradeMap;
}

/**
 * Merge company data from basic and advanced tables
 */
function mergeCompanyData(
  basicData: Record<string, string>[],
  advancedData: Record<string, string>[]
): Record<string, string>[] {
  // Create a map for quick lookup of advanced data by company name
  const advancedMap = new Map<string, Record<string, string>>();
  for (const row of advancedData) {
    const companyName = row['公司'];
    if (companyName) {
      advancedMap.set(companyName, row);
    }
  }
  
  // Merge basic and advanced data
  const mergedData: Record<string, string>[] = [];
  
  for (const basicRow of basicData) {
    const companyName = basicRow['公司'];
    const advancedRow = advancedMap.get(companyName);
    
    // Merge basic row with advanced row (advanced data takes precedence for duplicate keys)
    const mergedRow: Record<string, string> = {
      ...basicRow,
      ...(advancedRow || {}),
    };
    
    mergedData.push(mergedRow);
  }
  
  return mergedData;
}

/**
 * Add 代表縣市 data to company list.
 * Primary source: all-company.csv (公開資訊觀測站 listed-company registry).
 * Hub fallback: 排碳大戶表_Data.csv when all-company.csv name_abbr is empty
 *   (subsidiaries / 非上市櫃 entries lack name_abbr there).
 */
function addRepresentativeCity(
  companyList: Record<string, string>[],
  allCompanyData: Record<string, string>[],
  companyDetailData: Record<string, string>[],
  hubData: Record<string, string>[],
  logger: Logger
): Record<string, string>[] {
  logger.info('Step 3: Adding 代表縣市, 事業統編, and 公司全名 data');

  // Map 1: all-company name_abbr -> { tax_code, name }
  const nameAbbrToCompany = new Map<string, { taxCode: string; fullName: string }>();
  for (const company of allCompanyData) {
    const nameAbbr = company['name_abbr']?.trim();
    const taxCode = company['tax_code']?.trim();
    const fullName = company['name']?.trim();
    if (nameAbbr && taxCode && fullName) {
      nameAbbrToCompany.set(nameAbbr, { taxCode, fullName });
    }
  }
  logger.info(`Loaded ${nameAbbrToCompany.size} company mappings from all-company.csv`);

  // Map 1b (hub fallback): 公司簡稱 -> { 統一編號, 公司全稱, 最大廠所處縣市 }
  const hubByAbbr = new Map<string, { taxCode: string; fullName: string; city: string }>();
  for (const row of hubData) {
    const abbr = row['公司簡稱']?.trim();
    const taxCode = row['統一編號']?.trim();
    const fullName = row['公司全稱']?.trim() ?? '';
    const city = row['最大廠所處縣市']?.trim() ?? '';
    if (abbr && taxCode) {
      hubByAbbr.set(abbr, { taxCode, fullName, city });
    }
  }
  logger.info(`Loaded ${hubByAbbr.size} hub mappings from 排碳大戶表_Data.csv (fallback)`);

  // Map 2: tax_code -> 代表縣市
  const taxCodeToCity = new Map<string, string>();
  for (const detail of companyDetailData) {
    const taxCode = detail['事業統編']?.trim();
    const city = detail['代表縣市']?.trim();
    if (taxCode && city) {
      taxCodeToCity.set(taxCode, city);
    }
  }
  logger.info(`Loaded ${taxCodeToCity.size} city mappings from II. 公司總表（原始值）.csv`);

  let successCount = 0;
  let hubFallbackCount = 0;
  const failedCompanies: string[] = [];

  for (const company of companyList) {
    const companyName = company['公司'];

    // Step 1: Try all-company.csv (primary source)
    let companyInfo: { taxCode: string; fullName: string } | undefined =
      nameAbbrToCompany.get(companyName);
    let cityFromHub = '';

    // Step 1b: Hub fallback when all-company miss (154/287 lack name_abbr there)
    if (!companyInfo) {
      const hubMatch = hubByAbbr.get(companyName);
      if (hubMatch) {
        companyInfo = { taxCode: hubMatch.taxCode, fullName: hubMatch.fullName };
        cityFromHub = hubMatch.city;
        hubFallbackCount++;
      }
    }

    if (!companyInfo) {
      failedCompanies.push(companyName);
      logger.info(`Cannot find tax_code for company: ${companyName}`);
      continue;
    }

    const { taxCode, fullName } = companyInfo;

    // Step 2: Get 代表縣市 — prefer II. 公司總表 lookup, else hub's 最大廠所處縣市
    let city = taxCodeToCity.get(taxCode) ?? '';
    if (!city && cityFromHub) {
      city = cityFromHub;
    }

    if (!city) {
      failedCompanies.push(companyName);
      logger.info(`Cannot find 代表縣市 for company: ${companyName} (tax_code: ${taxCode})`);
      // Still add tax_code and full name even if city is not found
      company['事業統編'] = taxCode;
      if (fullName) company['公司全名'] = fullName;
      continue;
    }

    // Add all fields to company record
    company['代表縣市'] = city;
    company['事業統編'] = taxCode;
    if (fullName) company['公司全名'] = fullName;
    successCount++;
  }

  logger.success(`Successfully added 代表縣市 for ${successCount}/${companyList.length} companies`);
  if (hubFallbackCount > 0) {
    logger.info(`Hub fallback used for ${hubFallbackCount} companies (all-company.csv name_abbr empty)`);
  }

  if (failedCompanies.length > 0) {
    logger.info(`Failed to map ${failedCompanies.length} companies:`);
    failedCompanies.forEach(name => logger.info(`  - ${name}`));
  }

  return companyList;
}

/**
 * Compute YoY 排放量 delta from hub 總碳排放量_2023 vs _2024.
 * Adds company['年度變化'] = number (percentage, 1 decimal) or null when either
 * year is missing. CompanyHeader.vue hides the YoY badge when null.
 */
function addEmissionYoYDelta(
  companyList: Record<string, string>[],
  hubData: Record<string, string>[],
  logger: Logger
): Record<string, string>[] {
  const parseEmission = (raw: string | undefined): number | null => {
    if (!raw) return null;
    const n = parseFloat(raw.replace(/,/g, ''));
    return isNaN(n) || n <= 0 ? null : n;
  };

  const hub2023 = new Map<string, number>();
  const hub2024 = new Map<string, number>();
  for (const row of hubData) {
    const abbr = row['公司簡稱']?.trim();
    if (!abbr) continue;
    const e2023 = parseEmission(row['總碳排放量_2023']);
    const e2024 = parseEmission(row['總碳排放量_2024']);
    if (e2023 !== null) hub2023.set(abbr, e2023);
    if (e2024 !== null) hub2024.set(abbr, e2024);
  }

  let computed = 0;
  let missing = 0;
  for (const company of companyList) {
    const abbr = company['公司'];
    const e2023 = hub2023.get(abbr);
    const e2024 = hub2024.get(abbr);
    if (e2023 === undefined || e2024 === undefined) {
      (company as Record<string, unknown>)['年度變化'] = null;
      missing++;
      continue;
    }
    const delta = ((e2024 - e2023) / e2023) * 100;
    (company as Record<string, unknown>)['年度變化'] = Math.round(delta * 10) / 10;
    computed++;
  }

  logger.success(`Computed 年度變化 (YoY emission delta) for ${computed}/${companyList.length} companies`);
  if (missing > 0) logger.info(`  ${missing} skipped (missing 2023 or 2024 emission data)`);

  return companyList;
}

/**
 * Add per-company top-3 縣市 emission distribution.
 * Source: IV. 企業縣市排放絕對值（公式）.csv (公司全名 × 縣市 absolute matrix).
 * 縣市佔比 = company emission in this county / sum of all 排碳大戶 in this county × 100
 *   (advocacy framing: 該公司在縣市的污染主導地位)
 */
function addRegionEmissionDistribution(
  companyList: Record<string, string>[],
  regionAbsoluteData: Record<string, string>[],
  logger: Logger
): Record<string, string>[] {
  if (regionAbsoluteData.length === 0) {
    logger.info('No region absolute data; skipping');
    return companyList;
  }

  const KEY_COLUMN = '於該縣市合計排放量(公噸CO2e)';
  const TOTAL_COLUMN = '全台';
  const allFields = Object.keys(regionAbsoluteData[0]!);
  const countyColumns = allFields.filter(f => f !== KEY_COLUMN && f !== TOTAL_COLUMN);

  const parseAmount = (raw: string | undefined): number => {
    if (!raw) return 0;
    const n = parseFloat(raw.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  };

  // County totals: sum each county column across all companies
  const countyTotals: Record<string, number> = {};
  for (const county of countyColumns) {
    countyTotals[county] = regionAbsoluteData.reduce(
      (sum, row) => sum + parseAmount(row[county]),
      0
    );
  }

  // Lookup company row by normalized 公司全名 (handle 臺/台 异体字)
  const normalizeName = (name: string) => name.replace(/臺/g, '台');
  const rowByFullName = new Map<string, Record<string, string>>();
  for (const row of regionAbsoluteData) {
    const fullName = row[KEY_COLUMN]?.trim();
    if (fullName) rowByFullName.set(normalizeName(fullName), row);
  }

  let attached = 0;
  let missingFullName = 0;
  let notInRegionCsv = 0;

  for (const company of companyList) {
    const fullName = company['公司全名'];
    if (!fullName) {
      missingFullName++;
      continue;
    }
    const row = rowByFullName.get(normalizeName(fullName));
    if (!row) {
      notInRegionCsv++;
      continue;
    }

    const items: Array<{ 縣市: string; 排放量: number; 縣市佔比: number }> = [];
    for (const county of countyColumns) {
      const val = parseAmount(row[county]);
      if (val > 0) {
        const total = countyTotals[county] || 0;
        const share = total > 0 ? Math.round((val / total) * 1000) / 10 : 0;
        items.push({ 縣市: county, 排放量: val, 縣市佔比: share });
      }
    }

    items.sort((a, b) => b.排放量 - a.排放量);
    const top3 = items.slice(0, 3);

    if (top3.length > 0) {
      (company as Record<string, unknown>)['regionEmissions'] = top3;
      attached++;
    }
  }

  logger.success(`Attached regionEmissions to ${attached}/${companyList.length} companies`);
  if (missingFullName > 0) logger.info(`  ${missingFullName} skipped (no 公司全名)`);
  if (notInRegionCsv > 0) logger.info(`  ${notInRegionCsv} not in IV. 企業縣市排放絕對值（公式）.csv`);

  return companyList;
}

const RADAR_SCORE_FIELDS = [
  '2030年溫室氣體絕對減量目標',
  '2030年再生能源使用率目標',
  '2030年能源效率進步目標',
  '2024年再生能源使用率',
  '2022-2024年能源效率進步率',
  '範疇三及減量策略',
];

/**
 * Override the 6 radar score columns on each company with values from
 * 雷達圖_Data.csv (the canonical source). The hub CSV (排碳大戶表_Data.csv)
 * provides the 公司簡稱 → 統一編號 mapping for all 287 companies, which is
 * more complete than all-company.csv (some companies lack name_abbr there).
 */
function applyRadarScoresFromSource(
  companyList: Record<string, string>[],
  hubData: Record<string, string>[],
  radarData: Record<string, string>[],
  logger: Logger
): Record<string, string>[] {
  const nameToUbn = new Map<string, string>();
  for (const row of hubData) {
    const abbr = row['公司簡稱']?.trim();
    const ubn = row['統一編號']?.trim();
    if (abbr && ubn) nameToUbn.set(abbr, ubn);
  }

  const ubnToScores = new Map<string, Record<string, string>>();
  for (const row of radarData) {
    const ubn = row['統一編號']?.trim();
    if (!ubn) continue;
    const scores: Record<string, string> = {};
    for (const field of RADAR_SCORE_FIELDS) scores[field] = row[field] ?? '';
    ubnToScores.set(ubn, scores);
  }

  let matched = 0;
  const unmatched: string[] = [];
  for (const company of companyList) {
    const name = company['公司']?.trim();
    const ubn = name ? nameToUbn.get(name) : undefined;
    const scores = ubn ? ubnToScores.get(ubn) : undefined;
    if (!scores) {
      unmatched.push(`${name ?? '<no name>'} (ubn=${ubn ?? 'unknown'})`);
      continue;
    }
    for (const field of RADAR_SCORE_FIELDS) company[field] = scores[field];
    matched++;
  }

  logger.success(
    `Radar scores joined from 雷達圖_Data: ${matched}/${companyList.length} companies`
  );
  if (unmatched.length > 0) {
    logger.info(`Unmatched (${unmatched.length}):`);
    unmatched.slice(0, 10).forEach(name => logger.info(`  - ${name}`));
  }

  return companyList;
}

/**
 * Main transformation function
 */
async function transformCompanyData() {
  const logger = new Logger();

  try {
    logger.info('Starting company data transformation');

    // 1. Load and merge basic and advanced company data
    logger.info('Step 1: Loading company data');
    
    const basicCsvPath = join(RAW_DATA_DIR, 'I. 總表（易讀版）.csv');
    logger.info(`Reading basic data from: ${basicCsvPath}`);
    const basicCsvContent = readFileSync(basicCsvPath, 'utf-8');
    const basicData = parseCSV(basicCsvContent);
    logger.info(`Parsed ${basicData.length} records from basic table`);

    const advancedCsvPath = join(RAW_DATA_DIR, 'I. 總表（進階版）.csv');
    logger.info(`Reading advanced data from: ${advancedCsvPath}`);
    const advancedCsvContent = readFileSync(advancedCsvPath, 'utf-8');
    const advancedData = parseCSV(advancedCsvContent);
    logger.info(`Parsed ${advancedData.length} records from advanced table`);

    // Merge data
    let companyList = mergeCompanyData(basicData, advancedData);
    logger.success(`Merged company data: ${companyList.length} companies`);

    // 2. Load and transform grade map
    logger.info('Step 2: Loading grade map');
    
    const gradeMapCsvPath = join(RAW_DATA_DIR, 'I. 總表各欄數值分級.csv');
    logger.info(`Reading grade map from: ${gradeMapCsvPath}`);
    const gradeMapCsvContent = readFileSync(gradeMapCsvPath, 'utf-8');
    const gradeMapData = parseCSV(gradeMapCsvContent);
    logger.info(`Parsed ${gradeMapData.length} grade definitions`);

    const gradeMap = transformGradeMap(gradeMapData);
    const gradeMapFields = Object.keys(gradeMap);
    logger.success(`Transformed grade map: ${gradeMapFields.length} fields`);
    logger.info(`Grade map fields: ${gradeMapFields.join(', ')}`);

    // 3. Load all-company.csv and company detail data
    const allCompanyCsvPath = join(RAW_DATA_DIR, 'all-company.csv');
    logger.info(`Reading all-company data from: ${allCompanyCsvPath}`);
    const allCompanyCsvContent = readFileSync(allCompanyCsvPath, 'utf-8');
    const allCompanyData = parseCSV(allCompanyCsvContent);
    logger.info(`Parsed ${allCompanyData.length} records from all-company.csv`);

    const companyDetailCsvPath = join(RAW_DATA_DIR, 'II. 公司總表（原始值）.csv');
    logger.info(`Reading company detail data from: ${companyDetailCsvPath}`);
    const companyDetailCsvContent = readFileSync(companyDetailCsvPath, 'utf-8');
    const companyDetailData = parseCSV(companyDetailCsvContent);
    logger.info(`Parsed ${companyDetailData.length} records from II. 公司總表（原始值）.csv`);

    // Hub provides 公司簡稱 → (統一編號, 公司全稱, 最大廠所處縣市) for all 287 companies,
    // used as fallback for the 154/287 entries that lack name_abbr in all-company.csv.
    const hubCsvPath = join(RAW_DATA_DIR, '排碳大戶表_Data.csv');
    logger.info(`Reading hub data from: ${hubCsvPath}`);
    const hubData = parseCSV(readFileSync(hubCsvPath, 'utf-8'));
    logger.info(`Parsed ${hubData.length} records from 排碳大戶表_Data.csv`);

    // Add 代表縣市 to company list (with hub fallback)
    companyList = addRepresentativeCity(companyList, allCompanyData, companyDetailData, hubData, logger);

    // Compute YoY emission delta from hub 總碳排放量_2023 vs _2024
    companyList = addEmissionYoYDelta(companyList, hubData, logger);

    // Add per-company top-3 縣市 emission distribution
    const regionAbsCsvPath = join(RAW_DATA_DIR, 'IV. 企業縣市排放絕對值（公式）.csv');
    logger.info(`Reading region emission absolute data from: ${regionAbsCsvPath}`);
    const regionAbsoluteData = parseCSV(readFileSync(regionAbsCsvPath, 'utf-8'));
    logger.info(`Parsed ${regionAbsoluteData.length} records from IV. 企業縣市排放絕對值（公式）.csv`);
    companyList = addRegionEmissionDistribution(companyList, regionAbsoluteData, logger);

    // 4. Override radar score columns from 雷達圖_Data (single source of truth).
    // 易讀版 carries duplicate score columns that go stale if its snapshot is not
    // refreshed in lockstep with 雷達圖_Data. Joining via the hub (排碳大戶表_Data)
    // covers companies whose 事業統編 lookup via all-company.csv fails.

    const radarCsvPath = join(RAW_DATA_DIR, '雷達圖_Data.csv');
    logger.info(`Reading radar source from: ${radarCsvPath}`);
    const radarRaw = readFileSync(radarCsvPath, 'utf-8');
    // First row is a section-label band ("Demo,,,目標設定,..."); real header is row 2.
    const radarTrimmed = radarRaw.slice(radarRaw.indexOf('\n') + 1);
    const radarData = parseCSV(radarTrimmed);
    logger.info(`Parsed ${radarData.length} records from 雷達圖_Data.csv`);

    companyList = applyRadarScoresFromSource(companyList, hubData, radarData, logger);

    // Create output directory if it doesn't exist
    mkdirSync(OUTPUT_DIR, { recursive: true });
    logger.info(`Output directory: ${OUTPUT_DIR}`);

    // Write company list JSON
    const companyListPath = join(OUTPUT_DIR, 'company-list.json');
    writeFileSync(
      companyListPath,
      JSON.stringify(companyList, null, 2),
      'utf-8'
    );
    logger.success(`Saved company list to: company-list.json`);

    // Write grade map JSON
    const gradeMapPath = join(OUTPUT_DIR, 'company-grade-map.json');
    writeFileSync(
      gradeMapPath,
      JSON.stringify(gradeMap, null, 2),
      'utf-8'
    );
    logger.success(`Saved grade map to: company-grade-map.json`);

    // Generate region list (ordered by geographic location: north to south, west to east)
    logger.info('Step 4: Generating region list');
    const regionSet = new Set<string>();
    companyList.forEach(company => {
      const region = company['代表縣市'];
      if (region && region.trim()) {
        regionSet.add(region.trim());
      }
    });
    
    // Manual ordering: north to south, west to east
    const taiwanRegionOrder = [
      '基隆市',
      '臺北市',
      '新北市',
      '桃園市',
      '新竹市',
      '新竹縣',
      '苗栗縣',
      '臺中市',
      '彰化縣',
      '雲林縣',
      '嘉義市',
      '嘉義縣',
      '臺南市',
      '高雄市',
      '屏東縣',
      '南投縣',
      '宜蘭縣',
      '花蓮縣',
      '臺東縣',
      '澎湖縣',
      '金門縣',
      '連江縣',
    ];
    
    const regionList = taiwanRegionOrder.filter(region => regionSet.has(region));
    logger.info(`Found ${regionList.length} unique regions`);
    
    const regionListPath = join(OUTPUT_DIR, 'region-list.json');
    writeFileSync(
      regionListPath,
      JSON.stringify(regionList, null, 2),
      'utf-8'
    );
    logger.success(`Saved region list to: region-list.json`);

    // Generate industry list (ordered by count desc)
    logger.info('Step 5: Generating industry list');
    const industryCount = new Map<string, number>();
    companyList.forEach(company => {
      const industry = company['產業分類'];
      if (industry && industry.trim()) {
        const trimmedIndustry = industry.trim();
        industryCount.set(trimmedIndustry, (industryCount.get(trimmedIndustry) || 0) + 1);
      }
    });
    
    const industryList = Array.from(industryCount.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([industry, count]) => ({ industry, count }));
    
    logger.info(`Found ${industryList.length} unique industries`);
    
    const industryListPath = join(OUTPUT_DIR, 'industry-list.json');
    writeFileSync(
      industryListPath,
      JSON.stringify(industryList, null, 2),
      'utf-8'
    );
    logger.success(`Saved industry list to: industry-list.json`);

    // Generate top 10 companies by 溫室氣體排放量
    logger.info('Step 6: Generating top 10 companies by emissions');
    const companiesWithEmissions = companyList
      .map(company => {
        const emissions = parseNumber(company['溫室氣體排放量（公噸二氧化碳當量）']);
        return {
          ...company,
          emissionsValue: emissions || 0
        };
      })
      .filter(company => company.emissionsValue > 0)
      .sort((a, b) => b.emissionsValue - a.emissionsValue)
      .slice(0, 10);
    
    const top10Companies = companiesWithEmissions.map(({ emissionsValue, ...company }) => company); // Remove the temporary emissionsValue field
    
    logger.info(`Top 10 companies by emissions:`);
    companiesWithEmissions.forEach((item, index) => {
      const company = item as Record<string, string> & { emissionsValue: number };
      logger.info(`  ${index + 1}. ${company['公司']} - ${company['溫室氣體排放量（公噸二氧化碳當量）']}`);
    });
    
    const top10Path = join(OUTPUT_DIR, 'top-10-companies.json');
    writeFileSync(
      top10Path,
      JSON.stringify(top10Companies, null, 2),
      'utf-8'
    );
    logger.success(`Saved top 10 companies to: top-10-companies.json`);

    // Log sample of transformed data
    logger.info('Sample of company data (first 2 records):');
    console.log(JSON.stringify(companyList.slice(0, 2), null, 2));
    
    logger.info('Sample of grade map:');
    const sampleField = gradeMapFields[0];
    if (sampleField) {
      console.log(`Field: ${sampleField}`);
      console.log(JSON.stringify(gradeMap[sampleField], null, 2));
    }

    // Summary
    logger.info('='.repeat(60));
    logger.success('Data transformation completed successfully');
    logger.info(`Total companies processed: ${companyList.length}`);
    logger.info(`Total grade fields: ${gradeMapFields.length}`);
    logger.info(`Total regions: ${regionList.length}`);
    logger.info(`Total industries: ${industryList.length}`);
    logger.info(`Top 10 companies exported: ${top10Companies.length}`);
    logger.logDuration();
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Fatal error during data transformation', error);
    process.exit(1);
  }
}

// Run the script
transformCompanyData();
