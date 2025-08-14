import fs from 'fs';

const endpoint = "https://production-sfo.browserless.io/chromium/bql";
const token = "S1AMT3E9fOmOF332e325829abd823a1975bff5acdf";

async function fetchBrowserQL() {
  const response = await fetch(`${endpoint}?token=${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
      mutation Screenshot($url: String!) {
        goto(url: $url, waitUntil: load) {
          status
        }
        click(selector: "input#cardNumber") {
          status
        }
        type(selector: "input#cardNumber", text: "123") {
          status
        }
        wait(ms: 4000) {
          status
        }
        screenshot(type: jpeg) {
          base64
        }
      }`,
      variables: {
        url: "https://pay.mangopay.com/?id=wt_b83cf4b1-b3b1-4a15-8812-7e33a60261d3&client-token=hpp_0196b92b6a65731a9dc6881747502101"
      }
    })
  });

  const data = await response.json();
  console.log(data);

  // Extract the base64 string from the response and write a .jpg file
  const base64Screenshot = data?.data?.screenshot?.base64;
  if (base64Screenshot) {
    const buffer = Buffer.from(base64Screenshot, 'base64');
    fs.writeFileSync('mangopay_screenshot.jpg', buffer);
    console.log('Screenshot saved as mangopay_screenshot.jpg');
  } else {
    console.error("Screenshot data not found in the response.");
  }
}

fetchBrowserQL().catch(err => {
  console.error('Error:', err);
});