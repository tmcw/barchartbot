const tweet = `@barchartbot
Apple market cap: 10
Bitcoin: 2`;

console.log(
  `https://barchartbot.vercel.app/api/chart?tweet=${encodeURIComponent(tweet)}`
);
