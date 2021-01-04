import * as vega from "vega";
import Path from "path";
import { registerFont } from "canvas";

registerFont(Path.resolve("./public/Inter-Medium.ttf"), {
  family: "Inter",
});

function spec(data: Array<{ category: string; value: number }>): vega.Spec {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    description: "",
    width: 800,
    height: 400,
    padding: 20,

    config: {
      background: "#ffffff",
    },

    data: [
      {
        name: "table",
        values: data.map((d, id) => ({ id, ...d })),
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
      {
        name: "color",
        type: "ordinal",
        domain: { data: "table", field: "id" },
        range: { scheme: "category10" },
      },
    ],

    axes: [
      {
        orient: "bottom",
        scale: "xscale",
        labelFont: "Inter",
        labelFontSize: 18,
        format: "~s",
      },
      {
        orient: "left",
        scale: "yscale",
        labelFont: "Inter",
        labelFontSize: 20,
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
            fill: { scale: "color", field: "id" },
          },
        },
      },
    ],
  };
}

export async function renderChart(data: any) {
  const view = new vega.View(vega.parse(spec(data), {}), {
    renderer: "canvas",
  }).finalize();

  const canvas = (await view.toCanvas(1)) as any;
  return canvas.toBuffer();
}
