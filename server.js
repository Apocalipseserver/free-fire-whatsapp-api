const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* =========================
   BASE DE DATOS TEMPORAL
   ========================= */

const orders = new Map();

/* =========================
   PRODUCTOS
   ========================= */

const products = [
  {
    id: "ff-100",
    game: "free-fire",
    name: "100 Diamantes",
    diamonds: 100,
    price: 1.00,
    currency: "USD"
  },
  {
    id: "ff-310",
    game: "free-fire",
    name: "310 Diamantes",
    diamonds: 310,
    price: 3.00,
    currency: "USD"
  },
  {
    id: "ff-520",
    game: "free-fire",
    name: "520 Diamantes",
    diamonds: 520,
    price: 5.00,
    currency: "USD"
  }
];

/* =========================
   HEALTH CHECK
   ========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Free Fire WhatsApp API",
    status: "online"
  });
});

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
      crypto.randomBytes(5)
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

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.set(orderId, order);

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

  const order = orders.get(req.params.id);

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
   WEBHOOK DE PAGOS
   ========================= */

app.post("/api/payments/webhook", (req, res) => {

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

  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({
      ok: false,
      error: "Pedido no encontrado"
    });
  }

  /*
   IMPORTANTE:

   En producción NO debemos confiar
   únicamente en req.body.status.

   Aquí posteriormente conectaremos
   el webhook real del proveedor de pagos.
  */

  if (status === "paid") {

    order.paymentStatus = "paid";
    order.status = "paid";

    order.paymentId = paymentId || null;

    order.updatedAt =
      new Date().toISOString();

    orders.set(orderId, order);

    return res.json({
      ok: true,
      message: "Pago registrado",
      order
    });
  }

  res.json({
    ok: true,
    message: "Webhook recibido",
    paymentStatus: order.paymentStatus
  });
});

/* =========================
   RECARGA
   ========================= */

app.post("/api/topup", async (req, res) => {

  const {
    orderId
  } = req.body;

  if (!orderId) {
    return res.status(400).json({
      ok: false,
      error: "Falta orderId"
    });
  }

  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({
      ok: false,
      error: "Pedido no encontrado"
    });
  }

  /*
   SEGURIDAD:
   Solo permitimos recargar
   pedidos cuyo pago esté confirmado.
  */

  if (order.paymentStatus !== "paid") {
    return res.status(400).json({
      ok: false,
      error: "El pedido todavía no está pagado"
    });
  }

  /*
   Todavía NO hacemos una recarga real.
   Aquí conectaremos posteriormente
   el proveedor/API de recargas.
  */

  order.topupStatus = "waiting_provider";
  order.status = "processing";

  order.updatedAt =
    new Date().toISOString();

  orders.set(orderId, order);

  res.json({
    ok: true,
    message: "Pedido preparado para recarga",
    order
  });
});

/* =========================
   INICIAR SERVIDOR
   ========================= */

app.listen(PORT, () => {

  console.log(
    `API funcionando en puerto ${PORT}`
  );

});
