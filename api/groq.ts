export const config = {
  runtime: 'edge',
};

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export default async function handler(request: Request) {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { messages, model } = body;

    // 1. Read all keys from ENV
    const keysRaw = process.env.GROQ_API_KEYS;
    if (!keysRaw) {
      console.error("Missing GROQ_API_KEYS env var");
      return new Response(JSON.stringify({ error: "Server Configuration Error: Missing Keys" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const keys = keysRaw.split(",").map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
       return new Response(JSON.stringify({ error: "Server Configuration Error: No Valid Keys" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Pick random key (rotation)
    const apiKey = keys[Math.floor(Math.random() * keys.length)];

    // 3. Call Groq
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile", // Updated default model as per plan
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
      console.error(`Groq API Error: ${groqRes.status} - ${text}`);
      return new Response(JSON.stringify({ error: "Groq Provider Error", detail: text }), { 
        status: groqRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Pass through the response
    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Server Error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", detail: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
