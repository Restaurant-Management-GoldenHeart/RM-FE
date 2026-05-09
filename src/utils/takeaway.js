const TAKEAWAY_AREA_CODES = new Set([
  'DELIVERY',
  'TAKEAWAY',
  'TAKE_AWAY',
  'MANG_VE',
  'MANGVE',
]);

const TAKEAWAY_NAME_KEYWORDS = ['mang ve', 'mangv', 'takeaway', 'delivery'];

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const isTakeawayArea = (area) => {
  if (!area) return false;

  const code = normalize(area.code);
  if (TAKEAWAY_AREA_CODES.has(code)) {
    return true;
  }

  const name = normalizeText(area.name);
  return TAKEAWAY_NAME_KEYWORDS.some(keyword => name.includes(keyword));
};

export const isTakeawayTable = (table, areas = []) => {
  if (!table) return false;

  const areaId = Number(table.areaId ?? table.area_id);
  if (Number.isFinite(areaId)) {
    const matchedArea = areas.find(area => Number(area.id) === areaId);
    if (matchedArea) {
      return isTakeawayArea(matchedArea);
    }
  }

  return TAKEAWAY_NAME_KEYWORDS.some(keyword =>
    normalizeText(table.areaName ?? table.area_name).includes(keyword)
  );
};
