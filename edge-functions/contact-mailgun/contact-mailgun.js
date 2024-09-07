import { encodeBase64 } from "https://deno.land/std@0.212.0/encoding/base64.ts";

let {
  MAILGUN_API_KEY,
  MAILGUN_API_URL,
  MAILGUN_DOMAIN,
  FROM_EMAIL_ADDRESS,
  TO_EMAIL_ADDRESS,
} = Deno.env.toObject();

export default async (request, context) => {
  if (
    !MAILGUN_API_KEY ||
    !FROM_EMAIL_ADDRESS ||
    !TO_EMAIL_ADDRESS ||
    !MAILGUN_API_URL
  ) {
    return Response.json({
      error: "Missing MailGun configuration, please check your .env file.",
    });
  }

  const { email, name, message, topicEmail } = await request.json();

  if (!email || email === "") {
    return Response.json({ error: "Missing email" });
  }

  const authHeader = "Basic " + encodeBase64(`api:${MAILGUN_API_KEY}`);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/x-www-form-urlencoded",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    Authorization: authHeader,
  };

  let payload = new URLSearchParams();

  payload.append("from", FROM_EMAIL_ADDRESS);
  payload.append("to", topicEmail ? topicEmail : TO_EMAIL_ADDRESS);
  payload.append("h:Reply-To", email);
  payload.append("subject", `Contact Form: ${name} ${email}`);
  payload.append("text", message);

  try {
    const resp = await fetch(
      `${MAILGUN_API_URL}/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: headers,
        body: payload,
      },
    );

    // Verificar si la respuesta es JSON
    const contentType = resp.headers.get("content-type");
    let response;
    
    if (contentType && contentType.includes("application/json")) {
      // Si es JSON, parsear
      response = await resp.json();
    } else {
      // Si no es JSON, manejarlo como texto o HTML
      response = await resp.text();
    }

    // Retornar respuesta basada en el resultado de Mailgun
    if (resp.ok) {
      return Response.json({
        statusCode: 200,
        status: "ok",
        body: "Your message was sent successfully! We'll be in touch.",
      });
    } else {
      console.log("Error response from Mailgun:", response);
      return Response.json({
        statusCode: resp.status,
        status: "error",
        error: response,
      });
    }
  } catch (e) {
    console.log("ERROR:", e);
    return Response.json({
      statusCode: 400,
      status: "error",
      error: "Mailgun error: " + e.message,
    });
  }
};
