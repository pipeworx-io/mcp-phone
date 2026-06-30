interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Phone number validation MCP.
 *
 * Keyless, offline phone-number parsing & validation against the E.164 / ITU-T
 * calling-code plan: detect the country, normalize to E.164, and check the
 * national-number length is plausible. No API key, no rate limits.
 *
 * Scope: format/country/length validation (the common "is this a real number
 * and where is it from" need). It does NOT do carrier or line-type (mobile vs
 * landline) lookup — that requires a live keyed HLR API (numverify/veriphone).
 */


// [callingCode, iso, country name, minNationalLen, maxNationalLen]
// National Significant Number length (digits, excluding the country code).
// Shared codes (+1 NANP, +7) are labelled as regions; +1/+7 area-code-level
// country disambiguation is out of scope.
const DATA: [string, string, string, number, number][] = [
  ['1', 'NANP', 'North America (US, Canada & Caribbean — NANP)', 10, 10],
  ['7', 'RU/KZ', 'Russia / Kazakhstan', 10, 10],
  ['20', 'EG', 'Egypt', 9, 10], ['27', 'ZA', 'South Africa', 9, 9],
  ['30', 'GR', 'Greece', 10, 10], ['31', 'NL', 'Netherlands', 9, 9],
  ['32', 'BE', 'Belgium', 8, 9], ['33', 'FR', 'France', 9, 9],
  ['34', 'ES', 'Spain', 9, 9], ['36', 'HU', 'Hungary', 8, 9],
  ['39', 'IT', 'Italy', 9, 11], ['40', 'RO', 'Romania', 9, 9],
  ['41', 'CH', 'Switzerland', 9, 9], ['43', 'AT', 'Austria', 7, 13],
  ['44', 'GB', 'United Kingdom', 9, 10], ['45', 'DK', 'Denmark', 8, 8],
  ['46', 'SE', 'Sweden', 7, 13], ['47', 'NO', 'Norway', 8, 8],
  ['48', 'PL', 'Poland', 9, 9], ['49', 'DE', 'Germany', 6, 11],
  ['51', 'PE', 'Peru', 9, 9], ['52', 'MX', 'Mexico', 10, 10],
  ['53', 'CU', 'Cuba', 6, 8], ['54', 'AR', 'Argentina', 10, 11],
  ['55', 'BR', 'Brazil', 10, 11], ['56', 'CL', 'Chile', 9, 9],
  ['57', 'CO', 'Colombia', 10, 10], ['58', 'VE', 'Venezuela', 10, 10],
  ['60', 'MY', 'Malaysia', 9, 10], ['61', 'AU', 'Australia', 9, 9],
  ['62', 'ID', 'Indonesia', 9, 12], ['63', 'PH', 'Philippines', 10, 10],
  ['64', 'NZ', 'New Zealand', 8, 10], ['65', 'SG', 'Singapore', 8, 8],
  ['66', 'TH', 'Thailand', 9, 9], ['81', 'JP', 'Japan', 9, 10],
  ['82', 'KR', 'South Korea', 9, 10], ['84', 'VN', 'Vietnam', 9, 10],
  ['86', 'CN', 'China', 10, 11], ['90', 'TR', 'Turkey', 10, 10],
  ['91', 'IN', 'India', 10, 10], ['92', 'PK', 'Pakistan', 10, 10],
  ['93', 'AF', 'Afghanistan', 9, 9], ['94', 'LK', 'Sri Lanka', 9, 9],
  ['95', 'MM', 'Myanmar', 7, 10], ['98', 'IR', 'Iran', 10, 10],
  ['211', 'SS', 'South Sudan', 9, 9], ['212', 'MA', 'Morocco', 9, 9],
  ['213', 'DZ', 'Algeria', 9, 9], ['216', 'TN', 'Tunisia', 8, 8],
  ['218', 'LY', 'Libya', 9, 9], ['220', 'GM', 'Gambia', 7, 7],
  ['221', 'SN', 'Senegal', 9, 9], ['223', 'ML', 'Mali', 8, 8],
  ['224', 'GN', 'Guinea', 9, 9], ['225', 'CI', 'Côte d’Ivoire', 10, 10],
  ['226', 'BF', 'Burkina Faso', 8, 8], ['227', 'NE', 'Niger', 8, 8],
  ['228', 'TG', 'Togo', 8, 8], ['229', 'BJ', 'Benin', 8, 8],
  ['230', 'MU', 'Mauritius', 7, 8], ['231', 'LR', 'Liberia', 7, 9],
  ['232', 'SL', 'Sierra Leone', 8, 8], ['233', 'GH', 'Ghana', 9, 9],
  ['234', 'NG', 'Nigeria', 8, 10], ['235', 'TD', 'Chad', 8, 8],
  ['236', 'CF', 'Central African Republic', 8, 8], ['237', 'CM', 'Cameroon', 9, 9],
  ['238', 'CV', 'Cape Verde', 7, 7], ['239', 'ST', 'São Tomé and Príncipe', 7, 7],
  ['240', 'GQ', 'Equatorial Guinea', 9, 9], ['241', 'GA', 'Gabon', 7, 8],
  ['242', 'CG', 'Republic of the Congo', 9, 9], ['243', 'CD', 'DR Congo', 9, 9],
  ['244', 'AO', 'Angola', 9, 9], ['245', 'GW', 'Guinea-Bissau', 7, 7],
  ['248', 'SC', 'Seychelles', 7, 7], ['249', 'SD', 'Sudan', 9, 9],
  ['250', 'RW', 'Rwanda', 9, 9], ['251', 'ET', 'Ethiopia', 9, 9],
  ['252', 'SO', 'Somalia', 7, 9], ['253', 'DJ', 'Djibouti', 8, 8],
  ['254', 'KE', 'Kenya', 9, 9], ['255', 'TZ', 'Tanzania', 9, 9],
  ['256', 'UG', 'Uganda', 9, 9], ['257', 'BI', 'Burundi', 8, 8],
  ['258', 'MZ', 'Mozambique', 9, 9], ['260', 'ZM', 'Zambia', 9, 9],
  ['261', 'MG', 'Madagascar', 9, 9], ['263', 'ZW', 'Zimbabwe', 9, 9],
  ['264', 'NA', 'Namibia', 9, 9], ['265', 'MW', 'Malawi', 9, 9],
  ['266', 'LS', 'Lesotho', 8, 8], ['267', 'BW', 'Botswana', 7, 8],
  ['268', 'SZ', 'Eswatini', 8, 8], ['269', 'KM', 'Comoros', 7, 7],
  ['291', 'ER', 'Eritrea', 7, 7], ['297', 'AW', 'Aruba', 7, 7],
  ['298', 'FO', 'Faroe Islands', 6, 6], ['299', 'GL', 'Greenland', 6, 6],
  ['350', 'GI', 'Gibraltar', 8, 8], ['351', 'PT', 'Portugal', 9, 9],
  ['352', 'LU', 'Luxembourg', 8, 9], ['353', 'IE', 'Ireland', 7, 9],
  ['354', 'IS', 'Iceland', 7, 9], ['355', 'AL', 'Albania', 9, 9],
  ['356', 'MT', 'Malta', 8, 8], ['357', 'CY', 'Cyprus', 8, 8],
  ['358', 'FI', 'Finland', 6, 12], ['359', 'BG', 'Bulgaria', 8, 9],
  ['370', 'LT', 'Lithuania', 8, 8], ['371', 'LV', 'Latvia', 8, 8],
  ['372', 'EE', 'Estonia', 7, 8], ['373', 'MD', 'Moldova', 8, 8],
  ['374', 'AM', 'Armenia', 8, 8], ['375', 'BY', 'Belarus', 9, 9],
  ['376', 'AD', 'Andorra', 6, 6], ['377', 'MC', 'Monaco', 8, 9],
  ['378', 'SM', 'San Marino', 10, 10], ['380', 'UA', 'Ukraine', 9, 9],
  ['381', 'RS', 'Serbia', 8, 9], ['382', 'ME', 'Montenegro', 8, 8],
  ['383', 'XK', 'Kosovo', 8, 8], ['385', 'HR', 'Croatia', 8, 9],
  ['386', 'SI', 'Slovenia', 8, 8], ['387', 'BA', 'Bosnia and Herzegovina', 8, 8],
  ['389', 'MK', 'North Macedonia', 8, 8], ['420', 'CZ', 'Czechia', 9, 9],
  ['421', 'SK', 'Slovakia', 9, 9], ['423', 'LI', 'Liechtenstein', 7, 9],
  ['500', 'FK', 'Falkland Islands', 5, 5], ['501', 'BZ', 'Belize', 7, 7],
  ['502', 'GT', 'Guatemala', 8, 8], ['503', 'SV', 'El Salvador', 8, 8],
  ['504', 'HN', 'Honduras', 8, 8], ['505', 'NI', 'Nicaragua', 8, 8],
  ['506', 'CR', 'Costa Rica', 8, 8], ['507', 'PA', 'Panama', 7, 8],
  ['509', 'HT', 'Haiti', 8, 8], ['51', 'PE', 'Peru', 9, 9],
  ['590', 'GP', 'Guadeloupe', 9, 9], ['591', 'BO', 'Bolivia', 8, 8],
  ['592', 'GY', 'Guyana', 7, 7], ['593', 'EC', 'Ecuador', 8, 9],
  ['595', 'PY', 'Paraguay', 9, 9], ['597', 'SR', 'Suriname', 6, 7],
  ['598', 'UY', 'Uruguay', 8, 8], ['599', 'CW', 'Curaçao / Caribbean Netherlands', 7, 8],
  ['670', 'TL', 'Timor-Leste', 7, 8], ['673', 'BN', 'Brunei', 7, 7],
  ['674', 'NR', 'Nauru', 7, 7], ['675', 'PG', 'Papua New Guinea', 8, 8],
  ['676', 'TO', 'Tonga', 5, 7], ['677', 'SB', 'Solomon Islands', 5, 7],
  ['678', 'VU', 'Vanuatu', 5, 7], ['679', 'FJ', 'Fiji', 7, 7],
  ['685', 'WS', 'Samoa', 5, 7], ['686', 'KI', 'Kiribati', 5, 8],
  ['689', 'PF', 'French Polynesia', 6, 8], ['852', 'HK', 'Hong Kong', 8, 8],
  ['853', 'MO', 'Macau', 8, 8], ['855', 'KH', 'Cambodia', 8, 9],
  ['856', 'LA', 'Laos', 8, 10], ['870', 'XS', 'Inmarsat (satellite)', 9, 9],
  ['880', 'BD', 'Bangladesh', 10, 10], ['886', 'TW', 'Taiwan', 9, 9],
  ['960', 'MV', 'Maldives', 7, 7], ['961', 'LB', 'Lebanon', 7, 8],
  ['962', 'JO', 'Jordan', 8, 9], ['963', 'SY', 'Syria', 9, 9],
  ['964', 'IQ', 'Iraq', 10, 10], ['965', 'KW', 'Kuwait', 8, 8],
  ['966', 'SA', 'Saudi Arabia', 9, 9], ['967', 'YE', 'Yemen', 7, 9],
  ['968', 'OM', 'Oman', 8, 8], ['970', 'PS', 'Palestine', 9, 9],
  ['971', 'AE', 'United Arab Emirates', 8, 9], ['972', 'IL', 'Israel', 8, 9],
  ['973', 'BH', 'Bahrain', 8, 8], ['974', 'QA', 'Qatar', 8, 8],
  ['975', 'BT', 'Bhutan', 7, 8], ['976', 'MN', 'Mongolia', 8, 8],
  ['977', 'NP', 'Nepal', 9, 10], ['992', 'TJ', 'Tajikistan', 9, 9],
  ['993', 'TM', 'Turkmenistan', 8, 8], ['994', 'AZ', 'Azerbaijan', 9, 9],
  ['995', 'GE', 'Georgia', 9, 9], ['996', 'KG', 'Kyrgyzstan', 9, 9],
  ['998', 'UZ', 'Uzbekistan', 9, 9],
];

