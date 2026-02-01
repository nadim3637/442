import { NextResponse } from "next/server";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model } = body;

    // 1. Read all keys from ENV
    const keysRaw = process.env.GROQ_API_KEYS;
    if (!keysRaw) {
      return NextResponse.json(
        { error: "No GROQ_API_KEYS in env" },
        { status: 500 }
      );
    }

    const keys = keysRaw.split(",").map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
        return NextResponse.json(
            { error: "No Valid GROQ_API_KEYS configured" },
            { status: 500 }
        );
    }

    // 2. Pick random key (rotation)
    const apiKey = keys[Math.floor(Math.random() * keys.length)];

    // 3. Call Groq
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        stream: false,
        stop: null
      })
    });

    const text = await groqRes.text();

    if (!groqRes.ok) {
      return NextResponse.json(
        { error: "Groq error", detail: text },
        { status: groqRes.status }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Server crash", detail: err.message },
      { status: 500 }
    );
  }
}
