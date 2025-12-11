import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import nodemailer from "nodemailer";
import Stripe from "stripe";

dotenv.config();

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const app = express();
app.use(cors());
app.use(express.json());

const YOUR_DOMAIN =
  process.env.APP_DOMAIN ||
  "https://unindividuated-predisastrously-dayna.ngrok-free.dev";

app.post("/payment-sheet", async (req, res) => {
  try {
    const { amount, currency, uid } = req.body;
    if (!amount || !currency) return res.status(400).json({ error: "Missing fields" });

    let customerId = null;
    if (uid) {
      const userDoc = await db.collection("userInfo").doc(uid).get();
      if (userDoc.exists && userDoc.data().stripeUserId) {
        customerId = userDoc.data().stripeUserId;
      } else {
        const customer = await stripe.customers.create({
          description: `Customer for UID ${uid}`
        });
        customerId = customer.id;
        await db.collection("userInfo").doc(uid).set(
          { stripeUserId: customerId },
          { merge: true }
        );
      }
    } else {
      const customer = await stripe.customers.create({
        description: "Guest customer"
      });
      customerId = customer.id;
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-06-20" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true }
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      merchantDisplayName: "Peoplestown Revitalization",
      allowsDelayedPaymentMethods: true
    });
  } catch (error) {
    console.error("Payment Sheet Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "Missing amount" });
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment Intent Error:", error);
    console.log("Incoming request:", req.body);

    res.status(500).json({ error: error.message });
  }
});

