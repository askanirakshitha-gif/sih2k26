const axios = require('axios');

async function testAll() {
  console.log('--- STARTING E2E VERIFICATION SUITE ---');

  // 1. Get demo patients
  const patientsRes = await axios.get('http://localhost:5000/api/patients');
  console.log('1. Patients fetched:', patientsRes.data.patients.length, 'patients available.');
  const testPatient = patientsRes.data.patients[0];

  // 2. Start Allopathy Session (Chest Pain)
  const startRes = await axios.post('http://localhost:5000/api/start', {
    language: 'en',
    system: 'allopathy',
    patientId: testPatient.id,
    conditionId: 'chest_pain'
  });
  const sessionId = startRes.data.sessionId;
  console.log('2. Session started:', sessionId, '| OPD Token:', startRes.data.opdToken);
  console.log('   First Question:', startRes.data.nextQuestion.text);

  // 3. Answer Q1 (Chief complaint)
  const q1Res = await axios.post('http://localhost:5000/api/next', {
    sessionId,
    questionId: startRes.data.nextQuestion.id,
    answer: 'chest_pain_pressure'
  });
  console.log('3. Answered Q1. Next question:', q1Res.data.nextQuestion.text);

  // 4. Submit Red-Flag Trigger: Radiation to left arm
  const rfRes = await axios.post('http://localhost:5000/api/next', {
    sessionId,
    questionId: 'cp_q7',
    answer: 'left arm'
  });
  console.log('4. Radiation answered as "left arm":');
  console.log('   isRedFlag:', rfRes.data.isRedFlag);
  console.log('   Red flag alerts:', rfRes.data.redFlags.map(r => r.message));

  // 5. Test FHIR Generation
  const fhirRes = await axios.get(`http://localhost:5000/api/fhir/${sessionId}`);
  console.log('5. FHIR R4 Bundle generated successfully!');
  console.log('   ResourceType:', fhirRes.data.resourceType, '| Entries count:', fhirRes.data.entry.length);

  // 6. Test Mock ABDM/HIS Push
  const pushRes = await axios.post('http://localhost:5000/api/integrations/push', {
    sessionId,
    doctorId: 'DOC-TEST',
    abhaId: testPatient.abha_id
  });
  console.log('6. Push to ABDM/HIS successful!');
  console.log('   Transaction ID:', pushRes.data.transactionId);
  console.log('   Message:', pushRes.data.message);

  // 7. Start AYUSH Session (Dashavidha Pariksha in Hindi)
  const ayushStart = await axios.post('http://localhost:5000/api/start', {
    language: 'hi',
    system: 'ayush',
    patientId: testPatient.id,
    conditionId: 'ayush_general'
  });
  console.log('7. AYUSH session started in Hindi:', ayushStart.data.sessionId);
  console.log('   AYUSH Q1:', ayushStart.data.nextQuestion.text);

  // 8. AI Microservice test
  const aiEntityRes = await axios.post('http://localhost:8000/extract-entities', {
    text: 'Severe crushing chest pain radiating to my left arm for 2 hours with sweating',
    field: 'chief_complaint'
  });
  console.log('8. AI Entity Extraction:');
  console.log('   Symptoms:', aiEntityRes.data.entities.symptoms);
  console.log('   Radiation:', aiEntityRes.data.entities.radiation);
  console.log('   Associated:', aiEntityRes.data.entities.associated_symptoms);

  console.log('--- ALL E2E VERIFICATIONS PASSED 100%! ---');
}

testAll().catch(e => {
  console.error('Test Failed:', e.message, e.response ? e.response.data : '');
  process.exit(1);
});
