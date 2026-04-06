import fetch from 'node-fetch';

async function test() {
  const res = await fetch("https://api.cobalt.tools/api/json", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    })
  });
  console.log(await res.text());
}
test();
