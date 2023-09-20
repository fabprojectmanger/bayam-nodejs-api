require('dotenv').config()
require("rootpath")();
let express = require("express");
let morgan = require("morgan");
let cors = require("cors");
let app = express();
let session = require("express-session");
let bodyParser = require("body-parser");
const { expressjwt } = require('express-jwt');
const serverless = require("serverless-http");


let morganFormatString =
  '[:date[clf]] ":method :status :url" ":user-agent" - :response-time ms';

let allowCrossDomain = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Content-Length, X-Requested-With"
  );

  // Intercept OPTIONS method
  if ("OPTIONS" == req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};


app.use(
  cors({
    origin: "*",
    methods: "GET, PUT",
  })
);

app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));
app.use(
  bodyParser.json(
    {
      verify: function (req, res, buf) {
        let url = req.originalUrl;
        if (url.startsWith("/api/webhooks")) {
          req.rawBody = buf.toString();
        }
      }
    },
    {
      limit: "1000mb"
    }
  )
);

let apiUrlRegex = new RegExp("^/api");
app.use(
  morgan(morganFormatString, {
    skip: function (req) {
      return !apiUrlRegex.test(req.originalUrl);
    }
  })
);
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

// use JWT auth to secure the api
async function isRevokedCallback(req, payload) {
  try {
    const user = { id: '1$3@31Efe&ghy^5', name: 'pupinder' };
    if (!!user) {
      req.user = user;
      return;
    } else {
      throw new Error("Unauthorized");
    }
  } catch (err) {
    throw err;
  }
}

//please enable below code on production
app.use('/api', expressjwt(
  {
    secret: process.env.JWT_SECRET,
    isRevoked: isRevokedCallback,
    algorithms: ['HS256']
  })
  .unless({
    path: [
      /\/api\/webhooks\/shopify/i,
      // TODO: Hook up auth on these when called from Shopify
      '/docs/template'
    ]
  })
);

app.use("/.netlify/functions/api/orders", require("./controllers/orders.controller"));
app.use("/.netlify/functions/api/discount", require("./controllers/discount.controller"))
// app.use("/api/creditcards", require("./controllers/creditcard.controller"));

// app.use("/stripe", require("./controllers/stripe.controller"));

// Webhooks
// app.use(
//   "/api/webhooks/shopify",
//   require("./controllers/webhooks/shopify.controller")
// );

// Handle all other routes
app.all("*", function (req, res) {
  res.status(404).send("https://bayamjewelry.com/pages/apiprod-automation");
});

// Custom error responses
app.use(function (err, req, res) {
  console.log("error stack", err.stack);
  if (err.name === "UnauthorizedError") {
    res.status(401).send("Unauthorized User");
  } else if (err.name === "ReferenceError") {
    res.status(500).send("Server Error");
  }
});

// Start server
let server = app.listen(process.env.PORT || 5858, function () {
  let port = server.address().port;
  console.log("API Server Now Running On Port.", port);
});
module.exports.handler = serverless(app);
