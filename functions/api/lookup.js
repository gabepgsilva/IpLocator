// This Cloudflare Pages Function will act as a proxy to the ipinfo.io API
// to solve CORS issues and securely add an API key.

export async function onRequest(context) {
  // Get the original request's URL to extract the target IP
  const url = new URL(context.request.url);

  // The part of the path after '/api/lookup' will be the target IP or domain
  const target = url.pathname.substring('/api/lookup'.length);

  // Get the API token from Cloudflare's environment variables
  // The user will need to set this in their Pages project settings.
  const token = context.env.IPINFO_TOKEN;

  if (!token) {
    return new Response('API token is not configured', { status: 500 });
  }

  // Construct the target API URL
  const apiUrl = `https://ipinfo.io${target}?token=${token}`;

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