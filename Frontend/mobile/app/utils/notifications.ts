export async function postPushToken(email: string, token: string, base: string) {
  try {
    await fetch(`${base}/notification_token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token })
    });
  } catch {}
}

export async function disableNotifications(email: string, base: string) {
  try {
    await fetch(`${base}/notification_disable/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
  } catch {}
}
