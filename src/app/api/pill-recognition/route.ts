import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();
        const response = await fetch("https://myFlaskApp.azurewebsites.net/api/process_pill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Error processing pill image" }, { status: 500 });
    }
}