// Build a fast lookup keyed by calling code (longest first for prefix match).
const BY_CODE = new Map<string, { iso: string; name: string; min: number; max: number }>();
for (const [cc, iso, name, min, max] of DATA) {
  if (!BY_CODE.has(cc)) BY_CODE.set(cc, { iso, name, min, max });
}
const ISO_TO_CODE = new Map<string, string>();
for (const [cc, iso] of DATA) if (!ISO_TO_CODE.has(iso)) ISO_TO_CODE.set(iso, cc);
const CODES_DESC = [...new Set(DATA.map((d) => d[0]))].sort((a, b) => b.length - a.length);

const tools: McpToolExport['tools'] = [
  {
    name: 'validate_phone',
    description:
      'Validate & parse a phone number against the E.164 / ITU calling-code plan (keyless, offline). Detects the country, normalizes to E.164, and checks the national-number length is plausible. Pass an international number (e.g. "+33 1 23 45 67 89") OR a national number plus a `country` ISO code (e.g. phone="020 7946 0958", country="GB"). Does NOT determine carrier or mobile-vs-landline (that needs a keyed HLR lookup).',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'The phone number to validate (international "+.." form, or national form with `country`).' },
        country: { type: 'string', description: 'Optional ISO 3166 alpha-2 country code (e.g. "US", "GB", "DE") used when `phone` is in national (non-+) form.' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'country_calling_codes',
    description: 'Look up international calling (dialing) codes. With no args, lists all. Pass `query` to filter by country name, ISO code, or calling code (e.g. "germany", "DE", "49").',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Country name, ISO alpha-2 code, or calling code to search for.' } },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'validate_phone':
      return validatePhone(reqStr(args, 'phone', '"+14155552671"'), typeof args.country === 'string' ? args.country.toUpperCase() : undefined);
    case 'country_calling_codes':
      return callingCodes(typeof args.query === 'string' ? args.query : undefined);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function validatePhone(raw: string, country?: string) {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+') || trimmed.startsWith('00');
  let digits = trimmed.replace(/[^\d]/g, '');
  if (trimmed.startsWith('00')) digits = digits.slice(2); // 00 international prefix → treat as +

  let cc: string | undefined;
  let nsn = '';
  let info: { iso: string; name: string; min: number; max: number } | undefined;

  if (hasPlus) {
    // Match the longest calling-code prefix.
    cc = CODES_DESC.find((code) => digits.startsWith(code));
    if (cc) {
      info = BY_CODE.get(cc);
      nsn = digits.slice(cc.length);
    }
  } else if (country) {
    cc = ISO_TO_CODE.get(country);
    if (!cc) {
      return { input: raw, valid: false, reason: `Unknown country ISO code "${country}". Use country_calling_codes to find a valid ISO/calling code.` };
    }
    info = BY_CODE.get(cc);
    nsn = digits;
  } else {
    return { input: raw, valid: false, reason: 'Number is not in international (+) form and no `country` ISO code was given. Pass either "+<countrycode>..." or a `country` like "US".' };
  }

  if (!cc || !info) {
    return { input: raw, valid: false, reason: 'Could not match an international calling code. Check the number and country code.', national_number: nsn || undefined };
  }

  // Strip a leading national trunk prefix ("0") — used by most countries and
  // dropped in E.164, and also appears via the "+44 (0)20..." convention.
  // Italy (+39) keeps its leading 0 as part of the national number.
  if (nsn.startsWith('0') && cc !== '39') nsn = nsn.slice(1);

  const len = nsn.length;
  const lengthOk = len >= info.min && len <= info.max;
  const e164 = `+${cc}${nsn}`;
  return {
    input: raw,
    valid: lengthOk && nsn.length > 0,
    reason: lengthOk ? 'Calling code recognized and national-number length is plausible.' : `National number has ${len} digit(s); ${info.name} expects ${info.min === info.max ? info.min : `${info.min}-${info.max}`}.`,
    e164,
    calling_code: cc,
    country_iso: info.iso,
    country_name: info.name,
    national_number: nsn,
    expected_national_length: info.min === info.max ? info.min : { min: info.min, max: info.max },
    note: 'Format/country/length validation only — carrier and line-type (mobile vs landline) require a keyed HLR lookup.',
  };
}

function callingCodes(query?: string) {
  let rows = DATA.map(([cc, iso, name]) => ({ calling_code: `+${cc}`, iso, country: name }));
  if (query) {
    const q = query.toLowerCase().replace(/^\+/, '');
    rows = rows.filter((r) => r.country.toLowerCase().includes(q) || r.iso.toLowerCase() === q || r.calling_code.replace('+', '') === q || r.calling_code.replace('+', '').startsWith(q));
  }
  return { count: rows.length, results: rows };
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
