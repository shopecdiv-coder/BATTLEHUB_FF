export const sendBrevoEmail = async ({ to_email, to_name, subject, htmlContent }) => {
  // Brevo API Key fetched from environment variables for security
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;
  
  // You can change this to admin@battlehubff.site once it's fully verified in Brevo
  const senderEmail = "notification@battlehubff.site"; 
  
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: { name: "BATTLEHUB FF", email: senderEmail },
      to: [{ email: to_email, name: to_name || "Player" }],
      subject: subject,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Brevo API Error:", errorData);
    throw new Error(errorData.message || "Failed to send email via Brevo");
  }

  return response.json();
};
