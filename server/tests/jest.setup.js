const fs = require('fs');
const path = require('path');

const uriFile = path.resolve(__dirname, 'mongo-uri.txt');
if (fs.existsSync(uriFile)) {
  const uri = fs.readFileSync(uriFile, 'utf8').trim();
  if (uri) {
    process.env.MONGODB_URI = uri;
  }
}
