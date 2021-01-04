import Crypto from "crypto";
import { NowRequest, NowResponse } from "@vercel/node";
import request from "request-promise";
import { renderChart } from "../lib/chart";
import { parseTweet } from "../lib/parse_tweet";

const TWITTER_API = "https://api.twitter.com/1.1";
const TWITTER_USERNAME = "@barchartbot";

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
    const buf = await renderChart(parseTweet(tweet.text));

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
