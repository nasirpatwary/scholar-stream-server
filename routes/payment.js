const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { applicationCollection } = require("../config/db");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  const {
    scholarshipId,
    scholarshipName,
    universityName,
    userEmail,
    totalAmount,
  } = req.body;

  const amount = parseInt(totalAmount) * 100;

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: universityName || scholarshipName,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { scholarshipId },
      customer_email: userEmail,
      success_url: `${process.env.DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/dashboard/payment-cancelled`,
    });

    res.send({ url: session.url });
  } catch (error) {
    res
      .status(500)
      .send({
        message: "Stripe session creation failed",
        error: error.message,
      });
  }
});


router.put("/session-status", verifyToken, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id,
    );
    const transactionId = session.payment_intent;

    // Check if this transaction was already processed
    const existApplication = await applicationCollection.findOne({
      transactionId,
    });
    if (existApplication) {
      return res.send({ message: "already exists", transactionId });
    }

    if (session.payment_status === "paid") {
      const scholarshipId = session.metadata.scholarshipId;
      const query = { scholarshipId };
      const update = {
        $set: {
          paymentStatus: "paid",
          transactionId,
        },
      };

      const result = await applicationCollection.findOneAndUpdate(
        query,
        update,
        { returnDocument: "after" },
      );

      res.send({
        transactionId: result.transactionId,
        universityCity: result.universityCity,
        scholarshipName: result.scholarshipName, // Fixed from your snippet's universityCity typo
        applicationFees: result.applicationFees,
        serviceCharge: result.serviceCharge,
      });
    } else {
      res.status(400).send({ message: "Payment not completed" });
    }
  } catch (error) {
    res
      .status(500)
      .send({
        message: "Failed to retrieve session status",
        error: error.message,
      });
  }
});

module.exports = router;
