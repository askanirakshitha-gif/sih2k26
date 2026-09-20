export function normalizeSearchValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

export function sanitizeHospitalRecord(hospital = {}) {
  const nextHospital = { ...hospital };

  nextHospital.name = typeof hospital.name === 'string' ? hospital.name : String(hospital.name ?? '');
  nextHospital.city = typeof hospital.city === 'string' ? hospital.city : String(hospital.city ?? '');
  nextHospital.address = typeof hospital.address === 'string'
    ? hospital.address.trim()
    : String(hospital.address ?? '').trim() || `Address unavailable for ${nextHospital.name || 'this facility'}`;

  return nextHospital;
}

export function matchesHospitalSearch(hospital, query) {
  const search = normalizeSearchValue(query);
  if (!search) return true;

  const haystacks = [
    hospital?.name,
    hospital?.city,
    hospital?.address
  ].map(normalizeSearchValue);

  return haystacks.some(value => value.includes(search));
}
