import { Router, type IRouter } from "express";
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

function localSupportReply(userMessage: string) {
  const issue = userMessage.toLowerCase();
  const os = userMessage.match(/\b(?:Windows(?:\s+\d+)?|macOS(?:\s+\w+)?|iOS|iPadOS|Android|Linux)\b/i)?.[0];
  const errorCode = userMessage.match(/\b(?:error|code|status)[\s:#-]*[A-Z]?\d{3,5}\b/i)?.[0];
  const context = [os, errorCode].filter(Boolean).join(" and ");
  const contextLine = context
    ? `I’m keeping ${context} in view while you work through these checks.`
    : "I’m keeping the details from your message in view while you work through these checks.";

  if (/\b(wi-?fi|wireless|internet|network|dns|vpn|ethernet)\b/i.test(issue)) {
    return `This is a local Relay support guide, so no external AI quota is needed. I can give you a focused first pass for this network issue. ${contextLine}

1. Check whether another device on the same network is also losing access. If it is, restart the router and wait two minutes before reconnecting.
2. If only this device is affected, disconnect from the network, forget the saved network, then join it again. For a VPN or custom DNS setup, turn it off temporarily and test once more.
3. Record whether the drop happens at a predictable interval and note any error code before the next reconnect.

If the connection still drops after those checks, the next step is to open a tier-2 ticket with your device model, network type, timing, and the exact error wording.`;
  }

  if (/\b(crash|crashing|freeze|frozen|install|update|app|software|shutdown)\b/i.test(issue)) {
    return `This is a local Relay support guide, so no external AI quota is needed. I can give you a focused first pass for this software issue. ${contextLine}

1. Save any work if the app still responds, then close it completely and reopen it once.
2. Check for a pending app or operating-system update, install it, and restart the device before testing again.
3. If the problem continues, clear the app cache or repair the installation. Avoid deleting app data until important files are backed up.

If it still fails, open a tier-2 ticket with the app version, device model, steps that trigger the failure, and the exact error wording.`;
  }

  if (/\b(sign in|login|log in|password|mfa|two-factor|verification|account|locked)\b/i.test(issue)) {
    return `This is a local Relay support guide, so no external AI quota is needed. I can give you a focused first pass for this account issue. ${contextLine}

1. Confirm that the username or email is correct, then retry in a private browser window or the latest version of the app.
2. If verification is looping, check the device time and try the most recent code only. Do not share a password or recovery code.
3. Use the official password-reset flow once, then wait for the reset email before requesting another one.

If the account remains locked or verification still loops, open a tier-2 ticket with the account email, approximate time of failure, and any non-sensitive error text.`;
  }

  if (/\b(monitor|display|screen|bluetooth|audio|headset|speaker|keyboard|mouse|usb)\b/i.test(issue)) {
    return `This is a local Relay support guide, so no external AI quota is needed. I can give you a focused first pass for this hardware or peripheral issue. ${contextLine}

1. Disconnect the accessory, power it off if possible, then reconnect it directly without a hub or adapter.
2. Check the device settings for the selected display, audio output, or Bluetooth pairing and remove any duplicate entry.
3. Restart the device and test with a known-good cable, port, or accessory if one is available.

If the device is still not detected, open a tier-2 ticket with the model, connection type, visible lights or sounds, and any error text.`;
  }

  return `This is a local Relay support guide, so no external AI quota is needed. I can help you start safely. ${contextLine}

1. Write down the device model, operating system, application name, and the exact wording of the error.
2. Reproduce the issue once after restarting the affected app or device, and note what happens immediately before it fails.
3. Check for a pending update and test again without changing multiple settings at once.

If the issue remains unclear or needs account or hardware intervention, open a tier-2 ticket with those details.`;
}

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

  const lastUserMessage = [...parsed.data.messages]
    .reverse()
    .find((message) => message.role === "user")?.content ?? "";
  const reply = localSupportReply(lastUserMessage);
  res.write(`data: ${JSON.stringify({ content: reply })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;