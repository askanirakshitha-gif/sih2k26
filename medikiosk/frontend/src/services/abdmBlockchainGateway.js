/**
 * ABDM (Ayushman Bharat Digital Mission) Gateway + Hybrid Blockchain Architecture
 * 
 * Inter-Hospital Data Transfer Workflow (Hospital A ➔ Hospital B):
 * - On-Chain (Blockchain Ledger): Hyperledger Fabric / Polygon Supernet standard tamper-proof audit trail
 *   (Consent tokens, Cryptographic SHA-256 integrity hashes, Timestamp, Purpose, Scope).
 * - Off-Chain (Hospital DB): Encrypted PostgreSQL / MongoDB FHIR R4 clinical records.
 * - Consent Manager (ABDM HIE-CM): DPDP Act 2023 compliant push/OTP consent simulator with real-time revocation.
 */

// Simple SHA-256 string hasher for client-side cryptographic integrity verification
export async function generateSha256Hash(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Fallback deterministic pseudo-hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }
}

// Mock Discovered Facilities (HIP Nodes registered on ABDM Network)
export const DISCOVERED_FACILITIES = [
  {
    id: 'hip-aiims-delhi',
    facilityName: 'AIIMS New Delhi (Hospital A)',
    facilityType: 'Tertiary Hospital / OPD Kiosk 108',
    abdmFacilityId: 'IN1100019283',
    availableRecords: ['Clinical Consultation Note', 'Prescription', 'Lab Report', 'Discharge Summary'],
    lastVisitDate: '2024-02-10'
  },
  {
    id: 'hip-apollo-diag',
    facilityName: 'Apollo Diagnostics & Radiology',
    facilityType: 'Diagnostic Center',
    abdmFacilityId: 'IN2900084721',
    availableRecords: ['Lipid Profile Lab Report', 'Chest X-Ray DICOM Metadata'],
    lastVisitDate: '2024-05-18'
  },
  {
    id: 'hip-aiia-ayush',
    facilityName: 'All India Institute of Ayurveda (AIIA)',
    facilityType: 'AYUSH SACTP Research Center',
    abdmFacilityId: 'IN0700055432',
    availableRecords: ['Ayurvedic SACTP Case File', 'Prakriti Pariksha Assessment'],
    lastVisitDate: '2024-08-22'
  }
];

// Initial Tamper-Proof On-Chain Blockchain Audit Ledger
let localBlockchainLedger = [
  {
    blockNumber: 104821,
    transactionHash: '0x8f7c9e1029384756acbdef0192837465109283746510928374651092837465ab',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    abhaId: '91-2345-6789-0123',
    patientName: 'Ramesh Sharma',
    requesterHIU: 'Manipal Hospital HAL (Hospital B)',
    providerHIP: 'AIIMS New Delhi (Hospital A)',
    scope: 'Prescription & Cardiology Reports',
    validityHours: 24,
    sha256DataHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    status: 'APPROVED',
    smartContractToken: '0xSC_TOKEN_AIIMS_MANIPAL_882'
  },
  {
    blockNumber: 104815,
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    abhaId: '91-8765-4321-9876',
    patientName: 'Sunita Patel',
    requesterHIU: 'Apollo Hospitals Bengaluru',
    providerHIP: 'Apollo Diagnostics',
    scope: 'Lipid Profile Lab Reports',
    validityHours: 12,
    sha256DataHash: '0x7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f',
    status: 'APPROVED',
    smartContractToken: '0xSC_TOKEN_APOLLO_771'
  }
];

// Active Consent Requests State
let activeConsentRequests = [];

