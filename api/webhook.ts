import Crypto from "crypto";
import { NowRequest, NowResponse } from "@vercel/node";
import request from "request-promise";
import { registerFont } from "canvas";
import * as vega from "vega";
import numeral from "numeral";
import path from "path";

const TWITTER_API = "https://api.twitter.com/1.1";
const TWITTER_USERNAME = "@barchartbot";

registerFont(path.resolve("./public/Inter-Medium.ttf"), {
  family: "Inter",
});

function spec(data: any): vega.Spec {
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

function parseTweet(txt: string) {
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

function createCrcResponseToken(crcToken: string) {
  const hmac = Crypto.createHmac("sha256", process.env.TWITTER_CONSUMER_SECRET!)
    .update(crcToken)
    .digest("base64");

  return `sha256=${hmac}`;
}

function getHandler(req: NowRequest, res: NowResponse) {
  const crcToken = req.query.crc_token as string;

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

async function postHandler(req: NowRequest, res: NowResponse) {
  const body = req.body;

  // If not a tweet event, we're not doing anything
  if (!body.tweet_create_events) {
    res.status(200).send("");
    return;
  }

  const tweet = body.tweet_create_events[0];

  if (tweet.text.toLowerCase().includes(TWITTER_USERNAME)) {
    const view = new vega.View(vega.parse(spec(parseTweet(tweet.text)), {}), {
      renderer: "canvas",
    }).finalize();

    const canvas = (await view.toCanvas(1)) as any;
    const buf = canvas.toBuffer();

    try {
      const media_upload = await request.post({
        url: `https://upload.twitter.com/1.1/media/upload.json`,
        qs: {
          media_category: "tweet_image",
        },
        oauth: {
          consumer_key: process.env.TWITTER_CONSUMER_KEY,
          consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
          token: process.env.TWITTER_ACCESS_TOKEN,
          token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        },
        json: true,
        formData: {
          media: {
            value: buf,
            options: {
              filename: "chart.png",
              contentType: "image/png",
            },
          },
        },
      });

      const { media_id_string } = media_upload;

      await request.post({
        url: `${TWITTER_API}/statuses/update.json`,
        oauth: {
          consumer_key: process.env.TWITTER_CONSUMER_KEY,
          consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
          token: process.env.TWITTER_ACCESS_TOKEN,
          token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        },
        form: {
          status: `Here’s your chart!`,
          in_reply_to_status_id: tweet.id_str,
          auto_populate_reply_metadata: true,
          media_ids: media_id_string,
        },
      });
      res.status(200).send("");
    } catch (e) {
      console.log(e);
      res.status(500).send("");
    }
  } else {
    console.log("non-mention request");
    res.status(404).send("");
  }
}

export default (req: NowRequest, res: NowResponse) => {
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
    res.status(500).send("");
  }
};
