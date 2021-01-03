const crypto = require("crypto");
const request = require("request-promise");
import { registerFont } from "canvas";
import * as vega from "vega";
import numeral from "numeral";
import path from "path";

const TWITTER_API = "https://api.twitter.com/1.1";
const TWITTER_USERNAME = "@barchartbot";
const GITHUB_URL = "https://github.com/alexluong/gimmedadjoke";

registerFont(path.resolve("./public/Inter-Medium.ttf"), {
  family: "Inter",
});

function spec(data) {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    description: "",
    width: 800,
    height: 400,
    padding: 5,

    config: {
      background: "#ffffff",
    },

    data: [
      {
        name: "table",
        values: data,
      },
    ],

    scales: [
      {
        name: "yscale",
        type: "band",
        domain: { data: "table", field: "category" },
        range: "height",
        padding: 0.05,
        round: true,
      },
      {
        name: "xscale",
        domain: { data: "table", field: "amount" },
        nice: true,
        range: "width",
      },
    ],

    axes: [
      {
        orient: "bottom",
        scale: "xscale",
        labelFont: "Inter",
        labelFontSize: 14,
      },
      {
        orient: "left",
        scale: "yscale",
        labelFont: "Inter",
        labelFontSize: 14,
      },
    ],

    marks: [
      {
        type: "rect",
        from: { data: "table" },
        encode: {
          enter: {
            y: { scale: "yscale", field: "category" },
            height: { scale: "yscale", band: 1 },
            x: { scale: "xscale", field: "amount" },
            x2: { scale: "xscale", value: 0 },
            fill: { value: "steelblue" },
          },
        },
      },
    ],
  };
}

function parseTweet(txt) {
  const withoutUsername = txt.replace("@barchartbot", "");
  const lines = withoutUsername
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const values = lines
    .map((line) => {
      const parts = line.split(":");
      if (parts.length !== 2) return;
      const category = parts[0];
      const amount = numeral(parts[1]).value();
      if (typeof amount !== "number") return;
      return {
        category,
        amount,
      };
    })
    .filter(Boolean);
  return values;
}

function createCrcResponseToken(crcToken) {
  const hmac = crypto
    .createHmac("sha256", process.env.TWITTER_CONSUMER_SECRET)
    .update(crcToken)
    .digest("base64");

  return `sha256=${hmac}`;
}

function getHandler(req, res) {
  const crcToken = req.query.crc_token;

  if (crcToken) {
    res.status(200).send({
      response_token: createCrcResponseToken(crcToken),
    });
  } else {
    res.status(400).send({
      message: "Error: crc_token missing from request.",
    });
  }
}

function postHandler(req, res) {
  const body = req.body;

  // If not a tweet event, we're not doing anything
  if (!body.tweet_create_events) {
    res.status(200).send();
    return;
  }

  const tweet = body.tweet_create_events[0];

  if (tweet.text.toLowerCase().includes(TWITTER_USERNAME)) {
    const view = new vega.View(vega.parse(spec(parseTweet(tweet)), {}), {
      renderer: "canvas",
    }).finalize();

    view.toCanvas(1).then((canvas) => {
      canvas.createPNGStream().pipe(res);
    });

    request
      .post({
        url: `${TWITTER_API}/statuses/update.json`,
        oauth: {
          consumer_key: process.env.TWITTER_CONSUMER_KEY,
          consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
          token: process.env.TWITTER_ACCESS_TOKEN,
          token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        },
        form: {
          status: `test`,
          in_reply_to_status_id: tweet.id_str,
          auto_populate_reply_metadata: true,
        },
      })
      .then((response) => {
        console.log("Tweeted");
        console.log(response);
        res.status(200).send();
      })
      .catch((error) => {
        console.log(error.message);
        res.status(500).send();
      });
  } else {
    console.log("non-mention request");
    res.status(404).send();
  }
}

module.exports = (req, res) => {
  try {
    switch (req.method) {
      case "GET":
        return getHandler(req, res);
      case "POST":
        return postHandler(req, res);
      default:
        return res.status(410).json({ message: "Unsupported Request Method" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send();
  }
};
