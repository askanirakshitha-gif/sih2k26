# 🏥 MediKiosk

> **A multilingual, voice-enabled healthcare kiosk that makes patient registration and preliminary clinical information collection faster, simpler, and more accessible.**

## 📌 Overview

**MediKiosk** is a smart healthcare kiosk designed to simplify the initial stage of a patient's hospital visit.

Patients can use **touch or voice interaction**, select their preferred Indian language, verify their mobile number, provide their symptoms and medical information, and receive a **structured clinical summary** that can assist healthcare professionals during consultation.

The system is designed with a modular architecture integrating the frontend, backend, database, voice services, OTP verification, and digital-health services.

---

## 🚨 Problem

The initial hospital workflow often involves repetitive tasks such as:

* Patient registration
* Mobile verification
* Collecting basic information
* Recording symptoms and medical history
* Asking preliminary clinical questions
* Preparing information for the doctor

These processes can be time-consuming and can be difficult for patients who are more comfortable communicating in their regional language.

---

## 💡 Our Solution

MediKiosk provides a single interface to collect and structure preliminary patient information through:

* 🖥️ **Touch-based interaction**
* 🎙️ **Voice interaction**
* 🇮🇳 **Indian-language support**
* 📱 **Mobile OTP verification**
* 🩺 **Adaptive clinical questioning**
* 📋 **Clinical summary generation**
* 🪪 **ABHA/ABDM integration capability**


### Workflow

```text
Patient
   ↓
Language Selection
   ↓
Mobile Verification
   ↓
Patient Registration
   ↓
Voice / Touch Interaction
   ↓
Adaptive Clinical Questions
   ↓
Structured Patient Information
   ↓
Clinical Summary
   ↓
Healthcare Professional
```

---

## ✨ Key Features

### 🌐 Multilingual & Voice Enabled

Patients can interact with the kiosk using their preferred Indian language and voice, reducing dependence on typing.

### 🩺 Adaptive Questioning

Instead of asking every patient the same questions, the system can select relevant questions based on the patient's reported symptoms or complaint.

### 📋 Clinical Summary

Patient responses are organized into a structured summary that can help healthcare professionals quickly understand the patient's preliminary information.

### 🪪 ABHA / ABDM

The architecture supports integration with India's digital healthcare ecosystem through the **ABHA/ABDM** framework, subject to required APIs and authorization.

### 🏥 EMR/EHR Integration { will be implemented if necessary}

The system can be extended to communicate with compatible electronic medical record systems

---

## 🏗️ Architecture

```text
       MediKiosk
      Touch + Voice
           ↓
    React Frontend
           ↓
    FastAPI Backend
       ↙       ↘
 PostgreSQL   External Services
              ├── OTP
              ├── Voice / Language
              ├── ABDM
```

---

## 🛠️ Technology Stack

| Component         | Technology                   |
| ----------------- | ---------------------------- |
| Frontend          | React.js                     |
| Backend           | Python + FastAPI             |
| Database          | PostgreSQL / Supabase        |
| OTP               | Twilio Verify                |
| Voice & Languages | Bhashini / AI4Bharat         |
| Digital Health    | ABDM Sandbox                 |
| EMR/EHR           | OpenMRS / Compatible Systems |
| Communication     | REST / JSON                  |

---

## 🔐 Security & Privacy

Since MediKiosk handles patient-related information, the system is designed with:

* Secure authentication and authorization
* Protected API credentials
* Controlled access to patient information
* Appropriate consent mechanisms
* Secure handling of sensitive data

---

## 🚀 Project Status

**Prototype / Development**

MediKiosk is currently being developed as a prototype for **Smart India Hackathon (SIH)**.

Future development may include expanded Indian-language support, improved voice interaction, medical document processing, deeper ABDM integration, additional EMR/EHR integrations, and deployment on physical kiosk hardware.

---

## ⚠️ Disclaimer

MediKiosk is intended as a **healthcare information and workflow-support system**. It is not intended to replace qualified healthcare professionals or provide autonomous medical diagnosis or treatment.
