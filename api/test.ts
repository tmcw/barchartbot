import { NowRequest, NowResponse } from "@vercel/node";
import { renderChart } from "../lib/chart";
import { parseTweet } from "../lib/parse_tweet";

export default async function postHandler(req: NowRequest, res: NowResponse) {
  const body = req.query.body as string;

  console.log(req.query);

  const buf = await renderChart(parseTweet(body));
  res.status(200).send(buf);
}
