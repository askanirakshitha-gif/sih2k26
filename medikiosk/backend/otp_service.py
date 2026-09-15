import os
import time
import random
import logging
import httpx
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv

# Ensure environment variables from .env file are loaded
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

logger = logging.getLogger("otp_service")

# OTP In-Memory Storage: phone_10 -> { "otp": str, "created_at": float, "attempts": int }
_OTP_CACHE: Dict[str, Dict[str, Any]] = {}

def get_otp_expiry_seconds() -> int:
    try:
        return int(os.environ.get("OTP_EXPIRY_SECONDS", "300"))
    except ValueError:
        return 300

def get_gateway_provider() -> str:
    return os.environ.get("SMS_GATEWAY_PROVIDER", "fast2sms").lower().strip()

def get_fast2sms_api_key() -> str:
    return os.environ.get("FAST2SMS_API_KEY", "").strip()

def get_twilio_credentials() -> Tuple[str, str, str]:
    from_phone = os.environ.get("TWILIO_PHONE_NUMBER", "").strip() or os.environ.get("TWILIO_FROM_PHONE", "").strip()
    return (
        os.environ.get("TWILIO_ACCOUNT_SID", "").strip(),
        os.environ.get("TWILIO_AUTH_TOKEN", "").strip(),
        from_phone
    )


def normalize_phone(raw_phone: str) -> Tuple[str, str]:
    """
    Normalizes raw phone number into 10-digit standard Indian format
    and international E.164 (+91...).
    """
    digits = "".join([c for c in (raw_phone or "") if c.isdigit()])
    if len(digits) > 10 and digits.startswith("91"):
        clean_10 = digits[-10:]
    elif len(digits) >= 10:
        clean_10 = digits[-10:]
    else:
        clean_10 = digits

    e164 = f"+91{clean_10}" if len(clean_10) == 10 else ""
    return clean_10, e164

def mask_phone(raw_phone: str) -> str:
    """
    Masks phone number for privacy compliance: e.g., +91 ******1234
    """
    clean_10, e164 = normalize_phone(raw_phone)
    if len(clean_10) == 10:
        return f"+91 ******{clean_10[-4:]}"
    elif len(clean_10) >= 4:
        return f"******{clean_10[-4:]}"
    return "******"

def generate_otp(length: int = 4) -> str:
    """Generates a secure numeric OTP code (defaults to 4 digits)."""
    if length == 6:
        return f"{random.randint(100000, 999999)}"
    return f"{random.randint(1000, 9999)}"

