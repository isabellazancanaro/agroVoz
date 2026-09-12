import { NextResponse } from "next/server";

export function GET() {
  const number = (process.env.TWILIO_SANDBOX_NUMBER || "whatsapp:+14155238886").replace("whatsapp:", "").replace("+", "");
  return NextResponse.redirect(`https://wa.me/${number}?text=${encodeURIComponent("Activar AgroVoz")}`);
}
