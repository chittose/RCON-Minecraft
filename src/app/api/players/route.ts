import { NextResponse } from "next/server";
import { Rcon } from "rcon-client";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const host = process.env.RCON_HOST;
    const port = parseInt(process.env.RCON_PORT || "25575");
    const password = process.env.RCON_PASSWORD;

    if (!host || !password) {
      return NextResponse.json({ success: false, players: [] });
    }

    const rcon = await Rcon.connect({ host, port, password });
    
    // Command 'list' returns something like: "There are 2 of a max of 20 players online: dhinz129, Steve"
    const response = await rcon.send("list");
    await rcon.end();

    const parts = response.split(":");
    let players: string[] = [];
    
    if (parts.length > 1 && parts[1].trim() !== "") {
      // Split by comma and clean up spaces
      players = parts[1].split(",").map(p => p.trim()).filter(p => p.length > 0);
    }

    return NextResponse.json({ success: true, players });
  } catch (error) {
    // Fail silently so the UI doesn't crash if server is offline
    return NextResponse.json({ success: false, players: [] });
  }
}
