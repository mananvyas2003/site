import { NextResponse } from "next/server";
import { sendDailyPushAll } from "@/lib/push";

/** Vercel cron: 9pm IST = 15:30 UTC. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendDailyPushAll();
  return NextResponse.json(result);
}
