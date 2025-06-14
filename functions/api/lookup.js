// This Cloudflare Pages Function will act as a proxy to the ipapi.co API
// to solve the CORS issue.

export async function onRequest(context) {
  // Get the original request's URL to extract the target IP
  const url = new URL(context.request.url);

  // The part of the path after '/api/lookup' will be the target IP or domain (e.g., /8.8.8.8)
  const target = url.pathname.substring('/api/lookup'.length);

  // Construct the target API URL
  const apiUrl = `https://ipapi.co/json${target}`;

  // Fetch the data from the real API
  const apiResponse = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Cloudflare-Proxy/1.0' }
  });

  // Create a new response based on the API's response
  const response = new Response(apiResponse.body, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
    headers: apiResponse.headers
  });

  // Add the crucial CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
} 