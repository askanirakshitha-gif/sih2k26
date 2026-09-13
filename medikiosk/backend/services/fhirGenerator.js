/**
 * FHIR R4 Bundle Generator for ABDM (Ayushman Bharat Digital Mission) Compliance
 * Translates clinical history, answers, and extractions into standard FHIR resources.
 */

const { v4: uuidv4 } = require('uuid');

class FhirGenerator {
  /**
   * Build FHIR R4 Bundle from session, patient, answers, summary and reviews.
   */
  static generateBundle({ session, patient, answers = [], summary = null, documents = [], review = null }) {
    const timestamp = new Date().toISOString();
    const bundleId = `bundle-${session.id}`;

    const entries = [];

    // 1. PATIENT RESOURCE
    const patientResource = {
      fullUrl: `urn:uuid:${patient ? patient.id : 'anon-patient'}`,
      resource: {
        resourceType: 'Patient',
        id: patient ? patient.id : 'anon-patient',
        identifier: [
          {
            system: 'https://healthid.abdm.gov.in',
            type: { text: 'ABHA ID' },
            value: patient ? patient.abha_id : 'UNREGISTERED'
          }
        ],
        name: [
          {
            use: 'official',
            text: patient ? patient.full_name : 'Walk-in Patient'
          }
        ],
        telecom: [
          {
            system: 'phone',
            value: patient ? patient.phone : '+91 0000000000'
          }
        ],
        gender: patient ? patient.gender.toLowerCase() : 'unknown',
        extension: [
          {
            url: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/Age',
            valueQuantity: {
              value: patient ? patient.age : 40,
              unit: 'years'
            }
          }
        ]
      }
    };
    entries.push(patientResource);

    // 2. ENCOUNTER RESOURCE
    const encounterId = `encounter-${session.id}`;
    const encounterResource = {
      fullUrl: `urn:uuid:${encounterId}`,
      resource: {
        resourceType: 'Encounter',
        id: encounterId,
        status: 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'Ambulatory / OPD Kiosk'
        },
        subject: {
          reference: `urn:uuid:${patient ? patient.id : 'anon-patient'}`,
          display: patient ? patient.full_name : 'Patient'
        },
        period: {
          start: session.created_at,
          end: session.updated_at || timestamp
        },
        serviceProvider: {
          display: 'District Civil Hospital OPD (Ayush & Allopathy Kiosk)'
        }
      }
    };
    entries.push(encounterResource);

    // 3. CHIEF COMPLAINT CONDITION RESOURCE
    const chiefComplaintAns = answers.find(a => a.clinical_field === 'chief_complaint' || a.clinical_field === 'ayush_chief_complaint');
    if (chiefComplaintAns) {
      const condId = `condition-cc-${session.id}`;
      entries.push({
        fullUrl: `urn:uuid:${condId}`,
        resource: {
          resourceType: 'Condition',
          id: condId,
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: 'active'
              }
            ]
          },
          verificationStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: review ? 'confirmed' : 'provisional'
              }
            ]
          },
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                  code: 'encounter-diagnosis',
                  display: 'Chief Complaint'
                }
              ]
            }
          ],
          code: {
            text: chiefComplaintAns.raw_answer
          },
          subject: {
            reference: `urn:uuid:${patient ? patient.id : 'anon-patient'}`
          },
          encounter: {
            reference: `urn:uuid:${encounterId}`
          },
          recordedDate: timestamp
        }
      });
    }

    // 4. CLINICAL OBSERVATIONS (Pain severity, Radiation, AYUSH Dashavidha observations)
    for (const ans of answers) {
      const obsId = `obs-${ans.id || uuidv4()}`;
      entries.push({
        fullUrl: `urn:uuid:${obsId}`,
        resource: {
          resourceType: 'Observation',
          id: obsId,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: session.clinical_system === 'ayush' ? 'ayush-dashavidha' : 'exam',
                  display: session.clinical_system === 'ayush' ? 'AYUSH Dashavidha Pariksha' : 'Clinical History'
                }
              ]
            }
          ],
          code: {
            text: ans.clinical_field
          },
          subject: {
            reference: `urn:uuid:${patient ? patient.id : 'anon-patient'}`
          },
          valueString: String(ans.raw_answer),
          interpretation: ans.is_red_flag ? [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'CRITICAL',
                  display: 'Emergency Red-Flag Warning Sign'
                }
              ]
            }
          ] : undefined
        }
      });
    }

    // 5. MEDICATION STATEMENTS (From answer history or OCR)
    const medAns = answers.find(a => a.clinical_field === 'current_medications');
    if (medAns) {
      const medId = `med-${uuidv4()}`;
      entries.push({
        fullUrl: `urn:uuid:${medId}`,
        resource: {
          resourceType: 'MedicationStatement',
          id: medId,
          status: 'active',
          medicationCodeableConcept: {
            text: medAns.raw_answer
          },
          subject: {
            reference: `urn:uuid:${patient ? patient.id : 'anon-patient'}`
          },
          dateAsserted: timestamp
        }
      });
    }

    // 6. ALLERGY INTOLERANCE RESOURCE
    const allergyAns = answers.find(a => a.clinical_field === 'allergies');
    if (allergyAns) {
      const allergyId = `allergy-${uuidv4()}`;
      entries.push({
        fullUrl: `urn:uuid:${allergyId}`,
        resource: {
          resourceType: 'AllergyIntolerance',
          id: allergyId,
          clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
          },
          code: {
            text: allergyAns.raw_answer
          },
          patient: {
            reference: `urn:uuid:${patient ? patient.id : 'anon-patient'}`
          }
        }
      });
    }

    // 7. DOCUMENT REFERENCES (Uploaded physical documents)
    for (const doc of documents) {
      const docRefId = `docref-${doc.id}`;
      entries.push({
        fullUrl: `urn:uuid:${docRefId}`,
        resource: {
          resourceType: 'DocumentReference',
          id: docRefId,
          status: 'current',
          type: {
            text: doc.document_type || 'Prescription'
          },
          subject: {
            reference: `urn:uuid:${patient ? patient.id : 'anon-patient'}`
          },
          date: doc.uploaded_at || timestamp,
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: doc.file_path,
                title: doc.file_name
              }
            }
          ]
        }
      });
    }

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: timestamp,
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle']
      },
      identifier: {
        system: 'https://hospital.gov.in/bundles',
        value: `MEDIKIOSK-${session.id}`
      },
      type: 'collection',
      timestamp,
      entry: entries
    };
  }
}

module.exports = FhirGenerator;
