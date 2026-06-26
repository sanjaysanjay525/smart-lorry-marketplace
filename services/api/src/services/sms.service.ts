/**
 * SMS Service — Fast2SMS integration (India, no DLT needed for transactional SMS)
 * Fire-and-forget in all callers. Logs every attempt to sms_send_log table.
 * If FAST2SMS_API_KEY is not set, logs to console (dev mode) and skips HTTP call.
 */
import { prisma } from "../config/prisma";

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

export type SmsMessageType =
  | "load_posted_notify"
  | "load_accepted"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "trip_cancelled";

export async function sendSms(
  toPhone: string,
  messageType: SmsMessageType,
  body: string,
  tripId?: string
): Promise<void> {
  // Normalize phone: strip leading +91, 91, or 0
  const numbers = toPhone.replace(/^(\+91|91|0)/, "").trim();

  let success = false;
  let providerRef: string | undefined;

  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // Dev mode: log to console, skip HTTP
    console.log(`[SMS mock] → ${numbers} [${messageType}]: ${body}`);
    success = true;
  } else {
    try {
      const res = await fetch(FAST2SMS_URL, {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: body,
          language: "english",
          flash: 0,
          numbers,
        }),
      });
      const json = await res.json() as { return?: boolean; request_id?: string };
      success = json.return === true;
      providerRef = json.request_id;
    } catch (_err) {
      success = false;
    }
  }

  // Log to DB if tripId provided
  if (tripId) {
    try {
      await prisma.smsSendLog.create({
        data: { tripId, toPhone, messageType, messageBody: body, success, providerRef },
      });
    } catch (dbErr) {
      console.error("[SMS] Failed to log SMS to DB:", dbErr);
    }
  }
}

// ─── SMS Template Helpers ───────────────────────────────────────────

export function smsLoadPostedNotify(
  materialType: string, weightKg: number,
  pickupCity: string, dropCity: string, offeredRate: number
): string {
  return `New load: ${materialType} ${weightKg}kg from ${pickupCity} to ${dropCity}. Rate: Rs${offeredRate}. Log in to accept. -SmartLorry`;
}

export function smsLoadAccepted(
  ownerName: string, registration: string, vehicleType: string,
  pickupAddress: string, dropAddress: string
): string {
  return `Your load accepted by ${ownerName}. Vehicle ${registration} (${vehicleType}) from ${pickupAddress} to ${dropAddress}. SMS updates will follow. -SmartLorry`;
}

export function smsPickedUp(registration: string, dropAddress: string): string {
  return `Goods picked up by ${registration}. Now heading to ${dropAddress}. -SmartLorry`;
}

export function smsInTransit(registration: string, cityName: string, dropAddress: string): string {
  const time = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit",
  });
  return `${registration} near ${cityName}, heading to ${dropAddress}. Updated: ${time}. -SmartLorry`;
}

export function smsDelivered(materialType: string, dropAddress: string): string {
  return `Delivered! ${materialType} reached ${dropAddress}. Trip complete. Thank you for using SmartLorry.`;
}

export function smsTripCancelled(cancelledBy: string, cancelReason: string): string {
  return `Trip cancelled by ${cancelledBy}: ${cancelReason}. Load status is now open. -SmartLorry`;
}