async def send_sms_via_fast2sms(phone_10: str, otp_code: str) -> Tuple[bool, str]:
    """Sends real-time SMS via Fast2SMS Indian gateway with Smart OTP and Bulk V2 support."""
    api_key = get_fast2sms_api_key()
    if not api_key:
        return False, "FAST2SMS_API_KEY is not configured in .env"

    otp_id = os.environ.get("FAST2SMS_OTP_ID", "").strip()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            # Route 1: Smart OTP API (if FAST2SMS_OTP_ID is set)
            if otp_id:
                url_smart = "https://www.fast2sms.com/dev/otp/send"
                headers_smart = {
                    "Authorization": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                payload_smart = {
                    "mobile": phone_10,
                    "otp_id": otp_id,
                    "variables_values": otp_code
                }
                resp_s = await client.post(url_smart, json=payload_smart, headers=headers_smart)
                data_s = resp_s.json()
                if resp_s.status_code == 200 and data_s.get("return") is True:
                    logger.info(f"[Fast2SMS] Dispatched Smart OTP to {mask_phone(phone_10)}")
                    return True, "Fast2SMS (Smart OTP Route) dispatched"
                else:
                    msg_s = data_s.get("message", str(data_s))
                    logger.warning(f"[Fast2SMS Smart OTP] Rejected: {msg_s}")

            # Route 2: Bulk V2 OTP Route
            url_bulk = "https://www.fast2sms.com/dev/bulkV2"
            headers_bulk = {
                "authorization": api_key,
                "Content-Type": "application/json"
            }
            payload_otp = {
                "variables_values": otp_code,
                "route": "otp",
                "numbers": phone_10
            }
            resp = await client.post(url_bulk, json=payload_otp, headers=headers_bulk)
            data = resp.json()
            if resp.status_code == 200 and data.get("return") is True:
                logger.info(f"[Fast2SMS] Dispatched OTP route SMS to {mask_phone(phone_10)}")
                return True, "Fast2SMS (OTP Route) dispatched"

            err_msg = data.get("message") or (data_s.get("message") if otp_id else str(data))
            logger.warning(f"[Fast2SMS] Gateway rejected: {err_msg}")
            return False, f"Fast2SMS error: {err_msg}"
    except Exception as e:
        logger.error(f"[Fast2SMS] Connection failed: {e}")
async def send_sms_via_2factor(phone_10: str, otp_code: str) -> Tuple[bool, str]:
    """Sends real-time SMS OTP via 2Factor.in Indian gateway."""
    api_key = os.environ.get("TWOFACTOR_API_KEY", "").strip()
    if not api_key:
        return False, "TWOFACTOR_API_KEY is not configured in .env"

    try:
        url = f"https://2factor.in/API/V1/{api_key}/SMS/{phone_10}/{otp_code}/MediKiosk"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            data = resp.json()
            if resp.status_code == 200 and data.get("Status") == "Success":
                logger.info(f"[2Factor] Dispatched SMS OTP to {mask_phone(phone_10)}")
                return True, "2Factor.in SMS dispatched successfully"
            else:
                err_msg = data.get("Details") or resp.text
                logger.warning(f"[2Factor] Gateway rejected: {err_msg}")
                return False, f"2Factor error: {err_msg}"
    except Exception as e:
        logger.error(f"[2Factor] Connection failed: {e}")
        return False, str(e)


async def send_sms_via_textbee(e164_phone: str, otp_code: str) -> Tuple[bool, str]:
    """Sends real-time SMS via Open-Source Textbee Android Gateway API."""
    api_key = os.environ.get("TEXTBEE_API_KEY", "").strip()
    device_id = os.environ.get("TEXTBEE_DEVICE_ID", "").strip()
    if not api_key or not device_id:
        return False, "TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID missing in .env"

    try:
        url = f"https://api.textbee.dev/api/v1/gateway/devices/{device_id}/send-sms"
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "recipients": [e164_phone],
            "message": f"Your MediKiosk security OTP for mobile registration is {otp_code}."
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in [200, 201]:
                logger.info(f"[Textbee] Dispatched SMS OTP to {mask_phone(e164_phone)}")
                return True, "Textbee Open-Source Gateway SMS dispatched"
            else:
                logger.warning(f"[Textbee] Gateway rejected: {resp.text}")
                return False, f"Textbee error: {resp.text}"
    except Exception as e:
        logger.error(f"[Textbee] Connection failed: {e}")
        return False, str(e)


def get_twilio_verify_sid() -> str:
    return os.environ.get("TWILIO_VERIFY_SERVICE_SID", "VA48125e2725bbd8a8d8c72a33c66767d2").strip()

async def send_sms_via_twilio(e164_phone: str, otp_code: str) -> Tuple[bool, str]:
    """Sends real-time SMS via Twilio Verify API."""
    account_sid, auth_token, from_phone = get_twilio_credentials()
    verify_sid = get_twilio_verify_sid()

    if not account_sid or not auth_token:
        return False, "Twilio credentials missing"

    # Route 1: Twilio Verify API (Bypasses international trial DLT & template restrictions)
    if verify_sid:
        url_v = f"https://verify.twilio.com/v2/Services/{verify_sid}/Verifications"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url_v,
                    data={"To": e164_phone, "Channel": "sms"},
                    auth=(account_sid, auth_token)
                )
                data = resp.json()
                if resp.status_code in [200, 201] and data.get("status") in ["pending", "approved"]:
                    logger.info(f"[Twilio Verify] Dispatched live SMS OTP to {mask_phone(e164_phone)}")
                    return True, "Twilio Verify SMS dispatched"
                else:
                    msg = data.get("message", resp.text)
                    logger.warning(f"[Twilio Verify] Response: {msg}")
        except Exception as e:
            logger.error(f"[Twilio Verify] Connection failed: {e}")

    # Route 2: Twilio Messages API Fallback
    if from_phone:
        url_m = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        expiry_mins = max(1, get_otp_expiry_seconds() // 60)
        body_text = f"Your MediKiosk security OTP for mobile registration is {otp_code}. Valid for {expiry_mins} minutes."
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url_m,
                    data={"From": from_phone, "To": e164_phone, "Body": body_text},
                    auth=(account_sid, auth_token)
                )
                if resp.status_code in [200, 201]:
                    logger.info(f"[Twilio Messages] Dispatched OTP to {mask_phone(e164_phone)}")
                    return True, "Twilio Messages dispatched"
                else:
                    logger.warning(f"[Twilio Messages] Gateway response: {resp.text}")
                    return False, f"Twilio HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            logger.error(f"[Twilio Messages] Connection failed: {e}")
            return False, str(e)

    return False, "Twilio configuration error"


