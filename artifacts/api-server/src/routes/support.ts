import { Router, type IRouter } from "express";
import { SendSupportChatBody } from "@workspace/api-zod";

const router: IRouter = Router();

type SupportMessage = {
  role: "user" | "assistant";
  content: string;
};

function findDetails(message: string) {
  const match = (pattern: RegExp) => message.match(pattern)?.[0];
  return {
    os: match(/\b(?:Windows(?:\s+\d+)?|macOS(?:\s+\w+)?|iOS|iPadOS|Android|Linux)\b/i),
    errorCode: match(/\b(?:error|code|status)[\s:#-]*[A-Z]?\d{3,5}\b/i),
    device: match(/\b(?:laptop|desktop|phone|router|MacBook|iPhone|iPad|monitor|headset|keyboard|mouse|printer)\b/i),
    app: match(/\b(?:Chrome|Safari|Firefox|Edge|Outlook|Teams|Slack|Zoom|Excel|Word|Photoshop|Spotify|Steam|Discord|Gmail)\b/i),
  };
}

function localSupportReply(messages: SupportMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  const userMessage = userMessages.at(-1)?.content ?? "";
  const conversationText = userMessages.map((message) => message.content).join("\n");
  const issue = conversationText.toLowerCase();
  const latestIssue = userMessage.toLowerCase();
  const turn = userMessages.length;
  const details = findDetails(conversationText);
  const context = [details.app, details.device, details.os, details.errorCode]
    .filter(Boolean)
    .join(" · ");
  const category = /\b(wi-?fi|wireless|internet|network|dns|vpn|ethernet)\b/i.test(issue)
    ? "network"
    : /\b(crash|crashing|freeze|frozen|install|update|app|software|shutdown)\b/i.test(issue)
      ? "software"
      : /\b(sign in|login|log in|password|mfa|two-factor|verification|account|locked)\b/i.test(issue)
        ? "account"
        : /\b(monitor|display|screen|bluetooth|audio|headset|speaker|keyboard|mouse|usb)\b/i.test(issue)
          ? "hardware"
          : "unknown";

  if (/\b(thank you|thanks|it works|that helped|helped|fixed|resolved|all good|sorted)\b/i.test(latestIssue)) {
    const resolvedReplies = [
      "Great news — that confirms the fix worked. You’re all set.",
      "That’s a solid result. Leave the working settings as they are and no further changes are needed.",
      "Glad the change solved it. The issue is resolved, so you can carry on without opening a support ticket.",
    ];
    return resolvedReplies[(turn - 1) % resolvedReplies.length];
  }

  const greeting = turn === 1
    ? `Hi — I’ve got your ${category === "unknown" ? "support issue" : `${category} issue`}${context ? ` (${context})` : ""}.`
    : "";
  const firstResponseIntro = turn === 1
    ? `${greeting}\n\nI can help you work through this and identify the fix. Start with these checks:`
    : "";
  const followUpLead = turn > 1
    ? [
        "Let’s isolate the next useful signal.",
        "The next check should narrow down what is still happening.",
        "Keep the working changes in place and test this separate possibility.",
        "We can take a different route here instead of repeating the first check.",
      ][(turn - 2) % 4]
    : "";
  const opening = firstResponseIntro || followUpLead;

  if (category === "network") {
    if (turn > 1) {
      return `${opening}

1. Open a second website or run one other network-dependent app at the moment the drop occurs. This separates a single-service failure from a full connection loss.
2. Temporarily disable the VPN or custom DNS profile, then test on the same network for a few minutes. Re-enable it after the comparison.
3. If the connection fails only on this device, renew its network address and update the Wi-Fi or Ethernet driver before testing again.

If the drop continues, send tier-2 support the connection type, device model, exact timing, and any error text rather than repeating the same reset.`;
    }
    return `${opening}

1. Check another device on the same network while the problem is happening. If it is also offline, restart the router and wait two minutes before reconnecting.
2. If only this device is affected, forget the saved network, join it again, and test once with any VPN or custom DNS turned off.
3. Note whether the drop follows a predictable interval and capture the exact error wording before reconnecting.

If the connection still drops, the next step is a tier-2 ticket with the device model, network type, timing, and error details.`;
  }

  if (category === "software") {
    if (turn > 1) {
      return `${opening}

1. Check whether the same task fails in a different account, browser profile, or safe mode. That comparison shows whether the problem belongs to the app or the current profile.
2. Review the app’s crash or installation log for the first error recorded at the failure time.
3. Repair the installation or clear its cache only after backing up important local files, then test one clean launch.

If the failure remains, send tier-2 support the app version, operating system, reproduction steps, and the first logged error.`;
    }
    return `${opening}

1. Save any work if the app still responds, close it completely, and open it once more.
2. Install any pending app or operating-system update, then restart the device before testing the same action.
3. If it still fails, clear the app cache or use its repair option. Do not delete app data until important files are backed up.

If the app continues to fail, open a tier-2 ticket with its version, device model, trigger steps, and exact error wording.`;
  }

  if (category === "account") {
    if (turn > 1) {
      return `${opening}

1. Stop requesting new verification codes for a few minutes; repeated attempts can extend a temporary lock.
2. Check the device clock and timezone, then retry from the official sign-in page in a private window.
3. Use the official reset flow once and check spam or junk folders for the resulting message. Never share a password or recovery code.

If access is still blocked, tier-2 support will need the account identifier, approximate failure time, and non-sensitive error text.`;
    }
    return `${opening}

1. Confirm the username or email, then try the latest app version or a private browser window.
2. For a verification loop, check the device time and use only the newest code. Never share a password or recovery code.
3. Start the official password-reset flow once, then wait for its message before requesting another one.

If the account remains locked, open a tier-2 ticket with the account identifier, approximate failure time, and non-sensitive error text.`;
  }

  if (category === "hardware") {
    if (turn > 1) {
      return `${opening}

1. Test the accessory on a different port or with a known-good cable, bypassing hubs and adapters.
2. Remove the device from Bluetooth, display, or audio settings, restart the device, and pair or select it again.
3. Check for a device-specific driver or firmware update, then test before reconnecting other accessories.

If it is still undetected, tier-2 support will need the model, connection type, visible lights or sounds, and error text.`;
    }
    return `${opening}

1. Disconnect the accessory, power it off if possible, and reconnect it directly without a hub or adapter.
2. Check the selected display, audio output, or Bluetooth pairing and remove any duplicate entry.
3. Restart the device and test with a known-good cable, port, or accessory if one is available.

If the device is still not detected, open a tier-2 ticket with its model, connection type, symptoms, and error text.`;
  }

  return `${opening}

1. Record the device model, operating system, application name, and exact error wording.
2. Reproduce the issue once after restarting the affected app or device, noting what happens immediately before it fails.
3. Check for a pending update and change only one setting at a time so the result is clear.

If the cause remains unclear or needs account or hardware intervention, open a tier-2 ticket with those details.`;
}

router.post("/support/chat", (req, res) => {
  const parsed = SendSupportChatBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Please provide at least one valid chat message." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const reply = localSupportReply(parsed.data.messages);
  res.write(`data: ${JSON.stringify({ content: reply })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;