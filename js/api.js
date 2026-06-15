const PASSR_API_BASE = "/api/v1/passr";

async function passrRequest(path, body) {
  const response = await fetch(`${PASSR_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

function subscribeToPassr(email) {
  return passrRequest("/subscribe", { email });
}

function sendPassrContact({ name, email, message }) {
  return passrRequest("/contact", { name, email, message });
}