async def dispatch_real_time_otp(raw_phone: str) -> Dict[str, Any]:
    """
    Main entry point for dispatching a real-time OTP.
    Validates phone, generates code, caches it, and dispatches via configured SMS gateway.
    """
    phone_10, e164 = normalize_phone(raw_phone)
    if len(phone_10) != 10:
        return {
            "success": False,
            "message": "Invalid mobile number. Please provide a valid 10-digit Indian mobile number."
        }

    otp_code = generate_otp(length=4)
    now = time.time()
    expiry_seconds = get_otp_expiry_seconds()

    # Save to memory cache with expiry
    _OTP_CACHE[phone_10] = {
        "otp": otp_code,
        "created_at": now,
        "attempts": 0
    }

    provider = get_gateway_provider()
    gateway_used = "Mock/Console Provider"
    live_sent = False
    status_detail = ""

    if provider == "2factor":
        live_sent, status_detail = await send_sms_via_2factor(phone_10, otp_code)
        if live_sent:
            gateway_used = "2Factor.in (Live Route)"
        else:
            live_sent, status_detail = await send_sms_via_twilio(e164, otp_code)
            if live_sent:
                gateway_used = "Twilio Verify SMS (Fallback)"

    elif provider == "textbee":
        live_sent, status_detail = await send_sms_via_textbee(e164, otp_code)
        if live_sent:
            gateway_used = "Textbee Open-Source Gateway (Live Route)"

    elif provider == "fast2sms":
        live_sent, status_detail = await send_sms_via_fast2sms(phone_10, otp_code)
        if live_sent:
            gateway_used = "Fast2SMS (Live Route)"
        else:
            account_sid, auth_token, _ = get_twilio_credentials()
            if account_sid and auth_token:
                live_sent, status_detail = await send_sms_via_twilio(e164, otp_code)
                if live_sent:
                    gateway_used = "Twilio Verify SMS (Fallback Route)"

    elif provider == "twilio":
        live_sent, status_detail = await send_sms_via_twilio(e164, otp_code)
        if live_sent:
            gateway_used = "Twilio Verify SMS (Live Route)"
        else:
            if os.environ.get("TWOFACTOR_API_KEY"):
                live_sent, status_detail = await send_sms_via_2factor(phone_10, otp_code)
                if live_sent:
                    gateway_used = "2Factor.in (Fallback Route)"

    else:
        # Default Auto-Router: Try 2Factor -> Twilio -> Fast2SMS -> Textbee
        if os.environ.get("TWOFACTOR_API_KEY"):
            live_sent, status_detail = await send_sms_via_2factor(phone_10, otp_code)
            if live_sent:
                gateway_used = "2Factor.in (Auto Router)"

        if not live_sent:
            account_sid, auth_token, _ = get_twilio_credentials()
            if account_sid and auth_token:
                live_sent, status_detail = await send_sms_via_twilio(e164, otp_code)
                if live_sent:
                    gateway_used = "Twilio Verify SMS (Auto Router)"

        if not live_sent and get_fast2sms_api_key():
            live_sent, status_detail = await send_sms_via_fast2sms(phone_10, otp_code)
            if live_sent:
                gateway_used = "Fast2SMS (Auto Router)"

    masked = mask_phone(phone_10)

    # Server Terminal Log for visibility during dev/testing
    print("\n=======================================================")
    print(f" [REAL-TIME OTP SENDER] Target: {masked}")
    print(f" [OTP CODE]: >>> {otp_code} <<< (Valid for {expiry_seconds}s)")
    print(f" [GATEWAY]: {gateway_used} (Live Sent: {live_sent})")
    if status_detail:
        print(f" [STATUS DETAIL]: {status_detail}")
    print("=======================================================\n")

    res_dict = {
        "success": True,
        "phone_masked": masked,
        "gateway": gateway_used,
        "live_sms_sent": live_sent,
        "expires_in_seconds": expiry_seconds,
        "message": f"OTP sent to {masked} via {gateway_used}."
    }
    if not live_sent:
        res_dict["otp"] = otp_code
        res_dict["status_detail"] = status_detail

    return res_dict


def verify_otp_code(raw_phone: str, entered_otp: str) -> Tuple[bool, str]:
    """
    Validates user-entered OTP against Twilio Verify API check or active cache.
    """
    phone_10, e164 = normalize_phone(raw_phone)
    entered_clean = (entered_otp or "").strip()

    if not entered_clean:
        return False, "OTP cannot be empty."

    if len(phone_10) != 10:
        return False, "Invalid mobile number format."

    # Priority 1: Live Verification via Twilio Verify API
    account_sid, auth_token, _ = get_twilio_credentials()
    verify_sid = get_twilio_verify_sid()
    if account_sid and auth_token and verify_sid and e164:
        try:
            url_check = f"https://verify.twilio.com/v2/Services/{verify_sid}/VerificationCheck"
            with httpx.Client(timeout=6.0) as client:
                resp = client.post(
                    url_check,
                    data={"To": e164, "Code": entered_clean},
                    auth=(account_sid, auth_token)
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "approved" and data.get("valid") is True:
                        if phone_10 in _OTP_CACHE:
                            del _OTP_CACHE[phone_10]
                        return True, "Mobile number verified successfully via Live SMS OTP."
        except Exception as e:
            logger.warning(f"[Twilio VerificationCheck] Exception: {e}")

    # Priority 2: In-memory OTP cache check
    record = _OTP_CACHE.get(phone_10)
    if not record:
        return False, "No active OTP request found for this mobile number. Please request a new OTP."

    expiry_seconds = get_otp_expiry_seconds()
    if time.time() - record["created_at"] > expiry_seconds:
        del _OTP_CACHE[phone_10]
        return False, "OTP has expired. Please request a fresh OTP."

    record["attempts"] += 1
    if record["attempts"] > 5:
        del _OTP_CACHE[phone_10]
        return False, "Too many failed attempts. Please request a fresh OTP."

    if record["otp"] == entered_clean:
        del _OTP_CACHE[phone_10]
        return True, "Mobile number verified successfully."

    return False, "Invalid OTP code. Please check the SMS code received on your mobile device."

