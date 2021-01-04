import { test } from "tap";
import { parseTweet } from "./parse_tweet";

test("parseTweet", async (t) => {
  t.same(
    parseTweet(`@barchartbot
A: 1
B: 10`),
    [
      {
        category: "A",
        amount: 1,
      },
      {
        category: "B",
        amount: 10,
      },
    ]
  );

  t.same(
    parseTweet(`@barchartbot
A: $1,000
B: $10`),
    [
      {
        category: "A",
        amount: 1000,
      },
      {
        category: "B",
        amount: 10,
      },
    ]
  );

  t.same(
    parseTweet(`@barchartbot
A: $1m
B: $1b
C: $1K`),
    [
      {
        category: "A",
        amount: 1000000,
      },
      {
        category: "B",
        amount: 1000000000,
      },
      {
        category: "C",
        amount: 1000,
      },
    ]
  );

  t.same(
    parseTweet(`@barchartbot
http://foo.com/1000
A: $1m
B: $1b
C: $1K`),
    [
      {
        category: "A",
        amount: 1000000,
      },
      {
        category: "B",
        amount: 1000000000,
      },
      {
        category: "C",
        amount: 1000,
      },
    ]
  );
});
