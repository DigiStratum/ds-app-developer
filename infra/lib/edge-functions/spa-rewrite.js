// CloudFront Function: SPA route rewriting
// Redirects non-file requests to /index.html for React Router

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // Don't rewrite API requests
  if (uri.startsWith('/api/')) {
    return request;
  }
  
  // Check if this looks like a file (has an extension)
  if (uri.includes('.')) {
    return request;
  }
  
  // Rewrite to index.html for SPA routing
  request.uri = '/index.html';
  return request;
}