app.post("/send-verification", async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone)
      return res.status(400).json({ error: "Missing email or phone." });

    const target = email || phone;
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.collection("verifications").doc(target).set({
      code,
      createdAt: new Date(),
      expiresAt,
      verified: false,
      type: email ? "email" : "phone"
    });

    if (email) {
      await transporter.sendMail({
        from: `ParentLike <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your ParentLike Verification Code",
        html: `<p>Your verification code is <b>${code}</b></p><p>This code expires in 5 minutes.</p>`
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Verification Send Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/verify-code", async (req, res) => {
  try {
    const { email, phone, code } = req.body;
    const target = email || phone;
    if (!target)
      return res.status(400).json({ error: "Missing email or phone." });

    const doc = await db.collection("verifications").doc(target).get();
    if (!doc.exists)
      return res.status(400).json({ error: "No verification request found." });

    const data = doc.data();
    if (new Date() > data.expiresAt.toDate()) {
      await db.collection("verifications").doc(target).delete();
      return res.status(400).json({ error: "Verification code expired." });
    }

    if (data.code === code) {
      await db.collection("verifications").doc(target).update({
        verified: true
      });
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Invalid verification code." });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/list-payment-methods", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ error: "Missing userId" });

    const userDoc = await db.collection("userInfo").doc(userId).get();
    if (!userDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const { stripeUserId } = userDoc.data();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeUserId,
      type: "card"
    });

    res.json(paymentMethods.data);
  } catch (error) {
    console.error("List Payment Methods Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/detach-payment-method", async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    if (!paymentMethodId)
      return res.status(400).json({ error: "Missing paymentMethodId" });

    await stripe.paymentMethods.detach(paymentMethodId);
    res.json({ success: true });
  } catch (error) {
    console.error("Detach Payment Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/attach-payment-method", async (req, res) => {
  try {
    const { userId, paymentMethodId } = req.body;
    if (!userId || !paymentMethodId)
      return res.status(400).json({ error: "Missing fields" });

    const userDoc = await db.collection("userInfo").doc(userId).get();
    if (!userDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const { stripeUserId } = userDoc.data();
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeUserId
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Attach Payment Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/create-setup-intent", async (req, res) => {
  try {
    const { userId, customerId } = req.body;
    let stripeUserId = customerId || null;

    if (!userId && !customerId)
      return res.status(400).json({ error: "Missing userId or customerId" });

    if (userId) {
      const userDoc = await db.collection("userInfo").doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.stripeUserId) stripeUserId = data.stripeUserId;
      }

      if (!stripeUserId) {
        const customer = await stripe.customers.create({
          metadata: { firebaseUID: userId },
        });
        stripeUserId = customer.id;
        await db.collection("userInfo").doc(userId).set({ stripeUserId }, { merge: true });
      }
    }

    if (!stripeUserId)
      return res.status(400).json({ error: "No valid Stripe customer ID found." });

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeUserId,
      payment_method_types: ["card"],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error("Setup Intent Error:", error);
    res.status(500).json({ error: error.message });
  }
});


app.post("/refund", async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return res.status(400).json({ error: "Missing paymentIntentId" });
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    res.json({ success: true, refund });
  } catch (err) {
    console.error("Refund failed:", err);
    res.status(500).json({ error: "Refund failed" });
  }
});

app.post("/dialogflow/fulfillment", async (req, res) => {
  try {
    const body = req.body;

    const intentName = body?.queryResult?.intent?.displayName;
    const params = body?.queryResult?.parameters ?? {};

    console.log("Dialogflow intent:", intentName);
    console.log("Dialogflow params:", JSON.stringify(params, null, 2));

    if (intentName === "Default Welcome Intent") {
      const pickupRaw = params.pickup_location;
      const dropoffRaw = params.dropoff_location;
      const stopRaw = params.stop;  
      const numPassengersRaw = params.num_passengers; 
      const rideTimeRaw = params.ride_time; 
      const callerNameRaw = params.name;

      const pickupName =
        (Array.isArray(pickupRaw) ? pickupRaw[0] : pickupRaw)?.toString().trim() ||
        "your pickup location";

      const dropoffName =
        (Array.isArray(dropoffRaw) ? dropoffRaw[0] : dropoffRaw)?.toString().trim() ||
        "your dropoff location";

      const stop =
        (Array.isArray(stopRaw) ? stopRaw[0] : stopRaw)?.toString().trim() || null;

      const callerName =
        (Array.isArray(callerNameRaw) ? callerNameRaw[0] : callerNameRaw)?.toString().trim() ||
        null;

      const numPassengers = numPassengersRaw || null;
      const rideTime = rideTimeRaw || null;

      const badPhrases = ["i need a ride", "i want a ride"];

      const looksLikeJunk = (text) => {
        if (!text) return false;
        const lower = text.toLowerCase();
        return badPhrases.some((p) => lower.includes(p));
      };

      if (looksLikeJunk(pickupName) || looksLikeJunk(dropoffName)) {
        return res.json({
          fulfillmentText:
            "Got it, you’d like a ride. Where would you like to be picked up from?",
        });
      }

      const BOOKING_COLLECTION = "booking";

        const bookingDoc = await db.collection(BOOKING_COLLECTION).add({
          pickupName,
          dropoffName,
          stop,
          riders: numPassengers ?? 1,   
          rideTime,
          name: callerName,
          code: callerName || "Guest",  
          createdBy: "phone-ai",        
          status: "pending",            
          createdAt: Timestamp.now(),
        });

      console.log("Created AI booking with ID:", bookingDoc.id);

      let responseText = "";

      if (callerName) {
        responseText =
          `Thanks, ${callerName}. I’ve booked your ride from ${pickupName} to ${dropoffName}. ` +
          `Your reservation is under the name ${callerName}.`;
      } else {
        responseText =
          `Thanks. I’ve booked your ride from ${pickupName} to ${dropoffName}. ` +
          `Your reservation is under the name you provide to the driver.`;
      }

      return res.json({
        fulfillmentText: responseText,
      });
    }

    return res.json({
      fulfillmentText: "I’m not sure how to handle that yet.",
    });
  } catch (error) {
    console.error("Dialogflow webhook error:", error);
    return res.json({
      fulfillmentText:
        "Sorry, something went wrong while booking your ride. Please try again later.",
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
