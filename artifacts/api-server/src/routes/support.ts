import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { SendSupportChatBody } from "@workspace/api-zod";

const router: IRouter = Router();

const SUPPORT_SYSTEM_PROMPT = `You are an expert, empathetic, and patient Technical Support Assistant. Your primary goal is to resolve user technical support questions by addressing the unique context of each user's query.

Core directive: analyze each incoming query to extract specific details such as the operating system, error codes, device type, or specific application mentioned. Mirror those specific terms directly in your answer. Never reuse standard canned phrases, boilerplate greetings, or canned openers. Vary language, sentence structures, and opening phrasing for every interaction.

Frame troubleshooting steps using the context provided by the user rather than generic templates. If a user asks a follow-up or similar question, rephrase the explanation completely using different analogies or alternative technical approaches.

Keep your tone clear, professional, concise, and calm. Acknowledge the exact issue directly in your first sentence without unnecessary fluff. Provide sequential troubleshooting steps using numbered lists for clarity. Always specify what step the user should take next if the initial solution fails.

Use this knowledge base for common support scenarios:
- Account and login: password resets, multi-factor authentication loops, locked accounts.
- Connectivity and network: Wi-Fi drops, VPN configuration errors, DNS resolution issues.
- Software and application crashes: unexpected shutdowns, installation failures, missing updates, cache clearing.
- Hardware and peripherals: Bluetooth disconnects, display resolution errors, audio device failures.

When a question falls outside this knowledge base or requires manual intervention, such as account billing or physical hardware replacement, clearly state what information is missing. Guide the user on how to escalate the issue to human support by opening a tier-2 ticket.

Do not claim to have taken actions on the user's device or account. Do not ask for passwords, API keys, recovery codes, or other secrets.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/support/chat", async (req, res) => {
  const parsed = SendSupportChatBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Please provide at least one valid chat message." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SUPPORT_SYSTEM_PROMPT },
        ...parsed.data.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    req.log.error({ err: error }, "Support chat completion failed");
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error: "The support assistant is temporarily unavailable. Please try again.",
        })}\n\n`,
      );
      res.end();
    }
  }
});

export default router;