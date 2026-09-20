import urllib.request
import json

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body_parts = [
    f'--{boundary}\r\n'
    'Content-Disposition: form-data; name="document"; filename="sample_prescription.txt"\r\n'
    'Content-Type: text/plain\r\n\r\n'
    'OUTPATIENT PRESCRIPTION\r\n'
    'Diagnoses: Essential Hypertension, Type 2 Diabetes\r\n'
    'Rx:\r\n'
    '1. Tab Telmisartan 40mg Once daily morning\r\n'
    '2. Tab Atorvastatin 20mg Once daily night\r\n'
    'Lab analytes:\r\n'
    'HbA1c: 7.9 %\r\n'
    'Fasting Blood Glucose: 154 mg/dL\r\n'
    'Serum Creatinine: 1.1 mg/dL\r\n',
    f'--{boundary}\r\n'
    'Content-Disposition: form-data; name="documentType"\r\n\r\n'
    'prescription\r\n',
    f'--{boundary}--\r\n'
]
body = "".join(body_parts).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:5000/api/documents/upload',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode('utf-8'))
print('Upload Success:', data['success'])
print('Document ID:', data['documentId'])
print('Extracted Medications:', [(m['name'], m['dosage'], m['frequency']) for m in data['extractions']['medications']])
print('Extracted Labs:', [(l['test'], l['value'], l['abnormal'], l['flag']) for l in data['extractions']['lab_results']])
