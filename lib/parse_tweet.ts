import numeral from "numeral";
import urlRegex from "url-regex";

export function parseTweet(txt: string) {
  const withoutUsername = txt
    .replace("@barchartbot", "")
    .replace(urlRegex(), "");
  const lines = withoutUsername
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const values = lines
    .map((line) => {
      const parts = line.split(":");
      if (parts.length !== 2) return;
      const category = parts[0];
      const amount = numeral(parts[1].toLowerCase()).value();
      if (typeof amount !== "number") return;
      return {
        category,
        amount,
      };
    })
    .filter(Boolean);
  return values;
}
