import { NextResponse } from "next/server";
import { Rcon } from "rcon-client";

export async function POST(req: Request) {
  try {
    const { command } = await req.json();

    if (!command) {
      return NextResponse.json(
        { success: false, message: "Perintah tidak boleh kosong!" },
        { status: 400 }
      );
    }

    const host = process.env.RCON_HOST;
    const port = parseInt(process.env.RCON_PORT || "25575");
    const password = process.env.RCON_PASSWORD;

    if (!host || !password) {
      return NextResponse.json(
        { success: false, message: "Konfigurasi RCON di server belum diatur." },
        { status: 500 }
      );
    }

    // Connect to RCON
    const rcon = await Rcon.connect({
      host: host,
      port: port,
      password: password,
    });

    // Remove leading slash if user added it
    const cleanCommand = command.startsWith("/") ? command.substring(1) : command;
    
    // Execute the raw command
    const response = await rcon.send(cleanCommand);

    // Disconnect securely
    await rcon.end();

    return NextResponse.json({
      success: true,
      message: `Berhasil mengeksekusi: /${cleanCommand}`,
      response: response || "Sukses (Tidak ada output dari server)",
    });
  } catch (error: any) {
    console.error("RCON Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyambung ke RCON.", error: error.message },
      { status: 500 }
    );
  }
}
