import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSearchValue, matchesHospitalSearch, sanitizeHospitalRecord } from './hospitalSearch.js';

test('normalizeSearchValue should stringify non-string values safely', () => {
  assert.equal(normalizeSearchValue(null), '');
  assert.equal(normalizeSearchValue(154), '154');
  assert.equal(normalizeSearchValue(' Apollo '), 'apollo');
});

test('sanitizeHospitalRecord should ensure address is always a string', () => {
  const hospital = sanitizeHospitalRecord({
    id: 'hosp_fortis_bg_blr',
    name: 'Fortis Hospital Bannerghatta Road',
    address: 154,
    city: 'Bengaluru'
  });

  assert.equal(typeof hospital.address, 'string');
  assert.match(hospital.address, /154|Fortis|Bannerghatta|Bengaluru/i);
});

test('matchesHospitalSearch should match hospital names and addresses without crashing on numeric address fields', () => {
  const hospital = sanitizeHospitalRecord({
    id: 'hosp_fortis_bg_blr',
    name: 'Fortis Hospital Bannerghatta Road',
    address: 154,
    city: 'Bengaluru'
  });

  assert.equal(matchesHospitalSearch(hospital, 'fortis'), true);
  assert.equal(matchesHospitalSearch(hospital, 'bannerghatta'), true);
  assert.equal(matchesHospitalSearch(hospital, 'mg road'), false);
});
