const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure the AWS SES SMTP transporter using the keys generated
const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 465,
  secure: true,
  auth: {
    user: "AKIASTXWWCN62A24EWD7",
    pass: "BKHLzWBSIDtqNCiDnesbLvIKD04OPw6ubvVP0hnUi4b7",
  },
});

exports.processEmailQueue = functions.firestore
  .document("mail/{docId}")
  .onCreate(async (snap, context) => {
    const mailData = snap.data();
    const mailOptions = {
      from: "\"BattleHub FF\" <noreply@battlehub.site>",
      to: mailData.to,
      subject: mailData.message?.subject || "Update from BattleHub FF",
      text: mailData.message?.text || "",
      html: mailData.message?.html || "",
    };

    // If attachments exist in the document
    if (mailData.message?.attachments) {
        mailOptions.attachments = mailData.message.attachments;
    }

    try {
      await transporter.sendMail(mailOptions);
      // Mark as delivered
      await snap.ref.update({
        delivery: {
          state: "SUCCESS",
          startTime: admin.firestore.FieldValue.serverTimestamp(),
          endTime: admin.firestore.FieldValue.serverTimestamp(),
        }
      });
      console.log("Email sent successfully to:", mailData.to);
    } catch (error) {
      console.error("Error sending email:", error);
      await snap.ref.update({
        delivery: {
          state: "ERROR",
          error: error.toString(),
        }
      });
    }
  });
