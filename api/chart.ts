import { NowRequest, NowResponse } from "@vercel/node";
import * as vega from "vega";
import numeral from "numeral";

const images = {};

function spec(data) {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    description: "",
    width: 800,
    height: 400,
    padding: 5,

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
      { orient: "bottom", scale: "xscale" },
      { orient: "left", scale: "yscale" },
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

module.exports = (req: NowRequest, res: NowResponse) => {
  const { tweet = "" } = req.query;

  const view = new vega.View(vega.parse(spec(parseTweet(tweet)), {}), {
    renderer: "canvas",
  }).finalize();

  res.status(200);

  view.toCanvas(1).then((canvas) => {
    canvas.createPNGStream().pipe(res);
  });
};