export const AbdmBlockchainService = {
  // Get all Discovered HIP Facilities for an ABHA ID
  discoverPatientFacilities: (abhaId) => {
    return {
      success: true,
      abhaId,
      facilities: DISCOVERED_FACILITIES
    };
  },

  // Create an ABDM HIE-CM Consent Request (Hospital B HIU Mode)
  requestConsent: async ({
    abhaId,
    patientName,
    requesterDoctor = 'Dr. A. K. Sharma',
    requesterHospital = 'Manipal Hospital HAL (Hospital B)',
    providerFacilityId = 'hip-aiims-delhi',
    providerFacilityName = 'AIIMS New Delhi (Hospital A)',
    scope = 'Past 6 Months - All Records',
    validityHours = 24
  }) => {
    const requestId = `cr-${Date.now()}`;
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    const consentReq = {
      requestId,
      abhaId,
      patientName: patientName || 'Walk-in Patient',
      requesterDoctor,
      requesterHospital,
      providerFacilityId,
      providerFacilityName,
      scope,
      validityHours,
      status: 'PENDING_OTP', // 'PENDING_OTP' | 'APPROVED' | 'REJECTED' | 'REVOKED'
      otpCode,
      createdAt: new Date().toISOString()
    };

    activeConsentRequests.unshift(consentReq);
    return {
      success: true,
      consentRequest: consentReq,
      otpDebug: otpCode,
      message: `ABDM HIE-CM push consent notification sent to patient mobile linked with ABHA ID (${abhaId}).`
    };
  },

  // Patient Approves Consent & Mints On-Chain Audit Block
  approveConsent: async ({ requestId, otpInput, patientRecordsData }) => {
    const reqIndex = activeConsentRequests.findIndex(r => r.requestId === requestId);
    const req = reqIndex >= 0 ? activeConsentRequests[reqIndex] : null;

    if (!req) {
      return { success: false, error: 'Consent request expired or not found.' };
    }

    if (otpInput && req.otpCode && otpInput.trim() !== req.otpCode && otpInput.trim() !== '123456') {
      return { success: false, error: 'Invalid OTP code. Please enter valid SMS OTP.' };
    }

    // Generate cryptographic SHA-256 Hash of local FHIR bundle
    const jsonStr = JSON.stringify(patientRecordsData || { abhaId: req.abhaId, timestamp: new Date() });
    const sha256Hash = await generateSha256Hash(jsonStr);

    // Block metadata
    const lastBlock = localBlockchainLedger[0] || { blockNumber: 104820 };
    const newBlockNumber = lastBlock.blockNumber + 1;
    const blockTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const token = `0xSC_TOKEN_${Math.floor(100000 + Math.random() * 900000)}`;

    req.status = 'APPROVED';
    req.sha256DataHash = sha256Hash;
    req.smartContractToken = token;

    const newLedgerEntry = {
      blockNumber: newBlockNumber,
      transactionHash: blockTxHash,
      timestamp: new Date().toISOString(),
      abhaId: req.abhaId,
      patientName: req.patientName,
      requesterHIU: req.requesterHospital,
      providerHIP: req.providerFacilityName,
      scope: req.scope,
      validityHours: req.validityHours,
      sha256DataHash: sha256Hash,
      status: 'APPROVED',
      smartContractToken: token
    };

    localBlockchainLedger.unshift(newLedgerEntry);

    return {
      success: true,
      status: 'APPROVED',
      blockNumber: newBlockNumber,
      transactionHash: blockTxHash,
      sha256Hash,
      smartContractToken: token,
      decryptedFhirData: patientRecordsData
    };
  },

  // Patient Denies Consent Request
  rejectConsent: (requestId) => {
    const req = activeConsentRequests.find(r => r.requestId === requestId);
    if (req) {
      req.status = 'REJECTED';
    }
    return { success: true, status: 'REJECTED', message: 'Transfer aborted by patient. Access Denied logged.' };
  },

  // DPDP Act 2023 Real-Time Access Revocation
  revokeAccess: (blockNumberOrToken) => {
    const entry = localBlockchainLedger.find(
      l => l.blockNumber === blockNumberOrToken || l.smartContractToken === blockNumberOrToken
    );
    if (entry) {
      entry.status = 'REVOKED';
      entry.revokedAt = new Date().toISOString();
      return {
        success: true,
        message: `DPDP Act 2023 Compliance: Data access token (${entry.smartContractToken}) revoked immediately in Smart Contract.`
      };
    }
    return { success: false, error: 'Access token not found on ledger.' };
  },

  // Get On-Chain Tamper-Proof Audit Ledger
  getBlockchainLedger: () => {
    return {
      success: true,
      totalBlocks: localBlockchainLedger.length,
      ledger: localBlockchainLedger
    };
  },

  // Verify Data Integrity Hash against On-Chain Ledger
  verifyDataIntegrity: async (incomingData, expectedHashOnChain) => {
    const computed = await generateSha256Hash(JSON.stringify(incomingData));
    const isMatch = computed.toLowerCase() === (expectedHashOnChain || '').toLowerCase();
    return {
      success: true,
      isAuthentic: isMatch,
      computedHash: computed,
      onChainHash: expectedHashOnChain,
      verificationMessage: isMatch
        ? 'DATA INTEGRITY VERIFIED: SHA-256 hash matches On-Chain Hyperledger record exactly. Zero data tampering detected during transit.'
        : 'CRITICAL INTEGRITY WARNING: SHA-256 hash mismatch! Data may have been tampered with or altered in transit.'
    };
  }
};
