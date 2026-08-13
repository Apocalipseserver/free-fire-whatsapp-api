const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());

/* =========================
   PRODUCTOS
========================= */

const products = [
  {
    id: "ff-100",
    game: "free-fire",
    name: "100 Diamantes",
    diamonds: 100,
    price: 1,
    currency: "USD"
  },
  {
    id: "ff-310",
    game: "free-fire",
    name: "310 Diamantes",
    diamonds: 310,
    price: 3,
    currency: "USD"
  },
  {
    id: "ff-520",
    game: "free-fire",
    name: "520 Diamantes",
    diamonds: 520,
    price: 5,
    currency: "USD"
  }
];

/* =========================
   PEDIDOS
========================= */

const orders = new Map();

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Free Fire WhatsApp API",
    status: "online"
  });
});

/* =========================
   TEST HTML
========================= */

app.get("/test.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "test.html")
  );
});

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "online",
    timestamp: new Date().toISOString()
  });
});

/* =========================
   PRODUCTOS
========================= */

app.get("/api/products", (req, res) => {
  res.json({
    ok: true,
    products
  });
});

/* =========================
   CREAR PEDIDO
========================= */

app.post("/api/orders", (req, res) => {

  try {

    const {
      playerId,
      productId,
      whatsapp
    } = req.body;

    if (!playerId) {
      return res.status(400).json({
        ok: false,
        error: "Falta playerId"
      });
    }

    if (!productId) {
      return res.status(400).json({
        ok: false,
        error: "Falta productId"
      });
    }

    const product = products.find(
      p => p.id === productId
    );

    if (!product) {
      return res.status(404).json({
        ok: false,
        error: "Producto no encontrado"
      });
    }

    const orderId =
      "FF-" +
      crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase();

    const order = {

      id: orderId,

      playerId,

      whatsapp: whatsapp || null,

      product: {
        id: product.id,
        name: product.name,
        diamonds: product.diamonds
      },

      amount: product.price,

      currency: product.currency,

      paymentStatus: "pending",

      topupStatus: "pending",

      status: "awaiting_payment",

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    orders.set(
      orderId,
      order
    );

    res.status(201).json({
      ok: true,
      message: "Pedido creado",
      order
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Error interno del servidor"
    });

  }

});

/* =========================
   CONSULTAR PEDIDO
========================= */

app.get("/api/orders/:id", (req, res) => {

  const order =
    orders.get(req.params.id);

  if (!order) {

    return res.status(404).json({
      ok: false,
      error: "Pedido no encontrado"
    });

  }

  res.json({
    ok: true,
    order
  });

});

/* =========================
   WEBHOOK DE PAGO
========================= */

app.post(
  "/api/payments/webhook",
  (req, res) => {

    const {
      orderId,
      paymentId,
      status
    } = req.body;

    if (!orderId) {

      return res.status(400).json({
        ok: false,
        error: "Falta orderId"
      });

    }

    const order =
      orders.get(orderId);

    if (!order) {

      return res.status(404).json({
        ok: false,
        error: "Pedido no encontrado"
      });

    }

    /*
     
