const fs = require('fs');

function inspectPdfTypography(filePath) {
  const bytes = fs.readFileSync(filePath);
  const text = bytes.toString('latin1');
  const hasKoreanSourceMarker = text.includes('/KoreanTypography true');
  const hasEmbeddedFont = text.includes('/FontFile2') && text.includes('/Subtype /Type0');
  const hasUnicodeMap = text.includes('/ToUnicode') && text.includes('beginbfrange');
  const usesIdentityH = text.includes('/Encoding /Identity-H');
  const parserCanReadRawKorean = /[가-힣]/.test(bytes.toString('utf8'));
  const warnings = [];
  if (!hasEmbeddedFont) warnings.push('PDF_KOREAN_FONT_NOT_EMBEDDED');
  if (!hasUnicodeMap) warnings.push('PDF_TOUNICODE_MISSING');
  if (!parserCanReadRawKorean && hasEmbeddedFont && hasUnicodeMap) {
    warnings.push('RAW_BYTE_PARSER_LIMITATION_UTF16_HEX_TEXT');
  }
  return {
    status: hasKoreanSourceMarker && hasEmbeddedFont && hasUnicodeMap && usesIdentityH ? 'PASSED' : 'FAILED',
    has_korean_source_marker: hasKoreanSourceMarker,
    has_embedded_font: hasEmbeddedFont,
    has_to_unicode: hasUnicodeMap,
    uses_identity_h: usesIdentityH,
    raw_parser_reads_korean: parserCanReadRawKorean,
    warnings
  };
}

module.exports = { inspectPdfTypography };
